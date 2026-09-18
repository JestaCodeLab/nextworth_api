import { connectDB } from "../src/config/db.js";
import { User } from "../src/models/User.js";
import { hashPassword } from "../src/utils/password.js";
import mongoose from "mongoose";

const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD env vars before running this script.");
    process.exit(1);
  }

  await connectDB();

  const passwordHash = await hashPassword(PASSWORD);
  const existing = await User.findOne({ email: EMAIL });

  if (existing) {
    existing.role = "admin";
    existing.status = "verified";
    existing.passwordHash = passwordHash;
    await existing.save();
    console.log(`Updated existing user to admin: ${EMAIL}`);
  } else {
    await User.create({
      name: "Nexworth Admin",
      email: EMAIL,
      passwordHash,
      phone: "+000000000",
      role: "admin",
      status: "verified",
    });
    console.log(`Created new admin user: ${EMAIL}`);
  }

  console.log(`Email:    ${EMAIL}`);
  console.log(`Password: ${PASSWORD}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
