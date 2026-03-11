// Bioskina is a Shopify store — uses the public Predictive Search API (no API key needed)
// https://bioskina.com/search/suggest.json?q=QUERY&resources[type]=product&resources[limit]=6

const STORE_URL = (
  process.env.BIOSKINA_STORE_URL || "https://bioskina.com"
).replace(/\/+$/, "");

const SEARCH_URL = `${STORE_URL}/search/suggest.json`;

const STOPWORDS = new Set([
  "find", "search", "looking", "for", "show", "me", "do", "you", "have",
  "recommend", "suggest", "please", "a", "an", "the", "some", "any",
  "otsi", "leia", "soovita", "soovin", "tahan", "kas", "teil", "palun",
  "mulle", "sobiv", "sobivaid", "midagi", "hea", "parim", "on",
  "toode", "tooteid", "ja", "voi", "ning",
]);

function normalizeSearchWord(word) {
  let value = String(word || "").trim().toLowerCase();
  if (!value) return "";

  value = value
    .replace(/š/g, "s")
    .replace(/ž/g, "z")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/õ/g, "o")
    .replace(/ü/g, "u");

  const replacements = [
    [/shampoo(s|n|ni)?$/g, "shampoo"],
    [/sampooni(d|de|ga|le|st|sse)?$/g, "shampoo"],
    [/conditioner(s)?$/g, "conditioner"],
    [/palsami(d|de|ga|le|st|sse)?$/g, "conditioner"],
    [/maski(d|de|ga|le|st|sse)?$/g, "mask"],
    [/seerumi(d|de|ga|le|st|sse)?$/g, "serum"],
    [/kreemi(d|de|ga|le|st|sse)?$/g, "cream"],
    [/moisturizer(s)?$/g, "moisturizer"],
    [/cleanser(s)?$/g, "cleanser"],
    [/sunscreen(s)?$/g, "sunscreen"],
    [/foundation(s)?$/g, "foundation"],
    [/juustele$/g, "hair"],
    [/juukse(d|te|id)?$/g, "hair"],
    [/kuivadele$/g, "dry"],
    [/rasustele$/g, "oily"],
    [/tundlikele$/g, "sensitive"],
    [/lastele$/g, "kids"],
    [/meestele$/g, "men"],
  ];

  for (const [pattern, next] of replacements) {
    value = value.replace(pattern, next);
  }

  return value;
}

function normalizeSearchText(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .split(/\s+/)
    .map(normalizeSearchWord)
    .filter(Boolean)
    .join(" ")
    .trim();
}

function buildSearchTerms(message) {
  const normalized = normalizeSearchText(message);
  const rawTokens = normalized
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));

  const seen = new Set();
  const terms = [];

  function add(term) {
    const value = String(term || "").trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    terms.push(value);
  }

  add(normalized);
  if (rawTokens.length > 1) add(rawTokens.slice(0, 4).join(" "));
  for (let i = 0; i < rawTokens.length; i++) {
    add(rawTokens[i]);
    if (i < rawTokens.length - 1) add(`${rawTokens[i]} ${rawTokens[i + 1]}`);
  }

  return terms.slice(0, 6);
}

function buildSearchTokens(message) {
  return normalizeSearchText(message)
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function parsePrice(raw) {
  if (raw == null) return null;
  const num = Number(String(raw).replace(/[^0-9.]/g, ""));
  return isNaN(num) ? null : num;
}

async function queryShopify(query, limit) {
  const url =
    `${SEARCH_URL}?q=${encodeURIComponent(query)}` +
    `&resources[type]=product` +
    `&resources[limit]=${limit}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Shopify search error: ${response.status}`);
  }

  const json = await response.json();
  const products =
    (json.resources && json.resources.results && json.resources.results.products) || [];

  return products.map((item) => {
    const variant = Array.isArray(item.variants) ? item.variants[0] : null;
    const price = parsePrice(item.price) || parsePrice(variant && variant.price);
    const sku = String((variant && variant.sku) || "").trim();

    return {
      sku: sku || item.handle || "",
      name: String(item.title || "").trim(),
      url: item.url
        ? `${STORE_URL}${item.url}`
        : `${STORE_URL}/products/${item.handle}`,
      imageUrl: String(item.image || "").trim(),
      description: "",
      price: price || 0,
      currency: "EUR",
      available: item.available !== false,
    };
  }).filter((item) => item.name);
}

function scoreProduct(product, tokens) {
  const name = normalizeSearchText(product.name);
  const matchedTokens = new Set();
  let score = 0;

  for (const token of tokens) {
    if (!token) continue;
    if (name.indexOf(token) !== -1) {
      score += 14;
      matchedTokens.add(token);
    }
  }

  if (product.available) score += 2;

  return { score, matchedTokenCount: matchedTokens.size };
}

async function searchProducts(message, options) {
  const limit = Math.max(1, Number((options || {}).limit || 6));
  const pageSize = Math.min(10, Math.max(limit, 6));
  const searchTerms = buildSearchTerms(message);
  const searchTokens = buildSearchTokens(message);
  const byHandle = new Map();

  for (const term of searchTerms) {
    const items = await queryShopify(term, pageSize);
    for (const item of items) {
      const key = item.sku || item.name;
      if (!byHandle.has(key)) {
        byHandle.set(key, item);
      }
      if (byHandle.size >= limit * 2) break;
    }
    if (byHandle.size >= limit * 2) break;
  }

  const ranked = Array.from(byHandle.values())
    .map((item) => ({ item, ...scoreProduct(item, searchTokens) }))
    .sort(
      (a, b) =>
        b.matchedTokenCount - a.matchedTokenCount || b.score - a.score
    )
    .map((e) => e.item);

  return {
    items: ranked.slice(0, limit),
    searchTerms,
  };
}

module.exports = {
  STORE_URL,
  searchProducts,
};
