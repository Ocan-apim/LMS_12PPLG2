/**
 * Comprehensive SMK LMS Seed Script
 * Run: npm run seed
 */
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/lms";

async function runSeed() {
  console.log("Connecting to MongoDB:", MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log("Connected successfully.");

  const db = mongoose.connection;

  // Clear existing collections
  console.log("Clearing existing collections...");
  const collections = [
    "users",
    "classes",
    "departments",
    "subjects",
    "academicyears",
    "academicassignments",
    "schoolsettings",
  ];
  for (const name of collections) {
    try {
      await db.collection(name).drop();
    } catch {
      // ignore if collection doesn't exist
    }
  }

  const defaultPassword = await bcrypt.hash("password123", 10);

  // 1. Seed School Settings
  console.log("Seeding School Settings...");
  await db.collection("schoolsettings").insertOne({
    schoolName: "SMK Negeri 1 Learnix",
    npsn: "20104050",
    address: "Jl. Pendidikan Kejuruan Vokasi No. 42",
    phone: "(021) 555-8901",
    email: "admin@smklearnix.sch.id",
    headmasterName: "Drs. H. Mulyadi, M.Pd.",
    currentAcademicYear: "2024/2025 - Genap",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 2. Seed Academic Years
  console.log("Seeding Academic Years...");
  const academicYears = await db.collection("academicyears").insertMany([
    {
      name: "2024/2025",
      semester: "Genap",
      isActive: true,
      startDate: new Date("2025-01-06"),
      endDate: new Date("2025-06-20"),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "2024/2025",
      semester: "Ganjil",
      isActive: false,
      startDate: new Date("2024-07-15"),
      endDate: new Date("2024-12-20"),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "2023/2024",
      semester: "Genap",
      isActive: false,
      startDate: new Date("2024-01-08"),
      endDate: new Date("2024-06-21"),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  // 3. Seed Teachers & Staff First
  console.log("Seeding Staff & Teachers...");
  const teachersData = [
    {
      name: "Admin Learnix",
      email: "admin@sekolah.sch.id",
      password: defaultPassword,
      role: "admin",
      nip: "ADM001",
      phone: "081234567890",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Dra. Siti Rahayu, M.Pd.",
      email: "kurikulum@sekolah.sch.id",
      password: defaultPassword,
      role: "kurikulum",
      nip: "19750512 200003 2 001",
      phone: "081234567891",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Drs. H. Mulyadi, M.Pd.",
      email: "kepsek@sekolah.sch.id",
      password: defaultPassword,
      role: "kepsek",
      nip: "19680315 199501 1 002",
      phone: "081234567892",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Budi Pratama, S.Pd.",
      email: "budi.pratama@sekolah.sch.id",
      password: defaultPassword,
      role: "guru",
      nip: "19820512 200501 1 003",
      degree: "S.Pd.",
      lastEducation: "S1 / Sarjana",
      isHomeroomTeacher: true,
      phone: "081234567893",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Siti Lestari, M.Pd.",
      email: "siti.lestari@sekolah.sch.id",
      password: defaultPassword,
      role: "guru",
      nip: "19850920 200801 2 004",
      degree: "M.Pd.",
      lastEducation: "S2 / Magister",
      isHomeroomTeacher: true,
      phone: "081234567894",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Agus Wijaya, S.T.",
      email: "agus.wijaya@sekolah.sch.id",
      password: defaultPassword,
      role: "guru",
      nip: "19870311 201001 1 005",
      degree: "S.T.",
      lastEducation: "S1 / Sarjana",
      isHomeroomTeacher: true,
      phone: "081234567895",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Dra. Rina Sulistiawati, M.Pd.",
      email: "rina.s@sekolah.sch.id",
      password: defaultPassword,
      role: "guru",
      nip: "19820512 200501 2 003",
      degree: "M.Pd.",
      lastEducation: "S2 / Magister",
      isHomeroomTeacher: false,
      phone: "081234567896",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Budi Santoso, M.Kom.",
      email: "budi.santoso@sekolah.sch.id",
      password: defaultPassword,
      role: "guru",
      nip: "19800415 200604 1 007",
      degree: "M.Kom.",
      lastEducation: "S2 / Magister",
      isHomeroomTeacher: false,
      phone: "081234567897",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const userInsertResult = await db.collection("users").insertMany(teachersData);
  const teacherBudiPId = userInsertResult.insertedIds[3];
  const teacherSitiLId = userInsertResult.insertedIds[4];
  const teacherAgusWId = userInsertResult.insertedIds[5];
  const teacherBudiSId = userInsertResult.insertedIds[7];

  // 4. Seed the 6 SMK Jurusan
  console.log("Seeding 6 SMK Jurusan...");
  const departmentsData = [
    {
      name: "Pengembangan Perangkat Lunak & Gim",
      code: "PPLG",
      headOfDepartmentId: teacherBudiSId,
      maxClasses: 2, // 2 paralel
      capacity: 72,
      description: "Program keahlian rekayasa perangkat lunak, web, mobile, dan pembuatan game interaktif.",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Teknik Jaringan Komputer & Telekomunikasi",
      code: "TJKT",
      headOfDepartmentId: teacherAgusWId,
      maxClasses: 7, // 7 paralel
      capacity: 252,
      description: "Program keahlian infrastruktur jaringan, administrasi server, fiber optic, dan cloud computing.",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Desain Komunikasi Visual",
      code: "DKV",
      maxClasses: 3,
      capacity: 108,
      description: "Program keahlian desain grafis, ilustrasi digital, videografi, dan multimedia.",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Manajemen Perkantoran & Layanan Bisnis",
      code: "MPLB",
      maxClasses: 3,
      capacity: 108,
      description: "Program keahlian administrasi perkantoran modern, kearsipan digital, dan komunikasi bisnis.",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Perhotelan",
      code: "Perhotelan",
      maxClasses: 3,
      capacity: 108,
      description: "Program keahlian hospitality, front office, housekeeping, and restaurant services.",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Bisnis Daring & Retail",
      code: "BDR",
      maxClasses: 3,
      capacity: 108,
      description: "Program keahlian digital marketing, e-commerce, dan manajemen ritel modern.",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const deptInsertResult = await db.collection("departments").insertMany(departmentsData);
  const pplgDeptId = deptInsertResult.insertedIds[0];
  const tjktDeptId = deptInsertResult.insertedIds[1];
  const dkvDeptId = deptInsertResult.insertedIds[2];

  // 5. Seed Subjects
  console.log("Seeding Subjects...");
  const subjectsData = [
    {
      name: "Matematika",
      code: "MTK",
      category: "Umum",
      grade: "Semua",
      teacherIds: [teacherBudiPId, teacherSitiLId],
      description: "Mata pelajaran wajib matematika",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Bahasa Indonesia",
      code: "BIND",
      category: "Umum",
      grade: "Semua",
      teacherIds: [teacherSitiLId],
      description: "Mata pelajaran wajib Bahasa Indonesia",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Bahasa Inggris",
      code: "BING",
      category: "Umum",
      grade: "Semua",
      teacherIds: [],
      description: "Mata pelajaran wajib Bahasa Inggris",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Pemrograman Web",
      code: "PWEB",
      category: "Kejuruan",
      departmentId: pplgDeptId,
      grade: "11",
      teacherIds: [teacherBudiSId],
      description: "Dasar dan lanjutan web engineering (HTML, CSS, JS, Next.js)",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Pemrograman Berorientasi Objek",
      code: "PBO",
      category: "Kejuruan",
      departmentId: pplgDeptId,
      grade: "11",
      teacherIds: [teacherBudiSId],
      description: "Pemrograman OOP dengan Java dan C#",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Jaringan Komputer Dasar",
      code: "JKD",
      category: "Kejuruan",
      departmentId: tjktDeptId,
      grade: "10",
      teacherIds: [teacherAgusWId],
      description: "Konsep dasar OSI model, TCP/IP, IP addressing",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Desain Grafis Percetakan",
      code: "DGP",
      category: "Kejuruan",
      departmentId: dkvDeptId,
      grade: "11",
      teacherIds: [],
      description: "Penguasaan software vektor dan raster untuk percetakan",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  await db.collection("subjects").insertMany(subjectsData);

  // 6. Seed Classes (Rombel)
  console.log("Seeding Classes...");
  const classesData = [
    {
      name: "XII PPLG 2",
      grade: "12",
      departmentId: pplgDeptId,
      parallelNumber: 2,
      academicYear: "2024/2025 - Genap",
      homeroomTeacherId: teacherBudiPId,
      maxCapacity: 40,
      studentIds: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "XII PPLG 1",
      grade: "12",
      departmentId: pplgDeptId,
      parallelNumber: 1,
      academicYear: "2024/2025 - Genap",
      homeroomTeacherId: teacherSitiLId,
      maxCapacity: 36,
      studentIds: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "XI PPLG 2",
      grade: "11",
      departmentId: pplgDeptId,
      parallelNumber: 2,
      academicYear: "2024/2025 - Genap",
      homeroomTeacherId: teacherSitiLId,
      maxCapacity: 36,
      studentIds: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "XI PPLG 1",
      grade: "11",
      departmentId: pplgDeptId,
      parallelNumber: 1,
      academicYear: "2024/2025 - Genap",
      homeroomTeacherId: teacherSitiLId,
      maxCapacity: 36,
      studentIds: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "X PPLG 2",
      grade: "10",
      departmentId: pplgDeptId,
      parallelNumber: 2,
      academicYear: "2024/2025 - Genap",
      homeroomTeacherId: teacherSitiLId,
      maxCapacity: 36,
      studentIds: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "X PPLG 1",
      grade: "10",
      departmentId: pplgDeptId,
      parallelNumber: 1,
      academicYear: "2024/2025 - Genap",
      homeroomTeacherId: teacherAgusWId,
      maxCapacity: 40,
      studentIds: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Also add TJKT 1 through 7 for Grade 10
  for (let i = 1; i <= 7; i++) {
    classesData.push({
      name: `X TJKT ${i}`,
      grade: "10",
      departmentId: tjktDeptId,
      parallelNumber: i,
      academicYear: "2024/2025 - Genap",
      homeroomTeacherId: undefined,
      maxCapacity: 36,
      studentIds: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  const classInsertResult = await db.collection("classes").insertMany(classesData);
  const classXiiPplg2Id = classInsertResult.insertedIds[0];
  const classXiPplg1Id = classInsertResult.insertedIds[3];

  // Update teacher homeroom class references
  await db.collection("users").updateOne(
    { _id: teacherBudiPId },
    { $set: { homeroomClassId: classXiiPplg2Id } }
  );

  // 7. Seed Students
  console.log("Seeding Students...");
  const sampleStudents = [
    {
      name: "Ahmad Bagus Pratama",
      email: "0098273645@siswa.smk.sch.id",
      password: defaultPassword,
      role: "siswa",
      nis: "0098273645",
      nisn: "0098273645",
      gender: "Laki-laki",
      birthPlace: "Yogyakarta",
      birthDate: new Date("2009-06-29"),
      grade: "11",
      departmentId: pplgDeptId,
      classId: classXiPplg1Id,
      academicYear: "2024/2025 - Genap",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Siti Nurbaya",
      email: "0098273646@siswa.smk.sch.id",
      password: defaultPassword,
      role: "siswa",
      nis: "0098273646",
      nisn: "0098273646",
      gender: "Perempuan",
      birthPlace: "Padang",
      birthDate: new Date("2008-04-14"),
      grade: "12",
      departmentId: pplgDeptId,
      classId: classXiiPplg2Id,
      academicYear: "2024/2025 - Genap",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Bambang Pamungkas",
      email: "0098273647@siswa.smk.sch.id",
      password: defaultPassword,
      role: "siswa",
      nis: "0098273647",
      nisn: "0098273647",
      gender: "Laki-laki",
      birthPlace: "Salatiga",
      birthDate: new Date("2008-08-20"),
      grade: "12",
      departmentId: pplgDeptId,
      classId: classXiiPplg2Id,
      academicYear: "2024/2025 - Genap",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Raden Ajeng Kartini",
      email: "0098273648@siswa.smk.sch.id",
      password: defaultPassword,
      role: "siswa",
      nis: "0098273648",
      nisn: "0098273648",
      gender: "Perempuan",
      birthPlace: "Jepara",
      birthDate: new Date("2009-04-21"),
      grade: "11",
      departmentId: pplgDeptId,
      classId: classXiPplg1Id,
      academicYear: "2024/2025 - Genap",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Muhammad Rizky",
      email: "0098273649@siswa.smk.sch.id",
      password: defaultPassword,
      role: "siswa",
      nis: "0098273649",
      nisn: "0098273649",
      gender: "Laki-laki",
      birthPlace: "Bandung",
      birthDate: new Date("2009-11-05"),
      grade: "11",
      departmentId: pplgDeptId,
      classId: classXiPplg1Id,
      academicYear: "2024/2025 - Genap",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const studentInsertResult = await db.collection("users").insertMany(sampleStudents);
  const studentIds = Object.values(studentInsertResult.insertedIds);

  // Link students to their respective classes
  await db.collection("classes").updateOne(
    { _id: classXiPplg1Id },
    { $set: { studentIds: [studentIds[0], studentIds[3], studentIds[4]] } }
  );

  await db.collection("classes").updateOne(
    { _id: classXiiPplg2Id },
    { $set: { studentIds: [studentIds[1], studentIds[2]] } }
  );

  console.log("Seeding completed successfully!");
  await mongoose.disconnect();
}

runSeed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
