// src/controllers/postmanController.js

const postmanService = require('../services/postmanService');
const fileHelper = require('../utils/fileHelper');
const path = require('path');

const getAndSaveCollections = async (req, res) => {
  try {
    console.log('Fetching collections from Postman API...');
    const collections = await postmanService.fetchCollections();

    // --- DEBUGGING STEP ---
    // Log the names of the collections received from the API.
    // This helps verify if we are getting the latest data from Postman.
    const collectionNames = collections.map(c => c.name);
    console.log('Collections received from API:', collectionNames);
    // --- END DEBUGGING STEP ---

    const collectionsFilePath = path.join(__dirname, '..', 'data', 'collections.json');
    await fileHelper.saveJsonToFile(collectionsFilePath, collections);

    res.status(200).json({
      message: 'Successfully fetched and saved Postman collections.',
      count: collections.length,
      collections: collections.map(c => ({ id: c.id, name: c.name })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAndSaveCollections };