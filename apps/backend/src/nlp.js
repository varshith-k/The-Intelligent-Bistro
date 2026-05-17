const { menu } = require('./menu');

const numberWords = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

const sizeWords = ['small', 'regular', 'large'];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function singularize(value) {
  return value
    .replace(/\bsandwiches\b/g, 'sandwich')
    .replace(/\bfries\b/g, 'fries')
    .replace(/\bwraps\b/g, 'wrap')
    .replace(/\bwaters\b/g, 'water')
    .replace(/\bbrews\b/g, 'brew');
}

function normalizeText(message) {
  return singularize(
    String(message || '')
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

function itemAliases(item) {
  const aliases = new Set([item.name.toLowerCase(), item.id.replace(/-/g, ' ')]);
  item.tags.forEach((tag) => aliases.add(tag));

  if (item.id === 'spicy-chicken-sandwich') {
    aliases.add('chicken sandwich');
    aliases.add('spicy sandwich');
  }

  if (item.id === 'veggie-wrap') {
    aliases.add('veggie wrap');
    aliases.add('garden wrap');
  }

  if (item.id === 'truffle-fries') {
    aliases.add('truffle fries');
    aliases.add('fries');
  }

  if (item.id === 'cold-brew') {
    aliases.add('cold brew');
    aliases.add('coffee');
  }

  return [...aliases].map(singularize).sort((a, b) => b.length - a.length);
}

const menuMatchers = menu.map((item) => ({
  item,
  aliases: itemAliases(item),
}));

function findItemMatches(text) {
  const matches = [];

  for (const { item, aliases } of menuMatchers) {
    let bestMatch = null;

    for (const alias of aliases) {
      const pattern = new RegExp(`\\b${escapeRegExp(alias)}\\b`);
      const match = pattern.exec(text);
      if (!match) continue;

      if (!bestMatch || match.index < bestMatch.index || alias.length > bestMatch.alias.length) {
        bestMatch = { item, alias, index: match.index, end: match.index + match[0].length };
      }
    }

    if (bestMatch) matches.push(bestMatch);
  }

  return matches.sort((a, b) => a.index - b.index);
}

function nearestClause(text, match, nextMatch) {
  const connectors = [' and ', ' plus ', ' with ', ','];
  const hardStart = Math.max(...connectors.map((connector) => text.lastIndexOf(connector, match.index)));
  const start = hardStart === -1 ? 0 : hardStart + 1;
  const nextConnector = connectors
    .map((connector) => text.indexOf(connector, match.end))
    .filter((index) => index !== -1 && (!nextMatch || index < nextMatch.index))
    .sort((a, b) => a - b)[0];
  const end = nextConnector ?? nextMatch?.index ?? text.length;
  return text.slice(start, end).trim();
}

function getQuantity(text, fallback = 1) {
  const digitMatch = text.match(/\b(\d+)\b/);
  if (digitMatch) return Number(digitMatch[1]);

  for (const [word, value] of Object.entries(numberWords)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) return value;
  }

  return fallback;
}

function getSetQuantity(text) {
  const toQuantity = text.match(/\b(?:to|as|quantity)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/);
  if (!toQuantity) return getQuantity(text);
  const raw = toQuantity[1];
  return numberWords[raw] || Number(raw);
}

function getSize(text, item) {
  const supported = item.options?.size || ['regular'];
  const matchedSize = sizeWords.find((size) => new RegExp(`\\b${size}\\b`).test(text));
  if (matchedSize && supported.includes(matchedSize)) return matchedSize;
  return supported.includes('regular') ? 'regular' : supported[0];
}

function getOperation(text) {
  if (/\b(remove|delete|cancel|drop)\b/.test(text)) return 'remove_item';
  if (/\b(change|set|update|make)\b/.test(text)) return 'set_item_quantity';
  return 'add_item';
}

function actionReply(actions) {
  if (!actions.length) {
    return 'I could not match that to our menu yet. Try: add two spicy chicken sandwiches and a large water.';
  }

  const readable = actions.map((action) => {
    const item = menu.find((entry) => entry.id === action.itemId);
    const name = item?.name || action.itemId;
    const size = action.size ? ` ${action.size}` : '';

    if (action.type === 'remove_item') return `removed${size} ${name}`;
    if (action.type === 'set_item_quantity') return `set${size} ${name} to ${action.quantity}`;
    return `added ${action.quantity}${size} ${name}`;
  });

  return `Done. I ${readable.join(', ')}.`;
}

function parseOrderIntent(message) {
  const text = normalizeText(message);

  if (!text) {
    return { reply: 'Tell me what you would like to order.', actions: [] };
  }

  if (/\b(clear|empty|reset)\b/.test(text) && /\b(cart|order|basket)\b/.test(text)) {
    return {
      reply: 'I cleared your cart.',
      actions: [{ type: 'clear_cart' }],
    };
  }

  if (/\b(show|view|what|review|total)\b.*\b(cart|order|basket)\b/.test(text)) {
    return { reply: 'Here is your latest cart.', actions: [] };
  }

  const matches = findItemMatches(text);
  const operation = getOperation(text);

  const actions = matches.map((match, index) => {
    const clause = nearestClause(text, match, matches[index + 1]);

    if (operation === 'remove_item') {
      const size = sizeWords.find((candidate) => new RegExp(`\\b${candidate}\\b`).test(clause));
      return {
        type: 'remove_item',
        itemId: match.item.id,
        ...(size ? { size } : {}),
      };
    }

    return {
      type: operation,
      itemId: match.item.id,
      size: getSize(clause, match.item),
      quantity: operation === 'set_item_quantity' ? getSetQuantity(clause) : getQuantity(clause),
    };
  });

  return {
    reply: actionReply(actions),
    actions,
  };
}

module.exports = { parseOrderIntent };
