import json
import os
import boto3

from loan_discovery.router import run_scraper
from loan_discovery.validator import validate_products
from loan_discovery.normalizer import normalize_products

sns = boto3.client("sns")


def handler(event, context):
    try:
        # Handle string payload (CLI invoke case)
        if isinstance(event, str):
            event = json.loads(event)

        site = event.get("site_name")

        if not site:
            return {
                "status": "error",
                "message": "site_name is required"
            }

        products = run_scraper(site)
        validate_products(products)
        normalized = normalize_products(products)

        topic_arn = os.environ["LOAN_DISCOVERY_TOPIC_ARN"]

        sns.publish(
            TopicArn=topic_arn,
            Message=json.dumps({
                "source": site,
                "products": normalized
            })
        )

        return {
            "status": "success",
            "site": site,
            "products_scraped": len(normalized),
            "message": "Published to loan-discovery-topic"
        }

    except Exception as e:
        print("Error:", str(e))

        # Safely extract site if possible
        safe_site = None
        if isinstance(event, dict):
            safe_site = event.get("site_name")

        return {
            "status": "failed",
            "site": safe_site,
            "error": str(e)
        }