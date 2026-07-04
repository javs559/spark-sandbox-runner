const axios = require("axios");
const cheerio = require("cheerio");
const { SocksProxyAgent } = require("socks-proxy-agent");

const proxyAgent = new SocksProxyAgent("socks5h://127.0.0.1:9150");

async function fetchTitleThroughSocks5(url) {
  try {
    if (typeof url !== "string" || !url.trim()) {
      return "Error: URL must be a non-empty string";
    }

    const response = await axios.get(url, {
      httpAgent: proxyAgent,
      httpsAgent: proxyAgent,
      timeout: 30000,
      responseType: "text"
    });

    const $ = cheerio.load(response.data);
    const title = $("title").first().text().trim();

    return title || "Error: No <title> tag found";
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

module.exports = {
  fetchTitleThroughSocks5
};

// Direct test:
// npm install
// npm test -- https://example.com
if (require.main === module) {
  const testUrl = process.argv[2] || "https://example.com";

  fetchTitleThroughSocks5(testUrl).then((result) => {
    console.log(result);
  });
}
