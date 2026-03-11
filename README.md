# Bioskina Chatbot

Render-ready chatbot service and embeddable widget for `bioskina.com`.

## Local

Run the server from [`server`](./server):

```bash
npm install
npm start
```

Default local URLs:

- `http://localhost:3001/health`
- `http://localhost:3001/demo`
- `http://localhost:3001/widget/loader.js`

For local website previews, start it on port `3000`:

```bash
PORT=3000 npm start
```

## Deploy

- Backend/widget service is intended for Render.
- Static website clones can load the widget from Render with `/widget/loader.js`.
- Required env vars are listed in [`.env.example`](./.env.example).
