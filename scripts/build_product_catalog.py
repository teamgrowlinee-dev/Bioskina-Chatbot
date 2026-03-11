from __future__ import annotations

import csv
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT.parent / "Bioskina-veebileht-kloon"
CSV_PATH = SOURCE_ROOT / "analysis" / "bioskina_toodete_analuus.csv"
PRODUCT_DIR = SOURCE_ROOT / "public" / "products"
OUTPUT_PATH = ROOT / "server" / "data" / "productCatalog.json"

STORE_URL = "https://bioskina.com"
SUPPORTED_DOMAINS = {"juuksehooldus", "nahahooldus"}

SIZE_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*(ml|g|pcs|pc|tk)\b", re.I)


def parse_list(value: str) -> list[str]:
    raw = str(value or "").strip()
    if not raw:
        return []
    return [part.strip() for part in raw.split(",") if part.strip()]


def normalize_url(value: str) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    if text.startswith("//"):
        return "https:" + text
    if text.startswith("/"):
        return STORE_URL + text
    return text


def parse_price(value: str) -> float | None:
    raw = str(value or "").strip()
    if not raw:
        return None
    raw = raw.replace(",", ".")
    try:
        return float(raw)
    except ValueError:
        return None


def read_product_html(slug: str) -> dict[str, object]:
    file_path = PRODUCT_DIR / f"{slug}.html"
    if not file_path.exists():
        return {}

    text = file_path.read_text(encoding="utf-8", errors="ignore")

    def find(pattern: str) -> str:
        match = re.search(pattern, text, re.I)
        return match.group(1).strip() if match else ""

    return {
        "canonicalUrl": find(r'<link rel="canonical" href="([^"]+)"'),
        "imageUrl": normalize_url(find(r'<meta property="og:image" content="([^"]+)"')),
        "price": parse_price(find(r'<meta property="og:price:amount" content="([^"]+)"')),
        "currency": find(r'<meta property="og:price:currency" content="([^"]+)"') or "EUR",
        "metaDescription": find(r'<meta name="description" content="([^"]+)"'),
    }


def build_family_key(slug: str) -> str:
    key = str(slug or "").strip().lower()
    key = re.sub(r"-\d+(?:[.,]\d+)?(ml|g|pcs|pc|tk)$", "", key)
    key = re.sub(r"-(refill|travel-size|travel|tester|sample)$", "", key)
    return key


def detect_size_value(text: str) -> float | None:
    match = SIZE_RE.search(str(text or ""))
    if not match:
        return None
    raw = match.group(1).replace(",", ".")
    try:
        return float(raw)
    except ValueError:
        return None


def build_variant_rank(name: str, slug: str) -> int:
    score = 5
    size = detect_size_value(name) or detect_size_value(slug)

    if size is None:
        score = 6
    elif 75 <= size <= 300:
        score = 10
    elif 301 <= size <= 500:
        score = 8
    elif 51 <= size < 75:
        score = 7
    elif size > 500:
        score = 6
    else:
        score = 5

    normalized = f"{name} {slug}".lower()
    if "refill" in normalized:
        score -= 2
    if "tester" in normalized or "sample" in normalized:
        score -= 3

    return score


def row_to_product(row: dict[str, str]) -> dict[str, object] | None:
    domain = str(row.get("toote_valdkond") or "").strip()
    if domain not in SUPPORTED_DOMAINS:
        return None

    slug = str(row.get("slug") or "").strip()
    if not slug:
        return None

    html_data = read_product_html(slug)
    name = str(row.get("toote_nimi") or "").strip()

    return {
        "slug": slug,
        "familyKey": build_family_key(slug),
        "variantRank": build_variant_rank(name, slug),
        "name": name,
        "brand": str(row.get("brand") or "").strip(),
        "url": str(html_data.get("canonicalUrl") or row.get("url") or "").strip(),
        "imageUrl": str(html_data.get("imageUrl") or "").strip(),
        "price": html_data.get("price"),
        "currency": str(html_data.get("currency") or "EUR").strip() or "EUR",
        "domain": domain,
        "productType": str(row.get("toote_tyyp") or "").strip(),
        "analysisTarget": str(row.get("analuusi_siht") or "").strip(),
        "hairTypes": parse_list(row.get("sobivad_juuksetüübid") or ""),
        "hairConcerns": parse_list(row.get("juuste_mured") or ""),
        "skinTypes": parse_list(row.get("sobivad_nahatüübid") or ""),
        "skinConcerns": parse_list(row.get("naha_mured") or ""),
        "summary": str(row.get("kokkuvote") or "").strip(),
        "shortDescription": str(
            html_data.get("metaDescription")
            or row.get("kirjelduse_lyhend")
            or ""
        ).strip(),
        "confidence": str(row.get("kindlus") or "").strip(),
    }


def main() -> None:
    if not CSV_PATH.exists():
        raise SystemExit(f"CSV not found: {CSV_PATH}")

    with CSV_PATH.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))

    products = []
    for row in rows:
        product = row_to_product(row)
        if product:
            products.append(product)

    products.sort(key=lambda item: (str(item["domain"]), str(item["name"]).lower()))

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(products, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Wrote {len(products)} products to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
