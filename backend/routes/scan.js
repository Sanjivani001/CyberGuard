const express = require('express');
const router = express.Router();
const axios = require('axios');
const Alert = require('../models/Alert');

const IPQS_KEY = process.env.IPQS_KEY;
const IPQS_URL_BASE = 'https://ipqualityscore.com/api/json/'; // ip or url endpoints: ip/KEY/.. or url/KEY/..

// Utility to call IPQS for URL
async function scanUrl(targetUrl) {
  const api = `${IPQS_URL_BASE}url/${IPQS_KEY}/${encodeURIComponent(targetUrl)}`;
  const resp = await axios.get(api, { timeout: 15000 });
  return resp.data;
}

// Utility to call IPQS for IP (not used in auto flow but available)
async function scanIp(ip) {
  const api = `${IPQS_URL_BASE}ip/${IPQS_KEY}/${ip}`;
  const resp = await axios.get(api, { timeout: 15000 });
  return resp.data;
}

// Manual scan endpoint (used by frontend form & extension)
router.post('/api/scan-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, message: 'URL required' });

    const data = await scanUrl(url);

    const alert = new Alert({
      target: url,
      type: 'url',
      riskScore: data.fraud_score || 0,
      raw: data,
      flagged: (data.fraud_score || 0) >= Number(process.env.RISK_THRESHOLD || 50)
    });
    await alert.save();

    res.json({ success: true, data });
  } catch (err) {
    console.error('scan-url error', err.message || err);
    res.status(500).json({ success: false, message: 'Scan failed' });
  }
});

// simple GET to check API health
router.get('/api/health', (req, res) => res.json({ ok: true }));

module.exports = router;
