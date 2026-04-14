const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(express.json());

// Serve static files from "public" folder (CSS, JS, images if you use it)
app.use(express.static(path.join(__dirname, 'public')));

// Temporary storage to track successful payments
let paidUsers = {};

// =======================
// 1. HOME ROUTE (NEW FIX)
// =======================
// This makes index.html open when user visits "/"
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// =======================
// 2. STK PUSH INITIATION
// =======================
app.post('/payment/checkout', async (req, res) => {
    const { phone } = req.body;

    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith("0")) {
        formattedPhone = "254" + formattedPhone.substring(1);
    }

    const checkoutId = "INV" + Date.now();

    try {
        await axios.post(
            'https://backend.payhero.co.ke/api/v2/payments',
            {
                amount:1 ,
                phone_number: formattedPhone,
                channel_id: process.env.PAYHERO_SERVICE_ID,
                provider: "m-pesa",
                external_reference: checkoutId,
                callback_url: process.env.CALLBACK_URL
            },
            {
                auth: {
                    username: process.env.PAYHERO_USERNAME,
                    password: process.env.PAYHERO_PASSWORD
                }
            }
        );

        res.json({
            success: true,
            checkoutId: checkoutId
        });

    } catch (error) {
        console.error("Payment error:", error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: "M-Pesa initiation failed"
        });
    }
});

// =======================
// 3. CALLBACK (PAYHERO)
// =======================
app.post('/payment/callback', (req, res) => {
    const data = req.body;

    console.log("Callback received:", data);

    if (data.status === "Success" || data.ResponseCode === "0") {
        console.log(`✅ Payment verified: ${data.phone_number} paid ${data.amount}`);

        paidUsers[data.external_reference] = true;
    }

    res.sendStatus(200);
});

// =======================
// 4. PAYMENT STATUS CHECK
// =======================
app.get('/payment/status/:id', (req, res) => {
    const id = req.params.id;

    if (paidUsers[id]) {
        res.json({ status: "paid" });
    } else {
        res.json({ status: "pending" });
    }
});

// =======================
// 5. WHATSAPP REDIRECT
// =======================
app.get('/join', (req, res) => {
    res.redirect(process.env.WHATSAPP_LINK);
});

// =======================
// START SERVER
// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});