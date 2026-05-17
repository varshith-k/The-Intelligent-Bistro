# 5-Minute Loom Script: The Intelligent Bistro

## 0:00-0:30 - Intro
Hi, this is The Intelligent Bistro, a React Native Expo app with a Node.js backend. The goal is to make restaurant ordering feel natural: customers can browse visually, manage a cart manually, or talk to an AI concierge that turns plain English into structured cart actions.

## 0:30-1:30 - UI Experience and Usability
Start on the mobile app home screen. Point out the premium bistro styling, the AI concierge panel, quick prompt chips, menu cards, size selectors, and the persistent cart summary.

Demonstrate adding an item manually:
- Pick a menu item.
- Toggle between regular, large, or small when available.
- Tap Add.
- Show that the cart updates quantity, line total, subtotal, service fee, and final total.

Then demonstrate cart controls:
- Increase quantity with the plus button.
- Decrease quantity with the minus button.
- Use Clear to reset the order.

## 1:30-3:10 - AI-Driven Cart Interactions
Move to the AI Concierge section and explain that the backend receives a natural-language message plus the current cart, then returns JSON actions and the updated cart.

Demo prompt 1:
`Add two spicy chicken sandwiches and a large water`

Show that the assistant responds conversationally and the cart receives two structured actions:
- Add 2 regular spicy chicken sandwiches.
- Add 1 large water.

Demo prompt 2:
`Set truffle fries to 2`

Show the fries being added or updated to quantity 2.

Demo prompt 3:
`Remove water`

Show that water is removed from the cart.

Demo prompt 4:
`Clear my cart`

Show the cart returning to an empty state.

Mention that this proves the assistant supports adding, removing, modifying quantities, clearing the cart, and processing multiple menu items in one sentence.

## 3:10-4:15 - Backend and Structured JSON
Switch to the code. Start with `apps/backend/src/server.js`.

Explain:
- `GET /menu` returns the restaurant menu.
- `POST /assistant` accepts `{ message, cart }`.
- The server normalizes the cart, parses the message with `parseOrderIntent`, applies the actions, and returns `{ reply, actions, cart }`.

Open `apps/backend/src/nlp.js`.

Explain:
- The parser normalizes text and matches menu aliases.
- It detects operations like add, remove, set, and clear.
- It extracts quantity and size.
- It can split one message into multiple actions, which is the key conversational requirement.

Open `apps/backend/src/cart.js`.

Explain:
- `applyActions` is the deterministic cart engine.
- It adds items, sets quantities, removes either a specific size or all sizes of an item, and clears the cart.

## 4:15-4:45 - Frontend Code Structure
Open `apps/mobile/App.tsx`.

Explain:
- The app fetches menu data from the backend but includes a fallback menu for resilience.
- React state manages menu, cart, selected sizes, chat messages, loading state, and the last structured assistant actions.
- Manual UI interactions and AI responses both update the same cart state, so the experience stays consistent.

## 4:45-5:00 - AI Tools Used and Wrap-Up
Close by saying:
I used AI coding assistance to move quickly through implementation, especially for parser coverage, UI polish, and verification. The final project includes a runnable Expo frontend, a Node.js backend, backend tests, and this Loom script. The result is an end-to-end ordering experience where conversational AI and direct UI controls work together against the same cart model.
