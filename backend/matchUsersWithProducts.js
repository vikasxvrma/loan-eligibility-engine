const { Client } = require("pg");
const AWS = require("aws-sdk");
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

function ruleEngine(user, product) {
  // Rule 1: credit score
  if (user.credit_score < 650) return false;

  // Rule 2: income requirement
  if (user.monthly_income < 25000) return false;

  // Rule 3: employment categories allowed
  const allowedEmployment = [
    "employed",
    "self-employed",
    "business",
    "freelancer",
    "salaried",
  ];

  if (!allowedEmployment.includes(user.employment_status)) return false;

  return true;
}

module.exports.handler = async () => {
  const db = await getClient();

  // Stage 1 — SQL pre-filter
  const users = await db.query(`
    SELECT *
    FROM users
    WHERE credit_score >= 650
      AND monthly_income >= 25000
  `);

  const products = await db.query(`
    SELECT *
    FROM loan_products
  `);
  console.log(`Users fetched: ${users.rows.length}`);
  console.log(`Products fetched: ${products.rows.length}`);
  let matchCount = 0;

  for (const user of users.rows) {
    for (const product of products.rows) {
      // Stage 2 — rule engine
      if (ruleEngine(user, product)) {
        await db.query(
          `
          INSERT INTO matches (user_id, product_key)
          VALUES ($1, $2)
          ON CONFLICT (user_id, product_key) DO NOTHING
        `,
          [user.user_id, product.product_key],
        );

        matchCount++;
      }
    }
  }

  console.log(`Matches created: ${matchCount}`);

  await sns
    .publish({
      TopicArn: process.env.NOTIFICATION_TOPIC_ARN,
      Message: JSON.stringify({ trigger: "notify" }),
    })
    .promise();

  return {
    statusCode: 200,
    body: `Matches created: ${matchCount}`,
  };
};
