# V2 Risk Scoring Endpoint — Final Implementation

## What is the V2 Risk Algorithm?

The **V2 Risk Algorithm** is an improved weighted-feature model that calculates URL risk using multiple heuristics:

### Features Analyzed

| Feature | Risk Points | Description |
|---------|------------|-------------|
| **scheme** | 30 | Penalizes `http://` (unencrypted) URLs |
| **keywordScore** | Up to 45 | Counts suspicious keywords (login, verify, bank, paypal, secure, etc.) |
| **tld** | 30 | Flags suspicious TLDs (.xyz, .top, .info, .click, .online, .space, .icu, etc.) |
| **subdomainDepth** | 5 per extra level | Penalizes unusual subdomain nesting (e.g., `a.b.c.d.e.site.space`) |
| **hostLen** | 15 | Flags very short (<3) or very long (>50) hostnames |
| **ipHostname** | 25 | Detects IP addresses used as hostname (e.g., `192.168.1.1`) |
| **pathEntropy** | 10-20 | Analyzes path randomness (high entropy = suspicious) |
| **encodedOrParams** | 15 | Flags URL encoding (`%XX`) or >3 query parameters |
| **punycode** | 30 | Detects punycode/homograph attacks (xn--) |
| **shortName** | 10 | Flags very short hostnames (<4 chars) |

### Score Normalization

- Raw total is capped at 250 points
- Scaled to 0-100 range
- Returns JSON with breakdown of each feature

## V2 Endpoints

### `POST /api/scan-url-v2`
Scans a URL using the V2 algorithm and returns detailed breakdown.

**Request:**
```bash
curl -X POST http://localhost:5000/api/scan-url-v2 \
  -H "Content-Type: application/json" \
  -d '{"url":"http://login-secure.xyz/verify?user=1"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "target": "http://login-secure.xyz/verify?user=1",
    "riskScore": 42,
    "breakdown": {
      "scheme": 30,
      "keywordScore": 45,
      "tld": 30,
      "subdomainDepth": 0,
      "hostLen": 0,
      "ipHostname": 0,
      "pathEntropy": 2.8,
      "pathEntropyScore": 0,
      "encodedOrParams": 0,
      "punycode": 0,
      "shortName": 0
    },
    "raw": null,
    "_id": "63d7f123..."
  }
}
```

## Score Interpretation

| Score Range | Threat Level | Action |
|-------------|--------------|--------|
| 0-24 | LOW | Safe to visit |
| 25-49 | MEDIUM | Caution; verify URL legitimacy |
| 50-100 | HIGH | Block or avoid |

## Examples

### Safe URL
```
https://google.com
Score: 0 (all features clean)
```

### Suspicious URL
```
http://paypal-login.online/signin
Score: 24
- scheme: 0 (uses https)
- keywordScore: 30 (contains "login" and "paypal")
- tld: 30 (suspicious .online TLD)
```

### Highly Suspicious URL
```
http://login-secure.xyz/verify?user=1
Score: 42
- scheme: 30 (http://)
- keywordScore: 45 (multiple keywords: login, secure, verify)
- tld: 30 (.xyz TLD)
```

## How V2 is Used

1. **Backend**: `/api/scan-url-v2` computes V2 score and optionally compares with IPQS if available
2. **Extension**: `calculateUrlRiskScoreV2()` in `background.js` uses same logic locally
3. **Popup**: Shows enriched tabs with V2-based risk scores in color-coded display

## Legacy vs V2

- **Legacy (`/api/scan-url`)**: Simple point-based scoring, max ~130 points
- **V2 (`/api/scan-url-v2`)**: Weighted features, max 250 points, more granular breakdown

Both are active; V2 is recommended for more accurate threat detection.

## Notes

- IPQS API is optional; V2 runs entirely locally if IPQS is unavailable
- V2 scores are persisted to the Alert database
- Extension falls back to V2 if backend is unreachable
