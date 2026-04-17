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

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Database Connected Successfully"))
    .catch(err => console.log(err));

// Nodemailer Setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'naviyadark3@gmail.com', 
        pass: 'nefh kmos vids tjol' 
    }
});

// තාවකාලිකව OTP තැන්පත් කිරීමට
let tempUsers = {};

// 1. මුල් පිටුව
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 2. Sign Up - OTP එකක් යැවීම
app.post('/auth/signup', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.send("Email already registered!");

        const otp = Math.floor(100000 + Math.random() * 900000); // 6 Digit OTP
        tempUsers[email] = { name, email, password, otp };

        const mailOptions = {
            from: 'NaviyaDew <Naviyadark3@gmail.com>',
            to: email,
            subject: 'Account Verification Code',
            html: `
                <div style="font-family: sans-serif; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #3b82f6;">Welcome to NaviyaDew API</h2>
                    <p>ඔබේ ගිණුම තහවුරු කිරීමට පහත කේතය භාවිතා කරන්න:</p>
                    <h1 style="letter-spacing: 5px; color: #1e293b; background: #f1f5f9; padding: 10px; display: inline-block;">${otp}</h1>
                    <p style="font-size: 12px; color: #64748b; margin-top: 20px;">මෙය ඔබ ඉල්ලූ කේතයක් නොවේ නම් කරුණාකර මෙම පණිවිඩය නොසලකා හරින්න.</p>
                </div>
            `
        };

        transporter.sendMail(mailOptions, (err) => {
            if (err) return res.send("Email sending failed: " + err.message);
            
            // OTP එක ඇතුළත් කරන UI එක
            res.send(`
                <body style="background:#0f172a; color:white; font-family:sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0;">
                    <form action="/auth/verify" method="POST" style="background:#1e293b; padding:2rem; border-radius:15px; text-align:center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 320px;">
                        <h2 style="color:#3b82f6;">OTP Verification</h2>
                        <p style="color:#94a3b8; font-size:14px;">We sent a code to <b>${email}</b></p>
                        <input type="hidden" name="email" value="${email}">
                        <input type="text" name="otp" placeholder="Enter 6-digit OTP" required maxlength="6" style="padding:12px; border-radius:8px; border:none; width:100%; margin-bottom:15px; text-align:center; font-size:18px; font-weight:bold;">
                        <button type="submit" style="background:#2563eb; color:white; padding:12px; border:none; border-radius:8px; cursor:pointer; width:100%; font-weight:bold;">Verify Account</button>
                    </form>
                </body>
            `);
        });
    } catch (e) { res.send("Error: " + e.message); }
});

// 3. Verify OTP - Account එක සෑදීම
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
            res.send(`
                <body style="background:#0f172a; color:white; font-family:sans-serif; display:flex; justify-content:center; align-items:center; height:100vh;">
                    <div style="text-align:center;">
                        <h1 style="color:#10b981;">Account Verified!</h1>
                        <p>ඔබගේ ගිණුම සාර්ථකව සාදන ලදී.</p>
                        <a href="/" style="background:#3b82f6; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">Login Now</a>
                    </div>
                </body>
            `);
        } catch (dbErr) { res.send("Database Error: " + dbErr.message); }
    } else {
        res.send("<h1>Invalid or Expired OTP!</h1><a href='/'>Try Again</a>");
    }
});

// 4. Login
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (user && await bcrypt.compare(password, user.password)) {
            res.send(`
                <body style="background:#0f172a; color:white; font-family:sans-serif; padding:20px;">
                    <div style="max-width:600px; margin:auto; background:#1e293b; padding:20px; border-radius:10px;">
                        <h1 style="color:#3b82f6;">Welcome Back, ${user.name}!</h1>
                        <p>ඔබගේ API Key එක පහතින් දැක්වේ:</p>
                        <div style="background:#0f172a; padding:15px; border-radius:5px; border:1px dashed #3b82f6; font-family:monospace; font-size:18px; color:#10b981; word-break:break-all;">
                            ${user.apiKey}
                        </div>
                        <p style="color:#ef4444; font-size:12px; mt-10px;">*මෙම Key එක කිසිවෙකු සමඟ බෙදා නොගන්න.</p>
                    </div>
                </body>
            `);
        } else {
            res.send("Invalid Email or Password! <a href='/'>Go Back</a>");
        }
    } catch (e) { res.send(e.message); }
});

module.exports = app;
