const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

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
            auth: { username: process.env.PAYHERO_USERNAME, password: process.env.PAYHERO_PASSWORD }
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// 2. Callback (Where Payhero sends payment confirmation)
app.post('/payment/callback', (req, res) => {
    console.log("Payment Received:", req.body);
    res.sendStatus(200);
});

// 3. WhatsApp Redirect
app.get('/join', (req, res) => {
    res.redirect(process.env.WHATSAPP_LINK);
});

app.listen(process.env.PORT || 3000);
