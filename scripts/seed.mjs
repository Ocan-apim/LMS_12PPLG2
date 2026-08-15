/**
 * Seed demo users. Run: node --env-file=.env.local scripts/seed.mjs
 * Or: npm run seed
 */
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/lms";

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: String,
    nip: String,
    nis: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

const seedUsers = [
  {
    name: "Admin Sekolah",
    email: "admin@sekolah.sch.id",
    role: "admin",
    nip: "ADM001",
  },
  {
    name: "Guru Matematika",
    email: "guru@sekolah.sch.id",
    role: "guru",
    nip: "GRU001",
  },
  {
    name: "Staff Kurikulum",
    email: "kurikulum@sekolah.sch.id",
    role: "kurikulum",
    nip: "KUR001",
  },
  {
    name: "Kepala Sekolah",
    email: "kepsek@sekolah.sch.id",
    role: "kepsek",
    nip: "KEP001",
  },
  {
    name: "Siswa Demo",
    email: "siswa@sekolah.sch.id",
    role: "siswa",
    nis: "SIS001",
  },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  const password = await bcrypt.hash("password123", 10);

  for (const user of seedUsers) {
    await User.findOneAndUpdate(
      { email: user.email },
      { ...user, password, isActive: true },
      { upsert: true, new: true }
    );
    console.log(`Seeded: ${user.email} (${user.role})`);
  }

  await mongoose.disconnect();
  console.log("Seed selesai.");
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
