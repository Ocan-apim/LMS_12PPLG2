/**
 * Automated End-to-End & Integration Verification Suite for:
 * - TASK 1: Siswa Dashboard Redesign (Simplified welcome banner, 3 summary cards: Mata Pelajaran / Tenggat Tugas / Tenggat Kuis, removal of Kuis / Event Kalender / Notifikasi sections from dashboard)
 * - TASK 2: Guru Quiz Navigation Fix (Class stream quiz link points to /guru/assignments/[id], loads both wrapped and standalone quizzes, verifies ownership 403 & invalid ID 404, supports comments, edits, and submissions)
 * - TASK 3: Remove Pengaturan & Standardize Profil Navigation across all 5 roles (admin, guru, siswa, kurikulum, kepsek)
 * - TASK 4: Role-Aware Profile System & Backend Security (Read-only biodata, Siswa & Guru editable email/ID number/password with uniqueness & currentPassword verification, Kurikulum & Kepsek strictly read-only 403 on mutations, cross-user ID tampering rejected with 403)
 */
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3016";
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lms";

let passed = 0;
let failed = 0;

function assert(condition, label, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${label}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function loginAs(identifier, password, role) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password, role }),
  });
  const setCookie = res.headers.get("set-cookie") || "";
  const json = await res.json();
  return { status: res.status, cookie: setCookie.split(";")[0], json };
}

async function apiRequest(urlPath, method = "GET", cookie = "", body = undefined) {
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
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, headers: res.headers, json };
}

async function main() {
  console.log("=== LEARNIX LMS — DASHBOARD, GURU QUIZ NAV & PROFILE SECURITY TESTS ===");
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  // ---------------------------------------------------------------------------
  // 1. Static Source Verification for Task 1, Task 2, Task 3
  // ---------------------------------------------------------------------------
  console.log("\n[1] Static Component & Navigation Verification...");

  const bannerSrc = fs.readFileSync(
    path.join(process.cwd(), "src/components/student/StudentDashboardComponents.tsx"),
    "utf8"
  );
  // Extract JoinClassBanner function body
  const bannerFnMatch = bannerSrc.split("export function JoinClassBanner")[1]?.split("export function AverageScoreCard")[0] || "";
  assert(
    !bannerFnMatch.includes("NISN:") &&
      !bannerFnMatch.includes("Profil Saya") &&
      !bannerFnMatch.includes("student.photoUrl") &&
      !bannerFnMatch.includes("student.rombelName"),
    "Task 1.1: JoinClassBanner removes avatar, class badges, NISN text, and Profil Saya button"
  );
  assert(
    bannerFnMatch.includes("Join Kelas Baru") &&
      bannerFnMatch.includes("student?.name") &&
      bannerFnMatch.includes("student?.departmentName") &&
      bannerFnMatch.includes("student?.academicYear"),
    "Task 1.1: JoinClassBanner keeps student full name, study program + academic year, and Join Kelas Baru button"
  );

  const siswaPageSrc = fs.readFileSync(
    path.join(process.cwd(), "src/app/siswa/page.tsx"),
    "utf8"
  );
  assert(
    siswaPageSrc.includes("Mata Pelajaran") &&
      siswaPageSrc.includes("Tenggat Tugas") &&
      siswaPageSrc.includes("Tenggat Kuis") &&
      !siswaPageSrc.includes("Progres Tugas") &&
      !siswaPageSrc.includes("Progres Kuis") &&
      !siswaPageSrc.includes("Tenggat Aktif"),
    "Task 1.2: Siswa Dashboard displays exactly 3 summary cards (Mata Pelajaran, Tenggat Tugas, Tenggat Kuis)"
  );
  assert(
    !siswaPageSrc.includes("Event Kalender (") &&
      !siswaPageSrc.includes("Belum ada event pribadi") &&
      !siswaPageSrc.includes("Belum ada notifikasi"),
    "Task 1.3: Siswa Dashboard removes Kuis, Event Kalender, and Notifikasi dashboard sections"
  );
  assert(
    siswaPageSrc.includes("AverageScoreCard") &&
      siswaPageSrc.includes("DashboardSubjectCard") &&
      siswaPageSrc.includes("TaskList") &&
      siswaPageSrc.includes("SharedFileCard"),
    "Task 1.3: Siswa Dashboard preserves Nilai rata-rata, Mata Pelajaran, Tugas, and File yang dibagi"
  );

  const guruClassSrc = fs.readFileSync(
    path.join(process.cwd(), "src/app/guru/classes/[id]/page.tsx"),
    "utf8"
  );
  assert(
    !guruClassSrc.includes("/siswa/quiz/") &&
      guruClassSrc.includes("/guru/assignments/${post.refId}"),
    "Task 2: Guru class stream no longer links quizzes to /siswa/quiz/[id] (which caused middleware redirect to /guru)"
  );

  const navSrc = fs.readFileSync(
    path.join(process.cwd(), "src/lib/navigation.ts"),
    "utf8"
  );
  const sidebarSrc = fs.readFileSync(
    path.join(process.cwd(), "src/components/layout/Sidebar.tsx"),
    "utf8"
  );
  assert(
    !navSrc.includes("Pengaturan") && !sidebarSrc.includes("Pengaturan"),
    "Task 3.1: Pengaturan is completely removed from navigation across all roles"
  );
  for (const r of ["admin", "guru", "siswa", "kurikulum", "kepsek"]) {
    assert(
      navSrc.includes(`href: "/${r}/profile", label: "Profil"`),
      `Task 3.2: Standardized 'Profil' navigation item exists for role '${r}' -> /${r}/profile`
    );
  }

  // ---------------------------------------------------------------------------
  // 2. Authenticate all 5 roles
  // ---------------------------------------------------------------------------
  console.log("\n[2] Authenticating all 5 roles...");
  const siswaUser = await db.collection("users").findOne({ role: "siswa", isActive: true });
  const otherSiswaUser = await db
    .collection("users")
    .findOne({ role: "siswa", isActive: true, _id: { $ne: siswaUser._id } });
  const guruUser = await db.collection("users").findOne({ role: "guru", isActive: true });
  const otherGuruUser = await db
    .collection("users")
    .findOne({ role: "guru", isActive: true, _id: { $ne: guruUser._id } });
  const kurikulumUser = await db.collection("users").findOne({ role: "kurikulum", isActive: true });
  const kepsekUser = await db.collection("users").findOne({ role: "kepsek", isActive: true });
  const adminUser = await db.collection("users").findOne({ role: "admin", isActive: true });

  // Temporarily set known password hash for test users and restore at the end
  const originalPasswords = new Map();
  for (const u of [siswaUser, otherSiswaUser, guruUser, otherGuruUser, kurikulumUser, kepsekUser, adminUser]) {
    if (u) originalPasswords.set(String(u._id), u.password);
  }

  const testPwd = "TestPass123!";
  const testPwdHash = await bcrypt.hash(testPwd, 10);

  for (const u of [siswaUser, otherSiswaUser, guruUser, otherGuruUser, kurikulumUser, kepsekUser, adminUser]) {
    if (u) {
      await db.collection("users").updateOne({ _id: u._id }, { $set: { password: testPwdHash } });
    }
  }

  try {
    const siswaAuth = await loginAs(siswaUser.email, testPwd, "siswa");
    const guruAuth = await loginAs(guruUser.email, testPwd, "guru");
    const otherGuruAuth = await loginAs(otherGuruUser.email, testPwd, "guru");
    const kurikulumAuth = await loginAs(kurikulumUser.email, testPwd, "kurikulum");
    const kepsekAuth = await loginAs(kepsekUser.email, testPwd, "kepsek");
    const adminAuth = await loginAs(adminUser.email, testPwd, "admin");

    assert(siswaAuth.status === 200 && Boolean(siswaAuth.cookie), "Logged in as Siswa");
    assert(guruAuth.status === 200 && Boolean(guruAuth.cookie), "Logged in as Guru");
    assert(otherGuruAuth.status === 200 && Boolean(otherGuruAuth.cookie), "Logged in as Secondary Guru");
    assert(kurikulumAuth.status === 200 && Boolean(kurikulumAuth.cookie), "Logged in as Kurikulum");
    assert(kepsekAuth.status === 200 && Boolean(kepsekAuth.cookie), "Logged in as Kepsek");
    assert(adminAuth.status === 200 && Boolean(adminAuth.cookie), "Logged in as Admin");

    // -------------------------------------------------------------------------
    // 3. Task 1 Verification — Siswa Dashboard API
    // -------------------------------------------------------------------------
    console.log("\n[3] Verifying Task 1 — Siswa Dashboard API...");
    const dashRes = await apiRequest("/api/siswa/dashboard", "GET", siswaAuth.cookie);
    assert(dashRes.status === 200 && dashRes.json?.success === true, "GET /api/siswa/dashboard returns 200");
    const dashData = dashRes.json?.data;
    assert(
      dashData?.student?.name === siswaUser.name,
      "Dashboard returns authenticated student's real full name"
    );
    assert(
      typeof dashData?.stats?.totalClasses === "number" &&
        typeof dashData?.stats?.tenggatTugas === "number" &&
        typeof dashData?.stats?.tenggatKuis === "number",
      "Dashboard stats provide numeric totalClasses (Mata Pelajaran), tenggatTugas (Tenggat Tugas), and tenggatKuis (Tenggat Kuis)"
    );
    const expectedPendingTugas = (dashData?.assignments || []).filter((t) => !t.isSubmitted).length;
    const expectedPendingKuis = (dashData?.quizzes || []).filter((q) => !q.isCompleted).length;
    assert(
      dashData?.stats?.tenggatTugas === expectedPendingTugas,
      `Tenggat Tugas count (${dashData?.stats?.tenggatTugas}) matches uncompleted ordinary assignments (${expectedPendingTugas})`
    );
    assert(
      dashData?.stats?.tenggatKuis === expectedPendingKuis,
      `Tenggat Kuis count (${dashData?.stats?.tenggatKuis}) matches uncompleted quizzes (${expectedPendingKuis})`
    );
    assert(
      dashData?.notifications === undefined && dashData?.personalEvents === undefined,
      "Unnecessary dashboard-only Notification and StudentEvent payloads removed from /api/siswa/dashboard"
    );

    // -------------------------------------------------------------------------
    // 4. Task 2 Verification — Guru Quiz Navigation & Access Control
    // -------------------------------------------------------------------------
    console.log("\n[4] Verifying Task 2 — Guru Quiz Navigation & Ownership...");
    const guruClass = await db.collection("courseclasses").findOne({
      teacherId: guruUser._id,
      isActive: true,
    });
    assert(Boolean(guruClass), "Found active CourseClass for Guru");

    // Create a new quiz via POST /api/guru/quizzes (just like Guru Quiz Builder)
    const createQuizRes = await apiRequest("/api/guru/quizzes", "POST", guruAuth.cookie, {
      title: "Kuis Navigasi Guru CBT Test",
      description: "Uji navigasi detail kuis guru",
      courseClassId: String(guruClass._id),
      durationSeconds: 90,
      questions: [
        {
          id: "q-nav-1",
          type: "pilihan_ganda",
          question: "Manakah protokol HTTP yang aman?",
          options: ["FTP", "HTTPS", "Telnet", "SMTP"],
          correctAnswer: 1,
          points: 5,
          pointsFalse: 0,
        },
        {
          id: "q-nav-2",
          type: "pilihan_ganda",
          question: "Berapa bit dalam 1 byte?",
          options: ["4", "8", "16", "32"],
          correctAnswer: 1,
          points: 5,
          pointsFalse: 0,
        },
      ],
    });
    assert(
      createQuizRes.status === 201 && createQuizRes.json?.success === true,
      "Created new quiz via POST /api/guru/quizzes"
    );
    const createdQuizId = String(createQuizRes.json?.data?._id);

    try {
      // 4.1 Verify class stream post has refId = createdQuizId
      const postsRes = await apiRequest(
        `/api/guru/classes/${guruClass._id}/posts`,
        "GET",
        guruAuth.cookie
      );
      const matchingPost = (postsRes.json?.data || []).find(
        (p) => String(p.refId) === createdQuizId
      );
      assert(
        Boolean(matchingPost) && matchingPost.type === "quiz",
        "Quiz post appears in Guru class stream with refId pointing to quiz ID"
      );

      // 4.2 Opening /api/guru/assignments/[createdQuizId] as owner Guru succeeds and returns quiz questions
      const quizDetailRes = await apiRequest(
        `/api/guru/assignments/${createdQuizId}`,
        "GET",
        guruAuth.cookie
      );
      assert(
        quizDetailRes.status === 200 &&
          quizDetailRes.json?.success === true &&
          quizDetailRes.json?.data?.type === "kuis" &&
          quizDetailRes.json?.data?.quizId?.questions?.length === 2 &&
          quizDetailRes.json?.data?.maxRawScore === 10 &&
          quizDetailRes.json?.data?.maxScore === 100,
        "GET /api/guru/assignments/[quizId] loads standalone quiz detail with questions, raw points (10), and normalized scale (100)"
      );

      // 4.3 Direct GET /api/guru/quizzes/[createdQuizId] also succeeds for owner Guru
      const directQuizRes = await apiRequest(
        `/api/guru/quizzes/${createdQuizId}`,
        "GET",
        guruAuth.cookie
      );
      assert(
        directQuizRes.status === 200 && directQuizRes.json?.data?.title === "Kuis Navigasi Guru CBT Test",
        "GET /api/guru/quizzes/[quizId] loads quiz data for owner Guru"
      );

      // 4.4 Unauthorized Guru attempting to access another Guru's quiz receives 403
      const unauthAssignDetail = await apiRequest(
        `/api/guru/assignments/${createdQuizId}`,
        "GET",
        otherGuruAuth.cookie
      );
      assert(
        unauthAssignDetail.status === 403,
        "Unauthorized Guru blocked with 403 on GET /api/guru/assignments/[quizId]"
      );

      const unauthQuizDetail = await apiRequest(
        `/api/guru/quizzes/${createdQuizId}`,
        "GET",
        otherGuruAuth.cookie
      );
      assert(
        unauthQuizDetail.status === 403,
        "Unauthorized Guru blocked with 403 on GET /api/guru/quizzes/[quizId]"
      );

      // 4.5 Invalid / non-existent quiz ID returns 404
      const invalidIdRes1 = await apiRequest(
        "/api/guru/assignments/invalid-object-id",
        "GET",
        guruAuth.cookie
      );
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const invalidIdRes2 = await apiRequest(
        `/api/guru/assignments/${nonExistentId}`,
        "GET",
        guruAuth.cookie
      );
      assert(
        invalidIdRes1.status === 404 && invalidIdRes2.status === 404,
        "Invalid or non-existent quiz/assignment ID returns 404"
      );

      // 4.6 Submissions endpoint works for standalone quiz ID
      const quizSubRes = await apiRequest(
        `/api/guru/assignments/${createdQuizId}/submissions`,
        "GET",
        guruAuth.cookie
      );
      assert(
        quizSubRes.status === 200 && quizSubRes.json?.success === true,
        "GET /api/guru/assignments/[quizId]/submissions loads student submissions list for standalone quiz"
      );

      // 4.7 Comments endpoint works for standalone quiz ID
      const quizCommentRes = await apiRequest(
        `/api/guru/assignments/${createdQuizId}/comments`,
        "POST",
        guruAuth.cookie,
        { message: "Silakan kerjakan kuis tepat waktu." }
      );
      assert(
        quizCommentRes.status === 201 && quizCommentRes.json?.success === true,
        "POST /api/guru/assignments/[quizId]/comments works on standalone quiz"
      );
    } finally {
      // Cleanup test quiz & class post
      await db.collection("quizzes").deleteOne({ _id: new mongoose.Types.ObjectId(createdQuizId) });
      await db.collection("classposts").deleteMany({ refId: new mongoose.Types.ObjectId(createdQuizId) });
    }

    // -------------------------------------------------------------------------
    // 5. Task 4 Verification — Role-Aware Profile & Security Across All 5 Roles
    // -------------------------------------------------------------------------
    console.log("\n[5] Verifying Task 4 — Role-Aware Profile & Backend Security...");

    // 5.1 GET profile works for every role and never exposes password hash
    for (const [roleName, auth] of [
      ["siswa", siswaAuth],
      ["guru", guruAuth],
      ["kurikulum", kurikulumAuth],
      ["kepsek", kepsekAuth],
      ["admin", adminAuth],
    ]) {
      const profRes = await apiRequest(`/api/${roleName}/profile`, "GET", auth.cookie);
      assert(
        profRes.status === 200 &&
          profRes.json?.success === true &&
          profRes.json?.data?.user?.role === roleName &&
          profRes.json?.data?.user?.password === undefined,
        `GET /api/${roleName}/profile returns 200 with real '${roleName}' user data and no password hash`
      );
    }

    // 5.2 Cross-user ID tampering on GET and PATCH is rejected with 403
    const tamperGetRes = await apiRequest(
      `/api/siswa/profile?userId=${otherSiswaUser._id}`,
      "GET",
      siswaAuth.cookie
    );
    assert(
      tamperGetRes.status === 403,
      "GET /api/siswa/profile?userId=<otherUser> rejected with 403"
    );

    const tamperPatchRes = await apiRequest(
      "/api/siswa/profile",
      "PATCH",
      siswaAuth.cookie,
      { _id: String(otherSiswaUser._id), email: "hacked@learnix.sch.id" }
    );
    assert(
      tamperPatchRes.status === 403,
      "PATCH /api/siswa/profile with another user's _id rejected with 403"
    );

    // 5.3 Kurikulum and Kepsek profile mutations are strictly rejected with 403
    for (const [roRole, roAuth] of [
      ["kurikulum", kurikulumAuth],
      ["kepsek", kepsekAuth],
    ]) {
      for (const method of ["PATCH", "PUT", "POST", "DELETE"]) {
        const mutRes = await apiRequest(`/api/${roRole}/profile`, method, roAuth.cookie, {
          email: `changed.${roRole}@learnix.sch.id`,
        });
        assert(
          mutRes.status === 403,
          `${roRole.toUpperCase()} ${method} /api/${roRole}/profile rejected with 403`
        );
      }
      // Also test via centralized /api/profile
      const centralMutRes = await apiRequest("/api/profile", "PATCH", roAuth.cookie, {
        email: `changed.${roRole}@learnix.sch.id`,
      });
      assert(
        centralMutRes.status === 403,
        `${roRole.toUpperCase()} PATCH /api/profile rejected with 403`
      );
    }

    // 5.4 Siswa & Guru cannot modify personal biodata or role fields
    for (const [roleName, auth] of [
      ["siswa", siswaAuth],
      ["guru", guruAuth],
    ]) {
      for (const forbiddenPayload of [
        { name: "Hacker Name" },
        { birthPlace: "Mars" },
        { birthDate: "2000-01-01" },
        { gender: "L" },
        { role: "admin" },
        { isActive: false },
        { classId: String(guruClass._id) },
        { subjects: ["Hacking"] },
      ]) {
        const forbiddenKey = Object.keys(forbiddenPayload)[0];
        const res = await apiRequest(
          `/api/${roleName}/profile`,
          "PATCH",
          auth.cookie,
          forbiddenPayload
        );
        assert(
          res.status === 403,
          `${roleName.toUpperCase()} attempt to modify read-only field '${forbiddenKey}' rejected with 403`
        );
      }
    }

    // 5.5 Siswa can update own email, identification number (nisn), and password, with uniqueness & validation checks
    const origSiswaEmail = siswaUser.email;
    const origSiswaNisn = siswaUser.nisn;

    try {
      // Duplicate email rejection
      const dupEmailRes = await apiRequest("/api/siswa/profile", "PATCH", siswaAuth.cookie, {
        email: otherSiswaUser.email,
      });
      assert(
        dupEmailRes.status === 400,
        "Siswa duplicate email update rejected with 400"
      );

      // Duplicate NISN rejection
      if (otherSiswaUser.nisn) {
        const dupNisnRes = await apiRequest("/api/siswa/profile", "PATCH", siswaAuth.cookie, {
          nisn: otherSiswaUser.nisn,
        });
        assert(
          dupNisnRes.status === 400,
          "Siswa duplicate NISN update rejected with 400"
        );
      }

      // Valid email + NISN update
      const tempEmail = `siswa.updated.${Date.now()}@learnix.sch.id`;
      const tempNisn = `998877${String(Date.now()).slice(-4)}`;
      const validSiswaUpdate = await apiRequest("/api/siswa/profile", "PATCH", siswaAuth.cookie, {
        email: tempEmail,
        nisn: tempNisn,
      });
      assert(
        validSiswaUpdate.status === 200 &&
          validSiswaUpdate.json?.data?.email === tempEmail &&
          validSiswaUpdate.json?.data?.nisn === tempNisn,
        "Siswa can update own email and NISN; persisted in MongoDB"
      );

      // Wrong current password rejected
      const wrongPwdRes = await apiRequest("/api/siswa/profile", "PATCH", siswaAuth.cookie, {
        currentPassword: "WrongPassword999!",
        newPassword: "NewStudentPassword123!",
        confirmPassword: "NewStudentPassword123!",
      });
      assert(
        wrongPwdRes.status === 400,
        "Siswa password update with wrong currentPassword rejected with 400"
      );

      // Mismatched confirmPassword rejected
      const mismatchPwdRes = await apiRequest("/api/siswa/profile", "PATCH", siswaAuth.cookie, {
        currentPassword: testPwd,
        newPassword: "NewStudentPassword123!",
        confirmPassword: "DifferentPassword123!",
      });
      assert(
        mismatchPwdRes.status === 400,
        "Siswa password update with mismatched confirmPassword rejected with 400"
      );

      // Valid password update
      const newStudentPwd = "UpdatedSiswaPass456!";
      const validPwdRes = await apiRequest("/api/siswa/profile", "PATCH", siswaAuth.cookie, {
        currentPassword: testPwd,
        newPassword: newStudentPwd,
        confirmPassword: newStudentPwd,
      });
      assert(
        validPwdRes.status === 200 && validPwdRes.json?.success === true,
        "Siswa can update own password with valid currentPassword"
      );

      // Verify bcrypt hash in DB
      const dbSiswaAfter = await db.collection("users").findOne({ _id: siswaUser._id });
      const passwordMatchesNew = await bcrypt.compare(newStudentPwd, dbSiswaAfter.password);
      assert(
        passwordMatchesNew && dbSiswaAfter.password !== newStudentPwd,
        "Siswa new password is stored as a valid bcrypt hash in MongoDB"
      );
    } finally {
      await db.collection("users").updateOne(
        { _id: siswaUser._id },
        { $set: { email: origSiswaEmail, nisn: origSiswaNisn } }
      );
    }

    // 5.6 Guru can update own email, identification number (nip), and password, with uniqueness & validation checks
    const origGuruEmail = guruUser.email;
    const origGuruNip = guruUser.nip;

    try {
      // Duplicate email rejection
      const dupGuruEmailRes = await apiRequest("/api/guru/profile", "PATCH", guruAuth.cookie, {
        email: otherGuruUser.email,
      });
      assert(
        dupGuruEmailRes.status === 400,
        "Guru duplicate email update rejected with 400"
      );

      // Duplicate NIP rejection
      if (otherGuruUser.nip) {
        const dupGuruNipRes = await apiRequest("/api/guru/profile", "PATCH", guruAuth.cookie, {
          nip: otherGuruUser.nip,
        });
        assert(
          dupGuruNipRes.status === 400,
          "Guru duplicate NIP update rejected with 400"
        );
      }

      // Valid Guru email + NIP update
      const tempGuruEmail = `guru.updated.${Date.now()}@learnix.sch.id`;
      const tempGuruNip = `19850101${String(Date.now()).slice(-6)}`;
      const validGuruUpdate = await apiRequest("/api/guru/profile", "PATCH", guruAuth.cookie, {
        email: tempGuruEmail,
        nip: tempGuruNip,
      });
      assert(
        validGuruUpdate.status === 200 &&
          validGuruUpdate.json?.data?.email === tempGuruEmail &&
          validGuruUpdate.json?.data?.nip === tempGuruNip,
        "Guru can update own email and NIP; persisted in MongoDB"
      );

      // Valid Guru password update
      const newGuruPwd = "UpdatedGuruPass789!";
      const validGuruPwdRes = await apiRequest("/api/guru/profile", "PATCH", guruAuth.cookie, {
        currentPassword: testPwd,
        newPassword: newGuruPwd,
        confirmPassword: newGuruPwd,
      });
      assert(
        validGuruPwdRes.status === 200 && validGuruPwdRes.json?.success === true,
        "Guru can update own password with valid currentPassword"
      );
    } finally {
      await db.collection("users").updateOne(
        { _id: guruUser._id },
        { $set: { email: origGuruEmail, nip: origGuruNip } }
      );
    }
  } finally {
    // Restore original password hashes for all users
    for (const [idStr, origHash] of originalPasswords.entries()) {
      await db
        .collection("users")
        .updateOne({ _id: new mongoose.Types.ObjectId(idStr) }, { $set: { password: origHash } });
    }
    await mongoose.disconnect();
  }

  console.log(`\n=== SUMMARY: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
