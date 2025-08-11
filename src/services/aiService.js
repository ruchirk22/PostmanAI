// src/services/aiService.js

const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * **ENHANCED**: Analyzes a collection summary to explain its purpose.
 */
const getCollectionAnalysis = async (collectionSummary) => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('Google API key is not defined in .env file.');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `
      As an expert API analyst, analyze the following Postman collection summary. 
      Provide a concise, high-level explanation of the API's primary purpose and functionality.
      Use the endpoint details, including any specified request body keys, to inform your analysis.

      Collection Summary:
      ${collectionSummary}

      Your analysis:
    `;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Error in getCollectionAnalysis:', error);
    throw new Error('Failed to get analysis from Gemini API.');
  }
};

/**
 * **ENHANCED**: Generates an example JSON body for a given API request.
 * @param {object} requestDetails - Details of the request.
 * @param {string} requestDetails.name - The name of the request.
 *_@param {string} requestDetails.method - The HTTP method._
 * @param {string} requestDetails.path - The request path.
 * @param {object|null} requestDetails.originalBody - The parsed JSON of the original request body, if any.
 */
const generateExampleBody = async (requestDetails) => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('Google API key is not defined in .env file.');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Dynamically build the prompt with original body info if it exists
    let prompt = `
      You are an API testing assistant. Generate a realistic, example JSON request body.
      - ONLY output the raw JSON body.
      - Do not include any explanation, markdown (like \`\`\`json), or text other than the JSON itself.
      - The JSON should be appropriate for this request:
      Request Name: "${requestDetails.name}"
      Method: ${requestDetails.method}
      Path: "${requestDetails.path}"
    `;

    if (requestDetails.originalBody) {
        prompt += `
      The original request has this structure, use it as a reference for the keys, but generate new, realistic values:
      ${JSON.stringify(requestDetails.originalBody, null, 2)}
      `;
    }

    prompt += `
      Example JSON Body:
    `;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    // Clean up potential markdown formatting from the response
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return text;
  } catch (error) {
    console.error('Error in generateExampleBody:', error);
    throw new Error('Failed to generate example body from Gemini API.');
  }
};

/**
 * Generates example query parameters for a GET request.
 * @returns {Promise<Array<{key: string, value: string}>>} A promise that resolves to an array of key-value pairs.
 */
const generateExampleQueryParams = async (requestName, requestPath) => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('Google API key is not defined in .env file.');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `
      You are an API testing assistant. For the following GET request, suggest 1 to 3 realistic query parameters.
      - ONLY output a valid JSON array of objects, where each object has a "key" and a "value" property.
      - Do not include any explanation or other text.
      - If no parameters seem logical, return an empty array [].

      Request Name: "${requestName}"
      Path: "${requestPath}"

      Example JSON Array:
    `;
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    
    // Make parsing more robust. Find the JSON array within the text.
    const jsonMatch = text.match(/\[.*\]/s);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error("Failed to parse JSON for query params:", text);
        return []; // Return empty on parsing failure
      }
    }
    
    // If no array is found, return empty.
    return [];
  } catch (error) {
    console.error(`Error parsing or generating query params for "${requestName}":`, error);
    // If AI fails or returns bad JSON, return an empty array to avoid crashing.
    return [];
  }
};

module.exports = {
  getCollectionAnalysis,
  generateExampleBody,
  generateExampleQueryParams,
};
