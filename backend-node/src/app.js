/**
 * ValAI - Valorant Statistics API (Node.js/Express)
 * Main application entry point.
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { initDb } = require('./database');
const { accountRouter, statsRouter, chatRouter } = require('./api/routes');

const app = express();
const PORT = process.env.PORT || 8000;

// ============== Middleware ==============

// Parse JSON bodies
app.use(express.json());

// Enable CORS for frontend
// Note: When credentials are true, you CANNOT use "*" for origins
// You must specify exact origins
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ============== Routes ==============

// Include routers
app.use('/api/stats', statsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/account', accountRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'ValAI API',
    version: '1.0.0',
    endpoints: {
      stats: '/api/stats',
      last_match: '/api/stats/last-match',
      stability: '/api/stats/stability/:player_id',
      matches: '/api/stats/matches/:player_id',
      players: '/api/stats/players',
      chat: '/api/chat/completions',
      account: {
        register: '/api/account/register',
        login: '/api/account/login',
        profile: '/api/account/me',
        change_password: '/api/account/change-password',
      },
    },
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    detail: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    detail: 'Not found',
  });
});

// ============== Start Server ==============

async function startServer() {
  try {
    // Initialize database
    await initDb();

    // Start listening
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`ValAI API server running on http://0.0.0.0:${PORT}`);
      console.log(`  - Stats:   http://localhost:${PORT}/api/stats`);
      console.log(`  - Chat:    http://localhost:${PORT}/api/chat`);
      console.log(`  - Account: http://localhost:${PORT}/api/account`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
