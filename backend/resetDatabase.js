const { Client } = require("pg");

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

module.exports.handler = async () => {
  try {
    const db = await getClient();

    console.log("Resetting database...");

    await db.query(`
      TRUNCATE TABLE
        matches,
        loan_products,
        eligibility_decisions,
        users
      RESTART IDENTITY CASCADE;
    `);

    console.log("Database cleared");

    return {
      statusCode: 200,
      body: "Database reset successful",
    };

  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,
      body: err.message,
    };
  }
};