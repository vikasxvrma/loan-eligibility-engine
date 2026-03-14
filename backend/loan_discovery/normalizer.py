import hashlib


def normalize_products(products):
    normalized = []

    for product in products:
        product_name = product["product_name"].strip()
        source = product["source"].strip().lower()

        # Deterministic identity key
        product_key_raw = f"{product_name}:{source}"
        product_key = hashlib.sha256(product_key_raw.encode()).hexdigest()

        normalized.append(
            {
                "product_key": product_key,
                "product_name": product_name,
                "min_interest_rate": float(product["min_interest_rate"]),
                "max_interest_rate": (
                    float(product["max_interest_rate"])
                    if product["max_interest_rate"] is not None
                    else None
                ),
                "source": source,
            }
        )

    return normalized