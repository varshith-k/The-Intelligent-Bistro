const { menu } = require('./menu');

const numberWords = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
};

function getQuantity(text) {
  const quantities = [];
  for (const match of text.matchAll(/\b(\d+)\b/g)) {
    quantities.push(Number(match[1]));
  }
  for (const [word, value] of Object.entries(numberWords)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) quantities.push(value);
  }
  return quantities.length ? Math.max(...quantities) : 1;
}

function getSize(text, fallback = 'regular') {
  if (/\blarge\b/.test(text)) return 'large';
  if (/\bsmall\b/.test(text)) return 'small';
  return fallback;
}

function matchMenuItem(text) {
  const byName = menu.find((item) => text.includes(item.name.toLowerCase()));
  if (byName) return byName;

  return menu.find((item) => item.tags.every((tag) => text.includes(tag)) || item.tags.some((tag) => text.includes(tag)));
}

function parseOrderIntent(message) {
  const text = String(message || '').toLowerCase().trim();

  if (!text) {
    return { reply: 'Tell me what you would like to order.', actions: [] };
  }

  if (/\b(clear|empty|reset)\b/.test(text) && /\bcart\b/.test(text)) {
    return {
      reply: 'I cleared your cart.',
      actions: [{ type: 'clear_cart' }],
    };
  }

  if (/\b(show|view|what).*(cart|order)\b/.test(text)) {
    return { reply: 'Here is your latest cart.', actions: [] };
  }

  const item = matchMenuItem(text);
  if (!item) {
    return { reply: 'I could not match that to our menu yet. Try item names like spicy chicken sandwich or large water.', actions: [] };
  }

  const size = getSize(text, item.options?.size?.[0] || 'regular');
  const quantity = getQuantity(text);

  if (/\b(remove|delete|cancel)\b/.test(text)) {
    return {
      reply: `Removed ${item.name} (${size}) from your cart.`,
      actions: [{ type: 'remove_item', itemId: item.id, size }],
    };
  }

  if (/\b(change|set|update)\b/.test(text) && /\bto\b/.test(text)) {
    return {
      reply: `Updated ${item.name} (${size}) to quantity ${quantity}.`,
      actions: [{ type: 'set_item_quantity', itemId: item.id, size, quantity }],
    };
  }

  return {
    reply: `Added ${quantity} ${item.name} (${size}) to your cart.`,
    actions: [{ type: 'add_item', itemId: item.id, size, quantity }],
  };
}

module.exports = { parseOrderIntent };
