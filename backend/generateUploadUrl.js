const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { randomUUID } = require("crypto");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
});

module.exports.handler = async (event) => {
  try {

    // Handle empty body safely
    const body = event.body ? JSON.parse(event.body) : {};

    const { fileName, fileType } = body;

    if (!fileName || fileType !== "text/csv") {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          message: "Invalid file type or missing file name"
        }),
      };
    }

    const uniqueId = randomUUID();
    const objectKey = `uploads/${uniqueId}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: objectKey,
      ContentType: "text/csv"
    });

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: 300
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        uploadUrl,
        objectKey
      }),
    };

  } catch (error) {

    console.error("Error generating upload URL:", error);

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        message: "Internal server error"
      }),
    };

  }
};