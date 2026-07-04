const { json } = require("./_shared");

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  return json(200, {
    ok: true,
    package: "combined-socks5-netlify-private",
    status: "online",
    modules: [
      "socks5-http-get",
      "socks5-title-fetcher",
      "socks5-link-queue-crawler",
      "socks5-configurable-client",
      "socks5-recursive-crawl-stubs"
    ],
    endpoints: ["/api/get", "/api/title", "/api/crawl", "/api/client", "/api/phase5"]
  });
};
