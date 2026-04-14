const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 🔥 memory store (use DB later if scaling)
let payments = {};

// ==========================
// 1. STK PUSH (PAY REQUEST)
// ==========================
app.post('/payment/checkout', async (req, res) => {
    const { phone } = req.body;

    try {
        const response = await axios.post(
            'https://backend.payhero.co.ke/api/v2/payments',
            {
                amount: 2000,
                phone_number: phone,
                channel_id: process.env.PAYHERO_SERVICE_ID,
                provider: "m-pesa",
                external_reference: "INV_" + Date.now(),
                callback_url: process.env.CALLBACK_URL
            },
            {
                auth: {
                    username: process.env.PAYHERO_USERNAME,
                    password: process.env.PAYHERO_PASSWORD
                }
            }
        );

        console.log("PAY REQUEST SUCCESS:", response.data);

        res.json({
            success: true,
            message: "STK sent",
            data: response.data
        });

    } catch (err) {
        console.log("PAY ERROR:", err.response?.data || err.message);

        res.status(500).json({
            success: false,
            error: err.response?.data || err.message
        });
    }
});

// ==========================
// 2. CALLBACK (PAYMENT CONFIRMATION)
// ==========================
app.post('/payment/callback', (req, res) => {
    const data = req.body;

    console.log("CALLBACK RECEIVED:", data);

    const phone = data.phone_number;
    const status = data.status;

    if (status === "SUCCESS") {
        payments[phone] = true;
    }

    res.sendStatus(200);
});

// ==========================
// 3. CHECK PAYMENT STATUS
// ==========================
app.get('/payment/status', (req, res) => {
    const phone = req.query.phone;

    res.json({
        paid: payments[phone] === true
    });
});

// ==========================
// 4. WHATSAPP REDIRECT
// ==========================
app.get('/join', (req, res) => {
    res.redirect(process.env.WHATSAPP_LINK);
});

// ==========================
// START SERVER
// ==========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));