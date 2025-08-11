// src/services/postmanService.js

const axios = require('axios');
const postmanApiUrl = 'https://api.getpostman.com';

/**
 * Fetches the summary of all collections.
 */
const fetchCollections = async () => {
  const postmanApiKey = process.env.POSTMAN_API_KEY;
  if (!postmanApiKey) {
    throw new Error('Postman API key is not defined in .env file.');
  }
  try {
    const response = await axios.get(`${postmanApiUrl}/collections`, {
      headers: { 'x-api-key': postmanApiKey },
    });
    return response.data.collections;
  } catch (error) {
    console.error('Error fetching Postman collections:', error.response ? error.response.data : error.message);
    throw new Error('Failed to fetch collections from Postman API.');
  }
};

/**
 * Fetches the complete details for a single collection.
 */
const fetchSingleCollection = async (collectionId) => {
  const postmanApiKey = process.env.POSTMAN_API_KEY;
  if (!postmanApiKey) {
    throw new Error('Postman API key is not defined in .env file.');
  }
  try {
    const response = await axios.get(`${postmanApiUrl}/collections/${collectionId}`, {
      headers: { 'x-api-key': postmanApiKey },
    });
    return response.data.collection;
  } catch (error) {
    console.error(`Error fetching single Postman collection (${collectionId}):`, error.response ? error.response.data : error.message);
    throw new Error('Failed to fetch single collection from Postman API.');
  }
};

/**
 * Creates a new, empty collection in Postman.
 */
const createCollection = async (newCollectionName, workspaceId) => {
    const postmanApiKey = process.env.POSTMAN_API_KEY;
    let url = `${postmanApiUrl}/collections`;
    if (workspaceId) {
        url += `?workspace=${workspaceId}`;
    }

    try {
        const response = await axios.post(url, {
            collection: {
                info: {
                    name: newCollectionName,
                    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
                },
                item: [],
            },
        }, {
            headers: { 'x-api-key': postmanApiKey },
        });
        return response.data.collection;
    } catch (error) {
        console.error('Error creating new Postman collection:', error.response ? error.response.data : error.message);
        throw new Error('Failed to create new collection.');
    }
};

/**
 * Creates a folder inside a specified collection.
 */
const createFolderInCollection = async (collectionId, folderName) => {
    const postmanApiKey = process.env.POSTMAN_API_KEY;
    try {
        const response = await axios.post(`${postmanApiUrl}/collections/${collectionId}/folders`, {
            name: folderName,
        }, {
            headers: { 'x-api-key': postmanApiKey },
        });
        return response.data.data;
    } catch (error) {
        console.error(`Error creating folder "${folderName}":`, error.response ? error.response.data : error.message);
        throw new Error('Failed to create folder.');
    }
};




/**
 * **THE FIX**: Creates a new request with the corrected API payload structure.
 * @param {string} collectionId - The ID of the collection.
 * @param {object} requestData - The complete Postman request object.
 * @param {string|null} folderId - The ID of the folder to add the request to (optional).
 */
const createRequestInCollection = async (collectionId, requestData, folderId) => {
    const postmanApiKey = process.env.POSTMAN_API_KEY;
    
    // The API endpoint changes based on whether we are adding to a folder or the root.
    const url = folderId
        ? `${postmanApiUrl}/collections/${collectionId}/folders/${folderId}/requests`
        : `${postmanApiUrl}/collections/${collectionId}/requests`;

    // **CORRECTED PAYLOAD**: The Postman API expects the entire request object
    // to be nested under a single "request" key.
    const payload = {
        request: requestData
    };

    try {
        const response = await axios.post(url, payload, {
            headers: { 'x-api-key': postmanApiKey },
        });
        return response.data.data;
    } catch (error) {
        // Add more detailed logging for debugging
        console.error(`Error creating request "${requestData.name}" in collection ${collectionId}:`, error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        console.error('Payload sent:', JSON.stringify(payload, null, 2));
        throw new Error('Failed to create new request in collection.');
    }
};

const updateRequestInCollection = async (collectionId, requestId, updatedRequestData) => {
    const postmanApiKey = process.env.POSTMAN_API_KEY;
    const url = `${postmanApiUrl}/collections/${collectionId}/requests/${requestId}`;
    const payload = { request: updatedRequestData };
    try {
        const response = await axios.put(url, payload, {
            headers: { 'x-api-key': postmanApiKey },
        });
        return response.data.data;
    } catch (error) {
        console.error(`Error updating request "${requestId}":`, error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        throw new Error('Failed to update request.');
    }
};


module.exports = {
  fetchCollections,
  fetchSingleCollection,
  createCollection,
  createFolderInCollection,
  createRequestInCollection,
  // **THE FIX**: Correctly exporting the update function.
  updateRequestInCollection,
};
