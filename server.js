
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import Models
const User = require('./models/User');
const Skill = require('./models/Skill');
// (You would create System/Log models similarly)

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'skillflow_secret_key_123';

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
// Replace with your actual connection string from MongoDB Atlas
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/skillflow';

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// --- Middleware: Verify Token ---
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    res.status(400).json({ msg: 'Token is not valid' });
  }
};

// --- API Routes ---

// 1. Register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    // Auto-assign admin role for specific email
    const isAdmin = email === 'hamidulhaquetitas@gmail.com';

    const newUser = new User({
      name,
      email,
      password,
      role: role || (isAdmin ? 'admin' : 'user'),
      joinedAt: new Date().toISOString()
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    newUser.password = await bcrypt.hash(password, salt);

    await newUser.save();

    const token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// 2. Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// 3. Get Skills (Protected)
app.get('/api/skills', auth, async (req, res) => {
  try {
    const skills = await Skill.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(skills);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// 4. Sync/Save Skills (Protected)
// Note: For simplicity in this hybrid mode, we are sending the full array. 
// Ideally, you would have specific endpoints for add/delete entry.
app.post('/api/skills/sync', auth, async (req, res) => {
  try {
    const { skills } = req.body;
    // Delete existing skills for this user to replace with new state (Naive Sync)
    await Skill.deleteMany({ userId: req.user.id });

    const skillDocs = skills.map(s => ({
      ...s,
      userId: req.user.id
    }));

    await Skill.insertMany(skillDocs);
    res.json({ msg: 'Synced successfully' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
