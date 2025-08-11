// src/app.js

// IMPORTANT: Load environment variables from .env file at the very top
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const path = require('path'); // Import path module
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON and serve static files from 'public' directory
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API routes are prefixed with /api
app.use('/api', apiRoutes);

// The root path '/' will now serve index.html from the 'public' folder
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
