// src/services/aiService.js

const { GoogleGenerativeAI } = require("@google/generative-ai");

// No changes to getCollectionAnalysis, generateExampleBody, generateExampleQueryParams

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

const generateExampleBody = async (requestDetails) => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('Google API key is not defined in .env file.');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
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
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return text;
  } catch (error) {
    console.error('Error in generateExampleBody:', error);
    throw new Error('Failed to generate example body from Gemini API.');
  }
};

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
    const jsonMatch = text.match(/\[.*\]/s);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error("Failed to parse JSON for query params:", text);
        return [];
      }
    }
    return [];
  } catch (error) {
    console.error(`Error parsing or generating query params for "${requestName}":`, error);
    return [];
  }
};

/**
 * **NEW**: Generates a Postman test script for a request.
 * @param {object} requestObject - The Postman request object.
 * @returns {Promise<string>} A promise that resolves to the JavaScript test code.
 */
const generateTestScript = async (requestObject) => {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('Google API key is not defined in .env file.');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    let prompt = `
        You are an API test automation engineer. Generate a Postman test script for the following request.
        The script should be in JavaScript.
        - ALWAYS include a test for the status code (e.g., 200, 201).
        - If the request is a GET, or has an example response, add a test to check if the response is valid JSON.
        - If there is an example JSON response, add a test to check for the existence of 1-2 key properties.

        Request Details:
        Name: ${requestObject.name}
        Method: ${requestObject.method}
        
        ONLY output the raw JavaScript code for the test script. Do not include markdown or explanations.
    `;

    // Add example response info to the prompt if available
    if (requestObject.responses && requestObject.responses[0] && requestObject.responses[0].body) {
        prompt += `
        Example Response Body:
        ${requestObject.responses[0].body}
        `;
    }

    try {
        const result = await model.generateContent(prompt);
        let text = result.response.text();
        return text.replace(/```javascript/g, '').replace(/```/g, '').trim();
    } catch (error) {
        console.error('Error in generateTestScript:', error);
        throw new Error('Failed to generate test script from Gemini API.');
    }
};

/**
 * **NEW**: Audits a collection for security and performance issues.
 * @param {string} collectionSummary - A detailed summary of the collection.
 * @returns {Promise<string>} A promise that resolves to a Markdown report.
 */
const getSecurityAudit = async (collectionSummary) => {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('Google API key is not defined in .env file.');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
        You are a senior cybersecurity and API performance analyst.
        Analyze the following API collection summary and provide a report in Markdown format.
        Focus on identifying potential security vulnerabilities, performance issues, and violations of REST best practices.
        For each issue, provide a clear title, a brief explanation of the risk, and a specific recommendation.
        If no major issues are found, state that the collection appears to follow good practices.

        API Collection Summary:
        ${collectionSummary}

        Your Markdown Report:
    `;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error('Error in getSecurityAudit:', error);
        throw new Error('Failed to get security audit from Gemini API.');
    }
};


module.exports = {
  getCollectionAnalysis,
  generateExampleBody,
  generateExampleQueryParams,
  generateTestScript,
  getSecurityAudit,
};
