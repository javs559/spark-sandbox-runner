# combined-socks5-netlify-private

Private combined Netlify package for the five SOCKS5 modules.

Each original core module remains separated under `packages/` so the code stays modular:

- `packages/socks5-http-get`
- `packages/socks5-title-fetcher`
- `packages/socks5-link-queue-crawler`
- `packages/socks5-configurable-client`
- `packages/socks5-recursive-crawl-stubs`

The combined Netlify wrapper exposes unique routes:

- `/api/health`
- `/api/get`
- `/api/title`
- `/api/crawl`
- `/api/client`
- `/api/phase5`

## Deploy

Upload this ZIP/folder to Netlify.

## Local run

```bash
npm install
npm run dev
```

## Important runtime note

The modules default to `socks5h://127.0.0.1:9150`. Netlify cloud functions do not automatically include a local SOCKS5 proxy. The app deploys, but live proxy fetches require a SOCKS5 proxy reachable from the function runtime. You can set:

```text
SOCKS5_PROXY_URL=socks5h://127.0.0.1:9150
```
