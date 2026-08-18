import User from "../models/user.model.js";

const seedAdmin = async () => {
  try {
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) return;

    const email = process.env.ADMIN_EMAIL.toLowerCase().trim();
    let existingAdmin = await User.findOne({ email });

    if (existingAdmin) {
      const isMatch = await existingAdmin.comparePassword(process.env.ADMIN_PASSWORD);
      if (!isMatch || existingAdmin.role !== 'admin' || existingAdmin.lockUntil || existingAdmin.loginAttempts > 0) {
        existingAdmin.password = process.env.ADMIN_PASSWORD;
        existingAdmin.role = 'admin';
        existingAdmin.isBlocked = false;
        existingAdmin.loginAttempts = 0;
        existingAdmin.lockUntil = null;
        await existingAdmin.save();
        console.log("Admin account synced and unlocked successfully");
      } else {
        console.log("Admin account ready");
      }
      return;
    }

    await User.create({
      name: "Admin",
      email,
      password: process.env.ADMIN_PASSWORD,
      role: "admin",
    });

    console.log("Admin seeded successfully");
  } catch (error) {
    console.error("Admin seeding failed:", error.message);
  }
};

export default seedAdmin;