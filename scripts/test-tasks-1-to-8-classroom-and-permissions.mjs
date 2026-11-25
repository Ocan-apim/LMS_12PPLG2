import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import Module from "node:module";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

// Register a lightweight resolve hook so Node --experimental-strip-types resolves Next.js @/* aliases and extensionless .ts imports
const srcRootUrl = pathToFileURL(path.join(ROOT, "src") + path.sep).href;
const mongooseUrl = pathToFileURL(
  path.join(ROOT, "node_modules/mongoose/index.js")
).href;
const mongooseWrapperUrl = `data:text/javascript;base64,${Buffer.from(
  `import mongoose from ${JSON.stringify(mongooseUrl)};
export default mongoose;
export const Schema = mongoose.Schema;
export const model = mongoose.model.bind(mongoose);
export const models = mongoose.models;
export const Types = mongoose.Types;
export const connect = mongoose.connect.bind(mongoose);
export const disconnect = mongoose.disconnect.bind(mongoose);
export const connection = mongoose.connection;
`
).toString("base64")}`;

const loaderCode = `
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const srcRootUrl = ${JSON.stringify(srcRootUrl)};
const mongooseWrapperUrl = ${JSON.stringify(mongooseWrapperUrl)};

function tryResolveTs(candidateUrl) {
  try {
    const filePath = fileURLToPath(candidateUrl);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return candidateUrl;
    }
    if (fs.existsSync(filePath + ".ts")) {
      return pathToFileURL(filePath + ".ts").href;
    }
    if (fs.existsSync(path.join(filePath, "index.ts"))) {
      return pathToFileURL(path.join(filePath, "index.ts")).href;
    }
  } catch {}
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/server") {
    return nextResolve("next/server.js", context);
  }
  if (specifier === "mongoose" && context.parentURL && !context.parentURL.startsWith("data:")) {
    return { url: mongooseWrapperUrl, shortCircuit: true };
  }
  if (specifier.startsWith("@/")) {
    const targetUrl = new URL(specifier.slice(2), srcRootUrl).href;
    const resolved = tryResolveTs(targetUrl);
    if (resolved) {
      return nextResolve(resolved, context);
    }
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL) {
    const targetUrl = new URL(specifier, context.parentURL).href;
    const resolved = tryResolveTs(targetUrl);
    if (resolved) {
      return nextResolve(resolved, context);
    }
  }
  return nextResolve(specifier, context);
}
`;

Module.register(
  `data:text/javascript;base64,${Buffer.from(loaderCode).toString("base64")}`,
  pathToFileURL(__filename)
);

// Load MONGODB_URI from .env.local if not set
if (!process.env.MONGODB_URI) {
  const envPath = path.join(ROOT, ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^MONGODB_URI=(.+)$/);
      if (m) {
        process.env.MONGODB_URI = m[1].trim().replace(/^["']|["']$/g, "");
      }
    }
  }
}

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lms";

let passed = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function checkAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function main() {
  console.log("=== Running Learnix LMS Tasks 1-8 Verification Suite ===");

  // ---------------------------------------------------------------------------
  // TASK 1: Guru Create Mapel Class — Remove "Tahun Ajaran & Semester"
  // ---------------------------------------------------------------------------
  console.log("\n[Task 1] Guru — Create Mapel Class Form");
  const guruNewClassPage = fs.readFileSync(
    path.join(ROOT, "src/app/guru/classes/new/page.tsx"),
    "utf8"
  );

  check("Create Mapel Class form removes 'Tahun Ajaran & Semester' field", () => {
    assert.ok(
      !guruNewClassPage.includes("Tahun Ajaran"),
      "Tahun Ajaran & Semester label should not appear in guru/classes/new/page.tsx"
    );
    assert.ok(
      !guruNewClassPage.includes("class-academic-year"),
      "class-academic-year select should not appear in guru/classes/new/page.tsx"
    );
  });

  check("Create Mapel Class form preserves Nama Kelas, Rombel Tujuan, and Password Undangan", () => {
    assert.ok(guruNewClassPage.includes('id="class-name"'));
    assert.ok(guruNewClassPage.includes('id="class-rombel"'));
    assert.ok(guruNewClassPage.includes('id="class-password"'));
    assert.ok(guruNewClassPage.includes("＋ Buat Kelas"));
  });

  // ---------------------------------------------------------------------------
  // TASK 2: Guru Kelas Aktif — Remove "Performa Kelas"
  // ---------------------------------------------------------------------------
  console.log("\n[Task 2] Guru — Kelas Aktif Page");
  const guruClassesPage = fs.readFileSync(
    path.join(ROOT, "src/app/guru/classes/page.tsx"),
    "utf8"
  );

  check("Guru Kelas Aktif page removes 'Performa Kelas' widget", () => {
    assert.ok(
      !guruClassesPage.includes("Performa Kelas"),
      "Performa Kelas widget heading must be removed"
    );
    assert.ok(
      !guruClassesPage.includes("86.4%"),
      "86.4% hardcoded stat must be removed"
    );
    assert.ok(
      !guruClassesPage.includes("Unduh Laporan Lengkap"),
      "Unduh Laporan Lengkap button must be removed"
    );
  });

  check("Guru Kelas Aktif page preserves active classes list and Pengiriman Siswa Terbaru", () => {
    assert.ok(guruClassesPage.includes("Kelas Aktif"));
    assert.ok(guruClassesPage.includes("Pengiriman Siswa Terbaru"));
  });

  // ---------------------------------------------------------------------------
  // TASK 3: Guru Create Tugas Entry Points
  // ---------------------------------------------------------------------------
  console.log("\n[Task 3] Guru — Create Tugas Entry Points");
  const guruNewAssignmentPage = fs.readFileSync(
    path.join(ROOT, "src/app/guru/assignments/new/page.tsx"),
    "utf8"
  );

  check("Create Tugas form conditionally displays required Pilih Kelas Mapel dropdown only when not locked to a classId", () => {
    assert.ok(
      guruNewAssignmentPage.includes("const isLockedToClass = Boolean(initialClassId);"),
      "Should compute isLockedToClass from initialClassId"
    );
    assert.ok(
      guruNewAssignmentPage.includes("{!isLockedToClass && ("),
      "Should conditionally render Pilih Kelas Mapel dropdown only when !isLockedToClass"
    );
    assert.ok(
      guruNewAssignmentPage.includes('id="assignment-course-class"'),
      "Should render #assignment-course-class select element"
    );
    assert.ok(
      !guruNewAssignmentPage.includes("setSelectedClassId(classesJson.data[0]._id)"),
      "Must not silently auto-select classes[0] when opened from Manajemen Tugas"
    );
    assert.ok(
      !guruNewAssignmentPage.includes('"10 PPLG 1"'),
      "Must not hardcode fallback class name '10 PPLG 1'"
    );
  });

  // ---------------------------------------------------------------------------
  // TASK 4 & TASK 5: Admin Rombel Preview Simplified Cards & Delete Mapel Class
  // ---------------------------------------------------------------------------
  console.log("\n[Task 4 & Task 5] Admin — Rombel Preview & Mapel Class Deletion");
  const sharedRombelPreview = fs.readFileSync(
    path.join(ROOT, "src/components/class/SharedRombelPreview.tsx"),
    "utf8"
  );
  const sharedClassDetail = fs.readFileSync(
    path.join(ROOT, "src/components/class/SharedClassDetail.tsx"),
    "utf8"
  );

  check("SharedRombelPreview simplifies Mapel Classroom cards and removes verbose per-card stats", () => {
    assert.ok(
      !sharedRombelPreview.includes("Assigned rombel:"),
      "Should not repeat Assigned rombel on each Mapel card"
    );
    assert.ok(
      !sharedRombelPreview.includes("Cek Siswa ("),
      "Should not render Cek Siswa expandable button on each Mapel card"
    );
    assert.ok(
      sharedRombelPreview.includes("Buka Mapel"),
      "Should preserve Buka Mapel navigation button"
    );
    assert.ok(
      sharedRombelPreview.includes("Hapus Kelas Mapel"),
      "Should provide Hapus Kelas Mapel action for Admin"
    );
    assert.ok(
      sharedRombelPreview.includes("Status Enrollment Siswa Rombel"),
      "Should keep rombel-level Status Enrollment Siswa Rombel summary"
    );
  });

  // ---------------------------------------------------------------------------
  // TASK 6: Role Behavior — Admin vs Kurikulum vs Kepsek
  // ---------------------------------------------------------------------------
  console.log("\n[Task 6] Role Behavior — Admin vs Kurikulum vs Kepsek");
  const siswaCoursesApi = fs.readFileSync(
    path.join(ROOT, "src/app/api/siswa/courses/[id]/route.ts"),
    "utf8"
  );
  const classPostsApi = fs.readFileSync(
    path.join(ROOT, "src/app/api/guru/classes/[id]/posts/route.ts"),
    "utf8"
  );
  const classMaterialsApi = fs.readFileSync(
    path.join(ROOT, "src/app/api/guru/classes/[id]/materials/route.ts"),
    "utf8"
  );

  check("GET /api/siswa/courses/[id] sets isReadOnly ONLY for kurikulum and kepsek (not admin)", () => {
    assert.ok(
      siswaCoursesApi.includes(
        'const isReadOnlyStaff = ["kurikulum", "kepsek"].includes(session.role);'
      )
    );
    assert.ok(siswaCoursesApi.includes("isReadOnly: isReadOnlyStaff"));
  });

  check("SharedRombelPreview and SharedClassDetail apply Mode Pratinjau Staf (Baca-Saja) ONLY to kurikulum and kepsek", () => {
    assert.ok(
      sharedRombelPreview.includes('mode={role === "admin" ? "admin" : "readonly"}')
    );
    assert.ok(
      sharedRombelPreview.includes(
        'const isReadOnlyRole = role === "kurikulum" || role === "kepsek";'
      )
    );
    assert.ok(
      sharedClassDetail.includes(
        'mode === "readonly" || ["kurikulum", "kepsek"].includes(userRole)'
      )
    );
  });

  check("POST /api/guru/classes/[id]/posts allows Admin to post & reply to comments while blocking Kurikulum & Kepsek", () => {
    assert.ok(
      classPostsApi.includes('requireRole(["guru", "siswa", "admin"])'),
      "POST /api/guru/classes/[id]/posts must allow guru, siswa, and admin"
    );
  });

  check("DELETE /api/guru/classes/[id]/materials allows Guru and Admin to delete materials", () => {
    assert.ok(
      classMaterialsApi.includes("export async function DELETE"),
      "materials/route.ts must export DELETE handler"
    );
    assert.ok(
      classMaterialsApi.includes('requireRole(["guru", "admin"])'),
      "materials DELETE must allow guru and admin"
    );
  });

  // ---------------------------------------------------------------------------
  // TASK 7: Critical Bug Fix — Admin Cannot Edit Student Quiz/Assignment Grades
  // ---------------------------------------------------------------------------
  console.log("\n[Task 7] Critical Bug Fix — Admin Read-Only Submission & Grading Protection");
  const gradeApi = fs.readFileSync(
    path.join(ROOT, "src/app/api/guru/submissions/[id]/grade/route.ts"),
    "utf8"
  );
  const submissionsApi = fs.readFileSync(
    path.join(ROOT, "src/app/api/guru/assignments/[id]/submissions/route.ts"),
    "utf8"
  );
  const submissionsPage = fs.readFileSync(
    path.join(ROOT, "src/app/guru/assignments/[id]/submissions/page.tsx"),
    "utf8"
  );

  check("POST/PUT /api/guru/submissions/[id]/grade restricts grading strictly to Guru (rejects Admin, Kurikulum, Kepsek, Siswa)", () => {
    assert.ok(
      gradeApi.includes('await requireRole(["guru"])'),
      "grade/route.ts must strictly requireRole(['guru'])"
    );
    assert.ok(
      !gradeApi.includes('requireRole(["guru", "admin"])'),
      "grade/route.ts must NOT allow admin to mutate grades"
    );
  });

  check("GET /api/guru/assignments/[id]/submissions marks isReadOnly true for admin, kurikulum, and kepsek", () => {
    assert.ok(
      submissionsApi.includes(
        'requireRole(["guru", "admin", "kurikulum", "kepsek"])'
      )
    );
    assert.ok(
      submissionsApi.includes(
        'isReadOnly: ["admin", "kurikulum", "kepsek"].includes(session.role)'
      )
    );
  });

  check("Submissions preview page disables grading controls for admin, kurikulum, and kepsek while preserving filter tabs", () => {
    assert.ok(
      submissionsPage.includes('["admin", "kepsek", "kurikulum"].includes'),
      "submissions/page.tsx must set isReadOnly for admin, kepsek, and kurikulum"
    );
    assert.ok(submissionsPage.includes("Semua ("));
    assert.ok(submissionsPage.includes("Diserahkan ("));
    assert.ok(submissionsPage.includes("Dinilai ("));
    assert.ok(submissionsPage.includes("Belum ("));
  });

  // ---------------------------------------------------------------------------
  // DATABASE INTEGRATION VERIFICATION (Task 4 Cascading Mapel Class Deletion)
  // ---------------------------------------------------------------------------
  console.log("\n[Database Integration] Verifying Mapel Class Deletion inside a Rombel");
  await mongoose.connect(MONGODB_URI);

  const modelsMod = await import("../src/models/index.ts");
  const {
    User,
    ClassModel,
    CourseClass,
    Assignment,
    Quiz,
    Material,
    ClassPost,
    Submission,
  } = modelsMod;
  const cleanupMod = await import("../src/lib/teacher-class-cleanup.ts");
  const { deleteCourseClassAndAllRecords } = cleanupMod;

  const suffix = Date.now().toString().slice(-6);
  let testTeacher = null;
  let testStudent = null;
  let testRombel = null;
  let mapelToDelete = null;
  let mapelToKeep = null;

  try {
    testTeacher = await User.create({
      name: `Guru Test Task4 ${suffix}`,
      email: `guru.task4.${suffix}@learnix.test`,
      password: "hashed_password",
      role: "guru",
      nip: `9988${suffix}`,
      isActive: true,
      accountStatus: "active",
    });

    testStudent = await User.create({
      name: `Siswa Test Task4 ${suffix}`,
      email: `siswa.task4.${suffix}@learnix.test`,
      password: "hashed_password",
      role: "siswa",
      nis: `7766${suffix}`,
      nisn: `007766${suffix}`,
      isActive: true,
      accountStatus: "active",
    });

    testRombel = await ClassModel.create({
      name: `X PPLG TEST-${suffix}`,
      grade: "10",
      academicYear: "2026/2027 - Ganjil",
      maxCapacity: 36,
      studentIds: [testStudent._id],
      isActive: true,
    });

    mapelToDelete = await CourseClass.create({
      name: `BASIS DATA TEST-${suffix}`,
      code: `BD${suffix}`,
      password: "pass123",
      enrollmentMethod: "rombel",
      classRombelId: testRombel._id,
      assignedRombelIds: [testRombel._id],
      teacherId: testTeacher._id,
      studentIds: [testStudent._id],
      academicYear: "2026/2027 - Ganjil",
      isActive: true,
    });

    mapelToKeep = await CourseClass.create({
      name: `MATEMATIKA TEST-${suffix}`,
      code: `MT${suffix}`,
      password: "pass123",
      enrollmentMethod: "rombel",
      classRombelId: testRombel._id,
      assignedRombelIds: [testRombel._id],
      teacherId: testTeacher._id,
      studentIds: [testStudent._id],
      academicYear: "2026/2027 - Ganjil",
      isActive: true,
    });

    // Populate mapelToDelete with Material, Assignment, Quiz, ClassPost, and graded Student Submission
    const mat = await Material.create({
      title: "Modul Basis Data 1",
      description: "Pengenalan SQL",
      courseClassId: mapelToDelete._id,
      teacherId: testTeacher._id,
    });

    const quiz = await Quiz.create({
      title: "Kuis Basis Data 1",
      description: "Kuis DDL",
      courseClassId: mapelToDelete._id,
      teacherId: testTeacher._id,
      durationSeconds: 600,
      questions: [
        {
          id: "q1",
          type: "pilihan_ganda",
          question: "Apa kepanjangan SQL?",
          options: ["Structured Query Language", "Simple Query Language"],
          correctAnswer: 0,
          points: 100,
        },
      ],
    });

    const asg = await Assignment.create({
      title: "Tugas ERD Basis Data",
      instructions: "Buat ERD perpustakaan",
      type: "tugas",
      courseClassId: mapelToDelete._id,
      classId: testRombel._id,
      teacherId: testTeacher._id,
      maxScore: 100,
      comments: [
        {
          userId: testStudent._id,
          userName: testStudent.name,
          userRole: "siswa",
          message: "Pak, apakah dikumpul PDF?",
          createdAt: new Date(),
        },
      ],
    });

    const post = await ClassPost.create({
      courseClassId: mapelToDelete._id,
      teacherId: testTeacher._id,
      type: "announcement",
      title: "Selamat datang di Basis Data",
      content: "Diskusi kelas",
      comments: [
        {
          userId: testStudent._id,
          userName: testStudent.name,
          userRole: "siswa",
          message: "Siap Pak!",
          createdAt: new Date(),
        },
      ],
    });

    const sub = await Submission.create({
      assignmentId: asg._id,
      studentId: testStudent._id,
      status: "graded",
      score: 95,
      feedback: "Sangat bagus!",
      content: "Jawaban ERD Siswa",
      submittedAt: new Date(),
      gradedAt: new Date(),
    });

    // Also add an assignment in mapelToKeep to verify sibling Mapel Class is untouched
    const siblingAsg = await Assignment.create({
      title: "Tugas Aljabar Matematika",
      instructions: "Kerjakan latihan 1",
      type: "tugas",
      courseClassId: mapelToKeep._id,
      classId: testRombel._id,
      teacherId: testTeacher._id,
      maxScore: 100,
    });

    await checkAsync(
      "Admin deleting a Mapel Class with submissions, grades, and comments removes the Mapel Class and all its class-specific records",
      async () => {
        const res = await deleteCourseClassAndAllRecords(mapelToDelete._id);
        assert.equal(res.deletedMaterials, 1);
        assert.equal(res.deletedAssignments, 1);
        assert.equal(res.deletedQuizzes, 1);
        assert.equal(res.deletedPosts, 1);
        assert.equal(res.deletedSubmissions, 1);

        assert.equal(await CourseClass.findById(mapelToDelete._id), null);
        assert.equal(await Material.findById(mat._id), null);
        assert.equal(await Quiz.findById(quiz._id), null);
        assert.equal(await Assignment.findById(asg._id), null);
        assert.equal(await ClassPost.findById(post._id), null);
        assert.equal(await Submission.findById(sub._id), null);
      }
    );

    await checkAsync(
      "Deleting a Mapel Class preserves the Rombel, student accounts, teacher account, and sibling Mapel Classes",
      async () => {
        const rombelStillExists = await ClassModel.findById(testRombel._id);
        const studentStillExists = await User.findById(testStudent._id);
        const teacherStillExists = await User.findById(testTeacher._id);
        const siblingMapelStillExists = await CourseClass.findById(mapelToKeep._id);
        const siblingAsgStillExists = await Assignment.findById(siblingAsg._id);

        assert.ok(rombelStillExists, "Rombel must remain intact");
        assert.ok(studentStillExists, "Student account must remain intact");
        assert.ok(teacherStillExists, "Teacher account must remain intact");
        assert.ok(siblingMapelStillExists, "Sibling Mapel Class must remain intact");
        assert.ok(siblingAsgStillExists, "Sibling Mapel Class assignments must remain intact");
      }
    );
  } finally {
    // Cleanup temporary test artifacts
    if (mapelToKeep) {
      await deleteCourseClassAndAllRecords(mapelToKeep._id);
    }
    if (mapelToDelete) {
      await deleteCourseClassAndAllRecords(mapelToDelete._id);
    }
    if (testRombel) {
      await ClassModel.deleteOne({ _id: testRombel._id });
    }
    if (testStudent) {
      await User.deleteOne({ _id: testStudent._id });
    }
    if (testTeacher) {
      await User.deleteOne({ _id: testTeacher._id });
    }
    await mongoose.disconnect();
  }

  console.log(`\n=== Summary: ${passed} checks passed ===`);
  if (process.exitCode) {
    process.exit(process.exitCode);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
