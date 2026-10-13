import mongoose from 'mongoose';

/**
 * Resolves MongoDB URI from environment variables with priority:
 * 1. MONGODB_URI (standard convention in .env & .env.example)
 * 2. MONGO_URI (legacy fallback)
 * 
 * @returns {{ uri: string|null, source: string, isPlaceholder: boolean }}
 */
export const resolveMongoUri = () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || null;
  const source = process.env.MONGODB_URI ? 'MONGODB_URI' : process.env.MONGO_URI ? 'MONGO_URI' : 'none';
  const isPlaceholder = Boolean(
    !uri ||
    uri.includes('<username>') ||
    uri.includes('<password>') ||
    uri.includes('your_mongo_uri') ||
    uri.includes('example.com')
  );
  return { uri, source, isPlaceholder };
};

/**
 * Returns current database connection and storage persistence status.
 * @returns {{ connected: boolean, host: string|null, readyState: number, storageMode: string, uriSource: string }}
 */
export const getDatabaseStatus = () => {
  const readyState = mongoose.connection?.readyState ?? 0;
  const isConnected = readyState === 1;
  const { source, isPlaceholder } = resolveMongoUri();
  
  return {
    connected: isConnected,
    host: isConnected ? mongoose.connection.host : null,
    readyState,
    storageMode: isConnected ? 'mongodb-persistent' : 'in-memory-fallback',
    uriSource: source,
    isPlaceholder,
  };
};

export const connectDB = async () => {
  const { uri, source, isPlaceholder } = resolveMongoUri();

  if (!uri || isPlaceholder) {
    console.warn(
      `[Database] ⚠️ Neither MONGODB_URI nor MONGO_URI is configured with a valid connection string (source: ${source}). ` +
      `Running in 'in-memory-fallback' storage mode (data will not persist across restarts).`
    );
    return null;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] ✅ MongoDB Connected: ${conn.connection.host} (via ${source})`);
    return conn;
  } catch (error) {
    console.warn(
      `[Database] ⚠️ Could not connect to MongoDB at ${uri.replace(/\/\/[^@]+@/, '//***:***@')} (${error.message}). ` +
      `Active storage mode: 'in-memory-fallback'.`
    );
    return null;
  }
};
