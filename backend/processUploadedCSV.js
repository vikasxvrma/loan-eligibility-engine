const { Client } = require("pg");
const AWS = require("aws-sdk");
const { S3 } = require("aws-sdk");
const { randomUUID } = require("crypto");

const s3 = new S3();
const sns = new AWS.SNS();

let client;

async function getClient() {
  if (!client) {
    client = new Client({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();
    console.log("DB connected");
  }

  return client;
}

module.exports.handler = async (event) => {
  try {
    const db = await getClient();

    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = record.s3.object.key;

    console.log(`Processing file: ${key}`);

    const file = await s3.getObject({
      Bucket: bucket,
      Key: key,
    }).promise();

    const csvString = file.Body.toString("utf-8");

    const lines = csvString.split(/\r?\n/);

    // remove header
    lines.shift();

    const rows = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      const [
        email,
        monthly_income,
        credit_score,
        employment_status,
        age
      ] = line.split(",");

      rows.push({
        user_id: randomUUID(),
        email,
        monthly_income: parseInt(monthly_income),
        credit_score: parseInt(credit_score),
        employment_status,
        age: parseInt(age)
      });
    }

    let inserted = 0;

    for (const user of rows) {
      await db.query(
        `
        INSERT INTO users (
          user_id,
          email,
          monthly_income,
          credit_score,
          employment_status,
          age
        )
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (user_id) DO NOTHING
        `,
        [
          user.user_id,
          user.email,
          user.monthly_income,
          user.credit_score,
          user.employment_status,
          user.age
        ]
      );

      inserted++;
    }

    console.log(`Users inserted: ${inserted}`);

    await sns.publish({
      TopicArn: process.env.MATCH_TRIGGER_TOPIC_ARN,
      Message: JSON.stringify({
        trigger: "users_updated",
        users_inserted: inserted
      })
    }).promise();

    console.log("Match trigger published");

    return {
      statusCode: 200,
      body: `Users processed: ${inserted}`
    };

  } catch (err) {
    console.error("Error processing CSV:", err);

    return {
      statusCode: 500,
      body: err.message
    };
  }
};