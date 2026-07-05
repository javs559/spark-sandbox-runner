# Spark Sandbox Runner — Railway Ready

Railway-native Node.js service for Spark tool calls.

## Endpoints

- `GET /api/health`
- `GET|POST /api/get`
- `GET|POST /api/title`
- `GET|POST /api/crawl`
- `GET|POST /api/client`
- `GET|POST /api/phase5`

Example:

```text
/api/title?url=https://example.com
```

## Optional proxy variables

Set one of these if you have a reachable SOCKS proxy:

```text
PROXY_URL=socks5h://host:port
SOCKS_PROXY_URL=socks5h://host:port
SOCKS5_PROXY_URL=socks5h://host:port
```

Without a proxy variable, the service fetches directly.
