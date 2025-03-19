const express = require('express');
const router = express.Router();
const openaiService = require('../services/openaiService');
const { validateRequest } = require('../utils/validator');

/**
 * Generate an explanation for the selected text
 * POST /api/explanation
 */
router.post('/', validateRequest, async (req, res) => {
  try {
    console.log(`Received explanation request: selectedText length = ${req.body.selectedText ? req.body.selectedText.length : 0}`);
    
    const {
      selectedText, 
      documentContext, 
      citationTexts = [], 
      type = 'general' 
    } = req.body;
    
    console.log(`Generating explanation for text type: ${type}, with ${citationTexts.length} citations`);
    
    if (type === 'definition') {
      console.log('Processing definition request for:', selectedText);
    } else if (type === 'concept') {
      console.log('Processing concept request, text length:', selectedText.length);
    } else if (type === 'paragraph') {
      console.log('Processing paragraph request, text length:', selectedText.length);
    }
    
    // Generate explanation using the OpenAI service
    const explanation = await openaiService.generateExplanation(
      selectedText, 
      documentContext, 
      citationTexts, 
      type
    );
    
    console.log(`Generated explanation: ${explanation.length} characters`);
    
    res.json({
      success: true,
      explanation,
      type
    });
  } catch (error) {
    console.error('Error generating explanation:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate explanation'
    });
  }
});

/**
 * Extract references from document text
 * POST /api/explanation/references
 */
router.post('/references', async (req, res) => {
  try {
    console.log('Received references extraction request');
    
    const { documentText } = req.body;
    
    if (!documentText || typeof documentText !== 'string') {
      console.error('Document text missing or invalid');
      return res.status(400).json({
        success: false,
        error: 'Document text is required'
      });
    }
    
    console.log(`Extracting references from document of length: ${documentText.length}`);
    
    // Extract references from the document
    const references = openaiService.extractReferences(documentText);
    
    console.log(`Extracted ${references.length} references`);
    
    res.json({
      success: true,
      references
    });
  } catch (error) {
    console.error('Error extracting references:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract references'
    });
  }
});

module.exports = router; 