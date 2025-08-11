// src/controllers/postmanController.js

const postmanService = require('../services/postmanService');
const fileHelper = require('../utils/fileHelper');
const path = require('path');

const getAndSaveCollections = async (req, res) => {
  try {
    console.log('Fetching collections from Postman API...');
    const collections = await postmanService.fetchCollections();
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

/**
 * **NEW**: Gets the full details of a single collection, including all items (requests/folders).
 */
const getSingleCollectionDetails = async (req, res) => {
    try {
        const { collectionId } = req.params;
        const collection = await postmanService.fetchSingleCollection(collectionId);
        if (!collection) {
            return res.status(404).json({ message: 'Collection not found.' });
        }
        res.status(200).json(collection);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { 
    getAndSaveCollections,
    getSingleCollectionDetails, // Export the new function
};
