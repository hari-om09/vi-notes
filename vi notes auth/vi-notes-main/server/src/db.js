import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

// Force Node.js to use Google's Public DNS to avoid 'querySrv ECONNREFUSED' errors
dns.setServers(['8.8.8.8', '8.8.4.4']);

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
