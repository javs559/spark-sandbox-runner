# socks5-configurable-client-netlify-ready

This is the standalone Netlify wrapper for the `socks5-configurable-client` core module.

The core client logic stays in `index.js`. The Netlify wrapper lives in `netlify/functions/client.js` and imports the core module instead of duplicating it.

## Files

```text
socks5-configurable-client-netlify-ready/
├── index.html
├── index.js
├── package.json
├── netlify.toml
├── README.md
└── netlify/
    └── functions/
        └── client.js
```

## Local install

```bash
npm install
npm run dev
```

## Netlify deploy

Upload this folder or ZIP to Netlify.

Netlify will publish the static page and expose the function at:

```text
/api/client
/.netlify/functions/client
```

## API usage

POST JSON:

```bash
curl -X POST http://localhost:8888/api/client \
  -H "content-type: application/json" \
  -d '{"url":"https://example.com","options":{"maxRetries":2,"timeoutMs":30000}}'
```

GET query:

```text
/api/client?url=https://example.com
```

## Proxy configuration

By default, the core client uses:

```text
socks5h://127.0.0.1:9150
```

You can override it in Netlify with this environment variable:

```text
SOCKS5_PROXY_URL=socks5h://127.0.0.1:9150
```

Important: Netlify cloud functions do not automatically include a local SOCKS5 proxy. The wrapper is deployable, but successful proxy requests require a reachable SOCKS5 proxy from the runtime environment.
