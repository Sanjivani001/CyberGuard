async function fetchRecent() {
  try {
    const res = await fetch('/api/recent-alerts');
    const data = await res.json();
    const el = document.getElementById('recentList');
    if (!data.length) { el.innerHTML = '<p>No scans yet.</p>'; return; }
    el.innerHTML = data.map(a => `
      <div class="scan-row ${a.flagged ? 'flagged' : ''}">
        <strong>${a.target}</strong> — Risk: ${a.riskScore} — ${a.flagged ? '<span style="color:red">FLAGGED</span>' : 'OK' }
        <div>${a.solution || ''}</div>
      </div>
    `).join('');
  } catch (e) {
    document.getElementById('recentList').innerHTML = '<p>Error loading.</p>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('checkForm');
  const urlInput = document.getElementById('urlInput');
  const resultDiv = document.getElementById('result');

  fetchRecent();
  setInterval(fetchRecent, 15000); // refresh every 15s

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const url = urlInput.value.trim();
    if (!url) {
      resultDiv.innerHTML = '<div class="alert warn">Enter a URL or wait for monitoring.</div>';
      return;
    }
    resultDiv.innerHTML = 'Checking...';
    try {
      const r = await fetch('/api/scan-url', {
        method:'POST',
        headers:{ 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const j = await r.json();
      if (!j.success) {
        const serverMsg = j.message ? ` (${j.message})` : '';
        resultDiv.innerHTML = `<div class="alert warn">Scan failed. Try again later${serverMsg}.</div>`;
        return;
      }
      const d = j.data;
      const score = d.risk_score || 0;
      const info = `<div class="alert ${score >= (window.RISK_THRESHOLD||50) ? 'warn' : 'ok'}">
                      <strong>URL:</strong> ${d.requested_url || url}<br/>
                      <strong>Risk Score:</strong> ${score}<br/>
                      <strong>Phishing:</strong> ${d.phishing ? 'Yes' : 'No'} &nbsp; <strong>Malware:</strong> ${d.malware ? 'Yes' : 'No'} &nbsp; <strong>Suspicious:</strong> ${d.suspicious ? 'Yes' : 'No'}
                    </div>`;
      resultDiv.innerHTML = info;
      fetchRecent();
    } catch (err) {
      const msg = err.message || 'Error checking URL.';
      resultDiv.innerHTML = `<div class="alert warn">Error checking URL: ${msg}</div>`;
    }
  });
});
