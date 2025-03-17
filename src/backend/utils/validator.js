/**
 * Validate request body for explanation endpoint
 */
function validateRequest(req, res, next) {
  const { selectedText, documentContext, citationTexts, type } = req.body;
  
  console.log(`Request body keys: ${Object.keys(req.body).join(', ')}`);
  console.log(`Request body sizes: selectedText=${selectedText ? selectedText.length : 'missing'}, documentContext=${documentContext ? documentContext.length : 'missing'}, citationTexts=${citationTexts ? citationTexts.length : 'missing'}`);
  
  // Check if request body exists
  if (!req.body || Object.keys(req.body).length === 0) {
    console.error("Validation failed: Empty request body");
    return res.status(400).json({
      success: false,
      error: 'Request body is empty'
    });
  }
  
  // Required fields validation
  if (!selectedText) {
    console.error("Validation failed: selectedText is missing or empty");
    return res.status(400).json({
      success: false,
      error: 'Selected text is required'
    });
  }
  
  if (selectedText.trim().length === 0) {
    console.error("Validation failed: selectedText is only whitespace");
    return res.status(400).json({
      success: false,
      error: 'Selected text cannot be empty'
    });
  }
  
  if (!documentContext) {
    console.error("Validation failed: documentContext is missing");
    return res.status(400).json({
      success: false,
      error: 'Document context is required'
    });
  }
  
  // Type validation
  if (typeof selectedText !== 'string' || typeof documentContext !== 'string') {
    console.error("Validation failed: type mismatch", {
      selectedTextType: typeof selectedText,
      documentContextType: typeof documentContext
    });
    return res.status(400).json({
      success: false,
      error: 'Selected text and document context must be strings'
    });
  }
  
  // Citations validation 
  if (citationTexts !== undefined) {
    if (!Array.isArray(citationTexts)) {
      console.error("Validation failed: citationTexts is not an array");
      return res.status(400).json({
        success: false,
        error: 'Citation texts must be an array'
      });
    }
    
    // Check that all citation texts are strings
    const nonStringCitations = citationTexts.filter(citation => typeof citation !== 'string');
    if (nonStringCitations.length > 0) {
      console.error(`Validation failed: ${nonStringCitations.length} citation texts are not strings`);
      return res.status(400).json({
        success: false,
        error: 'All citation texts must be strings'
      });
    }
  }
  
  // Type validation (optional)
  if (type !== undefined && typeof type !== 'string') {
    console.error("Validation failed: type is not a string");
    return res.status(400).json({
      success: false,
      error: 'Type must be a string'
    });
  }
  
  // Length validation
  if (selectedText.length > 5000) {
    console.error("Validation failed: selectedText is too long");
    return res.status(400).json({
      success: false,
      error: 'Selected text is too long (max 5000 characters)'
    });
  }
  
  if (documentContext.length > 50000) {
    console.error("Validation failed: documentContext is too long");
    return res.status(400).json({
      success: false,
      error: 'Document context is too long (max 50000 characters)'
    });
  }
  
  // All validations passed
  console.log("Request validation passed");
  next();
}

module.exports = {
  validateRequest
}; 