const scanBtn = document.getElementById('scanBtn');
const ipInput = document.getElementById('ipInput');
const resultDiv = document.getElementById('result');

scanBtn.addEventListener('click', async () => {
    const ip = ipInput.value.trim();
    if(!ip) return alert('Please enter an IP');

    resultDiv.innerHTML = "Scanning...";

    try {
        const res = await fetch('http://localhost:5000/api/scan-ip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip })
        });
        const data = await res.json();
        if(data.success){
            resultDiv.innerHTML = `
                <h3>Result for: ${ip}</h3>
                <p>Risk Score: ${data.result.fraud_score}</p>
                <p>VPN: ${data.result.vpn}</p>
                <p>Proxy: ${data.result.proxy}</p>
                <p>Tor: ${data.result.tor}</p>
                <p>Fraud Type: ${data.result.fraud_type || 'None'}</p>
            `;
        } else {
            resultDiv.innerHTML = "Scan failed.";
        }
    } catch(err){
        resultDiv.innerHTML = "Error connecting to server.";
        console.error(err);
    }
});
