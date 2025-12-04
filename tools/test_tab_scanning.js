#!/usr/bin/env node
/**
 * Test Tab Scanning Functionality
 * This simulates what the extension does when you click "Scan All Open Tabs"
 */

const http = require('http');

const BACKEND = 'http://localhost:5000';

// Sample tabs that would be open in a browser
const sampleTabs = [
  { url: 'https://google.com', title: 'Google' },
  { url: 'https://github.com', title: 'GitHub' },
  { url: 'https://stackoverflow.com', title: 'Stack Overflow' },
  { url: 'http://login-secure.xyz/verify?user=admin', title: 'Suspicious Login' },
  { url: 'http://bit.ly/download-file.exe', title: 'Shortener Link' },
  { url: 'https://facebook.com', title: 'Facebook' },
];

async function scanUrl(url) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ url });
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/scan-url-v2',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ success: true, riskScore: json.data.riskScore, breakdown: json.data.breakdown });
        } catch (e) {
          resolve({ success: false, error: 'Parse error' });
        }
      });
    });

    req.on('error', err => {
      resolve({ success: false, error: err.message });
    });

    req.write(data);
    req.end();
  });
}

async function runTest() {
  console.log('🔍 Testing Tab Scanning Functionality\n');
  console.log('Backend URL:', BACKEND);
  console.log('Simulating', sampleTabs.length, 'open tabs\n');
  console.log('═'.repeat(100));

  const results = [];
  for (let i = 0; i < sampleTabs.length; i++) {
    const tab = sampleTabs[i];
    console.log(`\n[${i + 1}/${sampleTabs.length}] Scanning: ${tab.title}`);
    console.log(`    URL: ${tab.url}`);

    const result = await scanUrl(tab.url);
    
    if (result.success) {
      const score = result.riskScore;
      let threat = '🟢 LOW';
      if (score >= 50) threat = '🔴 HIGH';
      else if (score >= 25) threat = '🟡 MEDIUM';

      console.log(`    Risk Score: ${score}/100 ${threat}`);
      console.log(`    Breakdown: Scheme=${result.breakdown.scheme}, Keywords=${result.breakdown.keywordScore}, TLD=${result.breakdown.tld}, Shortener=${result.breakdown.shortenerDomain}, Files=${result.breakdown.dangerousFile}, Whitelist=${result.breakdown.whitelistBonus}`);

      results.push({ url: tab.url, title: tab.title, score, threat });
    } else {
      console.log(`    ❌ Error: ${result.error}`);
      results.push({ url: tab.url, title: tab.title, score: 0, threat: '❌ ERROR' });
    }
  }

  console.log('\n' + '═'.repeat(100));
  console.log('\n📊 SUMMARY - Scan Results Table\n');
  console.log('┌' + '─'.repeat(45) + '┬' + '─'.repeat(20) + '┬' + '─'.repeat(15) + '┬' + '─'.repeat(15) + '┐');
  console.log('│ ' + 'Title'.padEnd(43) + ' │ ' + 'Risk Score'.padEnd(18) + ' │ ' + 'Threat Level'.padEnd(13) + ' │ ' + 'Status'.padEnd(13) + ' │');
  console.log('├' + '─'.repeat(45) + '┼' + '─'.repeat(20) + '┼' + '─'.repeat(15) + '┼' + '─'.repeat(15) + '┤');
  
  results.forEach(r => {
    const title = r.title.substring(0, 43).padEnd(43);
    const score = `${r.score}/100`.padEnd(18);
    const threat = r.threat.padEnd(13);
    const status = r.score === 0 && r.threat === '❌ ERROR' ? '❌ FAILED' : '✅ SCANNED';
    console.log(`│ ${title} │ ${score} │ ${threat} │ ${status.padEnd(13)} │`);
  });
  
  console.log('└' + '─'.repeat(45) + '┴' + '─'.repeat(20) + '┴' + '─'.repeat(15) + '┴' + '─'.repeat(15) + '┘');

  const safeCount = results.filter(r => r.score >= 0 && r.score <= 24).length;
  const mediumCount = results.filter(r => r.score >= 25 && r.score <= 49).length;
  const highCount = results.filter(r => r.score >= 50).length;

  console.log('\n📈 Statistics:');
  console.log(`   🟢 Safe (0-24): ${safeCount} tabs`);
  console.log(`   🟡 Medium (25-49): ${mediumCount} tabs`);
  console.log(`   🔴 High (50-100): ${highCount} tabs`);
  console.log(`   📊 Total Scanned: ${results.length} tabs\n`);

  console.log('✅ Test Complete! This is what happens when you click "Scan All Open Tabs" in the extension.\n');
}

runTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
