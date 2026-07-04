const axios = require("axios");
const cheerio = require("cheerio");
const { SocksProxyAgent } = require("socks-proxy-agent");

const proxyAgent = new SocksProxyAgent("socks5h://127.0.0.1:9150");

function normalizeUrl(href, baseUrl) {
  try {
    return new URL(href, baseUrl).toString();
  } catch (_) {
    return null;
  }
}

async function fetchHtmlThroughSocks5(url) {
  const response = await axios.get(url, {
    httpAgent: proxyAgent,
    httpsAgent: proxyAgent,
    timeout: 30000,
    responseType: "text",
    headers: {
      "User-Agent": "socks5-link-queue-crawler/1.0"
    }
  });

  return response.data;
}

function extractTitleAndLinks(html, pageUrl, linkPattern = "example") {
  const $ = cheerio.load(html);
  const title = ($("title").first().text() || "").trim();
  const links = [];

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    const absoluteUrl = normalizeUrl(href, pageUrl);

    if (absoluteUrl && absoluteUrl.includes(linkPattern)) {
      links.push(absoluteUrl);
    }
  });

  return {
    title,
    links: [...new Set(links)]
  };
}

async function crawlOneLevel(startUrl, options = {}) {
  const linkPattern = options.linkPattern || "example";
  const queue = [{ url: startUrl, depth: 0 }];
  const visited = new Set();
  const results = [];

  while (queue.length > 0) {
    const current = queue.shift();

    if (visited.has(current.url) || current.depth > 1) {
      continue;
    }

    visited.add(current.url);

    try {
      const html = await fetchHtmlThroughSocks5(current.url);
      const { title, links } = extractTitleAndLinks(html, current.url, linkPattern);

      console.log(`Visited: ${current.url}`);
      console.log(`Title: ${title || "(no title found)"}`);

      results.push({
        url: current.url,
        title,
        links,
        error: null
      });

      if (current.depth === 0) {
        for (const link of links) {
          if (!visited.has(link)) {
            queue.push({ url: link, depth: 1 });
          }
        }
      }
    } catch (error) {
      const message = `Error fetching ${current.url}: ${error.message}`;
      console.log(message);

      results.push({
        url: current.url,
        title: null,
        links: [],
        error: message
      });
    }
  }

  return results;
}

module.exports = {
  crawlOneLevel,
  fetchHtmlThroughSocks5,
  extractTitleAndLinks
};

if (require.main === module) {
  const startUrl = process.argv[2] || "https://example.com";

  crawlOneLevel(startUrl)
    .then((results) => {
      console.log("\nCrawl complete:");
      console.log(JSON.stringify(results, null, 2));
    })
    .catch((error) => {
      console.error(`Crawler failed: ${error.message}`);
      process.exit(1);
    });
}
