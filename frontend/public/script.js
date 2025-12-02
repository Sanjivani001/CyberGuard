document.getElementById("scanBtn").addEventListener("click", async () => {
  const ip = document.getElementById("ipInput").value;
  const resultDiv = document.getElementById("result");

  resultDiv.innerHTML = "Scanning...";

  const res = await fetch("/api/scan-ip", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: ip })
  });

  const data = await res.json();

  if (data.error) {
    resultDiv.innerHTML = "Scan failed.";
  } else {
    resultDiv.innerHTML = `
      <h3>Scan Result</h3>
      <p><b>IP:</b> ${data.data.input}</p>
      <p><b>Risk Score:</b> ${data.data.riskScore}</p>
      <p><b>VPN:</b> ${data.data.details.vpn}</p>
      <p><b>Proxy:</b> ${data.data.details.proxy}</p>
      <p><b>TOR:</b> ${data.data.details.tor}</p>
    `;
  }
});
