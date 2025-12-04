// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Format a date string for display
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString();
}

/**
 * Get threat level color
 */
function getThreatColor(riskScore) {
  if (riskScore >= 50) return '#dc3545'; // red
  if (riskScore >= 25) return '#ffc107'; // yellow
  return '#28a745'; // green
}

// ============================================================
// SCAN FUNCTIONS
// ============================================================

/**
 * Refresh the open tabs display
 */
async function refreshTabs() {
  try {
    const response = await fetch('/api/tabs');
    const result = await response.json();

    if (!result.success) {
      console.error('Failed to fetch tabs:', result.error);
      setStatus('tabsStatus', 'Failed to fetch tabs: ' + (result.error || 'unknown'), true);
      return;
    }

    const tabs = result.data || [];
    const tabsTbody = document.getElementById('tabsTbody');

    if (!tabsTbody) {
      console.error('Table element #tabsTbody not found');
      return;
    }

    tabsTbody.innerHTML = '';

    if (tabs.length === 0) {
      tabsTbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 10px;">No open tabs reported yet</td></tr>';
      setStatus('tabsStatus', 'No open tabs reported');
      return;
    }

    tabs.forEach((tab, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${tab.title || 'No title'}</td>
        <td style="max-width:560px; word-break:break-all;">${tab.url || 'Unknown'}</td>
        <td style="text-align: center;">
          <span style="background-color: ${getThreatColor(tab.riskScore || 0)}; color: white; padding: 5px 10px; border-radius: 3px;">
            ${typeof tab.riskScore === 'number' ? tab.riskScore : '-'}
          </span>
        </td>
      `;
      tabsTbody.appendChild(row);
    });
    setStatus('tabsStatus', 'Last updated: ' + new Date().toLocaleTimeString());

  } catch (err) {
    console.error('Error refreshing tabs:', err);
    setStatus('tabsStatus', 'Error refreshing tabs: ' + (err && err.message ? err.message : String(err)), true);
  }
}

/**
 * Clear all open tabs
 */
async function clearTabs() {
  if (!confirm('Are you sure you want to clear all open tabs?')) {
    return;
  }

  try {
    const response = await fetch('/api/tabs/clear', { method: 'DELETE' });
    const result = await response.json();

    if (!result.success) {
      console.error('Failed to clear tabs:', result.error);
      setStatus('tabsStatus', 'Failed to clear tabs: ' + (result.error || 'unknown'), true);
      return;
    }

    console.log(`Cleared ${result.data.deleted} tabs`);
    await refreshTabs();
    setStatus('tabsStatus', `Cleared ${result.data.deleted} tabs`);

  } catch (err) {
    console.error('Error clearing tabs:', err);
    setStatus('tabsStatus', 'Error clearing tabs: ' + (err && err.message ? err.message : String(err)), true);
  }
}

/**
 * Refresh the scan history display
 */
async function refreshHistory() {
  try {
    const response = await fetch('/api/history');
    const result = await response.json();

    if (!result.success) {
      console.error('Failed to fetch history:', result.error);
      setStatus('historyStatus', 'Failed to fetch history: ' + (result.error || 'unknown'), true);
      return;
    }

    const history = result.data || [];
    const scansTbody = document.getElementById('scansTbody');

    if (!scansTbody) {
      console.error('Table element #scansTbody not found');
      return;
    }

    scansTbody.innerHTML = '';

    if (history.length === 0) {
      scansTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 10px;">No scan history yet</td></tr>';
      setStatus('historyStatus', 'No scan history yet');
      return;
    }

    history.forEach((alert) => {
      const row = document.createElement('tr');
      const threatLevel = alert.riskScore >= 50 ? 'HIGH' : (alert.riskScore >= 25 ? 'MEDIUM' : 'LOW');
      row.innerHTML = `
        <td>${alert.target}</td>
        <td>${alert.type}</td>
        <td style="text-align: center;">
          <span style="background-color: ${getThreatColor(alert.riskScore)}; color: white; padding: 5px 10px; border-radius: 3px;">
            ${alert.riskScore}
          </span>
        </td>
        <td>${formatDate(alert.createdAt)}</td>
      `;
      scansTbody.appendChild(row);
    });
    setStatus('historyStatus', 'Last updated: ' + new Date().toLocaleTimeString());

  } catch (err) {
    console.error('Error refreshing history:', err);
    setStatus('historyStatus', 'Error refreshing history: ' + (err && err.message ? err.message : String(err)), true);
  }
}

/**
 * Clear all scan history
 */
async function clearHistory() {
  if (!confirm('Are you sure you want to clear all scan history? This cannot be undone.')) {
    return;
  }

  try {
    const response = await fetch('/api/history/clear', { method: 'DELETE' });
    const result = await response.json();

    if (!result.success) {
      console.error('Failed to clear history:', result.error);
      setStatus('historyStatus', 'Failed to clear history: ' + (result.error || 'unknown'), true);
      return;
    }

    console.log(`Cleared ${result.data.deleted} history records`);
    await refreshHistory();
    setStatus('historyStatus', `Cleared ${result.data.deleted} scan records`);

  } catch (err) {
    console.error('Error clearing history:', err);
    setStatus('historyStatus', 'Error clearing history: ' + (err && err.message ? err.message : String(err)), true);
  }
}

// ============================================================
// EVENT LISTENERS
// ============================================================

// Clear Tabs Display button
const clearTabsBtn = document.getElementById('clearTabsDisplayBtn');
if (clearTabsBtn) {
  clearTabsBtn.addEventListener('click', clearTabs);
}
// Clear Scan History button
const clearHistoryBtn = document.getElementById('clearDisplayBtn');
if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener('click', clearHistory);
}

// ============================================================
// STATUS HELPERS
// ============================================================

function setStatus(id, msg, isError = false) {
  try {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerText = msg;
    el.style.color = isError ? '#f28b82' : 'var(--muted)';
  } catch (e) {
    console.error('setStatus error', e);
  }
}

function clearStatus(id) {
  try { const el = document.getElementById(id); if (el) el.innerText = ''; } catch(e){}
}

// ============================================================
// AUTO-REFRESH
// ============================================================

// Auto-refresh tabs and history every 5 seconds
let autoRefreshInterval = null;

function startAutoRefresh() {
  if (autoRefreshInterval) return;
  console.log('[autoRefresh] Starting auto-refresh (5s interval)...');
  refreshTabs();
  refreshHistory();
  autoRefreshInterval = setInterval(() => {
    refreshTabs();
    refreshHistory();
  }, 5000);
}

// ============================================================
// INITIALIZATION
// ============================================================

// Load initial data when page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('Page loaded, initializing...');
  startAutoRefresh();
});
