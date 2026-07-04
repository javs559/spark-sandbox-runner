const { crawlOneLevel } = require("../../packages/socks5-link-queue-crawler");
const { json, parseBody, getUrl, validateUrl } = require("./_shared");

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (!["GET", "POST"].includes(event.httpMethod)) return json(405, { ok: false, error: "Method not allowed. Use GET or POST." });
  const body = parseBody(event);
  if (body.parseError) return json(400, { ok: false, error: `Invalid JSON body: ${body.parseError}` });
  const params = event.queryStringParameters || {};
  const url = getUrl(event, body);
  const urlError = validateUrl(url);
  if (urlError) return json(400, { ok: false, error: urlError });
  const linkPattern = body.linkPattern || params.linkPattern || "example";
  const results = await crawlOneLevel(url, { linkPattern });
  return json(200, { ok: true, module: "socks5-link-queue-crawler", url, linkPattern, results });
};
