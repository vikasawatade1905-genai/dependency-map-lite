const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const { connectDB, disconnectDB } = require('./config/db');
const Task = require('./models/Task');
const { seedDemoTasks } = require('./seed/seedData');
const taskRoutes = require('./routes/taskRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'DependencyMap Lite API',
  });
});

const path = require('path');
const fs = require('fs');

// Mount API routes
app.use('/api/tasks', taskRoutes);

// Serve static frontend if client/dist exists (production build)
const clientDistPath = path.join(__dirname, '../client/dist');
if (!process.env.VERCEL && fs.existsSync(clientDistPath)) {
  console.log(`[Server] Serving production client from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// 404 Catch-All for unmatched API routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use(errorHandler);

/**
 * Bootstraps DB and server
 */
let serverInstance = null;

const startServer = async () => {
  try {
    await connectDB();

    // Auto-seed demo tasks if database is empty on boot
    const existingCount = await Task.countDocuments();
    if (existingCount === 0) {
      console.log('[Server] Database is empty. Auto-seeding initial DAG dataset...');
      await seedDemoTasks();
    } else {
      console.log(`[Server] Found ${existingCount} existing tasks in database.`);
    }

    serverInstance = app.listen(PORT, () => {
      console.log(`=================================================`);
      console.log(`🚀 DependencyMap Lite Server is LIVE on port ${PORT}`);
      console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`📊 Tasks Endpoint: http://localhost:${PORT}/api/tasks`);
      console.log(`🕸️ Graph Endpoint: http://localhost:${PORT}/api/tasks/graph`);
      console.log(`=================================================`);
    });
  } catch (err) {
    console.error('[Server] Fatal bootstrap error:', err);
    process.exit(1);
  }
};

// Graceful Shutdown Handlers
const handleShutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
  if (serverInstance) {
    serverInstance.close(async () => {
      console.log('[Server] HTTP server closed.');
      await disconnectDB();
      process.exit(0);
    });
  } else {
    await disconnectDB();
    process.exit(0);
  }
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

// Start server unless imported as a module in tests
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
