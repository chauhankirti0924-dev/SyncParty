import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoMemoryServer: MongoMemoryServer | null = null;

export async function connectDB(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;

  try {
    if (mongoUri) {
      console.log('Connecting to MongoDB via environment URI...');
      await mongoose.connect(mongoUri);
      console.log('✅ MongoDB connected successfully to external instance.');
    } else {
      console.log('No MONGODB_URI provided. Starting in-memory MongoDB Server for development/testing...');
      mongoMemoryServer = await MongoMemoryServer.create();
      const uri = mongoMemoryServer.getUri();
      await mongoose.connect(uri);
      console.log(`✅ In-Memory MongoDB connected at ${uri}`);
    }
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    if (!mongoUri && !mongoMemoryServer) {
      console.log('Attempting fallback to MongoMemoryServer...');
      mongoMemoryServer = await MongoMemoryServer.create();
      const uri = mongoMemoryServer.getUri();
      await mongoose.connect(uri);
      console.log(`✅ Fallback In-Memory MongoDB connected at ${uri}`);
    }
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
}
