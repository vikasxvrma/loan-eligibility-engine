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

module.exports.handler = async (event) => {
  try {
    const db = await getClient();

    const message = JSON.parse(event.Records[0].Sns.Message);
    const products = message.products || [];

    if (products.length === 0) {
      console.log("No products received");
      return { statusCode: 200 };
    }

    const values = [];
    const placeholders = [];

    products.forEach((p, i) => {
      const idx = i * 5;

      placeholders.push(
        `($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, NOW())`,
      );

      values.push(
        p.product_key,
        p.product_name,
        p.min_interest_rate,
        p.max_interest_rate,
        p.source,
      );
    });

    const query = `
      INSERT INTO loan_products
(product_key, product_name, min_interest_rate, max_interest_rate, source, updated_at)

VALUES ${placeholders.join(",")}

ON CONFLICT (product_key)
DO UPDATE SET
  product_name = EXCLUDED.product_name,
  min_interest_rate = EXCLUDED.min_interest_rate,
  max_interest_rate = EXCLUDED.max_interest_rate,
  source = EXCLUDED.source,
  updated_at = NOW()

WHERE
  loan_products.product_name IS DISTINCT FROM EXCLUDED.product_name
  OR loan_products.min_interest_rate IS DISTINCT FROM EXCLUDED.min_interest_rate
  OR loan_products.max_interest_rate IS DISTINCT FROM EXCLUDED.max_interest_rate
  OR loan_products.source IS DISTINCT FROM EXCLUDED.source

RETURNING product_key;
    `;

    const result = await db.query(query, values);

    const upsertedRows = result.rowCount;

    console.log(`Upserted ${upsertedRows} products`);

    if (upsertedRows > 0) {
      await sns
        .publish({
          TopicArn: process.env.MATCH_TRIGGER_TOPIC_ARN,
          Message: JSON.stringify({ trigger: "products_updated" }),
        })
        .promise();

      console.log("SNS match trigger sent");
    }

    return {
      statusCode: 200,
      body: `Upserted ${upsertedRows} products`,
    };
  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,
      body: err.message,
    };
  }
};