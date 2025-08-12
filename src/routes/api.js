// src/routes/api.js

const express = require('express');
const router = express.Router();
const postmanController = require('../controllers/postmanController');
const aiController = require('../controllers/aiController');

// Middleware to extract Postman API key from header
const apiKeyMiddleware = (req, res, next) => {
    req.postmanApiKey = req.headers['x-api-key'];
    if (!req.postmanApiKey) {
        return res.status(401).json({ message: 'Postman API Key is required in x-api-key header.' });
    }
    next();
};

// Apply the API key middleware to all routes in this file
router.use(apiKeyMiddleware);

// --- Collection Routes ---
router.get('/fetch-collections', postmanController.getCollections);
router.get('/collection/:collectionId', postmanController.getSingleCollectionDetails);

// --- AI-Powered Routes ---
router.get('/analyze-collection/:collectionId', aiController.analyzeCollection);
router.get('/audit-collection/:collectionId', aiController.auditCollection);
router.get('/generate-docs/:collectionId', aiController.generateApiDocumentation);
router.post('/generate-test/:collectionId/:requestId', aiController.generateTestScript);


module.exports = router;