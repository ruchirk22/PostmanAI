// src/utils/fileHelper.js

// Add a new function to read JSON files.
const fs = require('fs').promises;

const saveJsonToFile = async (filePath, data) => {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, jsonString);
    console.log(`Data successfully saved to ${filePath}`);
  } catch (error) {
    console.error('Error saving data to file:', error);
    throw new Error('Failed to save data to file.');
  }
};

/**
 * Reads and parses a JSON file.
 * @param {string} filePath - The path to the JSON file.
 * @returns {Promise<object>} A promise that resolves to the parsed JSON data.
 */
const readJsonFromFile = async (filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading or parsing file:', error);
    throw new Error('Failed to read or parse JSON file.');
  }
};

module.exports = { 
  saveJsonToFile,
  readJsonFromFile, // Export the new function
};