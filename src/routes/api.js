// src/routes/api.js

const express = require('express');
const router = express.Router();
const postmanController = require('../controllers/postmanController');
const aiController = require('../controllers/aiController');

// Feature 1: Fetch all collection summaries
router.get('/fetch-collections', postmanController.getAndSaveCollections);

// Feature 2: Analyze a single collection
router.get('/analyze-collection/:collectionId', aiController.analyzeCollection);

// Feature 3: Generate example requests for a collection
router.post('/generate-examples/:collectionId', aiController.generateExamples);

module.exports = router;