const axios = require("axios");
const { SocksProxyAgent } = require("socks-proxy-agent");

class Socks5HttpClient {
  constructor(options = {}) {
    this.proxyUrl = options.proxyUrl || "socks5h://127.0.0.1:9150";
    this.proxyLifetimeMs = options.proxyLifetimeMs || 5 * 60 * 1000;
    this.userAgents = Array.isArray(options.userAgents) && options.userAgents.length > 0
      ? options.userAgents
      : ["socks5-configurable-client/1.0"];
    this.maxRetries = Number.isInteger(options.maxRetries) ? options.maxRetries : 2;
    this.timeoutMs = options.timeoutMs || 30000;

    this.agentCreatedAt = 0;
    this.agent = null;
    this.userAgentIndex = 0;
  }

  createAgent() {
    this.agent = new SocksProxyAgent(this.proxyUrl);
    this.agentCreatedAt = Date.now();
  }

  getAgent() {
    const agentExpired = !this.agent || Date.now() - this.agentCreatedAt > this.proxyLifetimeMs;

    if (agentExpired) {
      // Placeholder: reconnect or refresh proxy circuit/session here when needed.
      this.createAgent();
    }

    return this.agent;
  }

  getNextUserAgent() {
    const userAgent = this.userAgents[this.userAgentIndex % this.userAgents.length];
    this.userAgentIndex += 1;

    // Placeholder: customize rotation rules here if certain domains need specific headers.
    return userAgent;
  }

  async get(url) {
    let lastError;

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        const agent = this.getAgent();
        const userAgent = this.getNextUserAgent();

        // Placeholder: add per-request logging, metrics, or request policy checks here.
        const response = await axios.get(url, {
          httpAgent: agent,
          httpsAgent: agent,
          timeout: this.timeoutMs,
          responseType: "text",
          headers: {
            "User-Agent": userAgent
          }
        });

        return response.data;
      } catch (error) {
        lastError = error;

        // Placeholder: add backoff, custom retry filtering, or proxy reset behavior here.
        if (attempt >= this.maxRetries) {
          return `Error: ${lastError.message}`;
        }
      }
    }

    return `Error: ${lastError ? lastError.message : "Unknown request failure"}`;
  }
}

async function getThroughSocks5(url, options = {}) {
  const client = new Socks5HttpClient(options);
  return client.get(url);
}

module.exports = {
  Socks5HttpClient,
  getThroughSocks5
};

// Test examples:
// npm install
// npm test
// npm run example -- https://example.com
if (require.main === module) {
  const testUrl = process.argv[2] || "https://example.com";

  const client = new Socks5HttpClient({
    proxyLifetimeMs: 60 * 1000,
    maxRetries: 3,
    timeoutMs: 30000,
    userAgents: [
      "Mozilla/5.0 ExampleClient/1.0",
      "Mozilla/5.0 ExampleClient/2.0",
      "socks5-configurable-client-test/1.0"
    ]
  });

  client.get(testUrl).then((result) => {
    console.log(result);
  });
}
