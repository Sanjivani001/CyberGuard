const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');

router.get('/dashboard', async (req, res) => {
  const alerts = await Alert.find().sort({ createdAt: -1 }).limit(200);
  res.render('dashboard', { alerts });
});

router.get('/export-json', async (req, res) => {
  const alerts = await Alert.find().sort({ createdAt: -1 });
  res.setHeader('Content-Disposition', 'attachment; filename=alerts.json');
  res.json(alerts);
});

// API: recent alerts for frontend
router.get('/api/recent-alerts', async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ createdAt: -1 }).limit(100);
    res.json(alerts.map(a => ({
      target: a.target,
      riskScore: a.riskScore,
      flagged: a.flagged,
      createdAt: a.createdAt,
      solution: a.solution || ''
    })));
  } catch (e) {
    console.error('recent-alerts error', e.message || e);
    res.status(500).json([]);
  }
});

module.exports = router;
