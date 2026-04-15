const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(express.json());

// Serve index.html from ROOT
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// TEMP STORAGE
let payments = {};

// =======================
// 1. INITIATE PAYMENT
// =======================
app.post('/pay', async (req, res) => {
    const { phone, orderId } = req.body;

    try {
        await axios.post(
            'https://api.lipana.dev/v1/checkout',
            {
                msisdn: phone,
                amount: 10,
                account_reference: orderId,
                callback_url: "https://hero-kro9.onrender.com/callback"
            },
            {
                headers: {
                    Authorization: 'Bearer lip_sk_live_e6fa1b97c7dffb5126e856b9d62a900baf96b17d5d66a68aa470ceb21de4bd1d',
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json({ success: true });

    } catch (err) {
        console.log(err.response?.data || err.message);
        res.status(500).json({ error: "STK failed" });
    }
});

// =======================
// 2. CALLBACK (SECURE)
// =======================
app.post('/callback', (req, res) => {

    const webhookSecret = "ec5fb0505dbd5b42260b584b8261f30244e879999f450b713f88cdca0695a99c";

    const signature = req.headers['x-lipana-signature'] || req.headers['x-signature'];

    const hash = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

    if (signature && signature !== hash) {
        console.log("Invalid signature");
        return res.status(403).send("Unauthorized");
    }

    console.log("CALLBACK:", req.body);

    const ref = req.body.account_reference || req.body.reference;
    const status = req.body.status || req.body.transaction_status;

    if (status === "SUCCESS" || status === "Completed") {
        payments[ref] = true;
    } else {
        payments[ref] = false;
    }

    res.sendStatus(200);
});

// =======================
// 3. CHECK PAYMENT
// =======================
app.get('/check', (req, res) => {
    const id = req.query.id;

    res.json({
        paid: payments[id] === true
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));