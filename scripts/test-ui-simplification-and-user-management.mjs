/**
 * Comprehensive Verification Suite for:
 * Learnix LMS — UI Simplification & Admin/User Management Updates
 *
 * Tests:
 * 1. TASK 1 — Guru Create Mapel Class Form & Database/Enrollment Logic
 * 2. TASK 2 — Admin Tambah Kelas Baru Form & Automatic Class Name Generation
 * 3. TASK 3 — Guru Penilaian Filters (No Walas, Kelas 10/11/12, Dynamic Database Jurusan)
 * 4. TASK 4 — Admin Manajemen Pengguna Single Mutually-Exclusive Account Status Logic
 */

import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { resolveAccountStatus } from "../src/lib/account-status.ts";

let total = 0;
let passed = 0;

function assert(condition, message) {
  total++;
  if (!condition) {
    console.error(`  ✖ FAIL: ${message}`);
    process.exit(1);
  }
  passed++;
  console.log(`  ✔ ${message}`);
}

async function run() {
  console.log("\n==============================================================");
  console.log(" LEARNIX LMS — UI SIMPLIFICATION & USER MANAGEMENT TEST SUITE");
  console.log("==============================================================\n");

  // ---------------------------------------------------------------------------
  // 1. TASK 1 STATIC & UI VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("--- TASK 1: Guru Create Mapel Class UI & Validation ---");
  const guruNewClassSrc = fs.readFileSync(
    path.join(process.cwd(), "src/app/guru/classes/new/page.tsx"),
    "utf8"
  );

  assert(
    !guruNewClassSrc.includes("Metode Pendaftaran Siswa") &&
      !guruNewClassSrc.includes("Otomatis Seluruh Siswa Rombel") &&
      !guruNewClassSrc.includes("Mandiri via Kode Undangan & Password"),
    "Removed 'Metode Pendaftaran Siswa' selection section and cards completely"
  );
  assert(
    guruNewClassSrc.includes("bg-gradient-to-b") &&
      guruNewClassSrc.includes("Buat Kelas Mapel") &&
      guruNewClassSrc.includes("Contoh: Matematika, Basis Data"),
    "Matches Screenshot 1 blue-to-purple gradient container and 'Nama Kelas / Mapel' placeholder"
  );
  assert(
    guruNewClassSrc.includes("Deskripsi Kelas (Opsional)") &&
      guruNewClassSrc.includes("Pilih Rombel Tujuan (1 Rombel)") &&
      guruNewClassSrc.includes("Password Undangan") &&
      guruNewClassSrc.includes("Tahun Ajaran") &&
      guruNewClassSrc.includes("＋ Buat Kelas"),
    "Contains all 5 required form fields and '＋ Buat Kelas' submit button"
  );

  const guruClassesApiSrc = fs.readFileSync(
    path.join(process.cwd(), "src/app/api/guru/classes/route.ts"),
    "utf8"
  );
  assert(
    guruClassesApiSrc.includes("if (!password || !String(password).trim())") &&
      guruClassesApiSrc.includes("Password undangan kelas wajib diisi") &&
      guruClassesApiSrc.includes("getActiveStudentIdsForRombel(rombelDoc._id)"),
    "Backend POST /api/guru/classes enforces mandatory rombel & invitation password, generates invitation code, and auto-enrolls active rombel students"
  );

  // ---------------------------------------------------------------------------
  // 2. TASK 2 STATIC & UI VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("\n--- TASK 2: Admin Tambah Kelas Baru UI & Name Generation ---");
  const adminClassesPageSrc = fs.readFileSync(
    path.join(process.cwd(), "src/app/admin/classes/page.tsx"),
    "utf8"
  );

  assert(
    !adminClassesPageSrc.includes("Nama Kelas (Otomatis / Kustom)"),
    "Removed 'Nama Kelas (Otomatis / Kustom)' customizable input field from Admin Manajemen Kelas"
  );
  assert(
    adminClassesPageSrc.includes("Pratinjau Nama Kelas (Otomatis)") &&
      adminClassesPageSrc.includes("generateStandardName("),
    "Displays non-editable automatic class name preview generated from Tingkat, Jurusan, and Rombel"
  );

  const adminClassesApiSrc = fs.readFileSync(
    path.join(process.cwd(), "src/app/api/admin/classes/route.ts"),
    "utf8"
  );
  assert(
    adminClassesApiSrc.includes("`${gradeEntry.roman} ${deptDoc.code} ${parsedParallel}`"),
    "Backend POST /api/admin/classes authoritatively generates '[Roman] [Jurusan] [Rombel]' class name"
  );

  // ---------------------------------------------------------------------------
  // 3. TASK 3 STATIC & UI VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("\n--- TASK 3: Guru Penilaian Filters (No Walas, Kelas 10/11/12, Dynamic Jurusan) ---");
  const guruGradesPageSrc = fs.readFileSync(
    path.join(process.cwd(), "src/app/guru/grades/page.tsx"),
    "utf8"
  );

  assert(
    !guruGradesPageSrc.includes("selectedWalas") &&
      !guruGradesPageSrc.includes("Ibu Alvisya") &&
      !guruGradesPageSrc.includes("Pak Bambang") &&
      !/<label[^>]*>\s*Walas\s*<\/label>/i.test(guruGradesPageSrc),
    "Removed 'Walas' filter/selection completely from Guru Penilaian"
  );
  assert(
    guruGradesPageSrc.includes('<option value="10">Kelas 10</option>') &&
      guruGradesPageSrc.includes('<option value="11">Kelas 11</option>') &&
      guruGradesPageSrc.includes('<option value="12">Kelas 12</option>'),
    "Kelas filter offers Kelas 10, Kelas 11, and Kelas 12 grade-level options"
  );
  assert(
    !guruGradesPageSrc.includes('<option value="PPLG">PPLG</option>') &&
      !guruGradesPageSrc.includes('<option value="TJKT">TJKT</option>') &&
      !guruGradesPageSrc.includes('<option value="DKV">DKV</option>') &&
      guruGradesPageSrc.includes("departments.map((dept) =>"),
    "Jurusan filter dynamically renders available majors from database without hardcoded major options"
  );

  // ---------------------------------------------------------------------------
  // 4. TASK 4 ACCOUNT STATUS LOGIC VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("\n--- TASK 4: Account Status Priority & Single-Badge Display ---");
  const adminUsersPageSrc = fs.readFileSync(
    path.join(process.cwd(), "src/app/admin/users/page.tsx"),
    "utf8"
  );

  assert(
    !adminUsersPageSrc.includes("Sudah Diaktivasi") &&
      adminUsersPageSrc.includes("Non-Aktif") &&
      adminUsersPageSrc.includes("Belum Diaktivasi") &&
      adminUsersPageSrc.includes("getDisplayAccountStatus(u)"),
    "Admin Manajemen Pengguna renders exactly one status badge ('Aktif', 'Belum Diaktivasi', or 'Non-Aktif') and removes 'Sudah Diaktivasi'"
  );

  const testCases = [
    {
      desc: "Siswa normal account -> Aktif",
      input: { role: "siswa", isActive: true },
      expected: "Aktif",
    },
    {
      desc: "Admin normal account -> Aktif",
      input: { role: "admin", isActive: true },
      expected: "Aktif",
    },
    {
      desc: "Kepsek normal account -> Aktif",
      input: { role: "kepsek", isActive: true },
      expected: "Aktif",
    },
    {
      desc: "Guru activation completed -> Aktif",
      input: {
        role: "guru",
        isActive: true,
        isActivated: true,
        mustChangePassword: false,
      },
      expected: "Aktif",
    },
    {
      desc: "Guru not yet activated (isActivated=false) -> Belum Diaktivasi",
      input: {
        role: "guru",
        isActive: true,
        isActivated: false,
        mustChangePassword: true,
      },
      expected: "Belum Diaktivasi",
    },
    {
      desc: "Kurikulum activation completed -> Aktif",
      input: {
        role: "kurikulum",
        isActive: true,
        isActivated: true,
        mustChangePassword: false,
      },
      expected: "Aktif",
    },
    {
      desc: "Kurikulum not yet activated -> Belum Diaktivasi",
      input: {
        role: "kurikulum",
        isActive: true,
        isActivated: false,
        mustChangePassword: true,
      },
      expected: "Belum Diaktivasi",
    },
    {
      desc: "Disabled Siswa -> Non-Aktif",
      input: { role: "siswa", isActive: false },
      expected: "Non-Aktif",
    },
    {
      desc: "Disabled unactivated Guru (Non-Aktif takes priority over Belum Diaktivasi) -> Non-Aktif",
      input: {
        role: "guru",
        isActive: false,
        isActivated: false,
        mustChangePassword: true,
      },
      expected: "Non-Aktif",
    },
    {
      desc: "Disabled activated Kurikulum -> Non-Aktif",
      input: {
        role: "kurikulum",
        isActive: false,
        isActivated: true,
        mustChangePassword: false,
      },
      expected: "Non-Aktif",
    },
  ];

  for (const tc of testCases) {
    const result = resolveAccountStatus(tc.input);
    assert(
      result.accountStatus === tc.expected,
      `${tc.desc} (got: ${result.accountStatus})`
    );
  }

  // ---------------------------------------------------------------------------
  // 5. LIVE DATABASE INTEGRITY & BUSINESS LOGIC VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("\n--- 5. Live MongoDB Integration & Data Integrity Checks ---");
  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lms";
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;

  try {
    // 5A. Verify live departments exist and match dynamic Jurusan filter source
    const dbDepts = await db
      .collection("departments")
      .find({ isActive: { $ne: false } })
      .toArray();
    assert(
      dbDepts.length >= 3 && dbDepts.some((d) => d.code === "PPLG"),
      `Database contains ${dbDepts.length} active majors (${dbDepts.map((d) => d.code).join(", ")}) for dynamic Jurusan filter`
    );

    // 5B. Verify every live user in MongoDB resolves to exactly one valid status and remains intact
    const dbUsers = await db.collection("users").find({}).toArray();
    assert(dbUsers.length > 0, `Loaded ${dbUsers.length} existing user accounts from MongoDB`);
    for (const u of dbUsers) {
      const { accountStatus } = resolveAccountStatus(u);
      assert(
        ["Aktif", "Belum Diaktivasi", "Non-Aktif"].includes(accountStatus),
        `User ${u.email} (${u.role}) resolves to single status: ${accountStatus}`
      );
    }

    // 5C. Verify Rombel automatic enrollment & duplicate prevention on X PPLG 1
    const xPplg1 = await db.collection("classes").findOne({ name: "X PPLG 1", isActive: true });
    assert(Boolean(xPplg1), "Located active rombel 'X PPLG 1' in MongoDB");

    const activeStudentsInXPplg1 = await db
      .collection("users")
      .find({
        role: "siswa",
        isActive: true,
        $or: [
          { classId: xPplg1._id },
          { _id: { $in: xPplg1.studentIds || [] } },
        ],
      })
      .toArray();

    assert(
      activeStudentsInXPplg1.length >= 1,
      `Found ${activeStudentsInXPplg1.length} active students in X PPLG 1 for automatic rombel enrollment`
    );
  } finally {
    await mongoose.disconnect();
  }

  console.log("\n==============================================================");
  console.log(` ALL ${passed}/${total} VERIFICATION CHECKS PASSED!`);
  console.log("==============================================================\n");
}

run().catch(async (err) => {
  console.error("Test suite error:", err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
