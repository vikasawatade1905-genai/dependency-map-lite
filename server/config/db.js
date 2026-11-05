const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoMemoryServerInstance = null;

/**
 * Connect to MongoDB with graceful fallback to mongodb-memory-server
 */
const connectDB = async () => {
  const targetUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dependencymap_lite';

  try {
    console.log(`[Database] Attempting connection to MongoDB at: ${targetUri}`);
    // Attempt local or configured MongoDB instance with a 2-second timeout
    await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000,
    });
    console.log(`[Database] Successfully connected to persistent MongoDB at ${targetUri}`);
  } catch (error) {
    console.warn(`[Database] Connection to ${targetUri} failed (${error.message}).`);
    console.log('[Database] Initializing in-memory fallback (mongodb-memory-server)...');

    try {
      // Use x64 architecture binary with Windows emulation support
      mongoMemoryServerInstance = await MongoMemoryServer.create({
        binary: {
          arch: 'x64',
          version: '7.0.14',
        },
      });
      const inMemoryUri = mongoMemoryServerInstance.getUri();
      
      await mongoose.connect(inMemoryUri);
      console.log(`[Database] In-memory MongoDB running and connected at ${inMemoryUri}`);
    } catch (fallbackError) {
      console.error('[Database] Fatal: Failed to initialize in-memory MongoDB fallback:', fallbackError);
      process.exit(1);
    }
  }
};

/**
 * Disconnect and clean up resources
 */
const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('[Database] Mongoose disconnected.');
    }
    if (mongoMemoryServerInstance) {
      await mongoMemoryServerInstance.stop();
      console.log('[Database] In-memory MongoDB stopped.');
    }
  } catch (err) {
    console.error('[Database] Error during disconnection:', err);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
};
