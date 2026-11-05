const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const { readJson, writeJson } = require('../store');
const { sign, authRequired } = require('../middleware/auth');

const router = express.Router();
const USERS_FILE = 'users.json';

function getUsers() {
  return readJson(USERS_FILE, []);
}

router.post('/register', async (req, res) => {
  const { name = '', email = '', password = '' } = req.body || {};
  if (!email.trim() || !password || password.length < 6) {
    return res.status(400).json({ error: 'Email and password (min 6 chars) required' });
  }
  const users = getUsers();
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: 'Email already registered' });
  }
  const user = {
    id: uuid(),
    name: name.trim() || email.split('@')[0],
    email: email.trim(),
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeJson(USERS_FILE, users);
  const token = sign(user);
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

router.post('/login', async (req, res) => {
  const { email = '', password = '' } = req.body || {};
  const users = getUsers();
  const user = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = sign(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

router.get('/me', authRequired, (req, res) => {
  const users = getUsers();
  const user = users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email });
});

module.exports = router;
