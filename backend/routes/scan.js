const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const Alert = require('../models/Alert');

const IPQS_KEY = process.env.IPQS_KEY;

// Scan IP using IPQS API
router.post('/scan-ip', async (req, res) => {
    try {
        const { ip } = req.body;
        const response = await fetch(`https://ipqualityscore.com/api/json/ip/${IPQS_KEY}/${ip}`);
        const data = await response.json();

        // Save to DB
        const alert = new Alert({
            input: ip,
            type: 'IP',
            riskScore: data.fraud_score,
            details: data
        });
        await alert.save();

        res.json({ success: true, result: data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;
