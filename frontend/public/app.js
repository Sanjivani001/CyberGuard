document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('checkForm');
  const input = document.getElementById('urlInput');
  const resultDiv = document.getElementById('result');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = input.value.trim();
    if (!url) {
      resultDiv.innerHTML = '<div class="alert warn">Please enter a URL or use auto-monitoring.</div>';
      return;
    }
    resultDiv.innerHTML = 'Checking...';
    try {
      const res = await fetch('/api/scan-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const json = await res.json();
      if (!json.success) {
        resultDiv.innerHTML = '<div class="alert warn">Scan failed. Try again later.</div>';
        return;
      }
      const d = json.data;
      const score = d.fraud_score || 0;
      const info = `
        <div class="alert ${score >= (window.RISK_THRESHOLD||50) ? 'warn' : 'ok'}">
          <strong>URL:</strong> ${d.requested_url || url}<br/>
          <strong>Fraud Score:</strong> ${score}<br/>
          <strong>Proxy:</strong> ${d.proxy} &nbsp; <strong>VPN:</strong> ${d.vpn} &nbsp; <strong>Tor:</strong> ${d.tor}
        </div>`;
      resultDiv.innerHTML = info;
    } catch (err) {
      console.error(err);
      resultDiv.innerHTML = '<div class="alert warn">Error checking URL.</div>';
    }
  });
});
