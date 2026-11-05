const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoMemoryServerInstance = null;
let connectionPromise = null;

/**
 * Reuse the Mongoose connection across local and serverless invocations.
 */
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    const targetUri = process.env.MONGO_URI;

    if (targetUri) {
      try {
        await mongoose.connect(targetUri, {
          serverSelectionTimeoutMS: 10000,
          connectTimeoutMS: 10000,
          maxPoolSize: 5,
        });
        console.log('[Database] Connected to configured MongoDB.');
        return mongoose.connection;
      } catch (error) {
        console.error(`[Database] Configured MongoDB connection failed: ${error.message}`);
        throw error;
      }
    }

    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      throw new Error('MONGO_URI is required in production.');
    }

    try {
      await mongoose.connect('mongodb://127.0.0.1:27017/dependencymap_lite', {
        serverSelectionTimeoutMS: 2000,
        connectTimeoutMS: 2000,
      });
    } catch (fallbackError) {
      console.warn(`[Database] Local MongoDB unavailable (${fallbackError.message}); starting in-memory fallback.`);
      mongoMemoryServerInstance = await MongoMemoryServer.create({
        binary: { arch: 'x64', version: '7.0.14' },
      });
      await mongoose.connect(mongoMemoryServerInstance.getUri());
    }

    return mongoose.connection;
  })().catch((error) => {
    connectionPromise = null;
    throw error;
  });

  return connectionPromise;
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
      mongoMemoryServerInstance = null;
      console.log('[Database] In-memory MongoDB stopped.');
    }
    connectionPromise = null;
  } catch (err) {
    console.error('[Database] Error during disconnection:', err);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
};
