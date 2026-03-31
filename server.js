const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: 'kitchen_secret_key',
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

const db = mysql.createConnection({
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: 'root123',
  database: 'kitchen_waste_db'
});

db.connect((err) => {
  if (err) { console.log('DB Error:', err); return; }
  console.log('MySQL Connected!');
});

// Register
app.post('/api/register', async (req, res) => {
  const { name, username, password, role } = req.body;
  if (!name || !username || !password)
    return res.status(400).json({ message: 'All fields required' });

  const hash = await bcrypt.hash(password, 10);
  db.query('SELECT id FROM users WHERE username = ?', [username], (err, results) => {
    if (results && results.length > 0)
      return res.status(400).json({ message: 'Username already taken' });

    db.query('INSERT INTO users (name, username, password, role) VALUES (?,?,?,?)',
      [name, username, hash, role || 'staff'], (err) => {
        if (err) return res.status(500).json({ message: 'Error creating account' });
        res.json({ message: 'Account created! Please login.' });
      });
  });
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
    if (!results || results.length === 0)
      return res.status(401).json({ message: 'Invalid username or password' });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: 'Invalid username or password' });

    const userData = { id: user.id, name: user.name, username: user.username, role: user.role };
    req.session.user = userData;
    res.json({ user: userData });
  });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Get current user
app.get('/api/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
  res.json(req.session.user);
});

// Add waste record
app.post('/api/waste', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
  const { date, day, food_item, quantity_kg } = req.body;
  const user = req.session.user;
  db.query('INSERT INTO waste_records (date, day, food_item, quantity_kg, added_by, added_by_username) VALUES (?,?,?,?,?,?)',
    [date, day, food_item, quantity_kg, user.id, user.username], (err) => {
      if (err) return res.status(500).json({ message: 'Failed to save' });
      res.json({ message: 'Record saved!' });
    });
});

// Get waste records
app.get('/api/waste', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
  const user = req.session.user;
  let query = 'SELECT * FROM waste_records ORDER BY created_at DESC';
  let params = [];
  if (user.role !== 'admin') {
    query = 'SELECT * FROM waste_records WHERE added_by = ? ORDER BY created_at DESC';
    params = [user.id];
  }
  db.query(query, params, (err, results) => {
    if (err) return res.json([]);
    res.json(results);
  });
});

// Delete record (admin only)
app.delete('/api/waste/:id', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin')
    return res.status(403).json({ error: 'Admin only' });
  db.query('DELETE FROM waste_records WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.json({ success: false });
    res.json({ success: true });
  });
});

app.listen(3000, () => console.log('Server running at http://localhost:3000'));