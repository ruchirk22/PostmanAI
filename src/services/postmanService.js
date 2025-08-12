// src/services/postmanService.js

const axios = require('axios');
const postmanApiUrl = 'https://api.getpostman.com';

const getHeaders = (apiKey) => ({
    'x-api-key': apiKey,
});

const fetchCollections = async (apiKey, workspaceId) => {
  if (!apiKey) {
    throw new Error('Postman API key is required.');
  }
  let url = `${postmanApiUrl}/collections`;
  if (workspaceId) {
      url += `?workspace=${workspaceId}`;
  }

  try {
    const response = await axios.get(url, { headers: getHeaders(apiKey) });
    return response.data.collections;
  } catch (error) {
    console.error('Error fetching Postman collections:', error.response ? error.response.data : error.message);
    throw new Error('Failed to fetch collections from Postman API. Check your API Key and Workspace ID.');
  }
};

const fetchSingleCollection = async (apiKey, collectionId) => {
  if (!apiKey) {
    throw new Error('Postman API key is required.');
  }
  try {
    const response = await axios.get(`${postmanApiUrl}/collections/${collectionId}`, {
      headers: getHeaders(apiKey),
    });
    return response.data.collection;
  } catch (error) {
    console.error(`Error fetching single Postman collection (${collectionId}):`, error.response ? error.response.data : error.message);
    throw new Error('Failed to fetch single collection from Postman API.');
  }
};

const updateCollection = async (apiKey, collectionId, collectionData) => {
    if (!apiKey) {
        throw new Error('Postman API key is required.');
    }
    const url = `${postmanApiUrl}/collections/${collectionId}`;
    const payload = { collection: collectionData };
    try {
        const response = await axios.put(url, payload, {
            headers: getHeaders(apiKey),
        });
        return response.data.collection;
    } catch (error) {
        console.error(`Error updating collection "${collectionId}":`, error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        throw new Error('Failed to update collection.');
    }
};


module.exports = {
  fetchCollections,
  fetchSingleCollection,
  updateCollection,
};