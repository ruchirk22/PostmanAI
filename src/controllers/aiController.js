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
        
        // This function recursively finds and updates the correct request in the collection object
        const updateRequestInObject = (items, id, newScript) => {
             for (let i = 0; i < items.length; i++) {
                if (items[i].id === id) {
                    // Ensure the request and event objects exist
                    items[i].request = items[i].request || {};
                    items[i].request.event = items[i].request.event || [];
                    
                    let testEvent = items[i].request.event.find(e => e.listen === 'test');
                    if (!testEvent) {
                        testEvent = { listen: 'test', script: { type: 'text/javascript', exec: [] } };
                        items[i].request.event.push(testEvent);
                    }
                    
                    // Prepend the new script to the top
                    testEvent.script.exec.unshift(newScript);
                    return items[i].name; // Return the name of the updated request
                }
                // Recurse into folders
                if (items[i].item) {
                    const updatedName = updateRequestInObject(items[i].item, id, newScript);
                    if (updatedName) return updatedName;
                }
            }
            return null;
        };
        
        const itemToUpdate = findRequest(collection.item, requestId); // We need a findRequest helper for the name
         if (!itemToUpdate) {
            return res.status(404).json({ message: 'Request not found in collection.' });
        }

        const scriptCode = await aiService.generateTestScript(itemToUpdate);
        const newTestScript = `// AI-Generated Test (${new Date().toUTCString()})\n${scriptCode}\n`;

        // Update the collection object in memory
        const updatedRequestName = updateRequestInObject(collection.item, requestId, newTestScript);
       
        if (!updatedRequestName) {
             return res.status(404).json({ message: 'Could not find request to update in collection object.' });
        }

        // *** THE FIX: Reverting to the full collection update method ***
        // This sends the entire modified collection back to Postman.
        await postmanService.updateCollection(
            req.postmanApiKey,
            collectionId,
            collection
        );

        res.status(200).json({ 
            message: `Successfully added AI test script to request: ${updatedRequestName}`,
            script: scriptCode
        });
    } catch (error) {
        console.error('Error generating test script:', error);
        res.status(500).json({ message: error.message });
    }
};

// You'll also need this helper function in the same file, you can place it above generateTestScript
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

module.exports = { 
    analyzeCollection,
    auditCollection,
    generateApiDocumentation,
    generateTestScript,
};