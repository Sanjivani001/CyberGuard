#!/usr/bin/env node
// scan_tabs_cdp.js
// Connects to a running Chrome instance via DevTools Protocol (requires Chrome started with --remote-debugging-port=9222)
// Fetches open pages, calls backend /api/scan-url-v2 for each, prints results and optionally reports to /api/report-open-tabs.

const http = require('http');
const https = require('https');

const CDP_LIST_URL = process.env.CDP_URL || 'http://127.0.0.1:9222/json/list';
const BACKEND_HOST = process.env.BACKEND_HOST || 'localhost';
const BACKEND_PORT = process.env.BACKEND_PORT || 5000;

const args = process.argv.slice(2);
const doReport = args.includes('--report') || args.includes('-r');

function getJson(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function postJson(path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const options = {
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { resolve({ success: false, error: 'Invalid JSON' }); }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(data);
    req.end();
  });
}

(async () => {
  console.log('Connecting to Chrome DevTools at', CDP_LIST_URL);
  try {
    const list = await getJson(CDP_LIST_URL);
    if (!Array.isArray(list)) {
      console.error('Unexpected response from CDP list:', list);
      process.exit(1);
    }

    // Filter pages that are user-visible
    const pages = list.filter(p => p.type === 'page' && p.url && (p.url.startsWith('http://') || p.url.startsWith('https://')))
                      .map(p => ({ url: p.url, title: p.title || '' }));

    console.log(`Found ${pages.length} page(s) in Chrome.`);
    pages.forEach((p, i) => console.log(`${i+1}. ${p.title} — ${p.url}`));

    if (pages.length === 0) process.exit(0);

    // Scan each page via backend
    const results = [];
    for (let p of pages) {
      try {
        process.stdout.write(`Scanning: ${p.url} ... `);
        const res = await postJson('/api/scan-url-v2', { url: p.url });
        if (res && res.success && res.data) {
          console.log(`Score: ${res.data.riskScore}`);
          results.push({ url: p.url, title: p.title, riskScore: res.data.riskScore });
        } else {
          console.log('Scan failed');
          results.push({ url: p.url, title: p.title, riskScore: 0 });
        }
      } catch (err) {
        console.log('Error:', err.message || err);
        results.push({ url: p.url, title: p.title, riskScore: 0 });
      }
    }

    if (doReport) {
      console.log('\nReporting scanned tabs to backend /api/report-open-tabs ...');
      try {
        const r = await postJson('/api/report-open-tabs', { tabs: results });
        if (r && r.success) console.log('Report saved, stored:', r.data && r.data.stored);
        else console.warn('Report failed:', r && r.error);
      } catch (err) {
        console.error('Reporting error:', err.message || err);
      }
    }

    console.log('\nDone.');
  } catch (err) {
    console.error('Error connecting to Chrome DevTools or backend:', err.message || err);
    console.error('Make sure Chrome is running with --remote-debugging-port=9222 and backend is running on port', BACKEND_PORT);
    process.exit(1);
  }
})();
