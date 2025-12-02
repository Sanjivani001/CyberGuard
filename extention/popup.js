const BACKEND = (typeof BACKEND_URL !== 'undefined') ? BACKEND_URL : 'http://localhost:5000';
const resultDiv = document.getElementById('result');

document.getElementById('scanTab').addEventListener('click', async () => {
  resultDiv.textContent = 'Scanning current tab...';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url;
    if (!url) return resultDiv.textContent = 'No URL found.';
    await scanUrl(url);
  } catch (e) {
    resultDiv.textContent = 'Error scanning current page.';
    console.error(e);
  }
});

document.getElementById('scanLink').addEventListener('click', async () => {
  const url = document.getElementById('link').value.trim();
  if (!url) return resultDiv.textContent = 'Enter a link.';
  resultDiv.textContent = 'Scanning link...';
  await scanUrl(url);
});

async function scanUrl(url) {
  try {
    const res = await fetch(BACKEND + '/api/scan-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const json = await res.json();
    if (!json.success) return resultDiv.textContent = 'Scan failed.';
    const d = json.data;
    const score = d.fraud_score || 0;
    resultDiv.innerHTML = `<div><strong>Score:</strong> ${score}<br/><strong>Proxy:</strong> ${d.proxy} <strong>VPN:</strong> ${d.vpn}</div>`;
  } catch (e) {
    console.error(e);
    resultDiv.textContent = 'Error connecting to backend.';
  }
}
