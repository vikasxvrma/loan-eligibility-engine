from loan_discovery.scrapers import hdfc, icici


SCRAPER_MAP = {
    "hdfc": hdfc.scrape,
    "icici": icici.scrape,
}


def run_scraper(site_name: str):
    if site_name not in SCRAPER_MAP:
        raise ValueError("Invalid site name")

    return SCRAPER_MAP[site_name]()