const router = require('express').Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const passport = require('passport');

const Otp = require('../models/Otp');
const User = require('../models/User');
const sendOtpEmail = require('../utils/sendOtpEmail');
const sendWelcomeEmail = require('../utils/sendWelcomeEmail');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    user = await User.create({ name, email, password: hashedPassword });

    // Generate and send OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
    await sendOtpEmail(email, otp);

    res.json({ message: 'Registration successful. OTP sent to your email.', email });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !user.password) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    // Generate and send OTP for 2FA
    const otp = crypto.randomInt(100000, 999999).toString();
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
    await sendOtpEmail(email, otp);

    res.json({ message: 'Credentials verified. OTP sent to your email.', email });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Google Auth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=oauth_failed` 
  }), 
  (req, res) => {
    try {
      if (!req.user) {
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=no_user`);
      }
      const token = generateToken(req.user._id);
      res.cookie('token', token, { 
        httpOnly: true, 
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      res.redirect(process.env.CLIENT_URL || 'http://localhost:5173');
    } catch (error) {
      console.error('Google Auth Error:', error);
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=server_error`);
    }
  }
);

// Get current user
router.get('/me', async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.json({ user: null });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.json({ user: null });
    res.json({ user });
  } catch (error) {
    res.json({ user: null });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

// Send OTP
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });

  const otp = crypto.randomInt(100000, 999999).toString();

  await Otp.deleteMany({ email });

  await Otp.create({
    email,
    otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  try {
    await sendOtpEmail(email, otp);
    res.json({ message: 'OTP sent' });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to send OTP',
      error: error.message,
    });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return res.status(400).json({ message: 'Email and OTP required' });

  const record = await Otp.findOne({ email });

  if (!record)
    return res.status(400).json({ message: 'No OTP found' });

  if (record.expiresAt < new Date()) {
    await record.deleteOne();
    return res.status(400).json({ message: 'OTP expired' });
  }

  let isMatch = false;

  if (record.otp.length === otp.length) {
    isMatch = crypto.timingSafeEqual(
      Buffer.from(record.otp),
      Buffer.from(otp)
    );
  }

  if (!isMatch)
    return res.status(400).json({ message: 'Invalid OTP' });

  const user = await User.findOneAndUpdate(
    { email },
    { email, isVerified: true },
    { upsert: true, new: true }
  );

  await record.deleteOne();

  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
  });

  res.json({
    message: 'Email verified',
    user: { name: user.name, email: user.email },
  });
});

module.exports = router;
