const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');
const axios = require('axios');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

const serviceAccount = require('./key4.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const app = express();
const port = 4000;

app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true
}));

app.use('/static', express.static(path.join(__dirname, 'public')));

// Signup page
app.get('/signup', (req, res) => {
  res.render('signup');
});

// Signup route
app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  await db.collection('pro').doc(email).set({
    username,
    email,
    password: hashedPassword,
  });
  res.redirect('/login');
});

// Login page
app.get('/login', (req, res) => {
  res.render('login');
});

// Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const userinfo = await db.collection('pro').doc(email).get();
  if (!userinfo.exists) {
    return res.send('User does not exist.');
  }
  const doc = userinfo.data();
  const match = await bcrypt.compare(password, doc.password);
  if (match) {
    req.session.userId = userinfo.id;
    req.session.username = doc.username;
    res.redirect('/dashboard');
  } else {
    res.send('Incorrect password.');
  }
});

// Home route
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Dashboard route
app.get('/dashboard', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  res.render('dashboard', { username: req.session.username, definition: null });
});

// Search route
app.post('/search', async (req, res) => {
  const { word } = req.body;
  try {
    const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const definition = response.data[0];
    res.render('dashboard', { username: req.session.username, definition });
  } catch (error) {
    res.render('dashboard', { username: req.session.username, definition: null });
  }
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send('Error logging out.');
    }
    res.redirect('/login');
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
