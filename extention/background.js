const BACKEND = 'http://localhost:5000';

// Local URL risk scoring logic (V2 Enhanced — improved weighted feature model)
function calculateUrlRiskScoreV2(urlString) {
  const breakdown = {};
  let total = 0;
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    const path = url.pathname || '/';
    const full = urlString.toLowerCase();

    // scheme
    breakdown.scheme = url.protocol === 'http:' ? 30 : 0; total += breakdown.scheme;

    // suspicious keywords (expanded)
    const suspiciousKeywords = ['login','verify','confirm','update','account','security','authenticate','bank','paypal','secure','reset','password','signin','sign-in','auth','credential'];
    let kwMatches = 0; suspiciousKeywords.forEach(k=>{ if (full.includes(k)) kwMatches++; });
    breakdown.keywordScore = Math.min(45, kwMatches * 10); total += breakdown.keywordScore;

    // tld (expanded list)
    const suspiciousTLDs = ['.xyz','.top','.info','.click','.download','.online','.site','.space','.icu','.bid','.date','.work','.pw','.tk','.ml','.cf'];
    breakdown.tld = suspiciousTLDs.some(t=>hostname.endsWith(t)) ? 30 : 0; total += breakdown.tld;

    // subdomain depth and hostname length
    const parts = hostname.split('.').filter(Boolean);
    breakdown.subdomainDepth = Math.max(0, parts.length - 2) * 5; total += breakdown.subdomainDepth;
    breakdown.hostLen = (hostname.length>50 || hostname.length<3) ? 15 : 0; total += breakdown.hostLen;

    // ip hostname
    breakdown.ipHostname = /^\d+\.\d+\.\d+\.\d+$/.test(hostname) ? 25 : 0; total += breakdown.ipHostname;

    // url shorteners (risky redirect services)
    const shortenerDomains = ['bit.ly', 'tinyurl.com', 'ow.ly', 'short.link', 'qr.net', 'goo.gl', 'shortz.com', 'u.to'];
    breakdown.shortenerDomain = shortenerDomains.some(s=>hostname.includes(s)) ? 35 : 0; total += breakdown.shortenerDomain;

    // dangerous file downloads
    const dangerousExtensions = ['.exe', '.bat', '.com', '.scr', '.zip', '.rar', '.dmg', '.msi', '.apk', '.iso'];
    breakdown.dangerousFile = dangerousExtensions.some(ext=>full.includes(ext)) ? 40 : 0; total += breakdown.dangerousFile;

    // path entropy
    const freq = {}; for (let ch of path) freq[ch] = (freq[ch]||0)+1; let entropy=0; const plen = path.length||1; for (let k in freq){ const p=freq[k]/plen; entropy -= p*Math.log2(p);} breakdown.pathEntropy = Math.round(entropy*10)/10; breakdown.pathEntropyScore = entropy>4?20:(entropy>3?10:0); total += breakdown.pathEntropyScore;

    // encoded or many params
    const queryParams = url.search? url.search.split('&').length : 0; breakdown.encodedOrParams = (full.includes('%') || queryParams>3) ? 15 : 0; total += breakdown.encodedOrParams;

    // punycode
    breakdown.punycode = hostname.includes('xn--') ? 30 : 0; total += breakdown.punycode;

    // whitelist bonus (reduces score for known safe sites)
    const whitelistDomains = ['google.com', 'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'github.com', 'stackoverflow.com', 'wikipedia.org', 'amazon.com', 'microsoft.com'];
    breakdown.whitelistBonus = whitelistDomains.some(w=>hostname.includes(w)) ? -15 : 0; total += breakdown.whitelistBonus;

    // short name
    breakdown.shortName = hostname.length<4 ? 10 : 0; total += breakdown.shortName;

  } catch (err) {
    console.warn('[calculateUrlRiskScoreV2] parse error', err && err.message);
    breakdown.error = err && err.message;
  }
  const maxPossible = 325; const raw = Math.min(total, maxPossible); const score = Math.min(100, Math.round((raw/maxPossible)*100));
  return { score, breakdown };
}

// Backwards-compatible wrapper that returns number only
function calculateUrlRiskScore(urlString) {
  return calculateUrlRiskScoreV2(urlString).score;
}

async function scanTabUrl(url) {
  // Try backend first; if it fails, fall back to the local heuristic
  try {
    console.log(new Date().toISOString(), '[scanTabUrl] Scanning via backend:', url);
    const res = await fetch(BACKEND + '/api/scan-url-v2', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url })
    });
    const data = await res.json();
    if (data && data.success && data.data && typeof data.data.riskScore === 'number') {
      console.log(new Date().toISOString(), '[scanTabUrl] Backend returned score:', data.data.riskScore, 'for', url);
      return { url, riskScore: data.data.riskScore, raw: data.data.raw || null };
    }
    // If backend returns unexpected response, fall back
    console.warn(new Date().toISOString(), '[scanTabUrl] Backend returned unexpected response, falling back to local score');
  } catch (e) {
    console.warn(new Date().toISOString(), '[scanTabUrl] Backend scan failed, falling back to local score:', e && e.message);
  }

  // Local heuristic
  try {
    const localScore = calculateUrlRiskScore(url);
    console.log(new Date().toISOString(), '[scanTabUrl] Local heuristic score:', localScore, 'for', url);
    return { url, riskScore: localScore, raw: null };
  } catch (err) {
    console.error(new Date().toISOString(), '[scanTabUrl] Local scan failed:', err && err.message);
    return { url, riskScore: 0, raw: null };
  }
}

// Report current open tabs to backend so the UI can show them + their latest risk score
async function reportOpenTabs(tabs) {
  // tabs expected to be enriched: { url, title, riskScore }
  try {
    const payload = { tabs: tabs.map(t => ({ url: t.url, title: t.title || '', riskScore: t.riskScore })) };
    console.log('[reportOpenTabs] Reporting', payload.tabs.length, 'tabs to backend');
    const res = await fetch(BACKEND + '/api/report-open-tabs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log('[reportOpenTabs] Response:', data);
  } catch (e) {
    console.warn('[reportOpenTabs] Error reporting to backend (may be offline):', e && e.message);
  }
}

// Scan and report open tabs
async function triggerScanAndReportOpenTabs() {
  try {
    console.log(new Date().toISOString(), '[triggerScanAndReportOpenTabs] Starting...');
      const tabs = await chrome.tabs.query({});
      console.log(new Date().toISOString(), '[triggerScanAndReportOpenTabs] Found', tabs.length, 'total tabs');
      const toScan = tabs.filter(t => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://'));

      // Scan all tabs concurrently and collect risk scores
      const scanPromises = toScan.map(async (t) => {
        try {
          const r = await scanTabUrl(t.url);
          const risk = r && typeof r.riskScore === 'number' ? r.riskScore : 0;
          console.log(new Date().toISOString(), '[triggerScanAndReportOpenTabs] Scanned', t.url, '=>', risk);
          return { url: t.url, title: t.title || '', riskScore: risk };
        } catch (e) {
          console.error(new Date().toISOString(), '[triggerScanAndReportOpenTabs] scan error for', t.url, e && e.message);
          return { url: t.url, title: t.title || '', riskScore: 0 };
        }
      });

      const enriched = await Promise.all(scanPromises);
      console.log(new Date().toISOString(), '[triggerScanAndReportOpenTabs] Reporting', enriched.length, 'tabs (with scores)');
      // Attempt to report to backend, but don't block returning to the caller
      reportOpenTabs(enriched).catch(() => {});
    console.log('[triggerScanAndReportOpenTabs] Done');
    return enriched;
  } catch (e) {
    console.error(new Date().toISOString(), '[triggerScanAndReportOpenTabs] Error:', e && e.message);
  }
}

// On extension install/update, scan and report tabs
chrome.runtime.onInstalled.addListener(() => {
  console.log('[onInstalled] Extension installed, triggering initial scan...');
  // Fire-and-forget initial scan (do not require response)
  triggerScanAndReportOpenTabs().then((enriched) => {
    console.log('[onInstalled] Initial scan completed, found', (enriched && enriched.length) || 0, 'tabs');
  }).catch(err => console.warn('[onInstalled] Initial scan error', err && err.message));
});

// Listen for tab changes and report automatically (debounced)
let tabChangeTimer = null;
function scheduleTabsReport(delay = 1200) {
  if (tabChangeTimer) clearTimeout(tabChangeTimer);
  tabChangeTimer = setTimeout(async () => {
    try {
      console.log(new Date().toISOString(), '[tabs] Detected change - scanning and reporting open tabs');
      const enriched = await triggerScanAndReportOpenTabs();
      console.log(new Date().toISOString(), '[tabs] Reported', (enriched && enriched.length) || 0, 'tabs');
    } catch (err) {
      console.error(new Date().toISOString(), '[tabs] scheduleTabsReport error:', err && err.message);
    }
  }, delay);
}

// Register listeners - onCreated, onRemoved, onUpdated (URL changes)
if (chrome && chrome.tabs && chrome.tabs.onCreated) {
  chrome.tabs.onCreated.addListener(() => scheduleTabsReport());
}
if (chrome && chrome.tabs && chrome.tabs.onRemoved) {
  chrome.tabs.onRemoved.addListener(() => scheduleTabsReport());
}
if (chrome && chrome.tabs && chrome.tabs.onUpdated) {
  // onUpdated provides changeInfo — only schedule when URL changes or status complete
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo && (changeInfo.url || changeInfo.status === 'complete')) {
      scheduleTabsReport();
    }
  });
}

// On message from popup, scan and report tabs (single listener only)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.cmd === 'scanOpenTabs') {
    console.log('[onMessage] scanOpenTabs requested from popup');
    triggerScanAndReportOpenTabs()
      .then((enriched) => {
        console.log('[onMessage] scan complete, sending enriched results');
        sendResponse({ ok: true, tabs: enriched });
      })
      .catch(err => {
        console.error('[onMessage] scan error:', err);
        sendResponse({ ok: false, error: err && err.message });
      });
    return true; // keep channel open for async response
  }
  
  // New: accept a pre-populated list of tabs from the popup and scan them
  if (msg && msg.cmd === 'scanUrls' && Array.isArray(msg.tabs)) {
    console.log('[onMessage] scanUrls requested, received', msg.tabs.length, 'tabs');
    (async () => {
      try {
        const scanPromises = msg.tabs.map(async (t) => {
          try {
            const r = await scanTabUrl(t.url);
            const risk = r && typeof r.riskScore === 'number' ? r.riskScore : 0;
            return { url: t.url, title: t.title || '', riskScore: risk };
          } catch (e) {
            console.error('[scanUrls] scan error for', t.url, e && e.message);
            return { url: t.url, title: t.title || '', riskScore: 0 };
          }
        });
        const enriched = await Promise.all(scanPromises);
        // Attempt to report to backend but do not block response
        reportOpenTabs(enriched).catch(() => {});
        sendResponse({ ok: true, tabs: enriched });
      } catch (err) {
        console.error('[onMessage] scanUrls error:', err && err.message);
        sendResponse({ ok: false, error: err && err.message });
      }
    })();
    return true; // indicate we'll respond asynchronously
  }
});
