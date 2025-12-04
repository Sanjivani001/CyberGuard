const express = require('express');
const router = express.Router();
const axios = require('axios');
const Alert = require('../models/Alert');

const IPQS_KEY = process.env.IPQS_KEY;
const IPQS_URL_BASE = 'https://ipqualityscore.com/api/json/';

// ============================================================
// RISK SCORING LOGIC
// ============================================================

/**
 * Calculate risk score for a URL based on multiple criteria
 * Returns a score from 0-100
 */
function calculateUrlRiskScore(urlString) {
  let score = 0;
  
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.toLowerCase();
    const fullUrl = urlString.toLowerCase();

    // +30 if URL contains suspicious keywords
    const suspiciousKeywords = ['login', 'verify', 'confirm', 'update', 'account', 'security', 'authenticate'];
    if (suspiciousKeywords.some(kw => fullUrl.includes(kw))) {
      score += 30;
    }

    // +20 if URL is very short (typically suspicious)
    if (urlString.length < 12) {
      score += 20;
    }

    // +40 if scheme is http:// (not https)
    if (url.protocol === 'http:') {
      score += 40;
    }

    // +30 if TLD is suspicious
    const suspiciousTLDs = ['.xyz', '.top', '.info', '.click', '.download', '.online', '.site', '.space'];
    if (suspiciousTLDs.some(tld => hostname.endsWith(tld))) {
      score += 30;
    }

    // +15 if hostname length is unusual (very long or very short)
    if (hostname.length > 50 || hostname.length < 3) {
      score += 15;
    }

    // +10 if URL uses IP address instead of domain
    if (/^\d+\.\d+\.\d+\.\d+/.test(hostname)) {
      score += 10;
    }

    // +20 if contains base64 or encoded content
    if (fullUrl.includes('%') || (fullUrl.includes('=') && fullUrl.includes('&'))) {
      score += 20;
    }

  } catch (err) {
    console.warn('[calculateUrlRiskScore] Error parsing URL:', err.message);
  }

  // Clamp score to 0-100
  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate risk score for an IP address (basic logic)
 */
function calculateIpRiskScore(ip) {
  let score = 0;
  
  // Check if private IP
  const parts = ip.split('.');
  if (parts.length === 4) {
    const firstOctet = parseInt(parts[0]);
    // Private IP ranges: 10.x.x.x, 127.x.x.x, 172.16-31.x.x, 192.168.x.x
    if (firstOctet === 10 || firstOctet === 127 || (firstOctet === 172 && parseInt(parts[1]) >= 16 && parseInt(parts[1]) <= 31) || (firstOctet === 192 && parseInt(parts[1]) === 168)) {
      return 0; // Private IPs are safe
    }
  }

  return score;
}

// ============================================================
// IPQS API UTILITIES
// ============================================================

/**
 * Call IPQS API for URL scanning
 */
async function scanUrlWithIPQS(targetUrl) {
  const encodedUrl = encodeURIComponent(targetUrl);
  const api = `${IPQS_URL_BASE}url/${IPQS_KEY}/${encodedUrl}`;
  console.log('[scanUrlWithIPQS] Calling:', api);
  
  try {
    const resp = await axios.get(api, { 
      timeout: 15000,
      headers: { 'User-Agent': 'CyberGuard-Scanner' }
    });
    console.log('[scanUrlWithIPQS] Success, risk_score:', resp.data.risk_score);
    return resp.data;
  } catch (err) {
    console.error('[scanUrlWithIPQS] Error:', err.message);
    throw err;
  }
}

/**
 * Call IPQS API for IP scanning
 */
async function scanIpWithIPQS(ip) {
  const api = `${IPQS_URL_BASE}ip/${IPQS_KEY}/${ip}`;
  console.log('[scanIpWithIPQS] Calling:', api);
  
  try {
    const resp = await axios.get(api, { timeout: 15000 });
    console.log('[scanIpWithIPQS] Success, risk_score:', resp.data.risk_score);
    return resp.data;
  } catch (err) {
    console.error('[scanIpWithIPQS] Error:', err.message);
    throw err;
  }
}

// ============================================================
// DATABASE UTILITIES
// ============================================================

/**
 * Save an alert to the database
 */
async function saveAlert(target, type, riskScore, ipqsData = null) {
  try {
    const alert = new Alert({
      target,
      type,
      riskScore,
      raw: ipqsData || {},
      flagged: riskScore >= 50
    });
    await alert.save();
    console.log(`[saveAlert] Saved alert: ${target} (score: ${riskScore})`);
    return alert;
  } catch (err) {
    console.error('[saveAlert] Error:', err.message);
    throw err;
  }
}

// ============================================================
// ENDPOINTS
// ============================================================

/**
 * POST /api/scan-url
 * Manual URL scan endpoint
 * Body: { url: "https://example.com" }
 */
router.post('/api/scan-url', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    console.log(`[POST /api/scan-url] Scanning URL: ${url}`);

    // Calculate local risk score
    let riskScore = calculateUrlRiskScore(url);
    let ipqsData = null;

    // Try to get IPQS data if available
    if (IPQS_KEY) {
      try {
        ipqsData = await scanUrlWithIPQS(url);
        // Use IPQS risk_score if available and higher than our calculation
        if (ipqsData && typeof ipqsData.risk_score === 'number') {
          riskScore = Math.max(riskScore, ipqsData.risk_score);
        }
      } catch (err) {
        console.warn('[POST /api/scan-url] IPQS failed, using local score only');
        // Fall back to local scoring
      }
    }

    // Clamp to 0-100
    riskScore = Math.min(100, Math.max(0, riskScore));

    // Save to database if connected
    let alert = null;
    if (global.DB_CONNECTED) {
      alert = await saveAlert(url, 'url', riskScore, ipqsData);
    }

    res.json({
      success: true,
      data: {
        target: url,
        type: 'url',
        riskScore,
        threat: riskScore >= 50 ? 'HIGH' : (riskScore >= 25 ? 'MEDIUM' : 'LOW'),
        flagged: riskScore >= 50,
        raw: ipqsData || null,
        _id: alert?._id || null
      }
    });

  } catch (err) {
    console.error('[POST /api/scan-url] Error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/scan-ip
 * Manual IP scan endpoint
 * Body: { ip: "1.2.3.4" }
 */
router.post('/api/scan-ip', async (req, res) => {
  try {
    const { ip } = req.body;

    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'IP is required'
      });
    }

    console.log(`[POST /api/scan-ip] Scanning IP: ${ip}`);

    // Calculate local risk score
    let riskScore = calculateIpRiskScore(ip);
    let ipqsData = null;

    // Try to get IPQS data if available
    if (IPQS_KEY) {
      try {
        ipqsData = await scanIpWithIPQS(ip);
        // Use IPQS risk_score if available and higher than our calculation
        if (ipqsData && typeof ipqsData.risk_score === 'number') {
          riskScore = Math.max(riskScore, ipqsData.risk_score);
        }
      } catch (err) {
        console.warn('[POST /api/scan-ip] IPQS failed, using local score only');
        // Fall back to local scoring
      }
    }

    // Clamp to 0-100
    riskScore = Math.min(100, Math.max(0, riskScore));

    // Save to database if connected
    let alert = null;
    if (global.DB_CONNECTED) {
      alert = await saveAlert(ip, 'ip', riskScore, ipqsData);
    }

    res.json({
      success: true,
      data: {
        target: ip,
        type: 'ip',
        riskScore,
        threat: riskScore >= 50 ? 'HIGH' : (riskScore >= 25 ? 'MEDIUM' : 'LOW'),
        flagged: riskScore >= 50,
        raw: ipqsData || null,
        _id: alert?._id || null
      }
    });

  } catch (err) {
    console.error('[POST /api/scan-ip] Error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/recent-alerts
 * Get the most recent scans/alerts
 */
router.get('/api/recent-alerts', async (req, res) => {
  try {
    if (!global.DB_CONNECTED) {
      return res.json({
        success: true,
        data: []
      });
    }

    const alerts = await Alert.find().sort({ createdAt: -1 }).limit(20);

    res.json({
      success: true,
      data: alerts
    });

  } catch (err) {
    console.error('[GET /api/recent-alerts] Error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/history
 * Get scan history
 */
router.get('/api/history', async (req, res) => {
  try {
    if (!global.DB_CONNECTED) {
      return res.json({
        success: true,
        data: []
      });
    }

    const history = await Alert.find().sort({ createdAt: -1 }).limit(50);

    res.json({
      success: true,
      data: history
    });

  } catch (err) {
    console.error('[GET /api/history] Error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * DELETE /api/history/clear
 * Clear all scan history
 */
router.delete('/api/history/clear', async (req, res) => {
  try {
    if (!global.DB_CONNECTED) {
      return res.json({
        success: true,
        data: { deleted: 0 }
      });
    }

    const result = await Alert.deleteMany({});

    res.json({
      success: true,
      data: {
        deleted: result.deletedCount
      }
    });

  } catch (err) {
    console.error('[DELETE /api/history/clear] Error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/tabs
 * Get all open tabs that were reported
 */
router.get('/api/tabs', async (req, res) => {
  try {
    const tabs = global.openTabs || [];

    res.json({
      success: true,
      data: tabs
    });

  } catch (err) {
    console.error('[GET /api/tabs] Error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * DELETE /api/tabs/clear
 * Clear all reported tabs
 */
router.delete('/api/tabs/clear', async (req, res) => {
  try {
    const deletedCount = (global.openTabs || []).length;
    global.openTabs = [];

    res.json({
      success: true,
      data: {
        deleted: deletedCount
      }
    });

  } catch (err) {
    console.error('[DELETE /api/tabs/clear] Error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/tabs/report
 * Report open tabs from browser extension
 * Body: { tabs: [...] }
 */
router.post('/api/tabs/report', async (req, res) => {
  try {
    const { tabs } = req.body;

    if (!Array.isArray(tabs)) {
      return res.status(400).json({
        success: false,
        error: 'tabs must be an array'
      });
    }

    // Store tabs in global memory
    global.openTabs = tabs;
    console.log(`[POST /api/tabs/report] Reported ${tabs.length} open tabs`);

    res.json({
      success: true,
      data: {
        stored: tabs.length,
        tabs
      }
    });

  } catch (err) {
    console.error('[POST /api/tabs/report] Error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date(),
      db: global.DB_CONNECTED ? 'connected' : 'offline'
    }
  });
});

module.exports = router;

