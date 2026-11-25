/**
 * Comprehensive Verification Suite for:
 * Learnix LMS — Teacher Account Deletion, Orphaned Class Cleanup, Impersonation Removal & Default Assignment Bug
 *
 * Covers:
 * - TASK 1: Teacher Deletion Confirmation Dialog & Cascading Cleanup (with historical record protection)
 * - TASK 2: Orphaned Mapel Classes Cleanup & Distinction (empty orphans removed, historical orphans preserved for review, valid legacy teachers preserved for rombel assignment)
 * - TASK 3: Removal of Admin Login-as-Guru Impersonation (frontend & backend 403 block)
 * - TASK 4: Fix Three Default Tugas Appearing in New Guru Accounts (0 assignments on new Guru, real assignment creation, isolation from other teachers)
 */

import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import mongoose from "mongoose";

// Register a lightweight resolve hook so Node --experimental-strip-types resolves Next.js @/* aliases and extensionless .ts imports
const srcRootUrl = pathToFileURL(path.join(process.cwd(), "src") + path.sep).href;
const mongooseUrl = pathToFileURL(
  path.join(process.cwd(), "node_modules/mongoose/index.js")
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
register(
  `data:text/javascript;base64,${Buffer.from(loaderCode).toString("base64")}`,
  pathToFileURL("./")
);

const {
  getTeacherDeletionSummary,
  deleteTeacherAndClasses,
  inspectAndCleanOrphanedClasses,
} = await import("../src/lib/teacher-class-cleanup.ts");
const impersonateRoute = await import(
  "../src/app/api/admin/teachers/[id]/impersonate/route.ts"
);
const {
  User,
  ClassModel,
  CourseClass,
  Assignment,
  Quiz,
  Material,
  ClassPost,
  Submission,
} = await import("../src/models/index.ts");

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
  console.log("\n======================================================================");
  console.log(" LEARNIX LMS — TEACHER DELETION, ORPHANS, IMPERSONATION & TUGAS SUITE");
  console.log("======================================================================\n");

  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lms";
  await mongoose.connect(mongoUri);

  try {
    // =========================================================================
    // TASK 3: IMPERSONATION REMOVAL (FRONTEND & BACKEND)
    // =========================================================================
    console.log("--- TASK 3: Admin Login-as-Guru Impersonation Removal ---");
    const adminTeachersPageSrc = fs.readFileSync(
      path.join(process.cwd(), "src/app/admin/teachers/page.tsx"),
      "utf8"
    );

    assert(
      !adminTeachersPageSrc.includes("handleLoginAsGuru") &&
        !adminTeachersPageSrc.includes("impersonatingTeacherId") &&
        !adminTeachersPageSrc.includes("Login sebagai Guru") &&
        !adminTeachersPageSrc.includes("/impersonate"),
      "Removed Login-as-Guru button, tooltip, confirmation dialog, and impersonation fetch from Admin Manajemen Guru UI"
    );

    for (const method of ["POST", "GET", "PUT", "PATCH", "DELETE"]) {
      const fn = impersonateRoute[method];
      assert(typeof fn === "function", `Impersonate route exports ${method} handler`);
      const res = await fn();
      const body = await res.json();
      assert(
        res.status === 403 &&
          body.success === false &&
          body.code === "IMPERSONATION_DISABLED" &&
          !res.headers.get("set-cookie"),
        `${method} /api/admin/teachers/[id]/impersonate returns 403 IMPERSONATION_DISABLED without setting any session cookie`
      );
    }

    // =========================================================================
    // TASK 4: FIX THREE DEFAULT TUGAS IN NEW GURU ACCOUNTS
    // =========================================================================
    console.log("\n--- TASK 4: Fix Three Default Tugas in New Guru Accounts ---");
    const guruAssignmentsPageSrc = fs.readFileSync(
      path.join(process.cwd(), "src/app/guru/assignments/page.tsx"),
      "utf8"
    );

    assert(
      !guruAssignmentsPageSrc.includes("mock-1") &&
        !guruAssignmentsPageSrc.includes("mock-2") &&
        !guruAssignmentsPageSrc.includes("mock-3") &&
        !guruAssignmentsPageSrc.includes("Membuat UI Component") &&
        !guruAssignmentsPageSrc.includes("Kuis Harian: HTML Basic") &&
        !guruAssignmentsPageSrc.includes("Proyek Akhir: CSS Layout") &&
        !guruAssignmentsPageSrc.includes("10 PPLG +"),
      "Removed the 3 hardcoded fallback mock Tugas ('Membuat UI Component', 'Kuis Harian: HTML Basic', 'Proyek Akhir: CSS Layout') and mock classes from Guru Tugas page"
    );

    assert(
      guruAssignmentsPageSrc.includes("Belum ada tugas yang dibuat.") &&
        guruAssignmentsPageSrc.includes(
          "Mulai dengan membuat tugas pertama untuk kelas Anda."
        ),
      "Guru Tugas page renders the required empty-state message when a teacher has 0 assignments"
    );

    // Create a fresh Guru account and verify 0 assignments in DB, then create 1 real Tugas
    const xPplg1 = await ClassModel.findOne({ name: "X PPLG 1", isActive: true }).lean();
    assert(Boolean(xPplg1), "Located active rombel X PPLG 1");

    const freshGuru = await User.create({
      name: "Guru Baru Tugas Test",
      email: `guru.baru.tugas.${Date.now()}@sekolah.sch.id`,
      loginUsername: `gurubarutugas${Date.now().toString().slice(-5)}`,
      password: " hashed_test_pw ",
      role: "guru",
      isActivated: true,
      mustChangePassword: false,
      isActive: true,
    });

    const initialGuruAssignments = await Assignment.find({
      teacherId: freshGuru._id,
      isArchived: { $ne: true },
    }).lean();
    assert(
      initialGuruAssignments.length === 0,
      "Newly created Guru account starts with 0 assignments (does not inherit any other teacher's assignments)"
    );

    const freshGuruClass = await CourseClass.create({
      name: "Pemrograman Dasar Test",
      code: `PD${Date.now().toString().slice(-3)}`,
      password: "pd123",
      enrollmentMethod: "rombel",
      teacherId: freshGuru._id,
      classRombelId: xPplg1._id,
      assignedRombelIds: [xPplg1._id],
      academicYear: "2026/2027 - Ganjil",
      bannerColor: "blue",
      studentIds: [],
      isActive: true,
    });

    const createdRealAssignment = await Assignment.create({
      title: "Tugas Algoritma Pertama",
      instructions: "Buat flowchart algoritma pencarian biner.",
      description: "Buat flowchart algoritma pencarian biner.",
      type: "tugas",
      courseClassId: freshGuruClass._id,
      classId: xPplg1._id,
      teacherId: freshGuru._id,
      maxScore: 100,
      isPublished: true,
    });

    const afterCreateAssignments = await Assignment.find({
      teacherId: freshGuru._id,
      isArchived: { $ne: true },
    }).lean();
    assert(
      afterCreateAssignments.length === 1 &&
        afterCreateAssignments[0].title === "Tugas Algoritma Pertama",
      "After creating 1 real Tugas, the new Guru account sees exactly 1 assignment"
    );

    // Clean up Task 4 temporary Guru, class, and assignment
    await Assignment.deleteOne({ _id: createdRealAssignment._id });
    await CourseClass.deleteOne({ _id: freshGuruClass._id });
    await User.deleteOne({ _id: freshGuru._id });

    // =========================================================================
    // TASK 2: CLEAN UP ORPHANED MAPEL CLASSES
    // =========================================================================
    console.log("\n--- TASK 2: Clean Up Orphaned Mapel Classes ---");
    const orphanInspection = await inspectAndCleanOrphanedClasses();
    console.log(
      "  Orphan inspection removed empty orphan classes:",
      orphanInspection.removedEmptyOrphanClassNames
    );

    // Verify the 3 empty orphaned classes without rombel ('12 pplg2', '11 PPLG 2', '10 PPLG 3') no longer exist in DB
    const remainingEmptyOrphans = await CourseClass.find({
      _id: {
        $in: [
          new mongoose.Types.ObjectId("6ac32c22b03dea9c200a4575"), // 12 pplg2
          new mongoose.Types.ObjectId("6ac588ec2ab093bab94c9682"), // 11 PPLG 2
          new mongoose.Types.ObjectId("6afd22e9078c79963b2331b7"), // 10 PPLG 3
        ],
      },
    }).lean();
    assert(
      remainingEmptyOrphans.length === 0,
      "Empty orphaned Mapel Classes ('12 pplg2', '11 PPLG 2', '10 PPLG 3') and their empty child records have been removed from the database"
    );

    // Verify BASISDATA10PPLG (which has 6 real student submissions & 4 graded scores) is preserved for review
    const basisDataOrphan = orphanInspection.orphanedClassesWithRecords.find(
      (oc) => oc._id === "6ac31a89f03da5f488975e4a"
    );
    assert(
      Boolean(basisDataOrphan) &&
        basisDataOrphan.name === "BASISDATA10PPLG" &&
        basisDataOrphan.submissionCount >= 4 &&
        basisDataOrphan.gradedSubmissionCount >= 4,
      `Orphaned class with meaningful student records ('BASISDATA10PPLG', ${basisDataOrphan?.submissionCount} submissions, ${basisDataOrphan?.gradedSubmissionCount} graded) was NOT deleted and is surfaced for administrative review`
    );

    // Verify BASISDATA10PPLG and deleted-teacher classes are NOT in validLegacyUnassignedClasses
    assert(
      !orphanInspection.validLegacyUnassignedClasses.some(
        (lc) =>
          lc.name === "12 pplg2" ||
          lc.name === "11 PPLG 2" ||
          lc.name === "10 PPLG 3" ||
          lc.name === "BASISDATA10PPLG"
      ),
      "No orphaned classes without a valid teacher appear in 'Kelas Mapel Tanpa Rombel (Legacy — Belum Ditetapkan)'"
    );

    // Verify a legacy class WITH a valid active teacher ('GURU1') but no rombel IS preserved in validLegacyUnassignedClasses
    const existingValidGuru = await User.findOne({
      role: "guru",
      isActive: true,
    }).lean();
    assert(Boolean(existingValidGuru), "Located an existing valid active Guru in DB");

    const tempLegacyWithTeacher = await CourseClass.create({
      name: "Kelas Legacy Guru Aktif",
      code: `LG${Date.now().toString().slice(-3)}`,
      password: "lg123",
      enrollmentMethod: "invitation",
      teacherId: existingValidGuru._id,
      academicYear: "2024/2025 - Genap",
      bannerColor: "blue",
      studentIds: [],
      isActive: true,
    });

    const secondInspection = await inspectAndCleanOrphanedClasses();
    assert(
      secondInspection.validLegacyUnassignedClasses.some(
        (lc) => String(lc._id) === String(tempLegacyWithTeacher._id)
      ),
      "A Mapel Class with a valid assigned Guru but no rombel is preserved in validLegacyUnassignedClasses for one-time rombel assignment"
    );

    // Clean up temporary legacy class
    await CourseClass.deleteOne({ _id: tempLegacyWithTeacher._id });

    // =========================================================================
    // TASK 1: TEACHER DELETION CONFIRMATION & CASCADING CLEANUP
    // =========================================================================
    console.log("\n--- TASK 1: Teacher Deletion Confirmation & Cascading Cleanup ---");
    const normalizedTeachersPageSrc = adminTeachersPageSrc.replace(/\s+/g, " ");
    assert(
      normalizedTeachersPageSrc.includes("Hapus Akun Guru?") &&
        normalizedTeachersPageSrc.includes(
          "Apakah Anda yakin ingin menghapus akun guru ini? Tindakan ini juga akan menghapus seluruh Kelas Mapel yang terhubung dengan guru tersebut beserta data kelas terkait. Data yang terhapus mungkin tidak dapat dipulihkan."
        ) &&
        normalizedTeachersPageSrc.includes("Kelas Mapel terkait:") &&
        normalizedTeachersPageSrc.includes("Materi:") &&
        normalizedTeachersPageSrc.includes("Tugas:") &&
        normalizedTeachersPageSrc.includes("Kuis:") &&
        normalizedTeachersPageSrc.includes("Hapus Guru dan Kelas"),
      "Admin Manajemen Guru confirmation modal displays required warning text, dynamic counts (Kelas Mapel, Materi, Tugas, Kuis), 'Batal', and 'Hapus Guru dan Kelas'"
    );

    // Create a test Guru with 2 Mapel Classes:
    // - Class 1 (Empty class): 2 Materials, 2 Tugas, 1 Quiz, 1 ClassPost, 0 student submissions
    // - Class 2 (Historical class): 1 Tugas with 1 graded student Submission
    const existingStudent = await User.findOne({
      role: "siswa",
      isActive: true,
    }).lean();
    assert(Boolean(existingStudent), "Located active student for historical submission test");

    const guruToDelete = await User.create({
      name: "Drs. Hendra Gunawan",
      degree: "M.Pd.",
      email: `hendra.delete.${Date.now()}@sekolah.sch.id`,
      loginUsername: `hendradel${Date.now().toString().slice(-5)}`,
      password: "hashed_password",
      role: "guru",
      isActivated: true,
      mustChangePassword: false,
      isActive: true,
    });

    const emptyClass = await CourseClass.create({
      name: "Sistem Operasi Test",
      code: `SO${Date.now().toString().slice(-3)}`,
      password: "so123",
      enrollmentMethod: "rombel",
      teacherId: guruToDelete._id,
      classRombelId: xPplg1._id,
      assignedRombelIds: [xPplg1._id],
      academicYear: "2026/2027 - Ganjil",
      bannerColor: "blue",
      studentIds: [],
      isActive: true,
    });

    const historicalClass = await CourseClass.create({
      name: "Jaringan Dasar Historis Test",
      code: `JD${Date.now().toString().slice(-3)}`,
      password: "jd123",
      enrollmentMethod: "rombel",
      teacherId: guruToDelete._id,
      classRombelId: xPplg1._id,
      assignedRombelIds: [xPplg1._id],
      academicYear: "2026/2027 - Ganjil",
      bannerColor: "purple",
      studentIds: [existingStudent._id],
      isActive: true,
    });

    // Populate Class 1 (Empty class) with 2 Materials, 2 Tugas, 1 Quiz, 1 Post
    const [mat1, mat2] = await Material.insertMany([
      {
        title: "Modul 1 Kernel Linux",
        courseClassId: emptyClass._id,
        teacherId: guruToDelete._id,
        isPublished: true,
      },
      {
        title: "Modul 2 Manajemen Memori",
        courseClassId: emptyClass._id,
        teacherId: guruToDelete._id,
        isPublished: true,
      },
    ]);

    const [asg1, asg2] = await Assignment.insertMany([
      {
        title: "Tugas 1 Instalasi Ubuntu",
        type: "tugas",
        courseClassId: emptyClass._id,
        teacherId: guruToDelete._id,
        maxScore: 100,
        isPublished: true,
      },
      {
        title: "Tugas 2 Shell Scripting",
        type: "tugas",
        courseClassId: emptyClass._id,
        teacherId: guruToDelete._id,
        maxScore: 100,
        isPublished: true,
      },
    ]);

    const quiz1 = await Quiz.create({
      title: "Kuis 1 Arsitektur OS",
      courseClassId: emptyClass._id,
      teacherId: guruToDelete._id,
      durationSeconds: 1800,
      totalPoints: 100,
      isPublished: true,
      questions: [],
    });

    const post1 = await ClassPost.create({
      courseClassId: emptyClass._id,
      teacherId: guruToDelete._id,
      type: "announcement",
      title: "Selamat datang di kelas Sistem Operasi",
      content: "Silakan unduh modul 1 dan 2.",
      comments: [],
    });

    // Populate Class 2 (Historical class) with 1 Tugas and 1 graded student Submission
    const histAssignment = await Assignment.create({
      title: "Tugas Topologi Jaringan",
      type: "tugas",
      courseClassId: historicalClass._id,
      teacherId: guruToDelete._id,
      maxScore: 100,
      isPublished: true,
    });

    const histSubmission = await Submission.create({
      assignmentId: histAssignment._id,
      courseClassId: historicalClass._id,
      studentId: existingStudent._id,
      status: "graded",
      score: 92,
      feedback: "Topologi sangat rapi dan tepat.",
      submittedAt: new Date(),
      gradedAt: new Date(),
    });

    // 1. Verify getTeacherDeletionSummary before deletion
    const summary = await getTeacherDeletionSummary(String(guruToDelete._id));
    assert(
      Boolean(summary) &&
        summary.teacherName === "Drs. Hendra Gunawan, M.Pd." &&
        summary.classCount === 2 &&
        summary.materialCount === 2 &&
        summary.assignmentCount === 3 &&
        summary.quizCount === 1 &&
        summary.submissionCount === 1 &&
        summary.gradedSubmissionCount === 1 &&
        summary.hasHistoricalRecords === true,
      "getTeacherDeletionSummary returned exact live DB counts: 2 kelas, 2 materi, 3 tugas, 1 kuis, 1 graded submission"
    );

    // 2. Execute deleteTeacherAndClasses
    const countTeachersBefore = await User.countDocuments({ role: "guru" });
    const countStudentsBefore = await User.countDocuments({ role: "siswa" });

    const delResult = await deleteTeacherAndClasses(String(guruToDelete._id));
    assert(
      Boolean(delResult) &&
        delResult.deletedClassesCount === 1 &&
        delResult.preservedHistoricalClassesCount === 1 &&
        delResult.deletedMaterialsCount === 2 &&
        delResult.deletedAssignmentsCount === 2 &&
        delResult.deletedQuizzesCount === 1,
      "deleteTeacherAndClasses deleted the empty class + its 2 materials, 2 assignments, 1 quiz, and archived the 1 class with graded student history"
    );

    // 3. Verify teacher and empty class records are gone
    const deletedGuruCheck = await User.findById(guruToDelete._id).lean();
    const deletedEmptyClassCheck = await CourseClass.findById(emptyClass._id).lean();
    const deletedMatsCheck = await Material.countDocuments({
      _id: { $in: [mat1._id, mat2._id] },
    });
    const deletedAsgsCheck = await Assignment.countDocuments({
      _id: { $in: [asg1._id, asg2._id] },
    });
    const deletedQuizCheck = await Quiz.findById(quiz1._id).lean();
    const deletedPostCheck = await ClassPost.findById(post1._id).lean();

    assert(
      !deletedGuruCheck &&
        !deletedEmptyClassCheck &&
        deletedMatsCheck === 0 &&
        deletedAsgsCheck === 0 &&
        !deletedQuizCheck &&
        !deletedPostCheck,
      "Deleted teacher, empty Mapel Class, and all its materials, assignments, quizzes, and posts are removed from MongoDB"
    );

    // 4. Verify historical student submission & grade were NOT destroyed
    const preservedSubCheck = await Submission.findById(histSubmission._id).lean();
    const preservedClassCheck = await CourseClass.findById(historicalClass._id).lean();
    assert(
      Boolean(preservedSubCheck) &&
        preservedSubCheck.score === 92 &&
        Boolean(preservedClassCheck) &&
        preservedClassCheck.isActive === false,
      "Historical student submission (score=92) and its parent class were safely preserved (archived with isActive=false)"
    );

    // 5. Verify unrelated teachers and students remain intact
    const countTeachersAfter = await User.countDocuments({ role: "guru" });
    const countStudentsAfter = await User.countDocuments({ role: "siswa" });
    assert(
      countTeachersAfter === countTeachersBefore - 1 &&
        countStudentsAfter === countStudentsBefore,
      "Unrelated teachers and all student accounts remain 100% intact"
    );

    // 6. Test deletion failure on nonexistent teacher ID -> returns null without affecting DB
    const nonExistentDel = await deleteTeacherAndClasses(
      new mongoose.Types.ObjectId().toString()
    );
    assert(
      nonExistentDel === null,
      "Deleting nonexistent teacher ID returns null cleanly without partial state corruption"
    );

    // Clean up the temporary archived test class, assignment, and submission
    await Submission.deleteOne({ _id: histSubmission._id });
    await Assignment.deleteOne({ _id: histAssignment._id });
    await CourseClass.deleteOne({ _id: historicalClass._id });
  } finally {
    await mongoose.disconnect();
  }

  console.log("\n======================================================================");
  console.log(` ALL ${passed}/${total} VERIFICATION CHECKS PASSED!`);
  console.log("======================================================================\n");
}

run().catch(async (err) => {
  console.error("Verification suite failed:", err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
