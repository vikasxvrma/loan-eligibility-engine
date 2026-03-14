const { Client } = require("pg");

// created globally for connection pooling
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

module.exports.run = async () => {
  try {
    const db = await getClient();

    // USERS TABLE
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id UUID PRIMARY KEY,
        email TEXT NOT NULL,
        monthly_income INT NOT NULL,
        credit_score INT NOT NULL,
        employment_status TEXT NOT NULL,
        age INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email
      ON users(email);
    `);

    // LOAN PRODUCTS
    await db.query(`
      CREATE TABLE IF NOT EXISTS loan_products (
        product_key TEXT PRIMARY KEY,
        product_name TEXT NOT NULL,
        min_interest_rate NUMERIC NOT NULL,
        max_interest_rate NUMERIC,
        source TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_loan_products_source
      ON loan_products(source);
    `);

    // MATCHES TABLE
    await db.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
        product_key TEXT REFERENCES loan_products(product_key),
        matched_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Ensure uniqueness (prevents duplicate matches)
    await db.query(`
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unique_user_product'
  ) THEN
    ALTER TABLE matches
    ADD CONSTRAINT unique_user_product
    UNIQUE (user_id, product_key);
  END IF;
END
$$;
`);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_matches_user
      ON matches(user_id);
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_matches_product
      ON matches(product_key);
    `);

    return {
      statusCode: 200,
      body: "Users, loan_products and matches tables are ready",
    };
  } catch (err) {
    console.error("Migration failed:", err);
    return {
      statusCode: 500,
      body: err.message,
    };
  }
};

module.exports.describeUsers = async () => {
  const db = await getClient();

  const res = await db.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'users'
  `);

  return {
    statusCode: 200,
    body: JSON.stringify(res.rows),
  };
};
