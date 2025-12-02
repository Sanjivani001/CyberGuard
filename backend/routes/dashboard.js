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

module.exports = router;

