import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from './src/config/db.js';
import seedAdmin from './src/utils/adminSeeder.js';
import mongoose from 'mongoose';

async function fix() {
  try {
    await connectDB();
    await seedAdmin();
    console.log("✅ Admin account synchronized successfully!");
  } catch (err) {
    console.error("❌ Error fixing admin:", err);
  } finally {
    await mongoose.connection.close();
  }
}

fix();
