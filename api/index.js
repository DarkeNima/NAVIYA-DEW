require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// =============================================
// 🟢 MongoDB Connection Cache for Vercel
// =============================================
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000, // 5s timeout
      socketTimeoutMS: 45000,
    };

    const MONGO_URI = process.env.MONGO_URI;
    
    if (!MONGO_URI) {
      throw new Error('Please define the MONGO_URI environment variable inside .env.local');
    }

    cached.promise = mongoose.connect(MONGO_URI, opts).then((mongoose) => {
      console.log('✅ MongoDB Connected Successfully!');
      return mongoose;
    }).catch(err => {
      console.error('❌ MongoDB Connection Error:', err.message);
      throw err;
    });
  }
  
  cached.conn = await cached.promise;
  return cached.conn;
}

// SERVER START KARANNA MONGODB CONNECT WUNATA PASSE WITARAI
dbConnect().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to connect to MongoDB, server not started.');
  process.exit(1);
});

// =============================================
// 📧 Nodemailer Setup
// =============================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Helper: OTP Generate karana eka
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper: API Key Generate karana eka
function generateApiKey() {
    return uuidv4();
}

// =============================================
// 🚪 API Endpoints
// =============================================

// 1. User Signup (Send OTP)
app.post('/api/signup', async (req, res) => {
  try {
    await dbConnect(); // <--- MEKA ADU KARANNA EPA!
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const user = new User({
        name,
        email,
        password: hashedPassword,
        apiKey: generateApiKey(),
        isVerified: false,
        otp,
        otpExpires
    });

    await user.save();

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'NaviyaDew - Verify Your Email',
        text: `Your OTP code is: ${otp}. It expires in 10 minutes.`
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ 
        message: 'Signup successful! Please check your email for OTP.',
        email: email
    });

  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// 2. Verify OTP
app.post('/api/verify-otp', async (req, res) => {
  try {
    await dbConnect(); // <--- MEKA ADU KARANNA EPA!
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    if (user.otpExpires < new Date()) return res.status(400).json({ error: 'OTP has expired' });

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.json({ message: 'Email verified successfully! You can now login.', apiKey: user.apiKey });
  } catch (error) {
    console.error('Verify Error:', error);
    res.status(500).json({ error: 'Server error during verification' });
  }
});

// 3. Login (MEKA THAMA OYAGE ERROR EKA GIYA THANA)
app.post('/api/login', async (req, res) => {
  try {
    await dbConnect(); // <--- MEKA ADU KARANNA EPA!
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email first' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

    res.json({
        message: 'Login successful!',
        user: { id: user._id, name: user.name, email: user.email, apiKey: user.apiKey }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// 4. Resend OTP (Optional)
app.post('/api/resend-otp', async (req, res) => {
  try {
    await dbConnect(); // <--- MEKA ADU KARANNA EPA!
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isVerified) return res.status(400).json({ error: 'User already verified' });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const mailOptions = { from: process.env.EMAIL_USER, to: email, subject: 'NaviyaDew - New OTP Code', text: `Your new OTP code is: ${otp}` };
    await transporter.sendMail(mailOptions);

    res.json({ message: 'New OTP sent to your email' });
  } catch (error) {
    console.error('Resend Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Fallback route for frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
});
