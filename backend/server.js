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

// Debug: log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// attach routes
app.use(scanRouter);
app.use(dashboardRouter);

// root route -> index page
app.get('/', async (req, res) => {
  try {
    const Alert = require('./models/Alert');
    const alerts = await Alert.find().sort({ createdAt: -1 }).limit(100);
    const scans = alerts.map(a => ({ target: a.target, riskScore: a.riskScore, flagged: a.flagged, createdAt: a.createdAt }));
    res.render('index', { result: null, error: null, scans });
  } catch (e) {
    console.error('root render error', e.message || e);
    res.render('index', { result: null, error: null, scans: [] });
  }
});

// Auto-monitoring: periodically scan MONITOR_URLS from .env
const monitorList = (process.env.MONITOR_URLS || '').split(',').map(s => s.trim()).filter(Boolean);
const SCAN_INTERVAL_MS = Number(process.env.SCAN_INTERVAL_MS || 300000);
const THRESH = Number(process.env.RISK_THRESHOLD || 50);

// IPQS URL base (keep only one 'url' segment here; we'll append key + encoded target later)
const IPQS_BASE = 'https://ipqualityscore.com/api/json/';

async function scanTarget(target) {
  try {
    const api = `${IPQS_BASE}url/${process.env.IPQS_KEY}/${encodeURIComponent(target)}`;
    const res = await axios.get(api, { timeout: 15000 });
    const data = res.data;
    const score = data.risk_score || 0;
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

function startAutoMonitoring() {
  if (monitorList.length === 0) return console.log('No MONITOR_URLS set — auto-monitor disabled');

  console.log('Auto-monitoring', monitorList, 'every', SCAN_INTERVAL_MS, 'ms');
  // run immediately once
  monitorList.forEach(t => scanTarget(t));
  // schedule
  setInterval(() => {
    monitorList.forEach(t => scanTarget(t));
  }, SCAN_INTERVAL_MS);
}

// Connect to MongoDB and start the server only after the DB is available.
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI, {
  // make sure Mongoose fails fast if it cannot connect, so the app doesn't attempt writes while buffering
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  // keep defaults for other options
})
  .then(() => {
    console.log('MongoDB connected');
    // only now we start auto-monitoring
    startAutoMonitoring();

    app.listen(PORT, () => console.log('Server running on port', PORT));
  })
  .catch(err => {
    // If developer explicitly allows offline start, run server without DB (dev convenience)
    if (process.env.ALLOW_OFFLINE_START === 'true') {
      console.warn('MongoDB connection failed, starting in offline mode (ALLOW_OFFLINE_START=true).', err.message || err);
      global.DB_CONNECTED = false;
      // start server anyway
      app.listen(PORT, () => console.log('Server running on port', PORT, '(offline mode)'));
    } else {
      // Make the error more visible and exit — this avoids a partially running server that will time out writes
      console.error('MongoDB connection error. Server will not start.', err);
      process.exit(1);
    }
  });

