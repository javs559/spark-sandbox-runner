'use strict';

const assert = require('assert');
const app = require('./server');
const { normalizeUrl, getProxyUrl, getAxiosConfig } = app._contract;

assert.throws(() => normalizeUrl(''), /URL_MISSING/);
assert.throws(() => normalizeUrl('file:\/\/etc\/passwd'), /URL_PROTOCOL_NOT_ALLOWED/);
assert.throws(() => getProxyUrl({ proxyUrl: 'socks5h:\/\/example.test:9050' }), /REQUEST_PROXY_OVERRIDE_FORBIDDEN/);
assert.throws(() => getProxyUrl({ options: { proxyUrl: 'http:\/\/example.test' } }), /REQUEST_PROXY_OVERRIDE_FORBIDDEN/);

const { config, proxyUrl } = getAxiosConfig({});
assert.strictEqual(proxyUrl, 'socks5h:\/\/127.0.0.1:9050');
assert.strictEqual(config.proxy, false);
assert.strictEqual(config.httpAgent, config.httpsAgent);
assert.strictEqual(config.httpAgent.shouldLookup, false);
assert.strictEqual(config.responseType, 'text');
assert.strictEqual(config.transformResponse[0]('{"looks":"json"}'), '{"looks":"json"}');

const routes = app._router.stack.filter((layer) => layer.route).map((layer) => ({
  path: layer.route.path,
  methods: Object.keys(layer.route.methods).sort()
}));
for (const path of ['/health', '/api/health']) assert(routes.some((route) => route.path === path));
const getRoute = routes.find((route) => route.path === '/api/get');
assert(getRoute.methods.includes('get'));
assert(getRoute.methods.includes('post'));

console.log('sandbox contract tests passed');
