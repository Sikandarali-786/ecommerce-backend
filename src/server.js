import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB } from './config/db.js';
import seedAdmin from './utils/adminSeeder.js';


const PORT = process.env.PORT || 5112;

const startServer = async () => {
    try {
        await connectDB();
        await seedAdmin()
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`)
        })
    } catch (error) {
        console.log(error);
    }
}

startServer()