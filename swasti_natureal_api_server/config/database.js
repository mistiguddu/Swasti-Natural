import mongoose from 'mongoose';

export async function connectDatabase(uri, databaseName) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { dbName: databaseName, serverSelectionTimeoutMS: 10000 });
  console.log('Connected to MongoDB');
}