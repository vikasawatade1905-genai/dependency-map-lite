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

function restoreApiPath(req) {
  const requestUrl = new URL(req.url, 'http://vercel.local');
  const apiPath = requestUrl.searchParams.get('path');

  if (apiPath === null) {
    return;
  }

  requestUrl.searchParams.delete('path');
  const query = requestUrl.searchParams.toString();
  req.url = `/api/${apiPath}${query ? `?${query}` : ''}`;
}

module.exports = async function handler(req, res) {
  try {
    restoreApiPath(req);
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