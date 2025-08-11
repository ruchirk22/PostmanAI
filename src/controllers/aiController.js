// src/controllers/aiController.js

const aiService = require('../services/aiService');
const postmanService = require('../services/postmanService');

/**
 * **PERFORMANCE FIX**: Processes collection items in parallel using Promise.all.
 * This function is now much faster for large collections.
 */
const processItemsInParallel = async (items, collectionId, folderId = null) => {
    // Create an array of promises, one for each item to be processed.
    const processingPromises = items.map(async (item) => {
        // Case 1: The item is a folder. Create it and recurse.
        if (item.item && Array.isArray(item.item)) {
            console.log(`Creating folder: ${item.name}`);
            const newFolder = await postmanService.createFolderInCollection(collectionId, item.name);
            // The recursive call returns a promise that resolves when the sub-folder is processed.
            return processItemsInParallel(item.item, collectionId, newFolder.id);
        } 
        // Case 2: The item is a request. Generate an example for it.
        else if (item.request) {
            const originalReq = item.request;
            if (!originalReq.url) {
                console.warn(`Skipping request "${item.name}" due to missing URL.`);
                return; // Skip this item
            }

            const newRequestPayload = { ...originalReq, name: item.name, url: typeof originalReq.url === 'string' ? { raw: originalReq.url } : { ...originalReq.url } };
            const { method } = newRequestPayload;
            const path = Array.isArray(newRequestPayload.url.path) ? newRequestPayload.url.path.join('/') : (newRequestPayload.url.path || '');

            if (['POST', 'PUT', 'PATCH'].includes(method)) {
                const requestDetails = { name: item.name, method, path, originalBody: originalReq.body?.raw ? JSON.parse(originalReq.body.raw) : null };
                const exampleBody = await aiService.generateExampleBody(requestDetails);
                newRequestPayload.body = { mode: 'raw', raw: exampleBody, options: { raw: { language: 'json' } } };
            } else if (method === 'GET') {
                const queryParams = await aiService.generateExampleQueryParams(item.name, path);
                if (queryParams && queryParams.length > 0) { newRequestPayload.url.query = queryParams; }
            }
            
            // This returns a promise for the creation of a single request.
            return postmanService.createRequestInCollection(collectionId, newRequestPayload, folderId);
        }
    });

    // Wait for all promises (all item processing) at the current level to complete.
    await Promise.all(processingPromises);
};


const generateExamples = async (req, res) => {
  try {
    const { collectionId } = req.params;
    const { workspaceId } = req.query;
    const sourceCollection = await postmanService.fetchSingleCollection(collectionId);
    if (!sourceCollection) { return res.status(404).json({ message: 'Source collection not found.' }); }
    
    const newCollectionName = `${sourceCollection.info.name} [AI Examples]`;
    console.log(`Creating new collection "${newCollectionName}"...`);
    const newCollection = await postmanService.createCollection(newCollectionName, workspaceId);
    
    console.log('Starting parallel processing of requests...');
    // Call the new, high-performance parallel function
    await processItemsInParallel(sourceCollection.item, newCollection.id);
    console.log('Finished parallel processing.');

    res.status(200).json({ message: 'Successfully generated example requests!', newCollectionId: newCollection.id, postmanLink: `https://go.postman.co/collection/${newCollection.id}` });
  } catch (error) { 
      console.error("Error in generateExamples:", error);
      res.status(500).json({ message: error.message });
  }
};


const generateTestScript = async (req, res) => {
    try {
        const { collectionId, requestId } = req.params;
        const collection = await postmanService.fetchSingleCollection(collectionId);
        
        const findRequest = (items, id) => {
            for (const item of items) {
                if (item.id === id) return item;
                if (item.item) {
                    const found = findRequest(item.item, id);
                    if (found) return found;
                }
            }
            return null;
        };
        const itemToUpdate = findRequest(collection.item, requestId);

        if (!itemToUpdate || !itemToUpdate.request) {
            return res.status(404).json({ message: 'Request not found in collection.' });
        }

        const scriptCode = await aiService.generateTestScript(itemToUpdate.request);
        const updatedRequest = { ...itemToUpdate.request };
        updatedRequest.event = updatedRequest.event || [];
        
        let testEvent = updatedRequest.event.find(e => e.listen === 'test');
        if (!testEvent) {
            testEvent = { listen: 'test', script: { type: 'text/javascript', exec: [] } };
            updatedRequest.event.push(testEvent);
        }
        
        // Prepend so the newest test appears at the top in the Postman UI
        testEvent.script.exec.unshift(`// AI-Generated Test (${new Date().toLocaleTimeString()})\n${scriptCode}\n`);

        await postmanService.updateRequestInCollection(collectionId, requestId, updatedRequest);
        res.status(200).json({ message: `Successfully added AI test script to request: ${itemToUpdate.name}` });
    } catch (error) {
        console.error('Error generating test script:', error);
        res.status(500).json({ message: error.message });
    }
};


const auditCollection = async (req, res) => {
    try {
        const { collectionId } = req.params;
        const collection = await postmanService.fetchSingleCollection(collectionId);
        if (!collection) {
            return res.status(404).json({ message: 'Collection not found.' });
        }

        const flattenForAudit = (item, pathPrefix = '') => {
            const currentPath = `${pathPrefix}/${item.name}`;
            if (item.item && Array.isArray(item.item)) {
                return item.item.flatMap(child => flattenForAudit(child, currentPath));
            }
            if (item.request) {
                const req = item.request;
                // **AUDIT FIX**: Added a check to ensure req.url exists before trying to access its properties.
                const url = req.url ? (typeof req.url === 'string' ? req.url : req.url.raw) : 'No URL defined';
                return [{
                    path: currentPath,
                    method: req.method,
                    url: url,
                    auth: req.auth ? `Type: ${req.auth.type}` : 'None',
                    headers: req.header ? req.header.map(h => `${h.key}`).join(', ') : 'None',
                }];
            }
            return [];
        };

        const requestDetails = flattenForAudit({ name: '', item: collection.item });
        const summary = `
            Collection Name: "${collection.info.name}"
            Requests:
            ${requestDetails.map(r => `
- Path: ${r.path}
  Method: ${r.method}
  URL: ${r.url}
  Auth: ${r.auth}
  Headers: [${r.headers}]
            `).join('')}
        `;

        const report = await aiService.getSecurityAudit(summary);
        res.status(200).json({ collectionName: collection.info.name, report });
    } catch (error) {
        console.error('Error auditing collection:', error);
        res.status(500).json({ message: error.message });
    }
};

// analyzeCollection remains unchanged, so it's omitted for brevity.
const analyzeCollection = async (req, res) => {
  try {
    const { collectionId } = req.params;
    const collection = await postmanService.fetchSingleCollection(collectionId);
    if (!collection) { return res.status(404).json({ message: 'Collection not found.' }); }
    const flattenRequests = (item) => (item.item && Array.isArray(item.item)) ? item.item.flatMap(flattenRequests) : (item.request ? [item] : []);
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
                if (keys.length > 0) { endpointInfo += ` (Body keys: ${keys.join(', ')})`; }
            } catch (e) { /* Ignore */ }
        }
        return endpointInfo;
      });
    const summary = `Collection Name: "${collection.info.name}"\n\nEndpoints:\n${endpoints.join('\n')}`;
    const analysis = await aiService.getCollectionAnalysis(summary);
    res.status(200).json({ collectionName: collection.info.name, analysis });
  } catch (error) { res.status(500).json({ message: error.message }); }
};


module.exports = { 
    analyzeCollection, 
    generateExamples,
    generateTestScript,
    auditCollection,
};
