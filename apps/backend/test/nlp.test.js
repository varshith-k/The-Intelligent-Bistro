const test = require('node:test');
const assert = require('node:assert/strict');
const { parseOrderIntent } = require('../src/nlp');
const { applyActions } = require('../src/cart');

test('parses mixed quantity and size add command into structured cart actions', () => {
  const intent = parseOrderIntent('Add two spicy chicken sandwich and a large water');

  assert.equal(intent.actions.length, 1);
  assert.deepEqual(intent.actions[0], {
    type: 'add_item',
    itemId: 'spicy-chicken-sandwich',
    size: 'large',
    quantity: 2,
  });
});

test('updates cart when applyActions receives add and remove actions', () => {
  const initialCart = [{ itemId: 'spicy-chicken-sandwich', size: 'regular', quantity: 1 }];
  const add = parseOrderIntent('add one large water');
  const afterAdd = applyActions(initialCart, add.actions);

  assert.deepEqual(afterAdd, [
    { itemId: 'spicy-chicken-sandwich', size: 'regular', quantity: 1 },
    { itemId: 'water', size: 'large', quantity: 1 },
  ]);

  const remove = parseOrderIntent('remove spicy chicken sandwich');
  const afterRemove = applyActions(afterAdd, remove.actions);
  assert.deepEqual(afterRemove, [{ itemId: 'water', size: 'large', quantity: 1 }]);
});
