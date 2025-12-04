$testUrls = @(
    'https://teksguide.org/resource/theatre-high-school',
    'http://bit.ly/malware-download.exe',
    'https://tinyurl.com/phishing-bank'
)

foreach ($url in $testUrls) {
    Write-Host "Testing: $url"
    $body = @{ url = $url } | ConvertTo-Json
    try {
        $response = Invoke-RestMethod -Uri 'http://localhost:5000/api/scan-url-v2' -Method Post -Body $body -ContentType 'application/json'
        Write-Host "Risk Score: $($response.data.riskScore)"
        if ($response.data.riskScore -ge 50) {
            Write-Host "Threat: HIGH RISK (RED)"
        } elseif ($response.data.riskScore -ge 25) {
            Write-Host "Threat: MEDIUM RISK (YELLOW)"
        } else {
            Write-Host "Threat: LOW RISK (GREEN)"
        }
        Write-Host "Breakdown:"
        $response.data.breakdown | ConvertTo-Json | Write-Host
    }
    catch {
        Write-Host "Error: $_"
    }
    Write-Host "---"
}
