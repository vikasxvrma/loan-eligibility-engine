import requests
from bs4 import BeautifulSoup
import re


def scrape():
    url = "https://www.icicibank.com/personal-banking/loans/personal-loan"
    response = requests.get(url, timeout=10)

    if response.status_code != 200:
        raise ValueError("Failed to fetch ICICI page")

    soup = BeautifulSoup(response.text, "html.parser")

    elements = soup.find_all(
        string=lambda text: text and "starting at" in text.lower()
    )

    for e in elements:
        text = e.strip()
        match = re.search(r"\d+(\.\d+)?%", text)

        if match:
            rate = float(match.group().replace("%", ""))

            return [
                {
                    "product_name": "ICICI Personal Loan",
                    "min_interest_rate": rate,
                    "max_interest_rate": None,
                    "source": "icici",
                }
            ]

    raise ValueError("Interest rate not found on ICICI page")