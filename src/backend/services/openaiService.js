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
  
  console.log(`Generating explanation for type: ${type}`);
  
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
 * Refine an explanation (make it simpler or more detailed)
 * @param {string} selectedText - Original text that was explained
 * @param {string} currentExplanation - The current explanation to refine
 * @param {string} refinementType - Type of refinement ('simpler', 'detailed', or 'summarize')
 * @param {string} documentContext - Surrounding context from the paper
 * @param {Array} citationTexts - Array of citation texts from the paper
 * @returns {Promise<string>} The refined explanation
 */
async function refineExplanation(selectedText, currentExplanation, refinementType, documentContext = '', citationTexts = []) {
  let prompt;
  let maxTokens;
  let systemContent;
  
  try {
    console.log(`Refining explanation to be ${refinementType}`);
    
    switch (refinementType) {
      case 'simpler':
        console.log('Creating simpler prompt...');
        prompt = createSimplerPrompt(selectedText, currentExplanation, documentContext);
        maxTokens = 350; // Simpler explanations should be concise
        systemContent = getSimplifierSystemPrompt();
        break;
        
      case 'detailed':
        console.log('Creating detailed prompt...');
        prompt = createDetailedPrompt(selectedText, currentExplanation, documentContext, citationTexts);
        maxTokens = 500; // Detailed explanations can be longer
        systemContent = getDetailedSystemPrompt();
        break;
        
      case 'summarize':
        console.log('Creating summarize prompt...');
        prompt = createSummarizePrompt(selectedText, currentExplanation, documentContext);
        maxTokens = 200; // Summaries should be very concise
        systemContent = getSummarizeSystemPrompt();
        break;
        
      default:
        // Fallback to simpler explanation if an unknown refinement type is provided
        console.log(`Unknown refinement type: ${refinementType}, defaulting to simpler explanation`);
        prompt = createSimplerPrompt(selectedText, currentExplanation, documentContext);
        maxTokens = 350;
        systemContent = getSimplifierSystemPrompt();
    }
    
    console.log(`Prompt created, length: ${prompt ? prompt.length : 0}`);
    console.log('Sending refinement request to OpenAI API...');
    
    // Check if prompt and systemContent are valid
    if (!prompt) {
      throw new Error('Failed to create prompt');
    }
    
    if (!systemContent) {
      throw new Error('Failed to get system content');
    }
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemContent
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: maxTokens
    });
    
    console.log('Received refinement response from OpenAI API');
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error during refinement:', error);
    console.error('Error details:', error.message);
    if (error.response) {
      console.error('Error response from OpenAI:', error.response.data);
    }
    throw new Error(`Failed to refine explanation: ${error.message}`);
  }
}

/**
 * Get system prompt for simplifying explanations
 */
function getSimplifierSystemPrompt() {
  return "You are a research assistant that specializes in simplifying complex academic concepts. \
         Make academic content accessible while maintaining accuracy. Use simpler vocabulary, \
         shorter sentences, and concrete examples when possible.";
}

/**
 * Get system prompt for detailed explanations
 */
function getDetailedSystemPrompt() {
  return "You are a research assistant that specializes in providing in-depth, detailed explanations \
         of academic concepts. Maintain the academic rigor while expanding on important details, \
         nuances, and connections that might not be obvious to non-experts.";
}

/**
 * Get system prompt for summarized explanations
 */
function getSummarizeSystemPrompt() {
  return "You are a research assistant that specializes in summarizing complex academic concepts \
         into their most essential points. Focus on brevity, clarity, and capturing only the \
         most crucial information. Eliminate all non-essential details.";
}

/**
 * Answer a follow-up question based on a previous explanation
 * @param {string} originalText - The original text that was explained
 * @param {string} question - The follow-up question asked by the user
 * @param {Array} conversationHistory - Previous exchanges in the conversation
 * @param {string} documentContext - Surrounding context from the paper
 * @param {Array} citationTexts - Array of citation texts from the paper
 * @returns {Promise<string>} The answer to the follow-up question
 */
async function answerFollowupQuestion(originalText, question, conversationHistory, documentContext = '', citationTexts = []) {
  try {
    console.log(`Answering follow-up question: "${question}"`);
    
    // Format the conversation history for the API
    const formattedHistory = conversationHistory.map(msg => {
      if (msg.role === 'explanation') {
        return { role: "assistant", content: msg.content };
      }
      return { role: msg.role, content: msg.content };
    });
    
    console.log(`Conversation history contains ${formattedHistory.length} messages`);
    
    // Prepare messages for the API call
    const messages = [
      {
        role: "system",
        content: "You are a helpful research assistant specialized in explaining academic concepts. \
          You are in a conversation with a user about a piece of text they're trying to understand. \
          Be precise, helpful, and concise in your answers. Draw from the original text and conversation \
          history to provide accurate, relevant information."
      },
      {
        role: "user", 
        content: `Original text being discussed: "${originalText}"\n\n${documentContext ? `Context: ${documentContext.slice(0, 1000)}\n\n` : ''}`
      }
    ];
    
    // Add conversation history
    messages.push(...formattedHistory);
    
    console.log('Sending follow-up question to OpenAI API...');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      temperature: 0.5,  // Updated for consistency
      max_tokens: 350
    });
    
    console.log('Received follow-up response from OpenAI API');
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error during follow-up:', error);
    console.error('Error details:', error.message);
    if (error.response) {
      console.error('Error response from OpenAI:', error.response.data);
    }
    throw new Error(`Failed to answer follow-up question: ${error.message}`);
  }
}

/**
 * Create a prompt for explaining general terms or concepts
 */
function createGeneralPrompt(selectedText, documentContext) {
  return `
    Please provide a concise explanation of the following selected text \
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
    Keep your explanation under 50 words total. Focus only on:
    What the term means in this specific research context
    Use simple, direct language
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
    A clear explanation of what this paragraph is communicating.
    How the cited works support or relate to the paragraph's main points if there are any included.
    `;
  } else {
    citationSection = `
    Please provide:
    A clear summary of the paragraph in simpler terms and the main point or 
    finding being communicated if there is one.
    `;
  }
  
  return `
    Summarize and explain this paragraph from a research paper:
    "${paragraph}"

    Additional context from the paper:
    ${documentContext.slice(0, 1000)}

    ${citationSection}
    
    Keep your explanation concise and use simpler language than the original text.
    `;
}

/**
 * Create a prompt for explaining a concept
 */
function createConceptPrompt(conceptText, documentContext) {
  return `
    Explain this concept or statement from a research paper:
    "${conceptText}"

    Context from the paper:
    ${documentContext.slice(0, 1500)}

    Please provide a concise explanation that:
    Clarifies what this concept means in the context of this research
    Explains why it's significant in this paper
    
    Use clear language and keep your explanation under 100 words.
    `;
}

/**
 * Create a prompt for a simpler explanation
 */
function createSimplerPrompt(selectedText, currentExplanation, documentContext) {
  return `
    I need a SIMPLER explanation of this text from a research paper:
    "${selectedText}"
    
    Here is the current explanation that needs to be simplified:
    "${currentExplanation}"
    
    Additional context from the paper:
    ${documentContext.slice(0, 800)}
    
    Please rewrite the explanation using:
    Simpler vocabulary and shorter sentences
    More straightforward language with fewer technical terms
    Basic examples or analogies if helpful
    
    The explanation should still be accurate but more accessible to someone without expertise in this field.
    Keep your response concise and direct.
  `;
}

/**
 * Create a prompt for a more detailed explanation
 */
function createDetailedPrompt(selectedText, currentExplanation, documentContext, citationTexts) {
  let citationSection = "";
  if (citationTexts && citationTexts.length > 0) {
    citationSection = `
    The text references these sources:
    ${citationTexts.map((text, i) => `Source ${i+1}: ${text}`).join('\n')}
    `;
  }
  
  return `
    I need a MORE DETAILED explanation of this text from a research paper:
    "${selectedText}"
    
    Here is the current explanation that needs more depth:
    "${currentExplanation}"
    
    Additional context from the paper:
    ${documentContext.slice(0, 1000)}
    
    ${citationSection}
    
    Please provide a more in-depth explanation that:
    Expands on important concepts mentioned in the text
    Explains the significance and implications in more detail
    Discusses relevant theoretical background or methodological details
    Connects this information to the broader field or research context
    
    While being more detailed, still maintain clarity and focus on what's most relevant.
  `;
}

/**
 * Create a prompt for a summarized explanation
 */
function createSummarizePrompt(selectedText, currentExplanation, documentContext) {
  return `
    Summarize this text from a research paper into 2-3 key points:
    "${selectedText}"
    
    Here is the current explanation to condense:
    "${currentExplanation}"
    
    Additional context from the paper:
    ${documentContext.slice(0, 600)}
    
    Create an extremely concise summary that:
    Focuses ONLY on the most important ideas (2-3 points maximum)
    Uses as few words as possible while retaining essential meaning
    Expresses each key point in a single, clear sentence
    Avoids any background information or explanatory details
    
    Your summary should be no more than 3-4 sentences total.
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
  refineExplanation,
  answerFollowupQuestion,
  extractReferences
};