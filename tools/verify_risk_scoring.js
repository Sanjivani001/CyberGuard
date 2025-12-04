#!/usr/bin/env node

/**
 * RISK SCORING VERIFICATION TOOL
 * Shows step-by-step how CyberGuard calculates risk scores
 */

function calculateUrlRiskScoreV2(urlString) {
  const breakdown = {};
  let total = 0;
  
  console.log(`\n📍 ANALYZING: ${urlString}\n`);
  console.log(`${'='.repeat(70)}\n`);

  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    const path = url.pathname || '/';
    const full = urlString.toLowerCase();

    console.log(`🔍 URL Components:`);
    console.log(`   Scheme: ${url.protocol}`);
    console.log(`   Hostname: ${hostname}`);
    console.log(`   Path: ${path}`);
    console.log(`   Full URL: ${full}\n`);

    // 1. Scheme check
    console.log(`📌 FEATURE 1: Scheme (HTTP vs HTTPS)`);
    breakdown.scheme = url.protocol === 'http:' ? 30 : 0;
    console.log(`   Protocol: ${url.protocol}`);
    console.log(`   Risk Points: ${breakdown.scheme} ${breakdown.scheme > 0 ? '❌ (HTTP is unencrypted!)' : '✅ (HTTPS is secure)'}`);
    total += breakdown.scheme;
    console.log(`   Running Total: ${total}\n`);

    // 2. Phishing keywords
    console.log(`📌 FEATURE 2: Phishing Keywords Detection`);
    const suspiciousKeywords = ['login', 'verify', 'confirm', 'update', 'account', 'security', 'authenticate', 'bank', 'paypal', 'secure', 'reset', 'password', 'signin', 'sign-in', 'auth', 'credential'];
    let keywordMatches = [];
    suspiciousKeywords.forEach(kw => { if (full.includes(kw)) keywordMatches.push(kw); });
    breakdown.keywordScore = Math.min(45, keywordMatches.length * 10);
    console.log(`   Keywords found: ${keywordMatches.length > 0 ? keywordMatches.join(', ') : 'None'}`);
    console.log(`   Risk Points: ${breakdown.keywordScore} ${keywordMatches.length > 0 ? '❌ (Phishing indicators)' : '✅ (No phishing words)'}`);
    total += breakdown.keywordScore;
    console.log(`   Running Total: ${total}\n`);

    // 3. Suspicious TLDs
    console.log(`📌 FEATURE 3: Suspicious Top-Level Domains (TLDs)`);
    const suspiciousTLDs = ['.xyz', '.top', '.info', '.click', '.download', '.online', '.site', '.space', '.icu', '.bid', '.date', '.work', '.pw', '.tk', '.ml', '.cf'];
    const tldMatch = suspiciousTLDs.find(t => hostname.endsWith(t));
    breakdown.tld = tldMatch ? 30 : 0;
    console.log(`   Domain: ${hostname}`);
    console.log(`   TLD List: ${suspiciousTLDs.join(', ')}`);
    console.log(`   Risk Points: ${breakdown.tld} ${tldMatch ? `❌ (${tldMatch} is suspicious!)` : '✅ (Legitimate TLD like .com, .org)'}`);
    total += breakdown.tld;
    console.log(`   Running Total: ${total}\n`);

    // 4. Subdomain depth
    console.log(`📌 FEATURE 4: Subdomain Depth (Nesting)`);
    const parts = hostname.split('.').filter(Boolean);
    breakdown.subdomainDepth = Math.max(0, parts.length - 2) * 5;
    console.log(`   Hostname parts: ${parts.join(' > ')}`);
    console.log(`   Subdomain levels: ${Math.max(0, parts.length - 2)}`);
    console.log(`   Risk Points: ${breakdown.subdomainDepth} ${breakdown.subdomainDepth > 0 ? `❌ (Too many nested levels!)` : '✅ (Normal subdomain structure)'}`);
    total += breakdown.subdomainDepth;
    console.log(`   Running Total: ${total}\n`);

    // 5. Hostname length
    console.log(`📌 FEATURE 5: Hostname Length Check`);
    breakdown.hostLen = (hostname.length > 50 || hostname.length < 3) ? 15 : 0;
    console.log(`   Hostname length: ${hostname.length} characters`);
    console.log(`   Risk Points: ${breakdown.hostLen} ${breakdown.hostLen > 0 ? `❌ (Abnormal length!)` : '✅ (Normal length 3-50)'}`);
    total += breakdown.hostLen;
    console.log(`   Running Total: ${total}\n`);

    // 6. IP address
    console.log(`📌 FEATURE 6: IP Address Detection`);
    const isIP = /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
    breakdown.ipHostname = isIP ? 25 : 0;
    console.log(`   Is IP address: ${isIP ? 'YES ❌' : 'NO ✅'}`);
    console.log(`   Risk Points: ${breakdown.ipHostname}`);
    total += breakdown.ipHostname;
    console.log(`   Running Total: ${total}\n`);

    // 7. URL shorteners
    console.log(`📌 FEATURE 7: URL Shortener Detection (HIGH RISK!)`);
    const shortenerDomains = ['bit.ly', 'tinyurl.com', 'ow.ly', 'short.link', 'qr.net', 'goo.gl', 'shortz.com', 'u.to'];
    const shortenerMatch = shortenerDomains.find(s => hostname.includes(s));
    breakdown.shortenerDomain = shortenerMatch ? 35 : 0;
    console.log(`   Known shorteners: ${shortenerDomains.join(', ')}`);
    console.log(`   Found: ${shortenerMatch ? shortenerMatch : 'None'}`);
    console.log(`   Risk Points: ${breakdown.shortenerDomain} ${shortenerMatch ? '❌ (Hides real destination - common attack!)' : '✅ (Direct domain)'}`);
    total += breakdown.shortenerDomain;
    console.log(`   Running Total: ${total}\n`);

    // 8. Dangerous files
    console.log(`📌 FEATURE 8: Malicious File Download Detection (HIGH RISK!)`);
    const dangerousExtensions = ['.exe', '.bat', '.com', '.scr', '.zip', '.rar', '.dmg', '.msi', '.apk', '.iso'];
    const fileMatch = dangerousExtensions.find(ext => full.includes(ext));
    breakdown.dangerousFile = fileMatch ? 40 : 0;
    console.log(`   Dangerous files: ${dangerousExtensions.join(', ')}`);
    console.log(`   Found: ${fileMatch ? fileMatch : 'None'}`);
    console.log(`   Risk Points: ${breakdown.dangerousFile} ${fileMatch ? '❌ (Executable download - direct malware!)' : '✅ (No dangerous files)'}`);
    total += breakdown.dangerousFile;
    console.log(`   Running Total: ${total}\n`);

    // 9. Path entropy
    console.log(`📌 FEATURE 9: Path Entropy (URL Randomness)`);
    const freq = {};
    for (let ch of path) freq[ch] = (freq[ch]||0)+1;
    let entropy = 0;
    const plen = path.length||1;
    for (let k in freq){ const p=freq[k]/plen; entropy -= p*Math.log2(p);}
    breakdown.pathEntropy = Math.round(entropy*10)/10;
    breakdown.pathEntropyScore = entropy>4?20:(entropy>3?10:0);
    console.log(`   Path: ${path}`);
    console.log(`   Entropy score: ${breakdown.pathEntropy}`);
    console.log(`   Risk Points: ${breakdown.pathEntropyScore} ${breakdown.pathEntropyScore > 0 ? '⚠️  (High randomness - may be malicious)' : '✅ (Normal path structure)'}`);
    total += breakdown.pathEntropyScore;
    console.log(`   Running Total: ${total}\n`);

    // 10. Encoded content
    console.log(`📌 FEATURE 10: URL Encoding & Query Parameters`);
    const queryParams = url.search? url.search.split('&').length : 0;
    breakdown.encodedOrParams = (full.includes('%') || queryParams > 3) ? 15 : 0;
    console.log(`   Contains URL encoding (%XX): ${full.includes('%') ? 'YES ❌' : 'NO ✅'}`);
    console.log(`   Query parameters: ${queryParams} ${queryParams > 3 ? '❌ (Too many params!)' : '✅'}`);
    console.log(`   Risk Points: ${breakdown.encodedOrParams}`);
    total += breakdown.encodedOrParams;
    console.log(`   Running Total: ${total}\n`);

    // 11. Punycode
    console.log(`📌 FEATURE 11: Punycode/Homograph Attack Detection`);
    breakdown.punycode = hostname.includes('xn--') ? 30 : 0;
    console.log(`   Contains punycode (xn--): ${hostname.includes('xn--') ? 'YES ❌' : 'NO ✅'}`);
    console.log(`   Risk Points: ${breakdown.punycode} ${breakdown.punycode > 0 ? '(Unicode domain - can spoof legitimate sites!)' : ''}`);
    total += breakdown.punycode;
    console.log(`   Running Total: ${total}\n`);

    // 12. Whitelist
    console.log(`📌 FEATURE 12: Known Safe Sites Whitelist`);
    const whitelistDomains = ['google.com', 'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'github.com', 'stackoverflow.com', 'wikipedia.org', 'amazon.com', 'microsoft.com'];
    breakdown.whitelistBonus = whitelistDomains.some(w=>hostname.includes(w)) ? -15 : 0;
    console.log(`   Whitelist: ${whitelistDomains.join(', ')}`);
    console.log(`   Match: ${breakdown.whitelistBonus < 0 ? 'YES ✅' : 'NONE'}`);
    console.log(`   Risk Points: ${breakdown.whitelistBonus} (Reduces score for known safe sites)`);
    total += breakdown.whitelistBonus;
    console.log(`   Running Total: ${total}\n`);

    // 13. Short name
    console.log(`📌 FEATURE 13: Short Hostname Check`);
    breakdown.shortName = hostname.length < 4 ? 10 : 0;
    console.log(`   Hostname: "${hostname}" (${hostname.length} chars)`);
    console.log(`   Risk Points: ${breakdown.shortName} ${breakdown.shortName > 0 ? '⚠️  (Very short domain)' : '✅'}`);
    total += breakdown.shortName;
    console.log(`   Running Total: ${total}\n`);

  } catch (err) {
    breakdown.error = err && err.message;
    console.error(`❌ Error parsing URL: ${err.message}`);
  }

  // Final calculation
  const maxPossible = 325;
  const raw = Math.min(total, maxPossible);
  const score = Math.min(100, Math.round((raw / maxPossible) * 100));

  console.log(`${'='.repeat(70)}`);
  console.log(`\n📊 FINAL RISK SCORE: ${score}/100\n`);
  
  if (score >= 50) {
    console.log(`🔴 THREAT LEVEL: HIGH RISK`);
    console.log(`⚠️  ACTION: BLOCK OR AVOID THIS LINK`);
  } else if (score >= 25) {
    console.log(`🟡 THREAT LEVEL: MEDIUM RISK`);
    console.log(`⚠️  ACTION: VERIFY URL LEGITIMACY BEFORE CLICKING`);
  } else {
    console.log(`🟢 THREAT LEVEL: LOW RISK`);
    console.log(`✅ ACTION: LIKELY SAFE TO VISIT`);
  }

  console.log(`\n📈 Score Breakdown:`);
  console.log(`   Scheme:                ${breakdown.scheme}`);
  console.log(`   Keywords:             ${breakdown.keywordScore}`);
  console.log(`   TLD:                  ${breakdown.tld}`);
  console.log(`   Subdomain Depth:      ${breakdown.subdomainDepth}`);
  console.log(`   Hostname Length:      ${breakdown.hostLen}`);
  console.log(`   IP Address:           ${breakdown.ipHostname}`);
  console.log(`   URL Shortener:        ${breakdown.shortenerDomain}`);
  console.log(`   Dangerous Files:      ${breakdown.dangerousFile}`);
  console.log(`   Path Entropy:         ${breakdown.pathEntropyScore}`);
  console.log(`   URL Encoding:         ${breakdown.encodedOrParams}`);
  console.log(`   Punycode:             ${breakdown.punycode}`);
  console.log(`   Whitelist Bonus:      ${breakdown.whitelistBonus}`);
  console.log(`   Short Name:           ${breakdown.shortName}`);
  console.log(`   ─────────────────────────`);
  console.log(`   Total Raw:            ${total}`);
  console.log(`   Max Possible:         ${maxPossible}`);
  console.log(`   Final Score:          ${score}/100\n`);

  return { score, breakdown };
}

// Test cases
const testURLs = [
  'https://google.com',
  'https://teksguide.org/resource/theatre-high-school',
  'http://login-secure.xyz/verify?user=1',
  'http://bit.ly/malware-download.exe',
  'https://tinyurl.com/phishing-bank-login',
];

console.log(`\n${'='.repeat(70)}`);
console.log(`CYBERGUARD - RISK SCORING VERIFICATION TOOL`);
console.log(`${'='.repeat(70)}`);

testURLs.forEach((url, idx) => {
  calculateUrlRiskScoreV2(url);
  if (idx < testURLs.length - 1) {
    console.log(`\n\n`);
  }
});

console.log(`\n${'='.repeat(70)}`);
console.log(`SCORING SCALE:`);
console.log(`${'='.repeat(70)}`);
console.log(`🟢 0-24:   LOW RISK      → Safe to visit`);
console.log(`🟡 25-49:  MEDIUM RISK   → Verify before clicking`);
console.log(`🔴 50-100: HIGH RISK     → Block or avoid\n`);
