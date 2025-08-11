// src/routes/api.js

const express = require('express');
const router = express.Router();
const postmanController = require('../controllers/postmanController');
const aiController = require('../controllers/aiController');

// Feature 1: Fetch all collection summaries
router.get('/fetch-collections', postmanController.getAndSaveCollections);

// **NEW**: Fetch details of a single collection, including its requests
router.get('/collection/:collectionId', postmanController.getSingleCollectionDetails);

// Feature 2: Analyze a single collection
router.get('/analyze-collection/:collectionId', aiController.analyzeCollection);

// Feature 3: Generate example requests for a collection
router.post('/generate-examples/:collectionId', aiController.generateExamples);

// **NEW** Feature 4: Generate a test script for a single request
router.post('/generate-test/:collectionId/:requestId', aiController.generateTestScript);

// **NEW** Feature 5: Run a security and performance audit on a collection
router.get('/audit-collection/:collectionId', aiController.auditCollection);


module.exports = router;