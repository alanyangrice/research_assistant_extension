/**
 * Get citation numbers from a paragraph of text
 * @param {string} text - The paragraph text
 * @returns {Array} Array of citation numbers
 */
function extractCitationNumbers(text) {
  // Match patterns like [1], [1,2], [1-3], (Author, 2020), (Author et al., 2020)
  const bracketPattern = /\[(\d+(?:[-,\s]*\d+)*)\]/g;
  const parenthesisPattern = /\(([^)]+(?:\d{4})[^)]*)\)/g;
  
  const citationNumbers = [];
  let match;
  
  // Extract citation numbers from bracket citations [1]
  while ((match = bracketPattern.exec(text)) !== null) {
    const citations = match[1].split(/[-,\s]+/).map(num => num.trim()).filter(Boolean);
    citationNumbers.push(...citations);
  }
  
  // Extract citation references from parenthesis citations (Author, 2020)
  const authorCitations = [];
  while ((match = parenthesisPattern.exec(text)) !== null) {
    authorCitations.push(match[1].trim());
  }
  
  return {
    numbers: citationNumbers,
    authorCitations: authorCitations
  };
}

/**
 * Extract surrounding context for a selected text
 * @param {string} fullText - The full document text
 * @param {string} selectedText - The selected text
 * @param {number} contextSize - The amount of context to include (characters)
 * @returns {string} The text with surrounding context
 */
function extractSurroundingContext(fullText, selectedText, contextSize = 2000) {
  if (!fullText || !selectedText) return '';
  
  const selectedIndex = fullText.indexOf(selectedText);
  if (selectedIndex === -1) return selectedText;
  
  const startIndex = Math.max(0, selectedIndex - contextSize / 2);
  const endIndex = Math.min(fullText.length, selectedIndex + selectedText.length + contextSize / 2);
  
  return fullText.substring(startIndex, endIndex);
}

/**
 * Find references in the document that match the citation numbers
 * @param {Array} citationNumbers - Array of citation numbers
 * @param {Array} references - Array of references from the document
 * @returns {Array} Matching references
 */
function findMatchingReferences(citationNumbers, references) {
  if (!citationNumbers.length || !references.length) return [];
  
  const matchingRefs = [];
  
  // For numeric citations [1]
  for (const num of citationNumbers.numbers) {
    const index = parseInt(num) - 1;
    if (index >= 0 && index < references.length) {
      matchingRefs.push(references[index]);
    }
  }
  
  // For author citations (Author, 2020)
  for (const citation of citationNumbers.authorCitations) {
    // Extract author name and year
    const match = citation.match(/([^,]+),\s*(\d{4})/);
    if (match) {
      const [_, author, year] = match;
      // Look for references containing both author and year
      for (const ref of references) {
        if (ref.includes(author) && ref.includes(year)) {
          matchingRefs.push(ref);
        }
      }
    }
  }
  
  return matchingRefs;
}

/**
 * Detect what type of text was selected
 * @param {string} text - The selected text
 * @returns {string} The type of text: 'definition', 'concept', 'paragraph'
 */
function detectTextType(text) {
  const wordCount = text.split(/\s+/).length;
  
  if (wordCount <= 3) {
    return 'definition';
  } else if (wordCount <= 20) {
    return 'concept';
  } else {
    return 'paragraph';
  }
}

module.exports = {
  extractCitationNumbers,
  extractSurroundingContext,
  findMatchingReferences,
  detectTextType
}; 