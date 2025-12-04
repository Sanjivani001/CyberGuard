document.getElementById('scan').addEventListener('click', () => {
  const statusEl = document.getElementById('status');
  const resultsEl = document.getElementById('results');
  const lastEl = document.getElementById('lastUpdated');
  const debugEl = document.getElementById('debug');
  statusEl.innerText = 'Scanning...';
  resultsEl.innerHTML = '';
  debugEl.style.display = 'none';

  // Query all tabs
  chrome.tabs.query({}, (tabsRaw) => {
    const rawCount = (tabsRaw && tabsRaw.length) || 0;
    console.log('[popup] tabsRaw count:', rawCount);
    // show debug in popup
    debugEl.style.display = 'block';
    debugEl.innerText = `Raw tabs returned: ${rawCount}`;

    if (!tabsRaw || tabsRaw.length === 0) {
      statusEl.innerText = 'No tabs found locally — requesting background scan...';
      chrome.runtime.sendMessage({ cmd: 'scanOpenTabs' }, resp => {
        if (!resp) {
          statusEl.innerText = 'No response from extension (fallback)';
          debugEl.innerText += '\nfallback: no response';
          return;
        }
        if (!resp.ok) {
          statusEl.innerText = 'Fallback scan failed: ' + (resp.error || 'unknown');
          debugEl.innerText += '\nfallback error: ' + (resp.error || 'unknown');
          return;
        }

        statusEl.innerText = 'Scan complete (fallback)';
        const tabs = resp.tabs || [];
        lastEl.innerText = 'Last: ' + new Date().toLocaleString();
        renderResults(tabs, resultsEl);
      });
      return;
    }

    const tabsToScan = tabsRaw.filter(t => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://')).map(t => ({ url: t.url, title: t.title || '' }));
    debugEl.innerText += `\nUser tabs after filter: ${tabsToScan.length}`;
    if (!tabsToScan || tabsToScan.length === 0) {
      statusEl.innerText = 'No user tabs found locally — requesting background scan...';
      chrome.runtime.sendMessage({ cmd: 'scanOpenTabs' }, resp => {
        if (!resp) {
          statusEl.innerText = 'No response from extension (fallback)';
          debugEl.innerText += '\nfallback: no response';
          return;
        }
        if (!resp.ok) {
          statusEl.innerText = 'Fallback scan failed: ' + (resp.error || 'unknown');
          debugEl.innerText += '\nfallback error: ' + (resp.error || 'unknown');
          return;
        }

        statusEl.innerText = 'Scan complete (fallback)';
        const tabs = resp.tabs || [];
        lastEl.innerText = 'Last: ' + new Date().toLocaleString();
        renderResults(tabs, resultsEl);
      });
      return;
    }

    // show first few URLs in debug
    debugEl.innerText += '\nFirst user tabs:\n' + tabsToScan.slice(0, 10).map((t, i) => `${i+1}. ${t.title || '(no title)'} — ${t.url}`).join('\n');

    // Send the list of tabs to the background service worker to perform scanning
    chrome.runtime.sendMessage({ cmd: 'scanUrls', tabs: tabsToScan }, resp => {
      if (!resp) {
        statusEl.innerText = 'No response from extension';
        debugEl.innerText += '\nscanUrls: no response';
        return;
      }
      if (!resp.ok) {
        statusEl.innerText = 'Scan failed: ' + (resp.error || 'unknown');
        debugEl.innerText += '\nscanUrls error: ' + (resp.error || 'unknown');
        return;
      }

      statusEl.innerText = 'Scan complete';
      const tabs = resp.tabs || [];
      lastEl.innerText = 'Last: ' + new Date().toLocaleString();
      renderResults(tabs, resultsEl);
    });
  });

  // helper to render results table
  function renderResults(tabs, resultsEl) {
    resultsEl.innerHTML = '';
    if (!tabs || tabs.length === 0) {
      resultsEl.innerHTML = '<div style="color:#666">No tabs found or tabs blocked by browser.</div>';
      return;
    }

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.innerHTML = '<thead><tr><th style="text-align:left">Title</th><th style="text-align:left">URL</th><th style="text-align:center">Risk</th></tr></thead>';
    const tbody = document.createElement('tbody');

    tabs.forEach(t => {
      const tr = document.createElement('tr');
      const titleTd = document.createElement('td');
      titleTd.style.padding = '6px 4px';
      titleTd.innerText = t.title || '(no title)';

      const urlTd = document.createElement('td');
      urlTd.style.padding = '6px 4px';
      urlTd.style.wordBreak = 'break-all';
      urlTd.innerText = t.url || '';

      const riskTd = document.createElement('td');
      riskTd.style.textAlign = 'center';
      riskTd.style.padding = '6px 4px';
      const score = typeof t.riskScore === 'number' ? t.riskScore : 0;
      const span = document.createElement('span');
      span.innerText = score;
      span.style.padding = '4px 8px';
      span.style.borderRadius = '4px';
      span.style.color = '#fff';
      if (score >= 50) span.style.backgroundColor = '#dc3545';
      else if (score >= 25) span.style.backgroundColor = '#ffc107';
      else span.style.backgroundColor = '#28a745';
      riskTd.appendChild(span);

      tr.appendChild(titleTd);
      tr.appendChild(urlTd);
      tr.appendChild(riskTd);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    resultsEl.appendChild(table);
  }
});

