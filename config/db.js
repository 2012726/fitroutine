const mongoose = require('mongoose');
require('dotenv').config();

let mongoServer = null;

const connectDB = async () => {
  const connURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fitroutine';
  
  try {
    console.log(`[Database] Connecting to: ${connURI.replace(/:[^@]+@/, ':****@')}`);
    
    // Set 3-second connection timeout for local db connections to fail fast and fall back
    const isLocal = connURI.includes('localhost') || connURI.includes('127.0.0.1');
    const options = isLocal ? { serverSelectionTimeoutMS: 3000 } : {};

    const conn = await mongoose.connect(connURI, options);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    const isLocal = connURI.includes('localhost') || connURI.includes('127.0.0.1');
    
    if (isLocal) {
      console.log(`[Database] Local MongoDB is not running (${error.message}).`);
      console.log(`[Database] Starting in-memory MongoDB server fallback...`);
      
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        
        console.log(`[Database] In-memory MongoDB server started at: ${mongoUri}`);
        const conn = await mongoose.connect(mongoUri);
        console.log(`[Database] MongoDB Connected (In-Memory): ${conn.connection.host}`);
      } catch (memError) {
        console.error(`[Database Error] Failed to start in-memory MongoDB: ${memError.message}`);
        process.exit(1);
      }
    } else {
      console.error(`[Database Error] Connection failed: ${error.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
