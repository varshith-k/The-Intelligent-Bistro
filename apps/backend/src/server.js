const express = require('express');
const cors = require('cors');
const { menu } = require('./menu');
const { parseOrderIntent } = require('./nlp');
const { applyActions, normalizeCart } = require('./cart');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/menu', (_req, res) => {
  res.json({ menu });
});

app.post('/assistant', (req, res) => {
  const message = req.body?.message;
  const cart = normalizeCart(req.body?.cart);
  const intent = parseOrderIntent(message);
  const nextCart = applyActions(cart, intent.actions);

  res.json({
    reply: intent.reply,
    actions: intent.actions,
    cart: nextCart,
  });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Intelligent Bistro backend listening on ${port}`);
});
