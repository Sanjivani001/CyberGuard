const BACKEND = 'http://localhost:5000';

async function scanTabUrl(url) {
  try {
    console.log('[scanTabUrl] Scanning:', url);
    const res = await fetch(BACKEND + '/api/scan-url', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ url })
    });
    const data = await res.json();
    console.log('[scanTabUrl] Result for', url, ':', data);
    return data;
  } catch (e) { 
    console.error('[scanTabUrl] Error scanning', url, ':', e); 
    return null; 
  }
}

// Report current open tabs to backend so the UI can show them + their latest risk score
async function reportOpenTabs(tabs) {
  try {
    const payload = { tabs: tabs.map(t => ({ url: t.url, title: t.title || '' })) };
    console.log('[reportOpenTabs] Reporting', payload.tabs.length, 'tabs to backend');
    const res = await fetch(BACKEND + '/api/report-open-tabs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log('[reportOpenTabs] Response:', data);
  } catch (e) { 
    console.error('[reportOpenTabs] Error:', e); 
  }
}

// Scan and report open tabs
async function triggerScanAndReportOpenTabs() {
  try {
    console.log('[triggerScanAndReportOpenTabs] Starting...');
    const tabs = await chrome.tabs.query({});
    console.log('[triggerScanAndReportOpenTabs] Found', tabs.length, 'total tabs');
    const toReport = [];
    for (const t of tabs) {
      if (!t.url || t.url.startsWith('chrome://') || t.url.startsWith('chrome-extension://')) {
        console.log('[triggerScanAndReportOpenTabs] Skipping:', t.url);
        continue;
      }
      console.log('[triggerScanAndReportOpenTabs] Will scan:', t.url);
      toReport.push(t);
      scanTabUrl(t.url); // fire and forget
    }
    console.log('[triggerScanAndReportOpenTabs] Reporting', toReport.length, 'tabs');
    await reportOpenTabs(toReport);
    console.log('[triggerScanAndReportOpenTabs] Done');
  } catch (e) {
    console.error('[triggerScanAndReportOpenTabs] Error:', e);
  }
}

// On extension install/update, scan and report tabs
chrome.runtime.onInstalled.addListener(() => {
  console.log('[onInstalled] Extension installed, triggering initial scan...');
  triggerScanAndReportOpenTabs();
});

// On message from popup, scan and report tabs (single listener only)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.cmd === 'scanOpenTabs') {
    console.log('[onMessage] scanOpenTabs requested from popup');
    triggerScanAndReportOpenTabs()
      .then(() => {
        console.log('[onMessage] scan complete, sending response');
        sendResponse({ok: true});
      })
      .catch(err => {
        console.error('[onMessage] scan error:', err);
        sendResponse({ok: false, error: err.message});
      });
    return true; // keep channel open for async response
  }
});
