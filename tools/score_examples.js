// Simple script to reuse the V2 scoring logic and print examples
function calculateUrlRiskScoreV2(urlString) {
  const breakdown = {};
  let total = 0;
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    const path = url.pathname || '/';
    const full = urlString.toLowerCase();

    breakdown.scheme = url.protocol === 'http:' ? 30 : 0; total += breakdown.scheme;

    const suspiciousKeywords = ['login', 'verify', 'confirm', 'update', 'account', 'security', 'authenticate', 'bank', 'paypal', 'secure'];
    let keywordMatches = 0; suspiciousKeywords.forEach(kw => { if (full.includes(kw)) keywordMatches++; });
    breakdown.keywordScore = Math.min(45, keywordMatches * 15); total += breakdown.keywordScore;

    const suspiciousTLDs = ['.xyz', '.top', '.info', '.click', '.download', '.online', '.site', '.space', '.icu'];
    breakdown.tld = suspiciousTLDs.some(t => hostname.endsWith(t)) ? 30 : 0; total += breakdown.tld;

    const parts = hostname.split('.').filter(Boolean);
    breakdown.subdomainDepth = Math.max(0, parts.length - 2) * 5; total += breakdown.subdomainDepth;
    breakdown.hostLen = (hostname.length > 50 || hostname.length < 3) ? 15 : 0; total += breakdown.hostLen;

    breakdown.ipHostname = /^\d+\.\d+\.\d+\.\d+$/.test(hostname) ? 25 : 0; total += breakdown.ipHostname;

    const freq = {}; for (let ch of path) freq[ch] = (freq[ch]||0)+1; let entropy = 0; const plen = path.length||1; for (let k in freq){ const p=freq[k]/plen; entropy -= p*Math.log2(p);} breakdown.pathEntropy = Math.round(entropy*10)/10; breakdown.pathEntropyScore = entropy>4?20:(entropy>3?10:0); total += breakdown.pathEntropyScore;

    const queryParams = url.search ? url.search.split('&').length : 0; breakdown.encodedOrParams = (full.includes('%') || queryParams > 3) ? 15 : 0; total += breakdown.encodedOrParams;

    breakdown.punycode = hostname.includes('xn--') ? 30 : 0; total += breakdown.punycode;

    breakdown.shortName = hostname.length < 4 ? 10 : 0; total += breakdown.shortName;

  } catch (err) {
    breakdown.error = err && err.message;
  }
  const maxPossible = 250; const raw = Math.min(total, maxPossible); const score = Math.round((raw / maxPossible) * 100);
  return { score, breakdown };
}

const samples = [
  'https://google.com',
  'https://example.com',
  'http://login-secure.xyz/verify?user=1',
  'https://paypal-login.online/signin',
  'http://192.168.1.1/test',
  'https://this.is.a.very.long.subdomain.name.for.testing.potentially.suspicious-site.space/path?x=1&y=2',
  'https://x.co',
  'https://xn--pple-43d.com/login%20secure'
];

for (let s of samples) {
  try {
    const r = calculateUrlRiskScoreV2(s);
    console.log('URL:', s);
    console.log('  Score:', r.score);
    console.log('  Breakdown:', JSON.stringify(r.breakdown, null, 2));
  } catch (e) {
    console.error('Error scoring', s, e);
  }
  console.log('--------------------------------------------------');
}
