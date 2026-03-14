import requests
from bs4 import BeautifulSoup
import json
import re


def scrape():
    url = "https://www.hdfcbank.com/personal/borrow/popular-loans/personal-loan"
    response = requests.get(url, timeout=10)

    if response.status_code != 200:
        raise ValueError("Failed to fetch HDFC page")

    soup = BeautifulSoup(response.text, "html.parser")
    scripts = soup.find_all("script", type="application/ld+json")

    for script in scripts:
        try:
            data = json.loads(script.string)

            if isinstance(data, dict) and "mainEntity" in data:
                offers = data["mainEntity"].get("offers", {})
                apr = offers.get("annualPercentageRate", [])

                if apr:
                    min_raw = apr[0].get("minValue")
                    max_raw = apr[0].get("maxValue")

                    min_rate = float(re.search(r"\d+(\.\d+)?", min_raw).group())
                    max_rate = float(re.search(r"\d+(\.\d+)?", max_raw).group())


                    return [
                        {
                            "product_name": "HDFC Personal Loan",
                            "min_interest_rate": min_rate,
                            "max_interest_rate": max_rate,
                            "source": "hdfc",
                        }
                    ]

        except (json.JSONDecodeError, TypeError, KeyError):
            continue

    raise ValueError("Interest rate not found on HDFC page")