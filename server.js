const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Serve frontend (root)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// 1. Send STK Push
app.post('/payment/checkout', async (req, res) => {
    const { phone } = req.body;

    try {
        await axios.post('https://backend.payhero.co.ke/api/v2/payments', {
            amount: 2000,
            phone_number: phone,
            channel_id: process.env.PAYHERO_SERVICE_ID,
            provider: "m-pesa",
            external_reference: "INV" + Date.now(),
            callback_url: process.env.CALLBACK_URL
        }, {
            auth: {
                username: process.env.PAYHERO_USERNAME,
                password: process.env.PAYHERO_PASSWORD
            }
        });

        res.json({ success: true });
    } catch (err) {
        console.log(err.response?.data || err.message);
        res.status(500).json({ success: false });
    }
});

// 2. Callback (PayHero will hit this)
app.post('/payment/callback', (req, res) => {
    console.log("Payment Received:", req.body);
    res.sendStatus(200);
});

// 3. WhatsApp Redirect
app.get('/join', (req, res) => {
    res.redirect(process.env.WHATSAPP_LINK);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));