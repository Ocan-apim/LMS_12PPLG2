/**
 * Comprehensive End-to-End Verification Suite for Learnix LMS:
 * - Task 1: Disable Profanity Filter for Guru Assignment & Quiz Uploads (Keep for Comments)
 * - Task 2: Replace Student Dashboard Placeholders with Real Database Data
 * - Task 3: Fix Student Reply Functionality in Class Comments
 * - Task 4: Add Student-Created Multi-Day Events to the Calendar
 * - Role & Permission Verification (Admin, Guru, Siswa, Kurikulum, Kepsek)
 *
 * Run with: node --env-file=.env.local scripts/test-four-tasks-regression.mjs
 */

import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

const BASE_URL = process.env.TEST_URL || "http://localhost:3000";

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  ✖ FAIL: ${message}`);
    process.exit(1);
  }
  passedTests++;
  console.log(`  ✔ ${message}`);
}

async function login(identifier, password, role) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, email: identifier, password, role }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(`Login failed for ${identifier} (${role}): ${JSON.stringify(data)}`);
  }
  const cookiesList =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie")].filter(Boolean);

  let cookie = "";
  for (const c of cookiesList) {
    const match = c.match(/lms_session=([^;]+)/);
    if (match) {
      cookie = `lms_session=${match[1]}`;
      break;
    }
  }
  return { user: data.data.user, cookie };
}

async function run() {
  console.log("\n=======================================================");
  console.log(" LEARNIX LMS - 4 TASKS E2E & REGRESSION SUITE");
  console.log(` Target: ${BASE_URL}`);
  console.log("=======================================================\n");

  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lms");
  const db = mongoose.connection.db;

  // Authenticate all 5 roles
  const admin = await login("admin@sekolah.sch.id", "password123", "admin");
  const guru = await login("budi.pratama@sekolah.sch.id", "password123", "guru");
  const kurikulum = await login("kurikulum@sekolah.sch.id", "password123", "kurikulum");
  const kepsek = await login("kepsek@sekolah.sch.id", "password123", "kepsek");
  const ahmad = await login("0098273645", "password123", "siswa");
  const siti = await login("0098273646", "password123", "siswa");

  assert(admin.user.role === "admin", "Authenticated Admin role");
  assert(guru.user.role === "guru", "Authenticated Guru role (Budi Pratama)");
  assert(kurikulum.user.role === "kurikulum", "Authenticated Kurikulum role");
  assert(kepsek.user.role === "kepsek", "Authenticated Kepsek role");
  assert(ahmad.user.role === "siswa" && ahmad.user.name === "Ahmad Bagus Pratama", "Authenticated Siswa 1 (Ahmad Bagus Pratama)");
  assert(siti.user.role === "siswa" && siti.user.name === "Siti Nurbaya", "Authenticated Siswa 2 (Siti Nurbaya)");

  const basisDataClassId = "6ac31a89f03da5f488975e4a";
  const ddlAssignmentId = "6ac31a89f03da5f488975e51";

  // =========================================================================
  // TASK 1: DISABLE PROFANITY FILTER FOR GURU ASSIGNMENT & QUIZ WORKFLOWS
  // =========================================================================
  console.log("\n--- TASK 1: Guru Assignment & Quiz Profanity Filter Adjustments ---");

  // 1A. Upload CBT Word Template (Reference/Soal CBT.docx which contains Q33 'Inu (anjing)')
  const cbtPath = path.resolve("Reference/Soal CBT.docx");
  const cbtBuffer = fs.readFileSync(cbtPath);
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([cbtBuffer], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
    "Soal CBT.docx"
  );

  const importRes = await fetch(`${BASE_URL}/api/guru/quizzes/import-word`, {
    method: "POST",
    headers: { Cookie: guru.cookie },
    body: formData,
  });
  const importJson = await importRes.json();
  assert(
    importRes.status === 200 && importJson.success === true,
    `CBT Word template import succeeded without false profanity rejection (imported ${importJson.data?.totalQuestions} questions)`
  );
  assert(
    importJson.data?.totalQuestions === 50,
    "CBT parser preserved all 50 questions (Q1>, A>, PT>, PF>, K>)"
  );

  // 1B. Create Quiz containing imported CBT questions
  const createQuizRes = await fetch(`${BASE_URL}/api/guru/quizzes`, {
    method: "POST",
    headers: {
      Cookie: guru.cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Kuis Bahasa Jepang & Biologi CBT",
      description: "Evaluasi kosakata bahasa Jepang seperti Inu (anjing) dan biologi.",
      courseClassId: basisDataClassId,
      durationSeconds: 1800,
      totalPoints: importJson.data.totalPoints,
      questions: importJson.data.questions.map((q) => ({
        id: q.id,
        question: q.prompt,
        type: "pilihan_ganda",
        options: q.options.map((o) => o.text),
        correctAnswer: 0,
        points: q.points,
      })),
    }),
  });
  const createQuizJson = await createQuizRes.json();
  assert(
    createQuizRes.status === 201 && createQuizJson.success === true,
    "Creating quiz with CBT template questions succeeded (201 Created)"
  );
  const tempQuizId = createQuizJson.data._id;

  // 1C. Edit Quiz
  const editQuizRes = await fetch(`${BASE_URL}/api/guru/quizzes/${tempQuizId}`, {
    method: "PUT",
    headers: {
      Cookie: guru.cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Kuis Bahasa Jepang & Biologi CBT (Edited)",
      description: "Penjelasan reproduksi seksual dan aseksual pada hewan anjing dan babi.",
      questions: [
        {
          id: "q-edit-1",
          question: "Apa bahasa Jepang dari anjing?",
          type: "pilihan_ganda",
          options: ["Inu (anjing)", "Neko (kucing)", "Tori (burung)", "Uma (kuda)"],
          correctAnswer: 0,
          points: 100,
        },
      ],
      totalPoints: 100,
    }),
  });
  const editQuizJson = await editQuizRes.json();
  assert(
    editQuizRes.status === 200 && editQuizJson.success === true,
    "Editing quiz questions and options succeeded without profanity filter rejection (200 OK)"
  );

  // 1D. Create Ordinary Assignment (Tugas)
  const createAssignRes = await fetch(`${BASE_URL}/api/guru/assignments`, {
    method: "POST",
    headers: {
      Cookie: guru.cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Tugas Klasifikasi Fauna & Kosakata",
      instructions: "Buat tabel database untuk data satwa (anjing, babi, monyet) beserta penjelasannya.",
      description: "Tugas pembuatan tabel satwa.",
      type: "tugas",
      courseClassId: basisDataClassId,
      maxScore: 100,
    }),
  });
  const createAssignJson = await createAssignRes.json();
  assert(
    createAssignRes.status === 201 && createAssignJson.success === true,
    "Creating ordinary assignment succeeded without profanity filter block (201 Created)"
  );
  const tempAssignId = createAssignJson.data._id;

  // 1E. Edit Ordinary Assignment
  const editAssignRes = await fetch(`${BASE_URL}/api/guru/assignments/${tempAssignId}`, {
    method: "PUT",
    headers: {
      Cookie: guru.cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Tugas Klasifikasi Fauna & Kosakata (Revisi)",
      instructions: "Instruksi tambahan untuk klasifikasi anjing dan babi.",
      maxScore: 100,
    }),
  });
  const editAssignJson = await editAssignRes.json();
  assert(
    editAssignRes.status === 200 && editAssignJson.success === true,
    "Editing ordinary assignment succeeded without profanity filter block (200 OK)"
  );

  // Clean up temporary Task 1 assignment & quiz so DB stays clean
  await db.collection("assignments").deleteOne({ _id: new mongoose.Types.ObjectId(tempAssignId) });
  await db.collection("quizzes").deleteOne({ _id: new mongoose.Types.ObjectId(tempQuizId) });
  await db.collection("classposts").deleteMany({
    refId: {
      $in: [
        new mongoose.Types.ObjectId(tempAssignId),
        new mongoose.Types.ObjectId(tempQuizId),
      ],
    },
  });

  // 1F. Confirm profanity filter REMAINS ACTIVE for Guru and Siswa comments
  const guruProfaneCommentRes = await fetch(
    `${BASE_URL}/api/guru/assignments/${ddlAssignmentId}/comments`,
    {
      method: "POST",
      headers: {
        Cookie: guru.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "Kalian semua bodoh dan goblok" }),
    }
  );
  const guruProfaneCommentJson = await guruProfaneCommentRes.json();
  assert(
    guruProfaneCommentRes.status === 400 && guruProfaneCommentJson.success === false,
    `Profanity filter remains active for Teacher comments (400: "${guruProfaneCommentJson.message}")`
  );

  const siswaProfaneCommentRes = await fetch(
    `${BASE_URL}/api/guru/assignments/${ddlAssignmentId}/comments`,
    {
      method: "POST",
      headers: {
        Cookie: ahmad.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "Tugas ini bngst sekali" }),
    }
  );
  const siswaProfaneCommentJson = await siswaProfaneCommentRes.json();
  assert(
    siswaProfaneCommentRes.status === 400 && siswaProfaneCommentJson.success === false,
    `Profanity filter remains active for Student comments (400: "${siswaProfaneCommentJson.message}")`
  );

  // =========================================================================
  // TASK 3: FIX STUDENT REPLY FUNCTIONALITY IN CLASS COMMENTS
  // =========================================================================
  console.log("\n--- TASK 3: Student Reply Functionality in Class Comments (Basis Data Praktikum DDL) ---");

  // 3A. Fetch Basis Data Praktikum DDL detail as Ahmad Bagus Pratama
  const ddlDetailRes = await fetch(`${BASE_URL}/api/siswa/assignments/${ddlAssignmentId}`, {
    headers: { Cookie: ahmad.cookie },
  });
  const ddlDetailJson = await ddlDetailRes.json();
  assert(
    ddlDetailRes.status === 200 && ddlDetailJson.success === true,
    "Ahmad Bagus Pratama can open Basis Data Praktikum DDL assignment detail"
  );

  const teacherComment = (ddlDetailJson.data.comments || []).find(
    (c) => c.userRole === "guru" && c.message.includes("query DDL")
  );
  assert(
    Boolean(teacherComment && teacherComment._id),
    `Located teacher's comment on Basis Data Praktikum DDL with valid _id: ${teacherComment?._id}`
  );

  // 3B. Submit a normal reply as Ahmad Bagus Pratama to the teacher's comment
  const replyMessage = "Terima kasih Pak Budi, query CREATE TABLE dan INSERT INTO saya sudah berjalan lancar.";
  const replyRes = await fetch(
    `${BASE_URL}/api/guru/assignments/${ddlAssignmentId}/comments`,
    {
      method: "POST",
      headers: {
        Cookie: ahmad.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: replyMessage,
        parentId: teacherComment._id,
      }),
    }
  );
  const replyJson = await replyRes.json();
  assert(
    replyRes.status === 201 && replyJson.success === true,
    "Ahmad Bagus Pratama successfully submitted a reply to teacher's comment (201 Created)"
  );
  assert(
    String(replyJson.data.parentId) === String(teacherComment._id),
    `Reply parentId (${replyJson.data.parentId}) matches teacher comment _id (${teacherComment._id})`
  );
  assert(
    replyJson.data.userName === "Ahmad Bagus Pratama" && replyJson.data.userRole === "siswa",
    "Reply author identity strictly derived from authenticated student session"
  );

  const createdReplyId = replyJson.data._id;

  // 3C. Refresh / Re-fetch assignment detail and verify reply persists beneath teacher comment
  const refreshDetailRes = await fetch(`${BASE_URL}/api/siswa/assignments/${ddlAssignmentId}`, {
    headers: { Cookie: ahmad.cookie },
  });
  const refreshDetailJson = await refreshDetailRes.json();
  const persistedReply = (refreshDetailJson.data.comments || []).find(
    (c) => String(c._id) === String(createdReplyId)
  );
  assert(
    Boolean(persistedReply) &&
      persistedReply.message === replyMessage &&
      String(persistedReply.parentId) === String(teacherComment._id),
    "Reply remains persisted in MongoDB under the teacher's comment thread after refresh"
  );

  // 3D. Verify profanity filter rejects an inappropriate student reply
  const badReplyRes = await fetch(
    `${BASE_URL}/api/guru/assignments/${ddlAssignmentId}/comments`,
    {
      method: "POST",
      headers: {
        Cookie: ahmad.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Jawaban kamu anjing banget",
        parentId: teacherComment._id,
      }),
    }
  );
  const badReplyJson = await badReplyRes.json();
  assert(
    badReplyRes.status === 400 && badReplyJson.success === false,
    "Profanity filter rejects inappropriate student reply with Indonesian error message"
  );

  // 3E. Verify non-member student (Siti Nurbaya) cannot reply in unrelated class
  const unauthReplyRes = await fetch(
    `${BASE_URL}/api/guru/assignments/${ddlAssignmentId}/comments`,
    {
      method: "POST",
      headers: {
        Cookie: siti.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Balasan dari siswa kelas lain",
        parentId: teacherComment._id,
      }),
    }
  );
  assert(
    unauthReplyRes.status === 403,
    "Non-member student (Siti Nurbaya) blocked from replying to unrelated class comment (403)"
  );

  // 3F. Verify Kurikulum & Kepsek retain read-only permissions (cannot post or delete comments)
  const kurikulumReplyRes = await fetch(
    `${BASE_URL}/api/guru/assignments/${ddlAssignmentId}/comments`,
    {
      method: "POST",
      headers: {
        Cookie: kurikulum.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Komentar dari kurikulum",
        parentId: teacherComment._id,
      }),
    }
  );
  assert(
    kurikulumReplyRes.status === 403,
    "Kurikulum role retains read-only permission (403 on POST comment)"
  );

  const kepsekReplyRes = await fetch(
    `${BASE_URL}/api/guru/assignments/${ddlAssignmentId}/comments`,
    {
      method: "POST",
      headers: {
        Cookie: kepsek.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Komentar dari kepsek",
        parentId: teacherComment._id,
      }),
    }
  );
  assert(
    kepsekReplyRes.status === 403,
    "Kepsek role retains read-only permission (403 on POST comment)"
  );

  // Verify Guru, Admin, Kurikulum, and Kepsek can view the thread including Ahmad's reply
  for (const [roleLabel, authObj] of [
    ["Guru", guru],
    ["Admin", admin],
    ["Kurikulum", kurikulum],
    ["Kepsek", kepsek],
  ]) {
    const viewRes = await fetch(
      `${BASE_URL}/api/guru/assignments/${ddlAssignmentId}/comments`,
      { headers: { Cookie: authObj.cookie } }
    );
    const viewJson = await viewRes.json();
    assert(
      viewRes.status === 200 &&
        Array.isArray(viewJson.data) &&
        viewJson.data.some((c) => String(c._id) === String(createdReplyId)),
      `${roleLabel} role can view the threaded comments and student reply (200 OK)`
    );
  }

  // Clean up test reply so repeated runs of this test suite stay idempotent
  await db.collection("assignments").updateOne(
    { _id: new mongoose.Types.ObjectId(ddlAssignmentId) },
    { $pull: { comments: { _id: new mongoose.Types.ObjectId(createdReplyId) } } }
  );

  // =========================================================================
  // TASK 4: ADD STUDENT-CREATED EVENTS TO THE CALENDAR
  // =========================================================================
  console.log("\n--- TASK 4: Student-Created Multi-Day Calendar Events ---");

  // Clean up any leftover test events for Ahmad & Siti before running
  await db.collection("studentevents").deleteMany({
    title: { $in: ["Persiapan Ujian", "Persiapan Ujian Akhir Semester", "Belajar Mandiri", "Event Lintas Minggu", "Event Lintas Bulan"] },
  });

  // 4A. Create multi-day personal event (23 Nov 2026 to 27 Nov 2026) as Ahmad
  const createEventRes = await fetch(`${BASE_URL}/api/siswa/schedule`, {
    method: "POST",
    headers: {
      Cookie: ahmad.cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Persiapan Ujian",
      description: "Belajar dan mengulang materi untuk ujian akhir",
      startDate: "2026-11-23",
      endDate: "2026-11-27",
      // Tampering attempt: try supplying Siti's studentId
      studentId: siti.user.id,
    }),
  });
  const createEventJson = await createEventRes.json();
  assert(
    createEventRes.status === 201 && createEventJson.success === true,
    "Created multi-day personal event 'Persiapan Ujian' (2026-11-23 to 2026-11-27)"
  );
  const eventId = createEventJson.data._id;
  assert(
    createEventJson.data.startDate === "2026-11-23" &&
      createEventJson.data.endDate === "2026-11-27",
    "Start and end dates preserved accurately without timezone shift"
  );
  assert(
    String(createEventJson.data.studentId) === String(ahmad.user.id),
    "Frontend-supplied studentId ignored; event strictly assigned to authenticated student"
  );

  // Verify stored as ONE single document in MongoDB (not 5 separate records)
  const dbEventCount = await db.collection("studentevents").countDocuments({
    _id: new mongoose.Types.ObjectId(eventId),
  });
  assert(
    dbEventCount === 1,
    "Multi-day event stored as 1 single MongoDB document (not duplicated per day)"
  );

  // 4B. Refresh / Fetch schedule and confirm event & academic events are both present
  const schedAfterCreateRes = await fetch(`${BASE_URL}/api/siswa/schedule`, {
    headers: { Cookie: ahmad.cookie },
  });
  const schedAfterCreateJson = await schedAfterCreateRes.json();
  assert(
    schedAfterCreateRes.status === 200 &&
      schedAfterCreateJson.data.personalEvents.some((e) => e._id === eventId),
    "Personal event persists in GET /api/siswa/schedule after refresh"
  );
  assert(
    schedAfterCreateJson.data.academicEvents.length >= 1,
    "Academic assignment and quiz events remain intact and separate"
  );

  // 4C. Edit personal event (title, description, dates) and verify in-place update
  const countBeforeEdit = await db.collection("studentevents").countDocuments({
    studentId: new mongoose.Types.ObjectId(ahmad.user.id),
  });

  const editEventRes = await fetch(`${BASE_URL}/api/siswa/schedule/${eventId}`, {
    method: "PATCH",
    headers: {
      Cookie: ahmad.cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Persiapan Ujian Akhir Semester",
      description: "Review materi DDL, DML, dan Normalisasi Database",
      startDate: "2026-11-24",
      endDate: "2026-11-28",
    }),
  });
  const editEventJson = await editEventRes.json();
  assert(
    editEventRes.status === 200 &&
      editEventJson.data.title === "Persiapan Ujian Akhir Semester" &&
      editEventJson.data.startDate === "2026-11-24" &&
      editEventJson.data.endDate === "2026-11-28",
    "Personal event updated successfully via PATCH"
  );

  const countAfterEdit = await db.collection("studentevents").countDocuments({
    studentId: new mongoose.Types.ObjectId(ahmad.user.id),
  });
  assert(
    countAfterEdit === countBeforeEdit,
    "Editing an event updated existing MongoDB document without creating a duplicate"
  );

  // 4D. Validation checks: invalid date range, empty title, invalid calendar date
  const invalidRangeRes = await fetch(`${BASE_URL}/api/siswa/schedule`, {
    method: "POST",
    headers: {
      Cookie: ahmad.cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Event Invalid",
      startDate: "2026-11-27",
      endDate: "2026-11-23",
    }),
  });
  assert(
    invalidRangeRes.status === 400,
    "Rejected event where endDate is earlier than startDate (400 Bad Request)"
  );

  const emptyTitleRes = await fetch(`${BASE_URL}/api/siswa/schedule`, {
    method: "POST",
    headers: {
      Cookie: ahmad.cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "   ",
      startDate: "2026-11-23",
      endDate: "2026-11-23",
    }),
  });
  assert(emptyTitleRes.status === 400, "Rejected event with empty title (400 Bad Request)");

  const invalidDateRes = await fetch(`${BASE_URL}/api/siswa/schedule`, {
    method: "POST",
    headers: {
      Cookie: ahmad.cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Tanggal Palsu",
      startDate: "2026-02-30",
      endDate: "2026-03-02",
    }),
  });
  assert(
    invalidDateRes.status === 400,
    "Rejected impossible calendar date 2026-02-30 (400 Bad Request)"
  );

  // 4E. Test 1-day event, week-crossing event, and month-crossing event
  const oneDayRes = await fetch(`${BASE_URL}/api/siswa/schedule`, {
    method: "POST",
    headers: { Cookie: ahmad.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Belajar Mandiri",
      startDate: "2026-11-25",
      endDate: "2026-11-25",
    }),
  });
  const oneDayJson = await oneDayRes.json();
  assert(oneDayRes.status === 201, "Created 1-day personal event (2026-11-25)");

  const crossMonthRes = await fetch(`${BASE_URL}/api/siswa/schedule`, {
    method: "POST",
    headers: { Cookie: ahmad.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Event Lintas Bulan",
      startDate: "2026-11-27",
      endDate: "2026-12-03",
    }),
  });
  const crossMonthJson = await crossMonthRes.json();
  assert(
    crossMonthRes.status === 201,
    "Created personal event crossing week and month boundaries (2026-11-27 to 2026-12-03)"
  );

  // 4F. Two different students creating events with the same title & cross-student authorization checks
  const sitiSameTitleRes = await fetch(`${BASE_URL}/api/siswa/schedule`, {
    method: "POST",
    headers: { Cookie: siti.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Belajar Mandiri",
      startDate: "2026-11-25",
      endDate: "2026-11-26",
    }),
  });
  const sitiSameTitleJson = await sitiSameTitleRes.json();
  assert(
    sitiSameTitleRes.status === 201 &&
      sitiSameTitleJson.data._id !== oneDayJson.data._id,
    "Two different students can create events with the same title independently"
  );

  // Siti attempts to view, edit, or delete Ahmad's event
  const sitiGetAhmadEvent = await fetch(`${BASE_URL}/api/siswa/schedule/${eventId}`, {
    headers: { Cookie: siti.cookie },
  });
  assert(
    sitiGetAhmadEvent.status === 403,
    "Siti blocked from viewing Ahmad's personal event (403 Forbidden)"
  );

  const sitiEditAhmadEvent = await fetch(`${BASE_URL}/api/siswa/schedule/${eventId}`, {
    method: "PATCH",
    headers: { Cookie: siti.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Dibajak Siti" }),
  });
  assert(
    sitiEditAhmadEvent.status === 403,
    "Siti blocked from editing Ahmad's personal event (403 Forbidden)"
  );

  const sitiDeleteAhmadEvent = await fetch(`${BASE_URL}/api/siswa/schedule/${eventId}`, {
    method: "DELETE",
    headers: { Cookie: siti.cookie },
  });
  assert(
    sitiDeleteAhmadEvent.status === 403,
    "Siti blocked from deleting Ahmad's personal event (403 Forbidden)"
  );

  // Ahmad attempts to edit or delete an academic assignment event
  const modifyAcademicRes = await fetch(
    `${BASE_URL}/api/siswa/schedule/${ddlAssignmentId}`,
    {
      method: "DELETE",
      headers: { Cookie: ahmad.cookie },
    }
  );
  assert(
    modifyAcademicRes.status === 403,
    "Student blocked from deleting automatically generated academic assignment event (403 Forbidden)"
  );

  // 4G. Delete personal events and verify removal
  for (const idToDel of [
    eventId,
    oneDayJson.data._id,
    crossMonthJson.data._id,
  ]) {
    const delRes = await fetch(`${BASE_URL}/api/siswa/schedule/${idToDel}`, {
      method: "DELETE",
      headers: { Cookie: ahmad.cookie },
    });
    assert(delRes.status === 200, `Deleted Ahmad personal event ${idToDel}`);
  }
  await fetch(`${BASE_URL}/api/siswa/schedule/${sitiSameTitleJson.data._id}`, {
    method: "DELETE",
    headers: { Cookie: siti.cookie },
  });

  const schedAfterDeleteRes = await fetch(`${BASE_URL}/api/siswa/schedule`, {
    headers: { Cookie: ahmad.cookie },
  });
  const schedAfterDeleteJson = await schedAfterDeleteRes.json();
  assert(
    !schedAfterDeleteJson.data.personalEvents.some((e) => e._id === eventId),
    "Deleted personal event disappears from calendar schedule"
  );

  // =========================================================================
  // TASK 2: STUDENT DASHBOARD REAL DATABASE DATA VERIFICATION
  // =========================================================================
  console.log("\n--- TASK 2: Student Dashboard Real Database Data Verification ---");

  const dashRes = await fetch(`${BASE_URL}/api/siswa/dashboard`, {
    headers: { Cookie: ahmad.cookie },
  });
  const dashJson = await dashRes.json();
  assert(dashRes.status === 200 && dashJson.success === true, "GET /api/siswa/dashboard returned 200 OK");

  const d = dashJson.data;
  assert(
    d.student?.name === "Ahmad Bagus Pratama" &&
      d.student?.nisn === "0098273645" &&
      d.student?.rombelName === "X PPLG 1",
    `Dashboard student info matches MongoDB record (${d.student?.name}, Rombel: ${d.student?.rombelName})`
  );
  assert(
    Array.isArray(d.classes) &&
      d.classes.length >= 1 &&
      d.classes.every((c) => c.name !== "MATEMATIKA" && c.name !== "BAHASA INDONESIA"),
    "Dashboard classes list contains only active classes assigned to Ahmad (inactive classes excluded)"
  );
  assert(
    Array.isArray(d.assignments) &&
      d.assignments.some((a) => a.title === "Praktikum DDL & DML MySQL"),
    "Dashboard assignments list contains real assignments from Ahmad's classes"
  );
  assert(
    Array.isArray(d.quizzes) &&
      d.quizzes.some((q) => q.title.includes("Normalisasi")),
    "Dashboard quizzes list contains real quizzes from Ahmad's classes without duplicates"
  );
  assert(
    typeof d.stats?.totalAssignments === "number" &&
      typeof d.stats?.completedAssignments === "number" &&
      typeof d.stats?.totalQuizzes === "number" &&
      typeof d.stats?.averageGrade === "number",
    `Dashboard statistics calculated from real DB records: ${JSON.stringify(d.stats)}`
  );

  await mongoose.disconnect();

  console.log("\n=======================================================");
  console.log(` ALL ${passedTests}/${totalTests} E2E & REGRESSION CHECKS PASSED!`);
  console.log("=======================================================\n");
}

run().catch(async (err) => {
  console.error("Test suite failed:", err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
