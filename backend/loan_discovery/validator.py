def validate_products(products):
    if not isinstance(products, list):
        raise ValueError("Products must be a list")

    if len(products) == 0:
        raise ValueError("No products returned")

    for product in products:
        if "product_name" not in product:
            raise ValueError("Missing product_name")

        if "min_interest_rate" not in product:
            raise ValueError("Missing min_interest_rate")

        if "source" not in product:
            raise ValueError("Missing source")

        min_rate = product["min_interest_rate"]
        max_rate = product.get("max_interest_rate")

        if not isinstance(min_rate, (int, float)):
            raise ValueError("min_interest_rate must be numeric")

        if not (5 <= min_rate <= 40):
            raise ValueError("min_interest_rate out of expected range")

        if max_rate is not None:
            if not isinstance(max_rate, (int, float)):
                raise ValueError("max_interest_rate must be numeric")

            if max_rate < min_rate:
                raise ValueError("max_interest_rate cannot be less than min_interest_rate")

            if max_rate > 50:
                raise ValueError("max_interest_rate suspiciously high")

    return True