'use strict';

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const { SocksProxyAgent } = require('socks-proxy-agent');
const net = require('net');

const app = express();
app.use(cors());

app.use(express.json({ limit: '1mb' }));

const SERVICE_MARKER = 'SPARK_V198_TOR_ENFORCED_SANDBOX_RUNNER_V1';
const DEFAULT_TOR_PROXY_URL = 'socks5h://127.0.0.1:9050';
const TOR_REQUIRED = String(process.env.TOR_REQUIRED || 'true').toLowerCase() !== 'false';
const TOR_PROXY_URL =
  process.env.SOCKS5_PROXY_URL ||
  process.env.SOCKS_PROXY_URL ||
  process.env.PROXY_URL ||
  DEFAULT_TOR_PROXY_URL;


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
  const requested = body.proxyUrl || body.options?.proxyUrl || '';
  const proxyUrl = requested || TOR_PROXY_URL;
  if (TOR_REQUIRED && !proxyUrl) throw new Error('TOR_PROXY_REQUIRED');
  if (TOR_REQUIRED && !/^socks5h?:\/\//i.test(proxyUrl)) {
    throw new Error('TOR_PROXY_URL_MUST_USE_SOCKS5_OR_SOCKS5H');
  }
  return proxyUrl;
}

function getAxiosConfig(body = {}) {
  const timeoutMs = Number(body.timeoutMs || body.options?.timeoutMs || process.env.TIMEOUT_MS || 30000);
  const proxyUrl = getProxyUrl(body);
  const config = {
    timeout: Number.isFinite(timeoutMs) ? timeoutMs : 30000,
    maxRedirects: 5,
    validateStatus: () => true,
    headers: {
      'User-Agent': 'SparkSandboxRunner/1.0',
      'Accept': 'application/json,text/plain,text/html,application/rss+xml,application/xml,*/*',
      ...(body.headers && typeof body.headers === 'object' ? body.headers : {}),
      ...(body.options?.headers && typeof body.options.headers === 'object' ? body.options.headers : {})
    }
  };
  if (!proxyUrl) throw new Error('TOR_PROXY_REQUIRED');
  const agent = new SocksProxyAgent(proxyUrl);
  config.httpAgent = agent;
  config.httpsAgent = agent;
  config.proxy = false;
  return { config, proxyUrl };
}

async function fetchText(url, body = {}) {
  const { config, proxyUrl } = getAxiosConfig(body);
  const res = await axios.get(url, config);
  const data = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
  return {
    status: res.status,
    data,
    proxyUrl,
    finalUrl: res.request?.res?.responseUrl || url,
    headers: res.headers || {}
  };
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
    timeoutMs: req.body?.timeoutMs || req.query.timeoutMs,
    headers: req.body?.headers || req.body?.request_headers || {}
  };
}


function checkPort(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

async function torReady() {
  return await checkPort('127.0.0.1', 9050);
}

app.get('/', (_req, res) => {
  res.json({ ok: true, package: 'spark-sandbox-runner', status: 'online', endpoints: ['/api/health', '/api/get', '/api/title', '/api/crawl', '/api/client', '/api/phase5'] });
});

app.get('/api/health', async (_req, res) => {
  const ready = await torReady();
  const status = ready ? 200 : 503;
  res.status(status).json({
    ok: ready,
    marker: SERVICE_MARKER,
    package: 'spark-sandbox-runner',
    status: ready ? 'online' : 'tor-not-ready',
    modules: MODULES,
    torRequired: TOR_REQUIRED,
    torReady: ready,
    proxyConfigured: true,
    proxyUrl: TOR_PROXY_URL,
    directFallbackAllowed: false
  });
});

app.all('/api/get', async (req, res) => {
  try {
    const input = readInput(req);
    const url = normalizeUrl(input.url);
    const result = await fetchText(url, input);
    res.json({
      ok: true,
      marker: SERVICE_MARKER,
      module: 'socks5-http-get',
      url,
      finalUrl: result.finalUrl,
      status: result.status,
      statusCode: result.status,
      headers: result.headers,
      proxyConfigured: true,
      proxyUrl: result.proxyUrl,
      transport: 'tor-socks5h',
      torRequired: TOR_REQUIRED,
      directFallbackUsed: false,
      body: result.data,
      rawBody: result.data,
      data: result.data
    });
  } catch (err) {
    res.status(502).json({
      ok: false,
      marker: SERVICE_MARKER,
      module: 'socks5-http-get',
      transport: 'tor-socks5h',
      torRequired: TOR_REQUIRED,
      directFallbackUsed: false,
      error: err.message
    });
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
