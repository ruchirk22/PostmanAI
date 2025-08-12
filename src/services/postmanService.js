// src/services/postmanService.js

const axios = require('axios');
const postmanApiUrl = 'https://api.getpostman.com';

const getHeaders = (apiKey) => ({
    'x-api-key': apiKey,
    'Content-Type': 'application/json', // It's a good practice to always include Content-Type for PUT/POST
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

/**
 * Updates a single request within a Postman collection using the specific endpoint for that action.
 * This is more efficient and safer than updating the entire collection.
 * @param {string} apiKey - The Postman API key.
 * @param {string} collectionId - The ID of the collection containing the request.
 * @param {string} requestId - The ID of the specific request to update.
 * @param {object} requestData - The full, updated request object that will replace the existing one.
 * @returns {Promise<object>} The updated request object returned from the Postman API.
 */
const updateRequestInCollection = async (apiKey, collectionId, requestId, requestData) => {
    if (!apiKey) {
        throw new Error('Postman API key is required.');
    }
    const url = `${postmanApiUrl}/collections/${collectionId}/requests/${requestId}`;
    
    // The payload for a request update is the request object itself.
    // The `requestData` parameter is the complete, modified request object.
    const payload = requestData;

    try {
        // The Postman API for updating a single request expects the payload directly.
        // It should NOT be nested under a 'request' key, which was the source of the error.
        const response = await axios.put(url, payload, {
            headers: getHeaders(apiKey),
        });
        return response.data;
    } catch (error) {
        // Provide more detailed error logging to help with future debugging.
        const errorDetails = error.response 
            ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data, null, 2)}` 
            : error.message;
        console.error(`Error updating request "${requestId}" in collection "${collectionId}": ${errorDetails}`);
        // Log the exact payload that was sent to the API for inspection.
        console.error('Payload Sent to Postman API:', JSON.stringify(payload, null, 2));
        throw new Error('Failed to update the request in the Postman collection. Please check the server logs for details.');
    }
};

module.exports = {
  fetchCollections,
  fetchSingleCollection,
  updateCollection,
  updateRequestInCollection,
};
