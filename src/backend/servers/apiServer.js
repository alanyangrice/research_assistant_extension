require('dotenv').config();
const express = require('express');
const cors = require('cors');
const explanationRoutes = require('../routes/explanationRoutes');

// Initialize the Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Debug logging middleware - Enhanced version
app.use((req, res, next) => {
  const start = Date.now();
  
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - REQUEST RECEIVED`);
  console.log(`Origin: ${req.headers.origin || 'unknown'}`);
  
  // Log response after it's sent
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - RESPONSE SENT: ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Enable CORS for all routes
app.use(cors({
  origin: '*', // Allow all origins in development
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// Parse JSON bodies - Increased limit for larger documents
app.use(express.json({ limit: '10mb' }));

// Add test endpoint FIRST, before other routes
app.get('/test-api', (req, res) => {
  console.log("Test API endpoint accessed");
  res.status(200).json({ status: 'ok', message: 'Test API endpoint is working' });
});

// Routes
app.use('/api/explanation', explanationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  console.log("Health check endpoint accessed");
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Test endpoint
app.get('/test', (req, res) => {
  console.log("Test endpoint accessed");
  res.status(200).json({ status: 'ok', message: 'Test endpoint is working' });
});

// Echo endpoint for debugging
app.post('/echo', (req, res) => {
  console.log("Echo endpoint received data:", req.body);
  res.status(200).json({
    status: 'ok',
    message: 'Echo endpoint received your data',
    receivedData: req.body
  });
});

// 404 handler
app.use((req, res, next) => {
  console.log(`404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({
    error: true,
    message: `Route not found: ${req.method} ${req.url}`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log('===== BACKEND SERVER STARTED =====');
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  console.log(`Test endpoints available at http://localhost:${PORT}/test and http://localhost:${PORT}/test-api`);
  console.log(`Echo endpoint available at http://localhost:${PORT}/echo`);
  console.log(`API endpoints available at http://localhost:${PORT}/api/explanation`);
  console.log('CORS enabled for all origins in development mode');
  console.log(`OpenAI API key configured: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
  console.log('==================================');
}); 