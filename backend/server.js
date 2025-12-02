require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const axios = require('axios');

const scanRouter = require('./routes/scan');
const dashboardRouter = require('./routes/dashboard');
const Alert = require('./models/Alert');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// views & static
app.set('views', path.join(__dirname, '..', 'frontend', 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

// attach routes
app.use(scanRouter);
app.use(dashboardRouter);

// root route -> index page
app.get('/', (req, res) => res.render('index', { result: null, error: null }));

// connect DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB err', err));

// Auto-monitoring: periodically scan MONITOR_URLS from .env
const monitorList = (process.env.MONITOR_URLS || '').split(',').map(s => s.trim()).filter(Boolean);
const SCAN_INTERVAL_MS = Number(process.env.SCAN_INTERVAL_MS || 300000);
const THRESH = Number(process.env.RISK_THRESHOLD || 50);

const IPQS_BASE = 'https://ipqualityscore.com/api/json/';

async function scanTarget(target) {
  try {
    const api = `${IPQS_BASE}url/${process.env.IPQS_KEY}/${encodeURIComponent(target)}`;
    const res = await axios.get(api, { timeout: 15000 });
    const data = res.data;
    const score = data.fraud_score || 0;
    const flagged = score >= THRESH;

    // save only if flagged OR save a record (optional)
    const alert = new Alert({
      target,
      type: 'url',
      riskScore: score,
      raw: data,
      flagged
    });
    await alert.save();

    if (flagged) {
      console.log(`[ALERT] ${target} flagged (score=${score})`);
    } else {
      console.log(`[SCAN] ${target} ok (score=${score})`);
    }
  } catch (e) {
    console.error('monitor scan error', target, e.message || e);
  }
}

if (monitorList.length > 0) {
  console.log('Auto-monitoring', monitorList, 'every', SCAN_INTERVAL_MS, 'ms');
  // run immediately once
  monitorList.forEach(t => scanTarget(t));
  // schedule
  setInterval(() => {
    monitorList.forEach(t => scanTarget(t));
  }, SCAN_INTERVAL_MS);
} else {
  console.log('No MONITOR_URLS set — auto-monitor disabled');
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('Server running on port', PORT));
