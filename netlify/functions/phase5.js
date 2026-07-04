const { crawl } = require("../../packages/socks5-recursive-crawl-stubs");
const { json, parseBody, getUrl, validateUrl } = require("./_shared");

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (!["GET", "POST"].includes(event.httpMethod)) return json(405, { ok: false, error: "Method not allowed. Use GET or POST." });
  const body = parseBody(event);
  if (body.parseError) return json(400, { ok: false, error: `Invalid JSON body: ${body.parseError}` });
  const params = event.queryStringParameters || {};
  const url = getUrl(event, body);
  if (!url) {
    return json(200, { ok: true, module: "socks5-recursive-crawl-stubs", status: "standalone Netlify wrapper ready", method: event.httpMethod });
  }
  const urlError = validateUrl(url);
  if (urlError) return json(400, { ok: false, error: urlError });
  const maxDepth = Number.parseInt(body.maxDepth || params.maxDepth || "1", 10);
  const result = await crawl(url, 0, Number.isFinite(maxDepth) ? maxDepth : 1, { proxyUrl: process.env.SOCKS5_PROXY_URL });
  return json(200, { ok: true, module: "socks5-recursive-crawl-stubs", result });
};
