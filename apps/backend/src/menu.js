const menu = [
  {
    id: 'spicy-chicken-sandwich',
    name: 'Spicy Chicken Sandwich',
    description: 'Crispy chicken, chili aioli, pickles',
    price: 8.5,
    tags: ['spicy', 'chicken', 'sandwich'],
    options: { size: ['regular', 'large'] },
  },
  {
    id: 'veggie-wrap',
    name: 'Garden Veggie Wrap',
    description: 'Roasted veggies, hummus, herbs',
    price: 7.25,
    tags: ['veggie', 'wrap', 'vegetarian'],
    options: { size: ['regular', 'large'] },
  },
  {
    id: 'truffle-fries',
    name: 'Truffle Fries',
    description: 'Crisp fries, truffle oil, parmesan',
    price: 4.75,
    tags: ['fries', 'side'],
    options: { size: ['regular', 'large'] },
  },
  {
    id: 'water',
    name: 'Water',
    description: 'Still water bottle',
    price: 2,
    tags: ['water', 'drink'],
    options: { size: ['small', 'large'] },
  },
  {
    id: 'cold-brew',
    name: 'Cold Brew',
    description: 'Slow-steeped coffee on ice',
    price: 3.5,
    tags: ['coffee', 'cold', 'brew', 'drink'],
    options: { size: ['small', 'large'] },
  },
];

module.exports = { menu };
