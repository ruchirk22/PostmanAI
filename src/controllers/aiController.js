// src/controllers/aiController.js

const aiService = require('../services/aiService');
const postmanService = require('../services/postmanService');
const htmlToDocx = require('html-to-docx');
const showdown = require('showdown');
const converter = new showdown.Converter({ tables: true });

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

        // 1. Get Markdown from AI service
        const reportMarkdown = await aiService.getSecurityAudit(collection);
        
        // 2. Convert Markdown to HTML
        const reportHtml = converter.makeHtml(reportMarkdown);

        // 3. Convert HTML to DOCX buffer
        const docxBuffer = await htmlToDocx(reportHtml, null, {
            table: { row: { cantSplit: true } },
            footer: true,
            pageNumber: true,
        });

        // 4. Send the DOCX file to the client
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

        // 1. Get Markdown from AI service
        const docMarkdown = await aiService.generateApiDocs(collection);
        
        // 2. Convert Markdown to HTML
        const docHtml = converter.makeHtml(docMarkdown);

        // 3. Convert HTML to DOCX buffer
        const docxBuffer = await htmlToDocx(docHtml, null, {
            table: { row: { cantSplit: true } },
            footer: true,
            pageNumber: true,
        });

        // 4. Send the DOCX file to the client
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${collection.info.name}_API_Docs.docx"`);
        res.setHeader('X-Collection-Name', collection.info.name);
        res.status(200).send(docxBuffer);

    } catch (error) {
        console.error('Error generating API documentation:', error);
        res.status(500).json({ message: error.message });
    }
};

const generateTestScript = async (req, res) => {
    try {
        const { collectionId, requestId } = req.params;
        const collection = await postmanService.fetchSingleCollection(req.postmanApiKey, collectionId);
        
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

        const scriptCode = await aiService.generateTestScript(itemToUpdate);
        
        const updatedRequestData = { ...itemToUpdate.request };
        updatedRequestData.event = updatedRequestData.event || [];
        
        let testEvent = updatedRequestData.event.find(e => e.listen === 'test');
        if (!testEvent) {
            testEvent = { listen: 'test', script: { type: 'text/javascript', exec: [] } };
            updatedRequestData.event.push(testEvent);
        }
        
        const newTestScript = `// AI-Generated Test (${new Date().toUTCString()})\n${scriptCode}\n`;
        testEvent.script.exec.unshift(newTestScript);

        // *** THE FLAWLESS FIX ***
        // We now call the new, specific function to update only the single request.
        await postmanService.updateRequestInCollection(
            req.postmanApiKey,
            collectionId,
            requestId,
            updatedRequestData
        );

        res.status(200).json({ 
            message: `Successfully added AI test script to request: ${itemToUpdate.name}`,
            script: scriptCode
        });
    } catch (error) {
        console.error('Error generating test script:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { 
    analyzeCollection,
    auditCollection,
    generateApiDocumentation,
    generateTestScript,
};