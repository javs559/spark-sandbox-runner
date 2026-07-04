const axios = require("axios");
const { SocksProxyAgent } = require("socks-proxy-agent");

const DEFAULT_PROXY = process.env.SOCKS5_PROXY || "socks5h://127.0.0.1:9150";

async function getThroughSocks5(url, proxyUrl = DEFAULT_PROXY) {
  try {
    if (!url) {
      return "Error: URL is required";
    }

    const agent = new SocksProxyAgent(proxyUrl);

    const response = await axios.get(url, {
      httpAgent: agent,
      httpsAgent: agent,
      timeout: 15000,
      responseType: "text",
      transformResponse: [(data) => data]
    });

    return response.data;
  } catch (error) {
    return `Error fetching ${url}: ${error.message}`;
  }
}

module.exports = { getThroughSocks5 };

if (require.main === module) {
  const testUrl = process.argv[2] || "http://example.com";

  getThroughSocks5(testUrl)
    .then((body) => {
      console.log(body);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
