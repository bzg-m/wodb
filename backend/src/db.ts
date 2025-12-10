import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

export async function connectDB(uri?: string) {
    const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wodb';
    await mongoose.connect(mongoUri);

    console.log(`Connected to MongoDB at ${mongoUri}`);
    return mongoose;
}

export async function disconnectDB() {
    await mongoose.disconnect();
}

export default { connectDB, disconnectDB };
