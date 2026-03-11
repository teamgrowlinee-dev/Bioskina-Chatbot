const { callAnthropic, hasAnthropic } = require("./anthropic");
const { searchProducts } = require("./bioskinaApi");
const { detectIntent } = require("./intent");
const {
  ANTHROPIC_SYSTEM_PROMPT,
  CONTACT,
  SUPPORT_MESSAGES,
  buildSupportContext,
} = require("./supportData");

function buildSupportResponse(intent) {
  const text =
    SUPPORT_MESSAGES[intent.replace("support_", "")] || SUPPORT_MESSAGES.general;
  return {
    mode: "support",
    assistantText: text,
    products: [],
  };
}

async function buildAnthropicSupportResponse(message, intent) {
  const context = buildSupportContext(intent);
  const userPrompt = [
    `Customer message: ${message}`,
    "",
    "Context:",
    context,
    "",
    "Reply in 1-3 sentences. If relevant, add a link to the appropriate page at the end.",
  ].join("\n");

  const text = await callAnthropic({
    systemPrompt: ANTHROPIC_SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 220,
  });

  return text || null;
}

async function buildAnthropicShoppingText(message, products) {
  if (!products.length) {
    return null;
  }

  const productLines = products.map((product, index) => {
    const price =
      typeof product.price === "number" && product.price
        ? `${product.price} ${product.currency || "EUR"}`
        : "price not available";
    return [
      `${index + 1}. ${product.name}`,
      `Price: ${price}`,
      `URL: ${product.url}`,
    ].join("\n");
  });

  const userPrompt = [
    `Customer search: ${message}`,
    "",
    "Found products:",
    productLines.join("\n\n"),
    "",
    "Write 1-2 sentences summarising the results. Do not invent new products.",
  ].join("\n");

  const text = await callAnthropic({
    systemPrompt: ANTHROPIC_SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 180,
  });

  return text || null;
}

function buildShoppingText(message, products) {
  if (!products.length) {
    return `I couldn't find exact matches for "${message}". Try a more specific keyword, e.g. "face serum for dry skin" or "natural sunscreen SPF 50".`;
  }
  return `Here are the best matches for "${message}" from Bioskina. Open a product page for more details.`;
}

async function buildChatResponse(message) {
  const cleanMessage = String(message || "").trim();
  const intent = detectIntent(cleanMessage);

  if (!cleanMessage) {
    return {
      mode: "smalltalk",
      assistantText: "Enter a question or product search.",
      products: [],
    };
  }

  if (intent === "greeting") {
    return {
      mode: "smalltalk",
      assistantText: SUPPORT_MESSAGES.greeting,
      products: [],
    };
  }

  if (intent === "smalltalk") {
    if (hasAnthropic()) {
      const anthropicText = await buildAnthropicSupportResponse(
        cleanMessage,
        "smalltalk"
      );
      if (anthropicText) {
        return { mode: "smalltalk", assistantText: anthropicText, products: [] };
      }
    }
    return { mode: "smalltalk", assistantText: SUPPORT_MESSAGES.smalltalk, products: [] };
  }

  if (intent === "escalation") {
    if (hasAnthropic()) {
      const anthropicText = await buildAnthropicSupportResponse(
        cleanMessage,
        "escalation"
      );
      if (anthropicText) {
        return { mode: "support", assistantText: anthropicText, products: [] };
      }
    }
    return { mode: "support", assistantText: SUPPORT_MESSAGES.escalation, products: [] };
  }

  if (intent.startsWith("support_")) {
    if (hasAnthropic()) {
      const anthropicText = await buildAnthropicSupportResponse(
        cleanMessage,
        intent
      );
      if (anthropicText) {
        return { mode: "support", assistantText: anthropicText, products: [] };
      }
    }
    return buildSupportResponse(intent);
  }

  // Product search
  const searchResult = await searchProducts(cleanMessage, { limit: 6 });
  if (searchResult.items.length) {
    const anthropicText = hasAnthropic()
      ? await buildAnthropicShoppingText(cleanMessage, searchResult.items)
      : null;
    return {
      mode: "shopping",
      assistantText:
        anthropicText || buildShoppingText(cleanMessage, searchResult.items),
      products: searchResult.items,
      searchTerms: searchResult.searchTerms,
    };
  }

  if (intent === "shopping") {
    return {
      mode: "shopping",
      assistantText: buildShoppingText(cleanMessage, []),
      products: [],
      searchTerms: searchResult.searchTerms,
    };
  }

  return {
    mode: "support",
    assistantText: hasAnthropic()
      ? (await buildAnthropicSupportResponse(cleanMessage, "general")) ||
        `${SUPPORT_MESSAGES.general} Quickest contact: ${CONTACT.email}.`
      : `${SUPPORT_MESSAGES.general} Quickest contact: ${CONTACT.email}.`,
    products: [],
  };
}

module.exports = {
  buildChatResponse,
};
