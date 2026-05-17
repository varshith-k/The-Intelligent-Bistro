# The Intelligent Bistro

A full-stack ordering experience with:
- **Expo React Native app** (`apps/mobile`) for menu browsing, cart management, and conversational ordering.
- **Node.js backend** (`apps/backend`) for natural-language intent parsing and structured cart actions.

## Run backend
```bash
cd apps/backend
npm install
npm start
```
Backend runs on `http://localhost:3001`.

## Run mobile app
```bash
cd apps/mobile
npm install
npm run web
```
Set `EXPO_PUBLIC_API_URL` if your backend is not on `http://localhost:3001`.

## Test
```bash
cd apps/backend
npm test
```

## Loom walkthrough
Use [`script.md`](./script.md) as the 5-minute walkthrough script for the submission video.
