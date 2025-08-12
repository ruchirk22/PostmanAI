// src/controllers/postmanController.js

const postmanService = require('../services/postmanService');

const getCollections = async (req, res) => {
  try {
    const { workspaceId } = req.query;
    const collections = await postmanService.fetchCollections(req.postmanApiKey, workspaceId);
    res.status(200).json({
      message: 'Successfully fetched Postman collections.',
      count: collections.length,
      collections: collections.map(c => ({ id: c.id, name: c.name })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSingleCollectionDetails = async (req, res) => {
    try {
        const { collectionId } = req.params;
        const collection = await postmanService.fetchSingleCollection(req.postmanApiKey, collectionId);
        if (!collection) {
            return res.status(404).json({ message: 'Collection not found.' });
        }
        res.status(200).json(collection);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { 
    getCollections,
    getSingleCollectionDetails,
};