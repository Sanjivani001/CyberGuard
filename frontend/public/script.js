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
      alert('Failed to refresh tabs');
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
      return;
    }

    tabs.forEach((tab, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${tab.url || 'Unknown'}</td>
        <td>${tab.title || 'No title'}</td>
        <td style="text-align: center;">
          <span style="background-color: ${getThreatColor(tab.riskScore || 0)}; color: white; padding: 5px 10px; border-radius: 3px;">
            ${tab.riskScore ? tab.riskScore : '-'}
          </span>
        </td>
      `;
      tabsTbody.appendChild(row);
    });

  } catch (err) {
    console.error('Error refreshing tabs:', err);
    alert('Error refreshing tabs: ' + err.message);
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
      alert('Failed to clear tabs');
      return;
    }

    console.log(`Cleared ${result.data.deleted} tabs`);
    await refreshTabs();
    alert(`Cleared ${result.data.deleted} tabs`);

  } catch (err) {
    console.error('Error clearing tabs:', err);
    alert('Error clearing tabs: ' + err.message);
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
      alert('Failed to refresh history');
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

  } catch (err) {
    console.error('Error refreshing history:', err);
    alert('Error refreshing history: ' + err.message);
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
      alert('Failed to clear history');
      return;
    }

    console.log(`Cleared ${result.data.deleted} history records`);
    await refreshHistory();
    alert(`Cleared ${result.data.deleted} scan records`);

  } catch (err) {
    console.error('Error clearing history:', err);
    alert('Error clearing history: ' + err.message);
  }
}

// ============================================================
// EVENT LISTENERS
// ============================================================

// Refresh Tabs Display button
const refreshTabsBtn = document.getElementById('refreshTabsDisplayBtn');
if (refreshTabsBtn) {
  refreshTabsBtn.addEventListener('click', refreshTabs);
}

// Clear Tabs Display button
const clearTabsBtn = document.getElementById('clearTabsDisplayBtn');
if (clearTabsBtn) {
  clearTabsBtn.addEventListener('click', clearTabs);
}

// Refresh Scan History button
const refreshHistoryBtn = document.getElementById('refreshDisplayBtn');
if (refreshHistoryBtn) {
  refreshHistoryBtn.addEventListener('click', refreshHistory);
}

// Clear Scan History button
const clearHistoryBtn = document.getElementById('clearDisplayBtn');
if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener('click', clearHistory);
}

// ============================================================
// INITIALIZATION
// ============================================================

// Load initial data when page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('Page loaded, initializing...');
  refreshTabs();
  refreshHistory();
});
