// src/controllers/aiController.js

const aiService = require('../services/aiService');
const postmanService = require('../services/postmanService');

// Helper function to recursively process items (folders and requests)
const processItems = async (items, collectionId, folderId = null) => {
    for (const item of items) {
        // Case 1: The item is a folder
        if (item.item && Array.isArray(item.item)) {
            console.log(`Creating folder: ${item.name}`);
            const newFolder = await postmanService.createFolderInCollection(collectionId, item.name);
            await processItems(item.item, collectionId, newFolder.id);
        }
        // Case 2: The item is a request
        else if (item.request) {
            console.log(`Processing request: ${item.name}`);
            
            // **THE FIX**: Create a clean copy of the request object to avoid modifying the original.
            // This ensures we build a valid payload for the Postman API.
            const originalReq = item.request;
            if (!originalReq.url) {
                console.warn(`Skipping request "${item.name}" due to missing URL.`);
                continue;
            }

            // Create a new request payload, ensuring the URL is a complete object.
            const newRequestPayload = {
                ...originalReq,
                name: item.name, // Ensure name is carried over
                // Reconstruct the URL object to ensure it's always in the correct format
                url: typeof originalReq.url === 'string' ? { raw: originalReq.url } : { ...originalReq.url },
            };
            
            const { method } = newRequestPayload;
            const path = Array.isArray(newRequestPayload.url.path) ? newRequestPayload.url.path.join('/') : (newRequestPayload.url.path || '');

            console.log(`  -> Method: ${method}, Path: /${path}`);

            // Generate AI content based on request type
            if (['POST', 'PUT', 'PATCH'].includes(method)) {
                console.log(`  -> Generating JSON body for ${method} request...`);
                const requestDetails = {
                    name: item.name,
                    method,
                    path,
                    originalBody: originalReq.body?.raw ? JSON.parse(originalReq.body.raw) : null
                };
                const exampleBody = await aiService.generateExampleBody(requestDetails);
                newRequestPayload.body = { mode: 'raw', raw: exampleBody, options: { raw: { language: 'json' } } };
            } 
            else if (method === 'GET') {
                console.log('  -> Generating query params for GET request...');
                const queryParams = await aiService.generateExampleQueryParams(item.name, path);
                if (queryParams && queryParams.length > 0) {
                    newRequestPayload.url.query = queryParams;
                }
            }
            
            // Create the request in the correct location (root or folder)
            await postmanService.createRequestInCollection(collectionId, newRequestPayload, folderId);
            console.log(`  -> Successfully created example for: ${item.name}`);
        }
    }
};


const analyzeCollection = async (req, res) => {
  try {
    const { collectionId } = req.params;
    const collection = await postmanService.fetchSingleCollection(collectionId);
    if (!collection) {
      return res.status(404).json({ message: 'Collection not found.' });
    }

    const flattenRequests = (item) => {
        if (item.item && Array.isArray(item.item)) {
            return item.item.flatMap(flattenRequests);
        }
        return item.request ? [item] : [];
    };

    const allRequests = flattenRequests({ item: collection.item });

    const endpoints = allRequests
      .filter(item => item && item.request && item.request.method && item.request.url)
      .map(item => {
        const path = Array.isArray(item.request.url.path) ? item.request.url.path.join('/') : (item.request.url.path || '');
        let endpointInfo = `- ${item.request.method} /${path}`;
        if (item.request.body && item.request.body.raw) {
            try {
                const body = JSON.parse(item.request.body.raw);
                const keys = Object.keys(body);
                if (keys.length > 0) {
                    endpointInfo += ` (Body keys: ${keys.join(', ')})`;
                }
            } catch (e) { /* Ignore parsing errors */ }
        }
        return endpointInfo;
      });

    const summary = `Collection Name: "${collection.info.name}"\n\nEndpoints:\n${endpoints.join('\n')}`;
    const analysis = await aiService.getCollectionAnalysis(summary);
    res.status(200).json({ collectionName: collection.info.name, analysis });
  } catch (error) {
    console.error('Analysis Error:', error);
    res.status(500).json({ message: error.message });
  }
};

const generateExamples = async (req, res) => {
  try {
    const { collectionId } = req.params;
    const { workspaceId } = req.query;
    const sourceCollection = await postmanService.fetchSingleCollection(collectionId);
    if (!sourceCollection) {
        return res.status(404).json({ message: 'Source collection not found.' });
    }

    const newCollectionName = `${sourceCollection.info.name} [AI Examples]`;
    
    console.log(`Creating new collection "${newCollectionName}"...`);
    const newCollection = await postmanService.createCollection(newCollectionName, workspaceId);
    
    console.log('Starting to process items and generate examples...');
    await processItems(sourceCollection.item, newCollection.id);
    console.log('Finished generating examples.');
    
    res.status(200).json({
      message: 'Successfully generated example requests!',
      newCollectionId: newCollection.id,
      postmanLink: `https://go.postman.co/collection/${newCollection.id}`,
    });
  } catch (error) {
    console.error('Generation Error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { analyzeCollection, generateExamples };
