const { Client } = require("pg");
const AWS = require("aws-sdk");

const ses = new AWS.SES({ region: "ap-south-1" });

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
  console.log("Connecting to DB...");
  const db = await getClient();

  console.log("Querying matches...");
  const result = await db.query(`
    SELECT
      u.email,
      p.product_name,
      p.min_interest_rate
    FROM matches m
    JOIN users u ON m.user_id = u.user_id
    JOIN loan_products p ON m.product_key = p.product_key
  `);

  if (result.rows.length === 0) {
    console.log("No matches found");
    return {
      statusCode: 200,
      body: "No matches found",
    };
  }

  // Group matches per user
  const grouped = {};

  for (const row of result.rows) {
    if (!grouped[row.email]) {
      grouped[row.email] = [];
    }

    grouped[row.email].push(
      `${row.product_name} — starting at ${row.min_interest_rate}%`
    );
  }

  // Build summary email
  let emailContent = "Loan Matching Results\n\n";

  let count = 0;

  for (const email in grouped) {
    if (count >= 10) break; // limit for demo

    emailContent += `User: ${email}\n`;
    emailContent += `Eligible for:\n• ${grouped[email].join("\n• ")}\n\n`;

    count++;
  }

  const params = {
    Source: process.env.SES_FROM_EMAIL,
    Destination: {
      ToAddresses: [process.env.SES_TO_EMAIL], // send only to verified admin email
    },
    Message: {
      Subject: {
        Data: "Loan Matching Results (Demo Summary)",
      },
      Body: {
        Text: {
          Data: emailContent,
        },
      },
    },
  };

  console.log("Sending summary email...");

  await ses.sendEmail(params).promise();

  console.log("Email sent successfully");

  return {
    statusCode: 200,
    body: "Summary email sent",
  };
};