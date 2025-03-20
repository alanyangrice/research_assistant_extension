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
 * Refine an explanation (make it simpler or more detailed)
 * POST /api/explanation/refine
 */
router.post('/refine', async (req, res) => {
  try {
    console.log('===== REFINEMENT REQUEST RECEIVED =====');
    
    const {
      selectedText,
      currentExplanation,
      refinementType,
      documentContext = '',
      citationTexts = []
    } = req.body;
    
    console.log(`Refinement type: ${refinementType}`);
    console.log(`Selected text length: ${selectedText ? selectedText.length : 0}`);
    console.log(`Current explanation length: ${currentExplanation ? currentExplanation.length : 0}`);
    console.log(`Document context length: ${documentContext ? documentContext.length : 0}`);
    console.log(`Citation texts count: ${citationTexts ? citationTexts.length : 0}`);
    
    // Generate refined explanation using the OpenAI service
    const explanation = await openaiService.refineExplanation(
      selectedText,
      currentExplanation,
      refinementType,
      documentContext,
      citationTexts
    );
    
    console.log(`Generated refined explanation: ${explanation.length} characters`);
    console.log('===== REFINEMENT RESPONSE SENT =====');
    
    res.json({
      success: true,
      explanation,
      refinementType
    });
  } catch (error) {
    console.error('===== REFINEMENT ERROR =====');
    console.error('Error refining explanation:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to refine explanation'
    });
  }
});

/**
 * Answer a follow-up question about a previous explanation
 * POST /api/explanation/followup
 */
router.post('/followup', async (req, res) => {
  try {
    console.log('===== FOLLOWUP QUESTION RECEIVED =====');
    
    const {
      originalText,
      question,
      conversationHistory,
      documentContext = '',
      citationTexts = []
    } = req.body;
    
    console.log(`Question: "${question}"`);
    console.log(`Original text length: ${originalText ? originalText.length : 0}`);
    console.log(`Conversation history length: ${conversationHistory ? conversationHistory.length : 0}`);
    console.log(`Document context length: ${documentContext ? documentContext.length : 0}`);
    console.log(`Citation texts count: ${citationTexts ? citationTexts.length : 0}`);
    
    // Generate answer to follow-up question
    const response = await openaiService.answerFollowupQuestion(
      originalText,
      question,
      conversationHistory,
      documentContext,
      citationTexts
    );
    
    console.log(`Generated follow-up response: ${response.length} characters`);
    console.log('===== FOLLOWUP RESPONSE SENT =====');
    
    res.json({
      success: true,
      response
    });
  } catch (error) {
    console.error('===== FOLLOWUP ERROR =====');
    console.error('Error answering follow-up question:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to answer follow-up question'
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