// src/controllers/aiController.js

const aiService = require('../services/aiService');
const postmanService = require('../services/postmanService');
const mammoth = require("mammoth");

const analyzeCollection = async (req, res) => {
  try {
    const { collectionId } = req.params;
    const collection = await postmanService.fetchSingleCollection(req.postmanApiKey, collectionId);
    if (!collection) { return res.status(404).json({ message: 'Collection not found.' }); }
    
    const analysis = await aiService.getCollectionAnalysis(collection);
    res.status(200).json({ collectionName: collection.info.name, analysis });
  } catch (error) { 
      console.error("Error in analyzeCollection:", error);
      res.status(500).json({ message: error.message });
  }
};

const auditCollection = async (req, res) => {
    try {
        const { collectionId } = req.params;
        const collection = await postmanService.fetchSingleCollection(req.postmanApiKey, collectionId);
        if (!collection) {
            return res.status(404).json({ message: 'Collection not found.' });
        }

        const reportMarkdown = await aiService.getSecurityAudit(collection);

        const { value: reportHtml } = await mammoth.convertToHtml({ buffer: Buffer.from(reportMarkdown) });

        const result = await mammoth.convertToDocx({ value: reportHtml });
        const docxBuffer = result.value;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${collection.info.name}_Security_Audit.docx"`);
        res.setHeader('X-Collection-Name', collection.info.name);
        res.status(200).send(docxBuffer);
    } catch (error) {
        console.error('Error auditing collection:', error);
        res.status(500).json({ message: error.message });
    }
};

const generateApiDocumentation = async (req, res) => {
    try {
        const { collectionId } = req.params;
        const collection = await postmanService.fetchSingleCollection(req.postmanApiKey, collectionId);
        if (!collection) {
            return res.status(404).json({ message: 'Collection not found.' });
        }

        const docMarkdown = await aiService.generateApiDocs(collection);
        
        const { value: docHtml } = await mammoth.convertToHtml({ buffer: Buffer.from(docMarkdown) });

        const result = await mammoth.convertToDocx({ value: docHtml });
        const docxBuffer = result.value;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${collection.info.name}_API_Docs.docx"`);
        res.setHeader('X-Collection-Name', collection.info.name);
        res.status(200).send(docxBuffer);

    } catch (error) {
        console.error('Error generating API documentation:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * Helper function to recursively find a request (item) by its ID within a collection's structure.
 * @param {Array} items - The array of items (requests or folders) from a Postman collection.
 * @param {string} requestId - The ID of the request to find.
 * @returns {object|null} The found item object or null if not found.
 */
const findRequestInCollection = (items, requestId) => {
    for (const item of items) {
        if (item.id === requestId) return item;
        if (item.item && Array.isArray(item.item)) {
            const found = findRequestInCollection(item.item, requestId);
            if (found) return found;
        }
    }
    return null;
};

const generateTestScript = async (req, res) => {
    try {
        const { collectionId, requestId } = req.params;

        // 1. Fetch the entire collection from Postman. We will modify this object and send it back.
        const collection = await postmanService.fetchSingleCollection(req.postmanApiKey, collectionId);
        if (!collection || !collection.item) {
            return res.status(404).json({ message: 'Collection not found or is empty.' });
        }

        // 2. Find the specific request item within the collection's structure.
        const itemToUpdate = findRequestInCollection(collection.item, requestId);
        if (!itemToUpdate || !itemToUpdate.request) {
            return res.status(404).json({ message: 'The specified request could not be found in the collection.' });
        }

        // 3. Call the AI service to generate the JavaScript test script code.
        const scriptCode = await aiService.generateTestScript(itemToUpdate);
        if (!scriptCode) {
            return res.status(500).json({ message: 'The AI service failed to generate a test script.' });
        }

        // 4. Modify the test events directly on the fetched collection object.
        const requestObject = itemToUpdate.request;
        requestObject.event = requestObject.event || [];
        let testEvent = requestObject.event.find(e => e.listen === 'test');
        
        if (!testEvent) {
            testEvent = { listen: 'test', script: { type: 'text/javascript', exec: [] } };
            requestObject.event.push(testEvent);
        }
        
        testEvent.script.exec = testEvent.script.exec || [];

        // 5. Prepend the newly generated script to the top of the execution array.
        const newTestScript = `// AI-Generated Test Script (Generated on: ${new Date().toUTCString()})\n${scriptCode}\n`;
        testEvent.script.exec.unshift(newTestScript);

        // 6. Call the service to update the ENTIRE collection, which is the reliable method.
        await postmanService.updateCollection(
            req.postmanApiKey,
            collectionId,
            collection // Pass the entire modified collection object
        );

        // 7. Send a success response.
        res.status(200).json({
            message: `Successfully generated and added a new test script to the request: "${itemToUpdate.name}"`,
            script: scriptCode
        });

    } catch (error) {
        console.error('Error in generateTestScript controller:', error.message, error.stack);
        res.status(500).json({ message: 'An internal server error occurred while generating the test script.' });
    }
};

module.exports = { 
    analyzeCollection,
    auditCollection,
    generateApiDocumentation,
    generateTestScript,
};