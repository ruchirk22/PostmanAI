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

// Helper function to find a request within a collection structure
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

const generateTestScript = async (req, res) => {
    try {
        const { collectionId, requestId } = req.params;
        
        // Fetch the collection to find the specific request's data
        const collection = await postmanService.fetchSingleCollection(req.postmanApiKey, collectionId);
        const itemToUpdate = findRequest(collection.item, requestId);

        if (!itemToUpdate || !itemToUpdate.request) {
            return res.status(404).json({ message: 'Request not found in collection.' });
        }

        // 1. Generate the new test script using the AI service
        const scriptCode = await aiService.generateTestScript(itemToUpdate);
        
        // 2. Prepare the updated event data for the specific request
        const updatedRequestData = { ...itemToUpdate.request };
        updatedRequestData.event = updatedRequestData.event || [];
        
        let testEvent = updatedRequestData.event.find(e => e.listen === 'test');
        if (!testEvent) {
            testEvent = { listen: 'test', script: { type: 'text/javascript', exec: [] } };
            updatedRequestData.event.push(testEvent);
        }
        
        const newTestScript = `// AI-Generated Test (${new Date().toUTCString()})\n${scriptCode}\n`;
        // Add the new script to the top of the array for visibility in the Postman UI
        testEvent.script.exec.unshift(newTestScript);

        // 3. *** THE FLAWLESS FIX ***
        // Use the correct, targeted service function to update ONLY the single request.
        // This is the most reliable method for serverless environments like Vercel.
        await postmanService.updateRequestInCollection(
            req.postmanApiKey,
            collectionId,
            requestId,
            updatedRequestData // Pass the modified request object
        );

        // 4. Send a success response back to the user
        res.status(200).json({ 
            message: `Successfully added AI test script to request: ${itemToUpdate.name}`,
            script: scriptCode
        });

    } catch (error) {
        // Provide detailed error logging for easier debugging on Vercel
        console.error('Error in generateTestScript controller:', error);
        res.status(500).json({ message: 'An internal error occurred while generating the test script.' });
    }
};

module.exports = { 
    analyzeCollection,
    auditCollection,
    generateApiDocumentation,
    generateTestScript,
};
