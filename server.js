const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Temporary storage to track successful payments (In production, use a Database)
let paidUsers = {}; 

// 1. STK PUSH INITIATION
app.post('/payment/checkout', async (req, res) => {
    const { phone } = req.body;
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith("0")) formattedPhone = "254" + formattedPhone.substring(1);

    const checkoutId = "INV" + Date.now();

    try {
        await axios.post('https://backend.payhero.co.ke/api/v2/payments', {
            amount: 2000,
            phone_number: formattedPhone,
            channel_id: process.env.PAYHERO_SERVICE_ID,
            provider: "m-pesa",
            external_reference: checkoutId,
            callback_url: process.env.CALLBACK_URL
        }, {
            auth: { username: process.env.PAYHERO_USERNAME, password: process.env.PAYHERO_PASSWORD }
        });

        res.json({ success: true, checkoutId: checkoutId });
    } catch (error) {
        res.status(500).json({ success: false, message: "M-Pesa fail" });
    }
});

// 2. THE CALLBACK (Payhero calls this when payment is COMPLETE)
app.post('/payment/callback', (req, res) => {
    const data = req.body;
    
    // Check if Payhero says Success
    if (data.status === "Success" || data.ResponseCode === "0") {
        console.log(`✅ Verified: ${data.phone_number} paid ${data.amount}`);
        // Mark this reference as paid
        paidUsers[data.external_reference] = true;
    }
    res.sendStatus(200);
});

// 3. CHECK STATUS (Frontend asks: "Did they pay yet?")
app.get('/payment/status/:id', (req, res) => {
    const id = req.params.id;
    if (paidUsers[id]) {
        res.json({ status: "paid" });
    } else {
        res.json({ status: "pending" });
    }
});

app.get('/join', (req, res) => {
    res.redirect(process.env.WHATSAPP_LINK);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on ${PORT}`));
