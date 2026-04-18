/* * -----------------------------------------------------------
 * PROJECT      : NaviyaDew API Ecosystem
 * DEVELOPER    : Nimsara Navidu (Naviya)
 * VERSION      : 1.0.5
 * STATUS       : Production Ready | Horana, SL
 * -----------------------------------------------------------
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const path = require('path');
const User = require('./models/User');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// MongoDB Connection with Developer Branding
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("=======================================");
        console.log("   NAVIYADEW API SERVER IS ACTIVE      ");
        console.log("   Developed by: Naviya (Horana)       ");
        console.log("   Database Connection: SECURED        ");
        console.log("=======================================");
    })
    .catch(err => console.log("DB Connection Error: ", err));

// Nodemailer Setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'naviyadark3@gmail.com', 
        pass: 'nefh kmos vids tjol' 
    }
});

let tempUsers = {};

// 1. Root Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 2. Sign Up - OTP with Premium UI
app.post('/auth/signup', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.send("Email already registered!");

        const otp = Math.floor(100000 + Math.random() * 900000);
        tempUsers[email] = { name, email, password, otp };

        const mailOptions = {
            from: 'NaviyaDew <Naviyadark3@gmail.com>',
            to: email,
            subject: 'Account Verification Code',
            html: `
                <div style="font-family: sans-serif; background: #0f172a; padding: 40px; color: white; border-radius: 20px; text-align: center;">
                    <h1 style="color: #3b82f6; font-size: 32px;">NaviyaDew API</h1>
                    <p style="font-size: 18px; color: #94a3b8;">Welcome! Here is your access code:</p>
                    <div style="background: rgba(255,255,255,0.1); padding: 20px; display: inline-block; border-radius: 10px; border: 1px solid #3b82f6;">
                        <h1 style="letter-spacing: 10px; margin: 0; color: #60a5fa;">${otp}</h1>
                    </div>
                    <p style="font-size: 12px; color: #64748b; margin-top: 30px;">If you didn't request this, just ignore it.</p>
                </div>
            `
        };

        transporter.sendMail(mailOptions, (err) => {
            if (err) return res.send("Email sending failed: " + err.message);
            
            // Premium Glassmorphism OTP Verification UI
            res.send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Verify Access | NaviyaDew</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet">
                    <style>
                        body { font-family: 'Poppins', sans-serif; background: radial-gradient(circle at top, #1e1b4b, #020617); height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
                        .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(15px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; box-shadow: 0 12px 60px rgba(0,0,0,0.6); }
                        .otp-input { background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.1); color: #60a5fa; letter-spacing: 0.5rem; text-align: center; transition: all 0.3s; }
                        .otp-input:focus { border-color: #3b82f6; box-shadow: 0 0 15px rgba(59, 130, 246, 0.4); outline: none; }
                    </style>
                </head>
                <body class="p-4">
                    <div class="glass p-10 w-full max-w-md text-center">
                        <h2 class="text-3xl font-bold text-white mb-2">Final Step</h2>
                        <p class="text-slate-400 mb-8 font-light">Enter the 6-digit code sent to <br><span class="text-blue-400 font-medium">${email}</span></p>
                        <form action="/auth/verify" method="POST" class="space-y-6">
                            <input type="hidden" name="email" value="${email}">
                            <input type="text" name="otp" placeholder="000000" maxlength="6" required class="otp-input w-full p-4 rounded-xl text-3xl font-bold">
                            <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-xl font-bold shadow-lg shadow-blue-900/40 transition">
                                Activate Account
                            </button>
                        </form>
                    </div>
                </body>
                </html>
            `);
        });
    } catch (e) { res.send("Error: " + e.message); }
});

// 3. Verify OTP
app.post('/auth/verify', async (req, res) => {
    const { email, otp } = req.body;
    const userData = tempUsers[email];

    if (userData && userData.otp == otp) {
        try {
            const hashedPassword = await bcrypt.hash(userData.password, 10);
            const newUser = new User({
                name: userData.name,
                email: userData.email,
                password: hashedPassword,
                apiKey: uuidv4()
            });

            await newUser.save();
            delete tempUsers[email];
            
            // Success Message with Premium Feel
            res.send(`
                <body style="background:#020617; color:white; font-family:sans-serif; display:flex; justify-content:center; align-items:center; height:100vh;">
                    <div style="text-align:center; background:rgba(255,255,255,0.05); padding:40px; border-radius:20px; border:1px solid #10b981;">
                        <h1 style="color:#10b981; font-size:30px;">Verification Successful!</h1>
                        <p style="color:#94a3b8; margin-bottom:20px;">Your account is ready for development.</p>
                        <a href="/" style="background:#3b82f6; color:white; padding:12px 25px; text-decoration:none; border-radius:10px; font-weight:bold;">Log In Now</a>
                    </div>
                </body>
            `);
        } catch (dbErr) { res.send("Database Error: " + dbErr.message); }
    } else {
        res.send("<h1>Invalid OTP!</h1><a href='/'>Try Again</a>");
    }
});

// 4. Login - Redirection with Parameters (Fixes UI Mixing)
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (user && await bcrypt.compare(password, user.password)) {
            // Redirect to dashboard with data in URL
            res.redirect(`/dashboard.html?key=${user.apiKey}&name=${encodeURIComponent(user.name)}`);
        } else {
            res.send("<h1>Invalid Login!</h1><a href='/'>Go Back</a>");
        }
    } catch (e) { res.send(e.message); }
});

module.exports = app;
