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
      ssl: {
        rejectUnauthorized: false,
      },
    });

    await client.connect();
    console.log("DB connected");
  }
  return client;
}

module.exports.hello = async (event) => {
  try {
    const db = await getClient();

    const res = await db.query("SELECT NOW()");
    console.log(res.rows[0]);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "DB Connected",
        time: res.rows[0],
      }),
    };
  } catch (err) {
    console.error("FULL ERROR:", err);
    return {
      statusCode: 500,
      body: JSON.stringify(err.message),
    };
  }
};

module.exports.tables = async () => {
  try {
    const db = await getClient();
    const res = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema='public'
    `);

    return {
      statusCode: 200,
      body: JSON.stringify(res.rows),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: err.message };
  }
};

module.exports.listUsers = async () => {
  try {
    const db = await getClient();

    const res = await db.query(
      `SELECT user_id,email,monthly_income,credit_score,employment_status,age  FROM users`,
    );
    return {
      statusCode: 200,
      body: JSON.stringify(res.rows),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: err.message,
    };
  }
};
module.exports.listDecisions = async () => {
  try {
    const db = await getClient();

    const res = await db.query(`
      SELECT 
        u.email,
        e.is_eligible,
        e.reason,
        e.evaluated_at
      FROM eligibility_decisions e
      JOIN users u ON u.user_id = e.user_id
      ORDER BY e.evaluated_at DESC
    `);

    return {
      statusCode: 200,
      body: JSON.stringify(res.rows),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: err.message };
  }
};

