const { fetchTitleThroughSocks5 } = require("../../packages/socks5-title-fetcher");
const { json, parseBody, getUrl, validateUrl } = require("./_shared");

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (!["GET", "POST"].includes(event.httpMethod)) return json(405, { ok: false, error: "Method not allowed. Use GET or POST." });
  const body = parseBody(event);
  if (body.parseError) return json(400, { ok: false, error: `Invalid JSON body: ${body.parseError}` });
  const url = getUrl(event, body);
  const urlError = validateUrl(url);
  if (urlError) return json(400, { ok: false, error: urlError });
  const title = await fetchTitleThroughSocks5(url);
  return json(200, { ok: true, module: "socks5-title-fetcher", url, title });
};
