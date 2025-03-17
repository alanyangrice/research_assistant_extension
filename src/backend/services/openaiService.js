const { OpenAI } = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Validate OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY environment variable is not set');
  throw new Error('OpenAI API key is required');
}

/**
 * Generate an explanation for selected text using GPT
 * @param {string} selectedText - The text highlighted by the user
 * @param {string} documentContext - Surrounding context from the paper
 * @param {Array} citationTexts - Array of citation texts from the paper
 * @param {string} type - Type of explanation needed (definition, concept, paragraph)
 * @returns {Promise<string>} The generated explanation
 */
async function generateExplanation(selectedText, documentContext, citationTexts = [], type = 'general') {
  let prompt;
  let maxTokens = 350; // Default max tokens - reduced from 500
  
  // Customize the prompt based on the type of explanation needed
  switch (type) {
    case 'definition':
      prompt = createDefinitionPrompt(selectedText, documentContext);
      maxTokens = 150; // Shorter responses for definitions - reduced from 200
      break;
    case 'paragraph':
      prompt = createParagraphPrompt(selectedText, documentContext, citationTexts);
      maxTokens = 400; // Responses for paragraphs - reduced from 600
      break;
    case 'concept':
      prompt = createConceptPrompt(selectedText, documentContext);
      maxTokens = 250; // Medium-length responses for concepts - reduced from 350
      break;
    default:
      prompt = createGeneralPrompt(selectedText, documentContext);
  }
  
  try {
    console.log('Sending request to OpenAI API...');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // You can adjust the model as needed
      messages: [
        {
          role: "system",
          content: "You are a helpful research assistant specialized in explaining \
            complex academic concepts. Use academic language but prioritize brevity \
            and clarity. Keep explanations concise, direct, and to-the-point. \
            Avoid unnecessary elaboration and focus on the most essential information. \
            When citations are provided, incorporate them efficiently."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: maxTokens
    });
    
    console.log('Received response from OpenAI API');
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate explanation');
  }
}

/**
 * Create a prompt for explaining general terms or concepts
 */
function createGeneralPrompt(selectedText, documentContext) {
  return `
    Please provide a concise explaination of the following selected text \
    from a research paper:
    "${selectedText}"

    Here is some context from the paper to help you understand the topic:
    ${documentContext.slice(0, 1500)}
    
    Keep your response brief and focused.
    `;
}

/**
 * Create a prompt focused on defining a term
 */
function createDefinitionPrompt(term, documentContext) {
  return `
    Define the term or phrase: "${term}"

    Based on this context from the research paper:
    ${documentContext.slice(0, 1000)}

    Provide a VERY BRIEF definition of this term as used in this context. 
    Keep your explanation under 75 words total. Focus only on:
    1. What the term means in this specific research context
    `;
}

/**
 * Create a prompt for explaining a paragraph with citations
 */
function createParagraphPrompt(paragraph, documentContext, citationTexts) {
  // Extract citation numbers from the paragraph if available
  const citationPattern = /\[(\d+(?:,\s*\d+)*)\]|\(([^)]+(?:,\s*[^)]+)*)\)/g;
  let citationsFound = [];
  let match;
  
  while ((match = citationPattern.exec(paragraph)) !== null) {
    if (match[1]) citationsFound.push(match[1]);
    if (match[2]) citationsFound.push(match[2]);
  }
  
  // Only include citation information if citations were found
  let citationSection = "";
  if (citationTexts.length > 0) {
    citationSection = `
    Referenced sources in this paragraph:
    ${citationTexts.map((text, i) => `Source ${i+1}: ${text}`).join('\n')}
    
    Please include:
    1. A clear explanation of what this paragraph is communicating
    2. How the cited works support or relate to the paragraph's claims
    `;
  } else {
    citationSection = `
    Please provide:
    A clear and concise explanation of what this paragraph is communicating
    `;
  }
  
  return `
    Explain this paragraph from a research paper:
    "${paragraph}"

    Additional context from the paper:
    ${documentContext.slice(0, 1000)}

    ${citationSection}
    
    Keep your explanation concise and to the point.
    `;
}

/**
 * Create a prompt for explaining a concept
 */
function createConceptPrompt(conceptText, documentContext) {
  return `
    Explain this concept from a research paper:
    "${conceptText}"

    Context from the paper:
    ${documentContext.slice(0, 1500)}

    Please provide a concise explanation of:
    1. What this concept means in the context of this research
    2. How it's used in the paper
    
    Keep your explanation clear but brief.
    `;
}

/**
 * Extract references from document text
 * @param {string} documentText - The full text of the document
 * @returns {Array} Array of references
 */
function extractReferences(documentText) {
  // Look for common reference section headers
  const refHeaders = [
    'References', 'REFERENCES', 'Bibliography', 'BIBLIOGRAPHY', 
    'Works Cited', 'WORKS CITED', 'Literature Cited'
  ];
  
  let refSection = '';
  
  // Find the reference section
  for (const header of refHeaders) {
    const headerIndex = documentText.indexOf(header);
    if (headerIndex !== -1) {
      refSection = documentText.slice(headerIndex);
      break;
    }
  }
  
  if (!refSection) return [];
  
  // Split references - using simplified pattern
  // This is a basic implementation - would need improvement for different reference formats
  const references = refSection.split(/\[\d+\]|\d+\.\s/).filter(ref => ref.trim().length > 30);
  
  return references.slice(1, 31); // Return up to 30 references, skip the header
}

module.exports = {
  generateExplanation,
  extractReferences
};