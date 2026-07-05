'use strict';

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const { SocksProxyAgent } = require('socks-proxy-agent');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const MODULES = [
  'socks5-http-get',
  'socks5-title-fetcher',
  'socks5-link-queue-crawler',
  'socks5-configurable-client',
  'socks5-recursive-crawl-stubs'
];

function normalizeUrl(input) {
  if (!input || typeof input !== 'string') throw new Error('URL_MISSING');
  const trimmed = input.trim().replace(/[“”]/g, '"').replace(/"/g, '');
  const url = new URL(trimmed);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('URL_PROTOCOL_NOT_ALLOWED');
  return url.toString();
}

function getProxyUrl(body = {}) {
  return body.proxyUrl || process.env.PROXY_URL || process.env.SOCKS_PROXY_URL || process.env.SOCKS5_PROXY_URL || '';
}

function getAxiosConfig(body = {}) {
  const timeoutMs = Number(body.timeoutMs || body.options?.timeoutMs || process.env.TIMEOUT_MS || 30000);
  const proxyUrl = getProxyUrl(body);
  const config = {
    timeout: Number.isFinite(timeoutMs) ? timeoutMs : 30000,
    maxRedirects: 5,
    validateStatus: () => true,
    headers: {
      'User-Agent': 'SparkSandboxRunner/1.0'
    }
  };
  if (proxyUrl) {
    const agent = new SocksProxyAgent(proxyUrl);
    config.httpAgent = agent;
    config.httpsAgent = agent;
    config.proxy = false;
  }
  return { config, proxyUrl };
}

async function fetchText(url, body = {}) {
  const { config, proxyUrl } = getAxiosConfig(body);
  const res = await axios.get(url, config);
  const data = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
  return { status: res.status, data, proxyUrl };
}

function extractTitle(html) {
  const $ = cheerio.load(html || '');
  return ($('title').first().text() || '').trim();
}

function extractLinks(html, baseUrl, linkPattern) {
  const $ = cheerio.load(html || '');
  const out = [];
  $('a[href]').each((_, el) => {
    try {
      const href = $(el).attr('href');
      const abs = new URL(href, baseUrl).toString();
      if (!linkPattern || abs.includes(linkPattern)) out.push(abs);
    } catch (_) {}
  });
  return [...new Set(out)].slice(0, 50);
}

function readInput(req) {
  return {
    url: req.query.url || req.body?.url,
    linkPattern: req.query.linkPattern || req.body?.linkPattern,
    options: req.body?.options || {},
    proxyUrl: req.body?.proxyUrl || req.query.proxyUrl,
    timeoutMs: req.body?.timeoutMs || req.query.timeoutMs
  };
}

app.get('/', (_req, res) => {
  res.json({ ok: true, package: 'spark-sandbox-runner', status: 'online', endpoints: ['/api/health', '/api/get', '/api/title', '/api/crawl', '/api/client', '/api/phase5'] });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, package: 'spark-sandbox-runner', status: 'online', modules: MODULES, proxyConfigured: Boolean(process.env.PROXY_URL || process.env.SOCKS_PROXY_URL || process.env.SOCKS5_PROXY_URL) });
});

app.all('/api/get', async (req, res) => {
  try {
    const input = readInput(req);
    const url = normalizeUrl(input.url);
    const result = await fetchText(url, input);
    res.json({ ok: true, module: 'socks5-http-get', url, status: result.status, proxyConfigured: Boolean(result.proxyUrl), data: result.data });
  } catch (err) {
    res.status(400).json({ ok: false, module: 'socks5-http-get', error: err.message });
  }
});

app.all('/api/title', async (req, res) => {
  try {
    const input = readInput(req);
    const url = normalizeUrl(input.url);
    const result = await fetchText(url, input);
    res.json({ ok: true, module: 'socks5-title-fetcher', url, status: result.status, proxyConfigured: Boolean(result.proxyUrl), title: extractTitle(result.data) });
  } catch (err) {
    res.status(400).json({ ok: false, module: 'socks5-title-fetcher', error: err.message });
  }
});

app.all('/api/crawl', async (req, res) => {
  try {
    const input = readInput(req);
    const url = normalizeUrl(input.url);
    const linkPattern = input.linkPattern || '';
    const maxPages = Math.min(Number(input.options.maxPages || input.options.limit || 2), 10);
    const queue = [url];
    const seen = new Set();
    const results = [];
    while (queue.length && results.length < maxPages) {
      const next = queue.shift();
      if (!next || seen.has(next)) continue;
      seen.add(next);
      try {
        const fetched = await fetchText(next, input);
        const links = extractLinks(fetched.data, next, linkPattern);
        results.push({ url: next, title: extractTitle(fetched.data), links, error: null });
        for (const link of links) if (!seen.has(link) && queue.length < 25) queue.push(link);
      } catch (err) {
        results.push({ url: next, title: null, links: [], error: err.message });
      }
    }
    res.json({ ok: true, module: 'socks5-link-queue-crawler', url, linkPattern, results });
  } catch (err) {
    res.status(400).json({ ok: false, module: 'socks5-link-queue-crawler', error: err.message });
  }
});

app.all('/api/client', async (req, res) => {
  try {
    const input = readInput(req);
    const url = normalizeUrl(input.url);
    const result = await fetchText(url, input);
    res.json({ ok: true, module: 'socks5-configurable-client', url, proxyUrl: getProxyUrl(input) || null, status: result.status, data: result.data });
  } catch (err) {
    res.status(400).json({ ok: false, module: 'socks5-configurable-client', error: err.message });
  }
});

app.all('/api/phase5', async (req, res) => {
  try {
    const input = readInput(req);
    const url = normalizeUrl(input.url);
    const maxDepth = Math.min(Number(input.options.maxDepth || req.query.maxDepth || 1), 3);
    const fetched = await fetchText(url, input);
    res.json({ ok: true, module: 'socks5-recursive-crawl-stubs', result: { url, depth: 0, ok: true, title: extractTitle(fetched.data), links: extractLinks(fetched.data, url, input.linkPattern || ''), nextDepthWouldBe: 1, maxDepth } });
  } catch (err) {
    res.status(400).json({ ok: false, module: 'socks5-recursive-crawl-stubs', error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Spark Sandbox Runner listening on ${PORT}`);
  });
}

module.exports = app;
