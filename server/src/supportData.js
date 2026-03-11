const CONTACT = {
  company: "Geminio OÜ",
  phone: "+372 5340 4288",
  email: "hello@bioskina.com",
  hours: "E-R 9.00-16.00",
  address: "Tare 10, Viljandi, 71016, Estonia",
};

const LINKS = {
  home: "https://bioskina.com/",
  contact: "https://bioskina.com/pages/about-us",
  delivery: "https://bioskina.com/policies/terms-of-service",
  returns: "https://bioskina.com/policies/refund-policy",
  terms: "https://bioskina.com/policies/terms-of-service",
  privacy: "https://bioskina.com/policies/privacy-policy",
  about: "https://bioskina.com/pages/about-us",
};

const SUPPORT_MESSAGES = {
  greeting:
    "Hello! I'm Bioskina's assistant. I can help you find natural cosmetics and answer customer service questions. Try searching for a product or ask about delivery.",
  smalltalk:
    "Ask me about a product you're looking for, or ask about delivery, returns, payment or your order.",
  general:
    `I can help with delivery, returns, payment, contact and order topics, and search Bioskina's store for products. For quick help contact: ${CONTACT.email}.`,
  escalation:
    `I understand this is frustrating. For the quickest resolution please contact our customer service directly: ${CONTACT.email} (${CONTACT.hours}).`,
  contact:
    `Bioskina customer service: ${CONTACT.email}, ${CONTACT.phone}. Working hours: ${CONTACT.hours}. More: ${LINKS.contact}`,
  shipping:
    `Delivery options include Omniva and Smartpost parcel machines plus DPD courier. Free shipping starts from 65 EUR orders. More: ${LINKS.delivery}`,
  returns:
    `You can request a return within 14 days of receiving the order. Contact ${CONTACT.email} before sending items back. More: ${LINKS.returns}`,
  payment:
    `Payments are handled via Maksekeskus, Stripe or PayPal. Order is confirmed after payment is received. More: ${LINKS.terms}`,
  order:
    `For order status, delays or delivery issues please contact ${CONTACT.email}. Include your order number and a short description of the issue.`,
};

const STORE_KNOWLEDGE = [
  `Store: Bioskina — pure and natural cosmetics (bioskina.com)`,
  `Company: ${CONTACT.company}`,
  `Email: ${CONTACT.email}`,
  `Phone: ${CONTACT.phone}`,
  `Working hours: ${CONTACT.hours}`,
  `Address: ${CONTACT.address}`,
  "",
  `Product categories: HAIR, FACE, BODY, SUN, KIDS, MEN, MAKEUP`,
  `Brand selection: wide range of natural and organic cosmetics brands`,
  "",
  `Delivery: Omniva parcel machines, Smartpost parcel machines and DPD courier.`,
  `Free shipping starts from 65 EUR orders.`,
  "",
  `Returns: 14 days from receipt.`,
  `Customer should contact ${CONTACT.email} before sending returned items.`,
  "",
  `Payment: Maksekeskus, Stripe and PayPal.`,
  `Order confirmed after payment received.`,
  "",
  `Contact page: ${LINKS.contact}`,
  `Delivery info: ${LINKS.delivery}`,
  `Returns info: ${LINKS.returns}`,
  `Terms: ${LINKS.terms}`,
].join("\n");

const ANTHROPIC_SYSTEM_PROMPT = [
  "You are Bioskina's customer service and shop assistant.",
  "Reply in the same language the customer uses (Estonian or English).",
  "Be friendly, concise and helpful.",
  "For customer service questions, answer only based on the store knowledge provided below.",
  "Do not invent shipping, returns, payment or contact details.",
  "If the user searches for a product, use the product data provided as separate context.",
  `If information is insufficient, direct the user to write to ${CONTACT.email}.`,
  "",
  "STORE KNOWLEDGE:",
  STORE_KNOWLEDGE,
].join("\n");

function buildSupportContext(intent) {
  if (intent === "support_shipping") return SUPPORT_MESSAGES.shipping;
  if (intent === "support_returns") return SUPPORT_MESSAGES.returns;
  if (intent === "support_payment") return SUPPORT_MESSAGES.payment;
  if (intent === "support_contact") return SUPPORT_MESSAGES.contact;
  if (intent === "support_order") return SUPPORT_MESSAGES.order;
  if (intent === "escalation") return SUPPORT_MESSAGES.escalation;
  return SUPPORT_MESSAGES.general;
}

module.exports = {
  ANTHROPIC_SYSTEM_PROMPT,
  CONTACT,
  LINKS,
  SUPPORT_MESSAGES,
  STORE_KNOWLEDGE,
  buildSupportContext,
};
