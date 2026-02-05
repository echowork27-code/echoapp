# 🐋 EchoApp

TON ecosystem aggregator — NFTs, swaps, gifts, all in one place.

## Features

- **Light/Dark Mode** — Automatic Telegram theme sync + manual toggle
- **TON Connect** — Wallet integration
- **NFTs** — Browse via Getgems API (coming)
- **Swap** — Token swaps via Tonnel (coming)
- **Gifts** — Send collectibles (coming)

## Development

```bash
npm install
npm run dev
```

## Deploy

```bash
npm run build
npx gh-pages -d dist
```

Then update the bot menu button to bust cache:
```bash
curl "https://api.telegram.org/bot$TOKEN/setChatMenuButton" \
  -d '{"menu_button":{"type":"web_app","text":"Open","web_app":{"url":"https://echoanna.github.io/echoapp/?v=N"}}}'
```

## Tech Stack

- Vite
- TON Connect UI
- Telegram Mini Apps SDK
