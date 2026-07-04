const { getThroughSocks5 } = require("../../packages/socks5-configurable-client");
const { json, parseBody, getUrl, validateUrl } = require("./_shared");

function normalizeOptions(input = {}) {
  const options = {};
  options.proxyUrl = process.env.SOCKS5_PROXY_URL || input.proxyUrl || "socks5h://127.0.0.1:9150";
  if (Number.isInteger(input.proxyLifetimeMs)) options.proxyLifetimeMs = input.proxyLifetimeMs;
  if (Number.isInteger(input.maxRetries)) options.maxRetries = input.maxRetries;
  if (Number.isInteger(input.timeoutMs)) options.timeoutMs = input.timeoutMs;
  if (Array.isArray(input.userAgents) && input.userAgents.length > 0) options.userAgents = input.userAgents;
  return options;
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (!["GET", "POST"].includes(event.httpMethod)) return json(405, { ok: false, error: "Method not allowed. Use GET or POST." });
  const body = parseBody(event);
  if (body.parseError) return json(400, { ok: false, error: `Invalid JSON body: ${body.parseError}` });
  const url = getUrl(event, body);
  const urlError = validateUrl(url);
  if (urlError) return json(400, { ok: false, error: urlError });
  const options = normalizeOptions(body.options || {});
  const data = await getThroughSocks5(url, options);
  return json(200, { ok: true, module: "socks5-configurable-client", url, proxyUrl: options.proxyUrl, data });
};
