function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type"
    },
    body: JSON.stringify(payload, null, 2)
  };
}

function parseBody(event) {
  if (!event.body) return {};
  try { return JSON.parse(event.body); }
  catch (error) { return { parseError: error.message }; }
}

function getUrl(event, body) {
  return body.url || (event.queryStringParameters && event.queryStringParameters.url);
}

function validateUrl(url) {
  if (!url) return "Missing url.";
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return "Only http and https URLs are supported.";
    return null;
  } catch (_) { return "Invalid URL."; }
}

module.exports = { json, parseBody, getUrl, validateUrl };
