const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();

// Required for Render to correctly identify the protocol (http vs https) 
// and handle external requests from PayHero
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from "public"
app.use(express.static(path.join(__dirname, 'public')));

// Memory storage to track successful payments
// Key: external_reference (e.g., VIP_123456789), Value: true
let paidUsers = {};

// 1. HOME ROUTE
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. STK PUSH INITIATION (If using custom button)
app.post('/payment/checkout', async (req, res) => {
    const { phone } = req.body;

    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith("0")) {
        formattedPhone = "254" + formattedPhone.substring(1);
    }

    const checkoutId = "VIP_" + Date.now();

    try {
        await axios.post(
            'https://backend.payhero.co.ke/api/v2/payments',
            {
                amount: 1, // Matching your frontend requirement
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
        res.status(500).json({ success: false, message: "M-Pesa initiation failed" });
    }
});

// 3. THE WEBHOOK / CALLBACK (Critical for PayHero)
// PayHero hits this URL when the transaction is finished
app.post('/payment/callback', (req, res) => {
    const data = req.body;

    console.log("🔔 Callback received:", data);

    // PayHero v2 uses 'status' or 'ResponseCode'
    if (data.status === "Success" || data.ResponseCode === "0") {
        const ref = data.external_reference;
        paidUsers[ref] = true; 
        console.log(`✅ Reference ${ref} successfully paid.`);
    }

    // Always respond with 200 OK so PayHero knows you received the data
    res.status(200).send("Webhook Received");
});

// 4. PAYMENT STATUS CHECK
// The frontend polls this every 3 seconds
app.get('/payment/status/:id', (req, res) => {
    const referenceId = req.params.id;

    if (paidUsers[referenceId]) {
        res.json({ status: "paid" });
    } else {
        res.json({ status: "pending" });
    }
});

// 5. WHATSAPP REDIRECT
app.get('/join', (req, res) => {
    const link = process.env.WHATSAPP_LINK || "https://chat.whatsapp.com/JSlEJalFg0ILPxOjyuoV6L?mode=gi_t";
    res.redirect(link);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
