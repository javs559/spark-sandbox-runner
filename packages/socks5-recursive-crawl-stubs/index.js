const axios = require("axios");
const cheerio = require("cheerio");
const { SocksProxyAgent } = require("socks-proxy-agent");

const DEFAULT_PROXY = "socks5h://127.0.0.1:9150";

function createHttpClient(proxyUrl = DEFAULT_PROXY) {
  const proxyAgent = new SocksProxyAgent(proxyUrl);

  return axios.create({
    httpAgent: proxyAgent,
    httpsAgent: proxyAgent,
    timeout: 30000,
    responseType: "text",
    headers: {
      "User-Agent": "socks5-recursive-crawl-stubs/1.0"
    }
  });
}

async function fetchHtml(url, client = createHttpClient()) {
  try {
    const response = await client.get(url);
    return {
      ok: true,
      html: response.data
    };
  } catch (error) {
    return {
      ok: false,
      error: `Error fetching ${url}: ${error.message}`
    };
  }
}

function extractLinks(html, baseUrl) {
  const $ = cheerio.load(html);
  const links = [];

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");

    if (!href) return;

    try {
      const absoluteUrl = new URL(href, baseUrl).toString();
      links.push(absoluteUrl);
    } catch (_) {
      // Ignore malformed or unsupported href values.
    }
  });

  return [...new Set(links)];
}

function extractTitle(html) {
  const $ = cheerio.load(html);
  return $("title").first().text().trim() || "Untitled page";
}

async function crawl(url, currentDepth = 0, maxDepth = 1, options = {}) {
  const client = options.client || createHttpClient(options.proxyUrl || DEFAULT_PROXY);

  if (currentDepth > maxDepth) {
    return {
      url,
      depth: currentDepth,
      skipped: true,
      reason: "Current depth exceeds max depth."
    };
  }

  const fetchResult = await fetchHtml(url, client);

  if (!fetchResult.ok) {
    return {
      url,
      depth: currentDepth,
      ok: false,
      error: fetchResult.error
    };
  }

  const title = extractTitle(fetchResult.html);
  const links = extractLinks(fetchResult.html, url);

  console.log(`[depth ${currentDepth}] ${url}`);
  console.log(`Title: ${title}`);
  console.log(`Extracted links: ${links.length}`);

  // Placeholder for future recursive crawling:
  // if (currentDepth < maxDepth) {
  //   for (const nextUrl of links) {
  //     await crawl(nextUrl, currentDepth + 1, maxDepth, { client });
  //   }
  // }
  //
  // This package intentionally demonstrates invocation with a depth limit
  // without enabling full recursive logic.

  return {
    url,
    depth: currentDepth,
    ok: true,
    title,
    links,
    nextDepthWouldBe: currentDepth + 1,
    maxDepth
  };
}

module.exports = {
  crawl,
  fetchHtml,
  extractLinks,
  extractTitle,
  createHttpClient
};

if (require.main === module) {
  const inputUrl = process.argv[2] || "https://example.com";
  const maxDepth = Number.parseInt(process.argv[3] || "1", 10);

  crawl(inputUrl, 0, maxDepth)
    .then((result) => {
      console.log("\nCrawl result:");
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error("Unexpected error:", error.message);
      process.exitCode = 1;
    });
}
