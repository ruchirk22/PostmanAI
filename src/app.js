// src/app.js

const dotenv = require('dotenv');
dotenv.config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const apiRoutes = require('./routes/api');

const app = express();

// Middleware
app.use(bodyParser.json());
// Correctly point to the public directory inside src
app.use(express.static(path.join(__dirname, 'public'))); 

// API routes are prefixed with /api
app.use('/api', apiRoutes);

// Serve the landing page at the root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the main application page
app.get('/main', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'main.html'));
});

// IMPORTANT: Export the app for Vercel
module.exports = app;