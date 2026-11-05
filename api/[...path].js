const { app } = require('../server/server');
const { connectDB } = require('../server/config/db');
const Task = require('../server/models/Task');
const { seedDemoTasks } = require('../server/seed/seedData');

let initializationPromise;

async function initializeDatabase() {
  await connectDB();

  if ((await Task.countDocuments()) === 0) {
    await seedDemoTasks();
  }
}

module.exports = async function handler(req, res) {
  try {
    initializationPromise ||= initializeDatabase().catch((error) => {
      initializationPromise = null;
      throw error;
    });
    await initializationPromise;
    return app(req, res);
  } catch (error) {
    console.error(`[Vercel API] Initialization failed: ${error.message}`);
    return res.status(503).json({
      success: false,
      message: 'Database is unavailable. Check the MONGO_URI configuration.',
    });
  }
};