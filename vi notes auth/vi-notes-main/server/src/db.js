import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const connectDb = async () => {
    try {
        const conn = await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB: ', conn.connection.host);
    } catch (error) {
        console.error('Error connecting to MongoDB: ', error);
        process.exit(1);
    }
}

export default connectDb;
