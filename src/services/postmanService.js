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
 * @param {string} collectionId - The ID or UID of the collection to fetch.
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
 * @param {string} newCollectionName - The name for the new collection.
 * @param {string} workspaceId - The ID of the workspace to create the collection in.
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
 * **NEW**: Creates a folder inside a specified collection.
 * @param {string} collectionId - The ID of the collection.
 * @param {string} folderName - The name of the new folder.
 */
const createFolderInCollection = async (collectionId, folderName) => {
    const postmanApiKey = process.env.POSTMAN_API_KEY;
    try {
        const response = await axios.post(`${postmanApiUrl}/collections/${collectionId}/folders`, {
            name: folderName,
        }, {
            headers: { 'x-api-key': postmanApiKey },
        });
        return response.data.data; // The new folder object
    } catch (error) {
        console.error(`Error creating folder "${folderName}":`, error.response ? error.response.data : error.message);
        throw new Error('Failed to create folder.');
    }
};


/**
 * **MODIFIED**: Creates a new request inside a collection, optionally within a folder.
 * @param {string} collectionId - The ID of the collection.
 * @param {object} requestData - The Postman request object to create.
 * @param {string|null} folderId - The ID of the folder to add the request to (optional).
 */
const createRequestInCollection = async (collectionId, requestData, folderId) => {
    const postmanApiKey = process.env.POSTMAN_API_KEY;
    // The API endpoint changes based on whether we are adding to a folder or the root.
    const url = folderId
        ? `${postmanApiUrl}/collections/${collectionId}/folders/${folderId}/requests`
        : `${postmanApiUrl}/collections/${collectionId}/requests`;

    try {
        const response = await axios.post(url, {
            name: requestData.name,
            description: requestData.description || '',
            request: requestData // The full request object from the source collection
        }, {
            headers: { 'x-api-key': postmanApiKey },
        });
        return response.data.data;
    } catch (error) {
        console.error(`Error creating request "${requestData.name}":`, error.response ? error.response.data : error.message);
        throw new Error('Failed to create new request.');
    }
};


module.exports = {
  fetchCollections,
  fetchSingleCollection,
  createCollection,
  createFolderInCollection,
  createRequestInCollection,
};
