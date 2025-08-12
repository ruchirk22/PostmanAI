// src/services/aiService.js

const { GoogleGenerativeAI } = require("@google/generative-ai");

const getAiModel = () => {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('Google API key is not defined in .env file.');
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}

const getCollectionAnalysis = async (collection) => {
  const model = getAiModel();
  const prompt = `
    As an expert API analyst, analyze the following Postman collection. 
    Provide a concise, high-level explanation of the API's primary purpose and functionality in Markdown format.
    Your analysis should be easy to understand and well-presented.

    Collection Details:
    Name: ${collection.info.name}
    Description: ${collection.info.description || 'N/A'}
    Total Requests: ${collection.item.length}

    Your concise analysis:
  `;
  const result = await model.generateContent(prompt);
  return result.response.text();
};

const getSecurityAudit = async (collection) => {
    const model = getAiModel();
    const prompt = `
# Security Auditor Prompt for Postman API Collections

## Role Definition
You are a professional cybersecurity auditor specializing in API security assessments. Your task is to conduct a comprehensive security audit of the provided Postman API collection and generate a detailed security audit report in Markdown format.

## Analysis Framework
Analyze the Postman collection systematically across these security domains:

### 1. Authentication & Authorization
- Review authentication methods used (API keys, tokens, OAuth, etc.)
- Check for hardcoded credentials or sensitive tokens in requests
- Evaluate authorization mechanisms and access controls
- Identify missing authentication on sensitive endpoints
- Assess token storage and transmission security

### 2. Data Protection & Privacy
- Identify endpoints handling sensitive data (PII, financial, health data)
- Check for proper data encryption in transit and at rest
- Review data masking and sanitization practices
- Evaluate compliance with data protection regulations (GDPR, CCPA)
- Assess data retention and deletion policies

### 3. Input Validation & Injection Vulnerabilities
- Review request parameters for proper validation
- Check for potential SQL injection vulnerabilities
- Identify NoSQL injection risks
- Evaluate XSS prevention measures
- Assess command injection possibilities
- Review file upload security controls

### 4. Network Security
- Analyze HTTPS usage and SSL/TLS configurations
- Check for insecure HTTP endpoints
- Review CORS policies and configurations
- Evaluate rate limiting and throttling mechanisms
- Assess network-level security controls

### 5. Error Handling & Information Disclosure
- Review error responses for information leakage
- Check for verbose error messages revealing system details
- Evaluate logging and monitoring practices
- Assess debug information exposure
- Review stack trace handling

### 6. Business Logic Security
- Identify potential business logic flaws
- Review workflow and process security
- Check for privilege escalation opportunities
- Evaluate transaction integrity
- Assess race condition vulnerabilities

## Report Structure
Generate your security audit report using this exact structure:

\`\`\`markdown
# API Security Audit Report

## Executive Summary
[2-3 paragraph summary of overall security posture, critical findings, and recommendations]

## Audit Scope
- Collection Name: ${collection.info.name}
- Number of Endpoints: ${collection.item.length}
- Audit Date: ${new Date().toISOString().split('T')[0]}
- Auditor: AI Security Auditor

## Critical Findings
[List high-severity security issues that require immediate attention]

### Finding 1: [Title]
- **Severity:** Critical
- **Affected Endpoints:** [List specific endpoints]
- **Description:** [Detailed explanation]
- **Risk Impact:** [Potential consequences]
- **Recommendation:** [Specific remediation steps]

## High-Risk Findings
[List medium to high-severity issues]

### Finding X: [Title]
- **Severity:** High
- **Affected Endpoints:** [List]
- **Description:** [Details]
- **Risk Impact:** [Impact]
- **Recommendation:** [Fix]

## Medium-Risk Findings
[List medium-severity issues]

## Low-Risk Findings & Best Practices
[List minor issues and improvement opportunities]

## Security Score
**Overall Security Rating:** [Score/10 or A-F grade]

### Score Breakdown:
- Authentication & Authorization: [Score/10]
- Data Protection: [Score/10]
- Input Validation: [Score/10]
- Network Security: [Score/10]
- Error Handling: [Score/10]
- Business Logic: [Score/10]

## Compliance Assessment
[Evaluate against common standards: OWASP API Top 10, PCI DSS, etc.]

## Remediation Roadmap
### Immediate Actions (0-30 days)
1. [Action item]
2. [Action item]

### Short-term Improvements (1-3 months)
1. [Action item]
2. [Action item]

### Long-term Enhancements (3-6 months)
1. [Action item]
2. [Action item]

## Conclusion
[Final assessment and key takeaways]
\`\`\`

Here is the JSON for the collection to be audited:
${JSON.stringify(collection, null, 2)}
`;

    const result = await model.generateContent(prompt);
    return result.response.text();
};

const generateApiDocs = async (collection) => {
    const model = getAiModel();
    const prompt = `
# API Documentation Generator Prompt for Postman Collections

## Role Definition
You are a technical documentation specialist who creates comprehensive, professional API documentation from Postman collections. Your task is to analyze the provided Postman collection and generate complete, developer-ready API documentation in Markdown format that follows industry best practices and standards.

## Documentation Structure Template
Generate documentation using this exact structure:

\`\`\`markdown
# ${collection.info.name} API Documentation

## Overview
${collection.info.description || '[2-3 paragraph description of the API, its purpose, and key capabilities]'}

**Version:** ${collection.info.version || '1.0.0'}
**Base URL:** \`[Determine Base URL from requests]\`
**Last Updated:** ${new Date().toISOString().split('T')[0]}

## Table of Contents
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Data Models](#data-models)
- [Endpoints](#endpoints)
  
## Authentication
[Detailed authentication documentation based on collection auth methods]

## Error Handling
[Generic error handling section, or derive from examples if present]

## Rate Limiting
[Rate limiting information if applicable]

## Data Models
[Extract and document data models from request/response bodies]

## Endpoints
[Document each endpoint from the collection here, following the detailed structure below for each]

---
#### [HTTP METHOD] [Endpoint Path]
[Brief description of what this endpoint does]

**URL:** \`[METHOD] [Full URL Path]\`
**Authentication:** [Required auth method]
**Parameters:**
**Request Body:**
**Response:**
---
\`\`\`

Here is the JSON for the collection to be documented:
${JSON.stringify(collection, null, 2)}
`;
    const result = await model.generateContent(prompt);
    return result.response.text();
};

const generateTestScript = async (requestItem) => {
    const model = getAiModel();
    const prompt = `
# Postman JavaScript Test Script Generator Prompt

## Role Definition
You are a professional API testing specialist who creates comprehensive JavaScript test scripts for Postman. Your task is to analyze the provided Postman request and generate a complete, production-ready test script that can be directly copied and pasted into the Postman "Tests" tab.

## Output Format Requirements
- Provide ONLY the raw JavaScript code block.
- No explanatory text, backticks, or markdown before or after the code.
- Ensure code is immediately copy-pasteable into Postman.

## Test Script Structure Template
Generate tests following this structure:
\`\`\`javascript
// ===========================================
// Test Suite: ${requestItem.name}
// Method: ${requestItem.request.method}
// Endpoint: /${requestItem.request.url.path ? requestItem.request.url.path.join('/') : ''}
// Generated: ${new Date().toISOString().split('T')[0]}
// ===========================================

pm.test("Status code is valid", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201, 202, 204]);
});

pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(2000);
});

// Add more specific tests based on the request below
\`\`\`

Analyze the provided Postman request and generate the complete JavaScript test script now.

Request JSON:
${JSON.stringify(requestItem, null, 2)}
`;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    // Clean up potential markdown formatting from the AI response
    return text.replace(/^```javascript\n?/, '').replace(/```$/, '').trim();
};

module.exports = {
  getCollectionAnalysis,
  getSecurityAudit,
  generateApiDocs,
  generateTestScript,
};