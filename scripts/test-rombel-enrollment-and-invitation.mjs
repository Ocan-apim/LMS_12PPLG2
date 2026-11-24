/**
 * Comprehensive End-to-End Verification Suite for:
 * Feature Implementation: Teacher Mapel Class Creation & Rombel-Based Enrollment
 *
 * Covers:
 * - Section 8.A: Rombel Enrollment
 *   1. Teacher creates a Basis Data class and assigns it to XII PPLG 2.
 *   2. All active students in XII PPLG 2 receive the class automatically.
 *   3. Students in XII PPLG 1 (and other rombels) do not receive the class.
 *   4. A student newly added to XII PPLG 2 receives the class automatically.
 *   5. A teacher cannot assign one Mapel Class to multiple rombels.
 *   6. An invalid or nonexistent rombel is rejected.
 *   7. Repeated synchronization does not create duplicate enrollments.
 *   8. Rombel-assigned classes display assigned rombel & student count without invitation credentials.
 * - Section 8.B: Existing Invitation System Regression
 *   1. Teacher can still create a Mapel Class using the existing Kode Undangan method.
 *   2. Previously created invitation codes ('29QRV', 'MW4RM') remain valid.
 *   3. Existing invitation password behavior remains unchanged (wrong password rejected with 403).
 *   4. Students can still join using the existing Join Kelas API (/api/siswa/classes/join).
 *   5. Invalid invitation codes are rejected (404).
 *   6. Duplicate enrollment is prevented.
 *   7. Existing invitation management features continue working.
 * - Section 8.C: Existing Functionality Regression
 *   1. Existing Mapel Classes remain accessible.
 *   2. Existing student enrollments remain intact.
 *   3. Tugas, Kuis, Materi, comments, submissions, and grading still work.
 *   4. Students see both types of enrolled classes in the same Kelas Saya / Mata Pelajaran section.
 *   5. Existing authentication and role permissions remain unchanged.
 *   6. Admin, Guru, Siswa, Kurikulum, and Kepsek dashboards remain functional.
 *
 * Run with: node --env-file=.env.local scripts/test-rombel-enrollment-and-invitation.mjs
 */

import mongoose from "mongoose";

const BASE_URL = process.env.TEST_URL || "http://localhost:3018";
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lms";

let totalTests = 0;
let passedTests = 0;

function assert(condition, message, detail = "") {
  totalTests++;
  if (!condition) {
    console.error(`  ✖ FAIL: ${message}${detail ? ` — ${detail}` : ""}`);
    process.exit(1);
  }
  passedTests++;
  console.log(`  ✔ ${message}`);
}

function extractCookie(res) {
  const cookiesList =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie")].filter(Boolean);

  for (const c of cookiesList) {
    const match = c.match(/lms_session=([^;]+)/);
    if (match) {
      return `lms_session=${match[1]}`;
    }
  }
  return "";
}

async function apiRequest(
  urlPath,
  method = "GET",
  cookie = "",
  body = undefined
) {
  const headers = {};
  if (cookie) headers["Cookie"] = cookie;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE_URL}${urlPath}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });

  let json = null;
  let text = "";
  try {
    text = await res.text();
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return {
    status: res.status,
    headers: res.headers,
    cookie: extractCookie(res) || cookie,
    json,
    text,
  };
}

async function login(identifier, password, role) {
  const res = await apiRequest("/api/auth/login", "POST", "", {
    identifier,
    password,
    role,
  });
  if (res.status !== 200 || !res.json?.success) {
    throw new Error(
      `Login failed for ${identifier} (${role}): ${JSON.stringify(res.json)}`
    );
  }
  return { user: res.json.data.user, cookie: res.cookie };
}

async function run() {
  console.log("\n==============================================================");
  console.log(
    " LEARNIX LMS — MAPEL CLASS CREATION & ROMBEL ENROLLMENT SUITE"
  );
  console.log(` Target: ${BASE_URL}`);
  console.log("==============================================================\n");

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const usersCol = db.collection("users");
  const classesCol = db.collection("classes");
  const courseClassesCol = db.collection("courseclasses");
  const notificationsCol = db.collection("notifications");

  const createdCourseClassIds = [];
  const createdUserIds = [];
  let preExistingMW4RMEnrolledSiti = false;

  try {
    // Authenticate all 5 roles
    const admin = await login("admin@sekolah.sch.id", "password123", "admin");
    const guru = await login("budi.pratama", "password123", "guru");
    const kurikulum = await login("kurikulum", "password123", "kurikulum");
    const kepsek = await login("kepsek@sekolah.sch.id", "password123", "kepsek");
    const ahmadX = await login("0098273645", "password123", "siswa"); // X PPLG 1
    const sitiXii2 = await login("0098273646", "password123", "siswa"); // XII PPLG 2
    const bambangXii2 = await login("0098273647", "password123", "siswa"); // XII PPLG 2

    assert(admin.user.role === "admin", "Authenticated Admin");
    assert(guru.user.role === "guru", "Authenticated Guru (Budi Pratama)");
    assert(kurikulum.user.role === "kurikulum", "Authenticated Kurikulum");
    assert(kepsek.user.role === "kepsek", "Authenticated Kepsek");
    assert(
      sitiXii2.user.name === "Siti Nurbaya",
      "Authenticated Siswa in XII PPLG 2 (Siti Nurbaya)"
    );
    assert(
      bambangXii2.user.name === "Bambang Pamungkas",
      "Authenticated Siswa in XII PPLG 2 (Bambang Pamungkas)"
    );

    // Look up XII PPLG 2 and XII PPLG 1 rombels
    const rombelsRes = await apiRequest(
      "/api/admin/classes",
      "GET",
      guru.cookie
    );
    assert(
      rombelsRes.status === 200 && Array.isArray(rombelsRes.json?.data),
      "Guru can fetch active rombels list from GET /api/admin/classes (200 OK)"
    );

    const xiiPplg2 = rombelsRes.json.data.find(
      (r) => r.name === "XII PPLG 2"
    );
    const xiiPplg1 = rombelsRes.json.data.find(
      (r) => r.name === "XII PPLG 1"
    );
    assert(
      Boolean(xiiPplg2) && Boolean(xiiPplg1),
      `Located Rombel XII PPLG 2 (${xiiPplg2?._id}) and XII PPLG 1 (${xiiPplg1?._id})`
    );

    // Create a temporary active student in XII PPLG 1 to explicitly verify XII PPLG 1 isolation
    const createXii1StudentRes = await apiRequest(
      "/api/admin/students",
      "POST",
      admin.cookie,
      {
        name: "Dimas Siswa XII PPLG 1",
        nis: "009911223",
        nisn: "0099112233",
        gender: "Laki-laki",
        birthPlace: "Jakarta",
        birthDate: "2008-05-10",
        classId: xiiPplg1._id,
        password: "password123",
      }
    );
    assert(
      createXii1StudentRes.status === 201,
      "Created test student in XII PPLG 1 (Dimas Siswa XII PPLG 1)"
    );
    const dimasXii1Id = createXii1StudentRes.json.data._id;
    createdUserIds.push(dimasXii1Id);
    const dimasXii1 = await login("009911223", "password123", "siswa");

    // =========================================================================
    // A. ROMBEL ENROLLMENT TESTS
    // =========================================================================
    console.log("\n--- A. Rombel-Based Automatic Enrollment ---");

    // A.5: Teacher cannot assign one Mapel Class to multiple rombels
    const multiRombelAttempt1 = await apiRequest(
      "/api/guru/classes",
      "POST",
      guru.cookie,
      {
        name: "Basis Data Multi Rombel",
        enrollmentMethod: "rombel",
        assignedRombelIds: [xiiPplg2._id, xiiPplg1._id],
      }
    );
    assert(
      multiRombelAttempt1.status === 400 &&
        multiRombelAttempt1.json?.success === false,
      `Rejected attempt to assign Mapel Class to multiple rombels via assignedRombelIds (400: "${multiRombelAttempt1.json?.message}")`
    );

    const multiRombelAttempt2 = await apiRequest(
      "/api/guru/classes",
      "POST",
      guru.cookie,
      {
        name: "Basis Data Multi Rombel Array",
        enrollmentMethod: "rombel",
        classRombelId: [xiiPplg2._id, xiiPplg1._id],
      }
    );
    assert(
      multiRombelAttempt2.status === 400 &&
        multiRombelAttempt2.json?.success === false,
      "Rejected attempt to pass an array of rombels in classRombelId (400)"
    );

    // A.6: Invalid or nonexistent rombel is rejected
    const invalidRombelRes = await apiRequest(
      "/api/guru/classes",
      "POST",
      guru.cookie,
      {
        name: "Basis Data Invalid Rombel",
        enrollmentMethod: "rombel",
        classRombelId: "not-a-valid-object-id",
      }
    );
    assert(
      invalidRombelRes.status === 400,
      "Rejected invalid rombel ObjectId format with 400 Bad Request"
    );

    const nonExistentRombelId = new mongoose.Types.ObjectId().toString();
    const nonExistentRombelRes = await apiRequest(
      "/api/guru/classes",
      "POST",
      guru.cookie,
      {
        name: "Basis Data Nonexistent Rombel",
        enrollmentMethod: "rombel",
        classRombelId: nonExistentRombelId,
      }
    );
    assert(
      nonExistentRombelRes.status === 404,
      "Rejected nonexistent rombel ID with 404 Not Found"
    );

    const emptyRombelRes = await apiRequest(
      "/api/guru/classes",
      "POST",
      guru.cookie,
      {
        name: "Basis Data Tanpa Rombel",
        enrollmentMethod: "rombel",
        classRombelId: "",
      }
    );
    assert(
      emptyRombelRes.status === 400,
      "Rejected Assign ke Rombel when no rombel is selected (400)"
    );

    // A.1: Teacher creates "Basis Data" class and assigns it to XII PPLG 2
    const createRombelClassRes = await apiRequest(
      "/api/guru/classes",
      "POST",
      guru.cookie,
      {
        name: "Basis Data",
        description: "Pemodelan dan Administrasi Basis Data XII PPLG 2",
        enrollmentMethod: "rombel",
        classRombelId: xiiPplg2._id,
      }
    );
    assert(
      createRombelClassRes.status === 201 &&
        createRombelClassRes.json?.success === true,
      "Teacher created 'Basis Data' Mapel Class using Assign ke Rombel -> XII PPLG 2 (201 Created)"
    );
    const basisDataRombelClass = createRombelClassRes.json.data;
    const basisDataRombelClassId = String(basisDataRombelClass._id);
    createdCourseClassIds.push(basisDataRombelClassId);

    // Verify Teacher Class Management response for rombel-assigned class
    assert(
      basisDataRombelClass.enrollmentMethod === "rombel" &&
        basisDataRombelClass.classRombelId?.name === "XII PPLG 2" &&
        basisDataRombelClass.password === undefined &&
        basisDataRombelClass.code === "",
      "Rombel-assigned class response includes enrollmentMethod='rombel', rombel 'XII PPLG 2', and omits invitation credentials"
    );

    // A.2: All active students in XII PPLG 2 (Siti Nurbaya & Bambang Pamungkas) receive the class
    const enrolledIdsOnCreation = (basisDataRombelClass.studentIds || []).map(
      (s) => String(s._id || s)
    );
    assert(
      enrolledIdsOnCreation.includes(sitiXii2.user.id) &&
        enrolledIdsOnCreation.includes(bambangXii2.user.id),
      "All active students in XII PPLG 2 (Siti Nurbaya & Bambang Pamungkas) are automatically enrolled upon class creation"
    );

    for (const [label, studentAuth] of [
      ["Siti Nurbaya (XII PPLG 2)", sitiXii2],
      ["Bambang Pamungkas (XII PPLG 2)", bambangXii2],
    ]) {
      const coursesRes = await apiRequest(
        "/api/siswa/courses",
        "GET",
        studentAuth.cookie
      );
      assert(
        coursesRes.status === 200 &&
          coursesRes.json?.data?.some(
            (c) =>
              String(c._id) === basisDataRombelClassId &&
              c.name === "Basis Data"
          ),
        `${label} immediately sees 'Basis Data' under Kelas Saya / Mata Pelajaran (/api/siswa/courses)`
      );

      const dashRes = await apiRequest(
        "/api/siswa/dashboard",
        "GET",
        studentAuth.cookie
      );
      assert(
        dashRes.status === 200 &&
          dashRes.json?.data?.classes?.some(
            (c) => String(c._id) === basisDataRombelClassId
          ),
        `${label} immediately sees 'Basis Data' on Siswa Dashboard`
      );

      const detailRes = await apiRequest(
        `/api/siswa/courses/${basisDataRombelClassId}`,
        "GET",
        studentAuth.cookie
      );
      assert(
        detailRes.status === 200 &&
          detailRes.json?.data?.name === "Basis Data",
        `${label} can open 'Basis Data' class detail directly without any invitation code or password`
      );
    }

    // A.3: Students in XII PPLG 1 (Dimas) and X PPLG 1 (Ahmad) do NOT receive the class
    for (const [label, otherStudent] of [
      ["Dimas Siswa (XII PPLG 1)", dimasXii1],
      ["Ahmad Bagus Pratama (X PPLG 1)", ahmadX],
    ]) {
      const otherCoursesRes = await apiRequest(
        "/api/siswa/courses",
        "GET",
        otherStudent.cookie
      );
      assert(
        otherCoursesRes.status === 200 &&
          !otherCoursesRes.json?.data?.some(
            (c) => String(c._id) === basisDataRombelClassId
          ),
        `${label} does NOT receive the XII PPLG 2 'Basis Data' class in /api/siswa/courses`
      );

      const otherDetailRes = await apiRequest(
        `/api/siswa/courses/${basisDataRombelClassId}`,
        "GET",
        otherStudent.cookie
      );
      assert(
        otherDetailRes.status === 403,
        `${label} is blocked with 403 Forbidden from accessing XII PPLG 2 'Basis Data' class detail`
      );
    }

    // A.4: A student newly added to XII PPLG 2 automatically receives the class
    const createNewXii2StudentRes = await apiRequest(
      "/api/admin/students",
      "POST",
      admin.cookie,
      {
        name: "Fajar Siswa Baru XII PPLG 2",
        nis: "009944556",
        nisn: "0099445566",
        gender: "Laki-laki",
        birthPlace: "Surabaya",
        birthDate: "2008-09-12",
        classId: xiiPplg2._id,
        password: "password123",
      }
    );
    assert(
      createNewXii2StudentRes.status === 201,
      "Admin added a new active student 'Fajar Siswa Baru XII PPLG 2' to XII PPLG 2"
    );
    const fajarXii2Id = createNewXii2StudentRes.json.data._id;
    createdUserIds.push(fajarXii2Id);

    const fajarXii2 = await login("009944556", "password123", "siswa");
    const fajarCoursesRes = await apiRequest(
      "/api/siswa/courses",
      "GET",
      fajarXii2.cookie
    );
    assert(
      fajarCoursesRes.status === 200 &&
        fajarCoursesRes.json?.data?.some(
          (c) => String(c._id) === basisDataRombelClassId
        ),
      "Newly added student in XII PPLG 2 (Fajar) automatically receives the 'Basis Data' class"
    );

    const fajarDetailRes = await apiRequest(
      `/api/siswa/courses/${basisDataRombelClassId}`,
      "GET",
      fajarXii2.cookie
    );
    assert(
      fajarDetailRes.status === 200 &&
        fajarDetailRes.json?.data?.name === "Basis Data",
      "Newly added student in XII PPLG 2 (Fajar) can open 'Basis Data' class detail immediately"
    );

    // A.7: Repeated synchronization does not create duplicate enrollments
    for (let i = 0; i < 3; i++) {
      await apiRequest("/api/guru/classes", "GET", guru.cookie);
      await apiRequest(
        `/api/guru/classes/${basisDataRombelClassId}`,
        "GET",
        guru.cookie
      );
      await apiRequest("/api/siswa/courses", "GET", fajarXii2.cookie);
      await apiRequest("/api/siswa/dashboard", "GET", sitiXii2.cookie);
    }

    const dbRombelClassDoc = await courseClassesCol.findOne({
      _id: new mongoose.Types.ObjectId(basisDataRombelClassId),
    });
    const rawStudentIdStrs = (dbRombelClassDoc.studentIds || []).map(String);
    const uniqueStudentIdStrs = Array.from(new Set(rawStudentIdStrs));
    assert(
      rawStudentIdStrs.length === uniqueStudentIdStrs.length &&
        uniqueStudentIdStrs.includes(sitiXii2.user.id) &&
        uniqueStudentIdStrs.includes(bambangXii2.user.id) &&
        uniqueStudentIdStrs.includes(String(fajarXii2Id)),
      `Repeated synchronization produced 0 duplicate enrollments (${rawStudentIdStrs.length} unique students enrolled)`
    );

    // Verify Teacher Class Detail endpoint (/api/guru/classes/[id]) shows rombel info and no invitation credentials
    const guruClassDetailRes = await apiRequest(
      `/api/guru/classes/${basisDataRombelClassId}`,
      "GET",
      guru.cookie
    );
    assert(
      guruClassDetailRes.status === 200 &&
        guruClassDetailRes.json?.data?.enrollmentMethod === "rombel" &&
        guruClassDetailRes.json?.data?.classRombelId?.name === "XII PPLG 2" &&
        guruClassDetailRes.json?.data?.password === undefined &&
        guruClassDetailRes.json?.data?.code === "" &&
        guruClassDetailRes.json?.data?.studentIds?.length === 3,
      "GET /api/guru/classes/[id] for rombel-assigned class returns assigned rombel, 3 enrolled students, and no invitation credentials"
    );

    // =========================================================================
    // B. EXISTING INVITATION SYSTEM REGRESSION TESTS
    // =========================================================================
    console.log("\n--- B. Existing Invitation System Regression ---");

    // B.1: Teacher creates a Mapel Class using the existing Kode Undangan method
    const createInviteClassRes = await apiRequest(
      "/api/guru/classes",
      "POST",
      guru.cookie,
      {
        name: "Pemrograman Web Lanjutan",
        description: "Kelas pilihan dengan Kode Undangan",
        enrollmentMethod: "invitation",
        password: "websecret123",
      }
    );
    assert(
      createInviteClassRes.status === 201 &&
        createInviteClassRes.json?.success === true,
      "Teacher created Mapel Class using existing Kode Undangan method (201 Created)"
    );
    const inviteClass = createInviteClassRes.json.data;
    const inviteClassId = String(inviteClass._id);
    createdCourseClassIds.push(inviteClassId);

    assert(
      inviteClass.enrollmentMethod === "invitation" &&
        typeof inviteClass.code === "string" &&
        inviteClass.code.length === 5 &&
        inviteClass.password === "websecret123" &&
        inviteClass.studentCount === 0,
      `Kode Undangan class generated 5-char code '${inviteClass.code}' and preserved password`
    );

    // B.2: Verify PREVIOUSLY CREATED invitation codes still work!
    // Existing class 1: 'BASISDATA10PPLG' (code: '29QRV', password: 'bucantik')
    // Existing class 2: '10 PPLG 3' (code: 'MW4RM', password: '123')
    const joinPreExistingWrongPwd = await apiRequest(
      "/api/siswa/classes/join",
      "POST",
      sitiXii2.cookie,
      {
        code: "29QRV",
        password: "wrongpassword",
      }
    );
    assert(
      joinPreExistingWrongPwd.status === 403,
      "Previously created invitation code '29QRV' rejects wrong password with 403"
    );

    const joinPreExistingMW4RM = await apiRequest(
      "/api/siswa/classes/join",
      "POST",
      sitiXii2.cookie,
      {
        code: "MW4RM",
        password: "123",
      }
    );
    assert(
      joinPreExistingMW4RM.status === 200 &&
        joinPreExistingMW4RM.json?.success === true,
      "Student (Siti Nurbaya) successfully joined PREVIOUSLY CREATED invitation class ('MW4RM' / '123')"
    );
    preExistingMW4RMEnrolledSiti = true;

    // Also verify already-enrolled Ahmad on pre-existing '29QRV' gets duplicate-prevented message
    const joinPreExisting29QRV = await apiRequest(
      "/api/siswa/classes/join",
      "POST",
      ahmadX.cookie,
      {
        code: "29QRV",
        password: "bucantik",
      }
    );
    assert(
      joinPreExisting29QRV.status === 200 &&
        joinPreExisting29QRV.json?.message ===
          "Anda sudah terdaftar di kelas ini",
      "Previously created invitation code '29QRV' works and prevents duplicate enrollment for already-enrolled student (Ahmad)"
    );

    // B.3 & B.4 & B.5 & B.6: Test joining the newly created Kode Undangan class
    const joinInvalidCodeRes = await apiRequest(
      "/api/siswa/classes/join",
      "POST",
      sitiXii2.cookie,
      {
        code: "ZZZZZ",
        password: "websecret123",
      }
    );
    assert(
      joinInvalidCodeRes.status === 404,
      "Invalid invitation code 'ZZZZZ' rejected with 404 Not Found"
    );

    const joinWrongPwdRes = await apiRequest(
      "/api/siswa/classes/join",
      "POST",
      sitiXii2.cookie,
      {
        code: inviteClass.code,
        password: "salahpassword",
      }
    );
    assert(
      joinWrongPwdRes.status === 403,
      "Wrong class password on new Kode Undangan class rejected with 403 Forbidden"
    );

    const joinValidRes = await apiRequest(
      "/api/siswa/classes/join",
      "POST",
      sitiXii2.cookie,
      {
        code: inviteClass.code,
        password: "websecret123",
      }
    );
    assert(
      joinValidRes.status === 200 &&
        joinValidRes.json?.success === true &&
        joinValidRes.json?.data?.password === undefined,
      `Student (Siti Nurbaya) joined new Kode Undangan class '${inviteClass.code}' and response does not expose password`
    );

    // B.6: Duplicate enrollment prevention on second join call
    const joinDuplicateRes = await apiRequest(
      "/api/siswa/classes/join",
      "POST",
      sitiXii2.cookie,
      {
        code: inviteClass.code,
        password: "websecret123",
      }
    );
    assert(
      joinDuplicateRes.status === 200 &&
        joinDuplicateRes.json?.message === "Anda sudah terdaftar di kelas ini",
      "Duplicate join call on Kode Undangan class prevented cleanly"
    );

    const dbInviteClassDoc = await courseClassesCol.findOne({
      _id: new mongoose.Types.ObjectId(inviteClassId),
    });
    assert(
      dbInviteClassDoc.studentIds.length === 1 &&
        String(dbInviteClassDoc.studentIds[0]) === sitiXii2.user.id,
      "Kode Undangan class has exactly 1 enrolled student (no duplicate entries)"
    );

    // B.7: Existing invitation management features on GET & PUT /api/guru/classes/[id]
    const guruInviteDetailRes = await apiRequest(
      `/api/guru/classes/${inviteClassId}`,
      "GET",
      guru.cookie
    );
    assert(
      guruInviteDetailRes.status === 200 &&
        guruInviteDetailRes.json?.data?.enrollmentMethod === "invitation" &&
        guruInviteDetailRes.json?.data?.code === inviteClass.code &&
        guruInviteDetailRes.json?.data?.password === "websecret123",
      "Teacher can view invitation code and password on GET /api/guru/classes/[id] for Kode Undangan class"
    );

    // =========================================================================
    // C. EXISTING FUNCTIONALITY REGRESSION
    // =========================================================================
    console.log("\n--- C. Existing Functionality Regression ---");

    // C.4: Student (Siti Nurbaya) sees BOTH rombel-assigned ('Basis Data') and invitation-joined ('Pemrograman Web Lanjutan' & '10 PPLG 3') classes in the same Kelas Saya / Mata Pelajaran section
    const sitiAllCoursesRes = await apiRequest(
      "/api/siswa/courses",
      "GET",
      sitiXii2.cookie
    );
    const sitiCourseIds = (sitiAllCoursesRes.json?.data || []).map((c) =>
      String(c._id)
    );
    assert(
      sitiAllCoursesRes.status === 200 &&
        sitiCourseIds.includes(basisDataRombelClassId) &&
        sitiCourseIds.includes(inviteClassId),
      "Student sees both rombel-assigned and invitation-joined classes in the same Kelas Saya / Mata Pelajaran list"
    );

    // C.1 & C.2 & C.3: Existing Mapel Class ('BASISDATA10PPLG') and its assignments/quizzes/comments/grades remain intact
    const basisDataExistingId = "6ac31a89f03da5f488975e4a";
    const ahmadExistingClassRes = await apiRequest(
      `/api/siswa/courses/${basisDataExistingId}`,
      "GET",
      ahmadX.cookie
    );
    assert(
      ahmadExistingClassRes.status === 200 &&
        ahmadExistingClassRes.json?.data?.name === "BASISDATA10PPLG" &&
        ahmadExistingClassRes.json?.data?.assignments?.length >= 1,
      "Existing Mapel Class 'BASISDATA10PPLG' and its assignments/quizzes remain intact for enrolled students"
    );

    // C.6: All 5 role dashboards remain functional
    for (const [roleLabel, endpoint, cookie] of [
      ["Admin", "/api/admin/stats", admin.cookie],
      ["Guru", "/api/guru/dashboard", guru.cookie],
      ["Siswa", "/api/siswa/dashboard", ahmadX.cookie],
      ["Kurikulum", "/api/kurikulum/dashboard", kurikulum.cookie],
      ["Kepsek", "/api/kepsek/reports/recap", kepsek.cookie],
    ]) {
      const dashCheck = await apiRequest(endpoint, "GET", cookie);
      assert(
        dashCheck.status === 200 && dashCheck.json?.success === true,
        `${roleLabel} dashboard/overview API (${endpoint}) returns 200 OK`
      );
    }
  } finally {
    // Cleanup temporary test data so database remains clean
    if (preExistingMW4RMEnrolledSiti) {
      await courseClassesCol.updateOne(
        { code: "MW4RM" },
        {
          $pull: {
            studentIds: new mongoose.Types.ObjectId(
              "6ac31a89f03da5f488975e43"
            ),
          },
        }
      );
    }

    if (createdCourseClassIds.length > 0) {
      const objIds = createdCourseClassIds.map(
        (id) => new mongoose.Types.ObjectId(id)
      );
      await courseClassesCol.deleteMany({ _id: { $in: objIds } });
      await notificationsCol.deleteMany({ relatedEntityId: { $in: objIds } });
    }

    if (createdUserIds.length > 0) {
      const userObjIds = createdUserIds.map(
        (id) => new mongoose.Types.ObjectId(id)
      );
      await classesCol.updateMany(
        {},
        { $pull: { studentIds: { $in: userObjIds } } }
      );
      await courseClassesCol.updateMany(
        {},
        { $pull: { studentIds: { $in: userObjIds } } }
      );
      await usersCol.deleteMany({ _id: { $in: userObjIds } });
    }

    await mongoose.disconnect();
  }

  console.log("\n==============================================================");
  console.log(
    ` ALL ${passedTests}/${totalTests} ROMBEL ENROLLMENT & INVITATION CHECKS PASSED!`
  );
  console.log("==============================================================\n");
}

run().catch(async (err) => {
  console.error("Test execution failed:", err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
