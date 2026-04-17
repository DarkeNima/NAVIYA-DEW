require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const User = require('./models/User');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// static files පෙන්වීමට
app.use(express.static(path.join(__dirname, '../public')));

// MongoDB සම්බන්ධ කිරීම
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("DB Connected"))
    .catch(err => console.error(err));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.post('/auth/signup', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword, apiKey: uuidv4() });
        await user.save();
        res.send("Account Created! <a href='/'>Login Now</a>");
    } catch (e) { res.send("Error: " + e.message); }
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
        res.send(`<h1>Hi ${user.name}</h1><p>Your API Key: <b>${user.apiKey}</b></p>`);
    } else { res.send("Invalid Login!"); }
});

module.exports = app;
