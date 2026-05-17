function normalizeCart(cart = []) {
  return cart
    .filter((item) => item && item.itemId && Number(item.quantity) > 0)
    .map((item) => ({
      itemId: item.itemId,
      quantity: Number(item.quantity),
      size: item.size || 'regular',
    }));
}

function applyActions(cart = [], actions = []) {
  const next = [...normalizeCart(cart)];

  for (const action of actions) {
    if (!action || !action.type) continue;

    if (action.type === 'clear_cart') {
      next.length = 0;
      continue;
    }

    if (!action.itemId) continue;

    const size = action.size;
    const key = `${action.itemId}:${size || 'any'}`;
    const idx = next.findIndex((item) => `${item.itemId}:${item.size}` === key);

    if (action.type === 'add_item') {
      const selectedSize = size || 'regular';
      const quantity = Math.max(1, Number(action.quantity) || 1);
      if (idx === -1) {
        next.push({ itemId: action.itemId, size: selectedSize, quantity });
      } else {
        next[idx].quantity += quantity;
      }
    }

    if (action.type === 'set_item_quantity') {
      const selectedSize = size || 'regular';
      const selectedIdx = next.findIndex((item) => item.itemId === action.itemId && item.size === selectedSize);
      const quantity = Math.max(0, Number(action.quantity) || 0);
      if (quantity === 0 && selectedIdx !== -1) {
        next.splice(selectedIdx, 1);
      }
      if (quantity > 0) {
        if (selectedIdx === -1) {
          next.push({ itemId: action.itemId, size: selectedSize, quantity });
        } else {
          next[selectedIdx].quantity = quantity;
        }
      }
    }

    if (action.type === 'remove_item') {
      if (size) {
        if (idx !== -1) next.splice(idx, 1);
      } else {
        for (let i = next.length - 1; i >= 0; i -= 1) {
          if (next[i].itemId === action.itemId) next.splice(i, 1);
        }
      }
    }
  }

  return next;
}

module.exports = { normalizeCart, applyActions };
