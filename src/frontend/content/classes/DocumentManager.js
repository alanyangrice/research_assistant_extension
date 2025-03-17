class DocumentManager {
  constructor() {
    console.log('Creating DocumentManager');
    this.documentText = "";
    this.documentReferences = [];
    this.initialized = false;
  }

  initialize() {
    try {
      console.log('Initializing DocumentManager');
      this.documentText = this.extractDocumentText();
      console.log(`Extracted document text: ${this.documentText.length} characters`);
      this.extractReferences();
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing DocumentManager:', error);
    }
  }

  extractDocumentText() {
    try {
      // Get all text nodes, excluding script and style elements
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            // Skip script, style, and hidden elements
            if (node.parentElement.closest('script, style, [style*="display: none"]')) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      let text = '';
      let node;
      while (node = walker.nextNode()) {
        text += node.textContent + ' ';
      }
      
      return text.trim();
    } catch (error) {
      console.error('Error extracting document text:', error);
      return "";
    }
  }

  async extractReferences() {
    try {
      const referencesSection = this.findReferencesSection();
      if (!referencesSection) {
        console.log('No references section found in document');
        return;
      }

      console.log('Found references section:', referencesSection.substring(0, 100) + '...');
      const lines = referencesSection.split('\n');
      this.documentReferences = lines
        .map(line => line.trim())
        .filter(line => line.length > 10); // Filter out very short lines
        
      console.log(`Extracted ${this.documentReferences.length} references`);
    } catch (error) {
      console.error('Error extracting references:', error);
      this.documentReferences = [];
    }
  }

  findReferencesSection() {
    try {
      // Common headings for reference sections
      const refHeadings = ['references', 'bibliography', 'works cited', 'citations', 'literature cited'];
      
      // Try to find the references section using headers
      console.log('Searching for reference section headers');
      const headers = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      for (const header of headers) {
        const headerText = header.textContent.toLowerCase().trim();
        if (refHeadings.some(ref => headerText.includes(ref))) {
          console.log('Found reference section header:', headerText);
          // Get all following siblings until the next header
          let content = '';
          let element = header.nextElementSibling;
          while (element && !element.matches('h1, h2, h3, h4, h5, h6')) {
            content += element.textContent + '\n';
            element = element.nextElementSibling;
          }
          return content.trim();
        }
      }
      
      // If no headers found, try to find a section with lots of citations
      console.log('No reference header found, searching for citation patterns');
      const paragraphs = Array.from(document.querySelectorAll('p, div'));
      for (const para of paragraphs) {
        const text = para.textContent.trim();
        if (text.length > 100 && text.match(/\[\d+\]|\(\d{4}\)/) && text.match(/et al\./)) {
          console.log('Found potential reference section by pattern matching');
          return text;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding references section:', error);
      return null;
    }
  }

  extractSurroundingContext(selectedText, contextSize = 1500) {
    try {
      if (!this.documentText || !selectedText) {
        console.warn('No document text or selected text for context extraction');
        return selectedText || '';
      }
      
      const selectedIndex = this.documentText.indexOf(selectedText);
      if (selectedIndex === -1) {
        console.warn('Selected text not found in document text, using fuzzy match');
        // Try a fuzzy match if exact match fails
        for (let i = 0; i < selectedText.length - 10; i++) {
          const subtext = selectedText.substring(i, i + 10);
          const fuzzyIndex = this.documentText.indexOf(subtext);
          if (fuzzyIndex !== -1) {
            const approxStart = Math.max(0, fuzzyIndex - i);
            const startIndex = Math.max(0, approxStart - contextSize / 2);
            const endIndex = Math.min(this.documentText.length, approxStart + selectedText.length + contextSize / 2);
            
            return this.documentText.substring(startIndex, endIndex);
          }
        }
        
        // If all else fails, just return the selected text
        return selectedText;
      }
      
      const startIndex = Math.max(0, selectedIndex - contextSize / 2);
      const endIndex = Math.min(this.documentText.length, selectedIndex + selectedText.length + contextSize / 2);
      
      return this.documentText.substring(startIndex, endIndex);
    } catch (error) {
      console.error('Error extracting surrounding context:', error);
      return selectedText || '';
    }
  }
  
  cleanup() {
    console.log('Cleaning up DocumentManager');
    this.documentText = "";
    this.documentReferences = [];
    this.initialized = false;
  }
}

export default DocumentManager; 