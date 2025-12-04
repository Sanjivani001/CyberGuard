// Test scoring for the URL showing zero risk
function calculateUrlRiskScoreV2(urlString) {
  const breakdown = {};
  let total = 0;
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    const path = url.pathname || '/';
    const full = urlString.toLowerCase();

    breakdown.scheme = url.protocol === 'http:' ? 30 : 0;
    total += breakdown.scheme;

    const suspiciousKeywords = ['login', 'verify', 'confirm', 'update', 'account', 'security', 'authenticate', 'bank', 'paypal', 'secure', 'reset', 'password', 'signin', 'sign-in', 'auth', 'credential'];
    let keywordMatches = 0; suspiciousKeywords.forEach(kw => { if (full.includes(kw)) keywordMatches++; });
    breakdown.keywordScore = Math.min(45, keywordMatches * 10);
    total += breakdown.keywordScore;

    const suspiciousTLDs = ['.xyz', '.top', '.info', '.click', '.download', '.online', '.site', '.space', '.icu', '.bid', '.date', '.work', '.pw', '.tk', '.ml', '.cf'];
    breakdown.tld = suspiciousTLDs.some(t => hostname.endsWith(t)) ? 30 : 0;
    total += breakdown.tld;

    const parts = hostname.split('.').filter(Boolean);
    breakdown.subdomainDepth = Math.max(0, parts.length - 2) * 5;
    total += breakdown.subdomainDepth;
    breakdown.hostLen = (hostname.length > 50 || hostname.length < 3) ? 15 : 0;
    total += breakdown.hostLen;

    breakdown.ipHostname = /^\d+\.\d+\.\d+\.\d+$/.test(hostname) ? 25 : 0;
    total += breakdown.ipHostname;

    const shortenerDomains = ['bit.ly', 'tinyurl.com', 'ow.ly', 'short.link', 'qr.net', 'goo.gl', 'shortz.com', 'u.to'];
    breakdown.shortenerDomain = shortenerDomains.some(s => hostname.includes(s)) ? 35 : 0;
    total += breakdown.shortenerDomain;

    const dangerousExtensions = ['.exe', '.bat', '.com', '.scr', '.zip', '.rar', '.dmg', '.msi', '.apk', '.iso'];
    breakdown.dangerousFile = dangerousExtensions.some(ext => full.includes(ext)) ? 40 : 0;
    total += breakdown.dangerousFile;

    const freq = {}; for (let ch of path) freq[ch] = (freq[ch]||0)+1;
    let entropy = 0; const plen = path.length||1;
    for (let k in freq){ const p=freq[k]/plen; entropy -= p*Math.log2(p);}
    breakdown.pathEntropy = Math.round(entropy*10)/10;
    breakdown.pathEntropyScore = entropy>4?20:(entropy>3?10:0);
    total += breakdown.pathEntropyScore;

    const queryParams = url.search? url.search.split('&').length : 0;
    breakdown.encodedOrParams = (full.includes('%') || queryParams > 3) ? 15 : 0;
    total += breakdown.encodedOrParams;

    breakdown.punycode = hostname.includes('xn--') ? 30 : 0;
    total += breakdown.punycode;

    const whitelistDomains = ['google.com', 'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'github.com', 'stackoverflow.com', 'wikipedia.org', 'amazon.com', 'microsoft.com'];
    breakdown.whitelistBonus = whitelistDomains.some(w=>hostname.includes(w)) ? -15 : 0;
    total += breakdown.whitelistBonus;

    breakdown.shortName = hostname.length < 4 ? 10 : 0;
    total += breakdown.shortName;

  } catch (err) {
    breakdown.error = err && err.message;
  }
  const maxPossible = 325; const raw = Math.min(total, maxPossible); const score = Math.min(100, Math.round((raw / maxPossible) * 100));
  return { score, breakdown };
}

console.log('=== ENHANCED V2 RISK SCORING TEST ===\n');

const testURLs = [
  'https://teksguide.org/resource/theatre-high-school',
  'https://google.com',
  'http://login-secure.xyz/verify?user=1',
  'http://bit.ly/malware-download.exe',
  'https://tinyurl.com/phishing-bank',
];

testURLs.forEach(url => {
  const result = calculateUrlRiskScoreV2(url);
  console.log('URL:', url);
  console.log('Score:', result.score, '| Threat:', result.score >= 50 ? '🔴 HIGH' : (result.score >= 25 ? '🟡 MEDIUM' : '🟢 LOW'));
  console.log('Breakdown:', JSON.stringify(result.breakdown, null, 2));
  console.log('---');
});
