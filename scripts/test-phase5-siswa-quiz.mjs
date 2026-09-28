/**
 * Automated Verification for Phase 5: Siswa Quiz Taking & Submission
 * Run: node --env-file=.env.local scripts/test-phase5-siswa-quiz.mjs
 */

const BASE_URL = process.env.TEST_URL || "http://localhost:3005";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function login(identifier, password, role) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password, role }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(`Login failed for ${identifier}: ${JSON.stringify(data)}`);
  }
  const cookiesList = typeof res.headers.getSetCookie === "function" 
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

async function runTests() {
  console.log("==================================================");
  console.log("STARTING PHASE 5 SISWA QUIZ TAKING & SUBMISSION TESTS");
  console.log(`Target: ${BASE_URL}`);
  console.log("==================================================\n");

  // TEST 1: Unauthenticated Requests
  console.log("TEST GROUP 1: UNAUTHENTICATED REQUESTS");
  const unauthGet = await fetch(`${BASE_URL}/api/siswa/quiz/6ab914600e99eff615f8fc61`);
  assert(unauthGet.status === 401, "GET /api/siswa/quiz/[id] rejects unauthenticated (401)");

  const unauthStart = await fetch(`${BASE_URL}/api/siswa/quiz/6ab914600e99eff615f8fc61/start`, {
    method: "POST",
  });
  assert(unauthStart.status === 401, "POST /api/siswa/quiz/[id]/start rejects unauthenticated (401)");

  const unauthSubmit = await fetch(`${BASE_URL}/api/siswa/quiz/6ab914600e99eff615f8fc61/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers: [] }),
  });
  assert(unauthSubmit.status === 401, "POST /api/siswa/quiz/[id]/submit rejects unauthenticated (401)");

  // TEST 2: Wrong Role Authorization (Guru blocked from Siswa quiz endpoints)
  console.log("\nTEST GROUP 2: ROLE AUTHORIZATION (GURU BLOCKED FROM SISWA QUIZ ENDPOINTS)");
  const guru = await login("budi.pratama@sekolah.sch.id", "password123", "guru");
  assert(guru.user.role === "guru", `Authenticated as Guru: ${guru.user.name}`);

  const guruGet = await fetch(`${BASE_URL}/api/siswa/quiz/6ab914600e99eff615f8fc61`, {
    headers: { Cookie: guru.cookie },
  });
  assert(guruGet.status === 403, "Guru blocked from GET /api/siswa/quiz/[id] (403 Forbidden)");

  const guruStart = await fetch(`${BASE_URL}/api/siswa/quiz/6ab914600e99eff615f8fc61/start`, {
    method: "POST",
    headers: { Cookie: guru.cookie },
  });
  assert(guruStart.status === 403, "Guru blocked from POST /api/siswa/quiz/[id]/start (403 Forbidden)");

  const guruSubmit = await fetch(`${BASE_URL}/api/siswa/quiz/6ab914600e99eff615f8fc61/submit`, {
    method: "POST",
    headers: { Cookie: guru.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ answers: [] }),
  });
  assert(guruSubmit.status === 403, "Guru blocked from POST /api/siswa/quiz/[id]/submit (403 Forbidden)");

  // TEST 3: Find Quiz ID from Siswa 1's assignments
  console.log("\nTEST GROUP 3: LOCATING QUIZ FOR ENROLLED SISWA 1");
  const siswa1 = await login("0098273645", "password123", "siswa");
  assert(siswa1.user.role === "siswa", `Authenticated as Siswa 1: ${siswa1.user.name}`);

  const assignRes = await fetch(`${BASE_URL}/api/siswa/assignments`, {
    headers: { Cookie: siswa1.cookie },
  });
  const assignData = await assignRes.json();
  assert(assignRes.status === 200, "GET /api/siswa/assignments returned 200 OK");
  
  const quizAssignment = assignData.data.assignments.find(
    (a) => a.type === "kuis" || a.title.toLowerCase().includes("kuis")
  );
  assert(quizAssignment != null, "Found quiz assignment in student's class");
  const quizTargetId = quizAssignment._id;
  console.log(`Target Quiz Assignment: ${quizAssignment.title} (ID: ${quizTargetId})`);

  // TEST 4: Quiz Access & Critical Security: NO correctAnswer Leak
  console.log("\nTEST GROUP 4: QUIZ ACCESS & ZERO CORRECT_ANSWER LEAK CHECK");
  const quizRes = await fetch(`${BASE_URL}/api/siswa/quiz/${quizTargetId}`, {
    headers: { Cookie: siswa1.cookie },
  });
  const rawQuizText = await quizRes.text();
  const quizJson = JSON.parse(rawQuizText);

  assert(quizRes.status === 200, "GET /api/siswa/quiz/[id] returned 200 OK");
  assert(quizJson.success === true, "Payload success is true");
  assert(quizJson.data.title != null, `Quiz title: ${quizJson.data.title}`);
  assert(typeof quizJson.data.durationSeconds === "number", `Quiz duration: ${quizJson.data.durationSeconds}s`);

  // CRITICAL SECURITY ASSERTION: No correctAnswer in response string
  assert(
    !rawQuizText.includes("correctAnswer"),
    "CRITICAL PASS: Raw response does NOT contain 'correctAnswer'"
  );
  assert(
    !rawQuizText.includes("isCorrect"),
    "CRITICAL PASS: Raw response does NOT contain 'isCorrect'"
  );

  // Check each question structure
  if (quizJson.data.questions) {
    for (const q of quizJson.data.questions) {
      assert(q.id != null, `Question has ID: ${q.id}`);
      assert(q.question != null, "Question has text");
      assert(Array.isArray(q.options), "Question has options array");
      assert(q.correctAnswer === undefined, `Question ${q.id} has NO correctAnswer property`);
      assert(q.isCorrect === undefined, `Question ${q.id} has NO isCorrect property`);
    }
  }

  // TEST 5: Non-member Student Isolation (Siti Nurbaya)
  console.log("\nTEST GROUP 5: NON-MEMBER STUDENT ISOLATION (Siti Nurbaya)");
  const siswa2 = await login("0098273646", "password123", "siswa");
  assert(siswa2.user.role === "siswa", `Authenticated as Siswa 2: ${siswa2.user.name}`);

  const forbiddenGet = await fetch(`${BASE_URL}/api/siswa/quiz/${quizTargetId}`, {
    headers: { Cookie: siswa2.cookie },
  });
  assert(forbiddenGet.status === 403, "Non-member blocked from GET /api/siswa/quiz/[id] (403 Forbidden)");

  const forbiddenStart = await fetch(`${BASE_URL}/api/siswa/quiz/${quizTargetId}/start`, {
    method: "POST",
    headers: { Cookie: siswa2.cookie },
  });
  assert(forbiddenStart.status === 403, "Non-member blocked from POST /api/siswa/quiz/[id]/start (403 Forbidden)");

  const forbiddenSubmit = await fetch(`${BASE_URL}/api/siswa/quiz/${quizTargetId}/submit`, {
    method: "POST",
    headers: {
      Cookie: siswa2.cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ answers: [] }),
  });
  assert(forbiddenSubmit.status === 403, "Non-member blocked from POST /api/siswa/quiz/[id]/submit (403 Forbidden)");

  // TEST 6: Start Attempt
  console.log("\nTEST GROUP 6: START QUIZ ATTEMPT (Siswa 1)");
  const startRes = await fetch(`${BASE_URL}/api/siswa/quiz/${quizTargetId}/start`, {
    method: "POST",
    headers: { Cookie: siswa1.cookie },
  });
  const startData = await startRes.json();
  assert(startRes.status === 200 || startRes.status === 400, "Start quiz returns 200 (or 400 if already done)");
  console.log(`Start Quiz Result message: ${startData.message}`);

  // TEST 7: Fresh Quiz Lifecycle with Siswa 3 (Raden Ajeng Kartini) & Server-Side Grading
  console.log("\nTEST GROUP 7: FRESH QUIZ LIFECYCLE (Siswa 3: Raden Ajeng Kartini) & SERVER GRADING");
  const siswa3 = await login("0098273648", "password123", "siswa");
  assert(siswa3.user.role === "siswa", `Authenticated as Siswa 3: ${siswa3.user.name}`);

  // 7a. Start Attempt for Siswa 3 (or Siswa 4 if Siswa 3 already completed)
  let activeStudent = siswa3;
  let startResStudent = await fetch(`${BASE_URL}/api/siswa/quiz/${quizTargetId}/start`, {
    method: "POST",
    headers: { Cookie: activeStudent.cookie },
  });

  if (startResStudent.status === 400) {
    // Siswa 3 already completed in previous run, use Siswa 4 for fresh submit test
    const siswa4 = await login("0098273649", "password123", "siswa");
    activeStudent = siswa4;
    startResStudent = await fetch(`${BASE_URL}/api/siswa/quiz/${quizTargetId}/start`, {
      method: "POST",
      headers: { Cookie: activeStudent.cookie },
    });
  }

  assert(startResStudent.status === 200 || startResStudent.status === 400, "Student start quiz returned 200 OK (or 400 if already submitted)");

  if (startResStudent.status === 200) {
    const startData = await startResStudent.json();
    assert(startData.data.startedAt != null, "Attempt startedAt recorded");
    assert(startData.data.remainingSeconds > 0, `Remaining seconds: ${startData.data.remainingSeconds}s`);

    // 7b. Submit with 4 correct answers out of 5 and malicious client tampering
    const submitTamperedRes = await fetch(`${BASE_URL}/api/siswa/quiz/${quizTargetId}/submit`, {
      method: "POST",
      headers: {
        Cookie: activeStudent.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        answers: [
          { questionId: "q1", answer: 0 }, // Correct (Kunci utama unik)
          { questionId: "q2", answer: 1 }, // Correct (Primary key)
          { questionId: "q3", answer: 1 }, // Correct (WHERE clause)
          { questionId: "q4", answer: 0 }, // Correct (1NF atomik)
          { questionId: "q5", answer: 2 }, // WRONG (TRUNCATE instead of DROP TABLE)
        ],
        // Tampering attack:
        score: 100,
        percentage: 100,
        correctCount: 999,
        incorrectCount: 0,
        studentId: "654321654321654321654321",
      }),
    });

    const submitResultData = await submitTamperedRes.json();
    assert(submitTamperedRes.status === 200, "POST /api/siswa/quiz/[id]/submit returned 200 OK");
    assert(submitResultData.success === true, "Submit response success is true");
    assert(submitResultData.data.correctCount === 4, `Server authoritative calculation: Benar = ${submitResultData.data.correctCount}`);
    assert(submitResultData.data.incorrectCount === 1, `Server authoritative calculation: Salah = ${submitResultData.data.incorrectCount}`);
    assert(submitResultData.data.score === 80, `Server authoritative calculation: Nilai = ${submitResultData.data.score}`);
    assert(submitResultData.data.correctCount !== 999, "Security Pass: Injected client correctCount was stripped/ignored");
  }

  // TEST 8: Duplicate Attempt Prevention
  console.log("\nTEST GROUP 8: DUPLICATE ATTEMPT PREVENTION");
  const duplicateSubmitRes = await fetch(`${BASE_URL}/api/siswa/quiz/${quizTargetId}/submit`, {
    method: "POST",
    headers: {
      Cookie: activeStudent.cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ answers: [] }),
  });
  assert(duplicateSubmitRes.status === 400, "Duplicate quiz submission rejected with 400 Bad Request");

  const duplicateStartRes = await fetch(`${BASE_URL}/api/siswa/quiz/${quizTargetId}/start`, {
    method: "POST",
    headers: { Cookie: activeStudent.cookie },
  });
  assert(duplicateStartRes.status === 400, "Restarting already completed quiz rejected with 400 Bad Request");

  // TEST 9: Result View on Quiz Access After Completion
  console.log("\nTEST GROUP 9: QUIZ ACCESS AFTER COMPLETION (RESULT MODE)");
  const quizAfterRes = await fetch(`${BASE_URL}/api/siswa/quiz/${quizTargetId}`, {
    headers: { Cookie: siswa1.cookie },
  });
  const quizAfterData = await quizAfterRes.json();
  assert(quizAfterRes.status === 200, "GET /api/siswa/quiz/[id] after completion returns 200 OK");
  assert(quizAfterData.data.isCompleted === true, "Quiz is marked as isCompleted: true");
  assert(quizAfterData.data.result != null, "Result object is provided for completed quiz");
  assert(typeof quizAfterData.data.result.score === "number", `Result score: ${quizAfterData.data.result.score}`);
  assert(typeof quizAfterData.data.result.correctCount === "number", `Result Benar: ${quizAfterData.data.result.correctCount}`);
  assert(typeof quizAfterData.data.result.incorrectCount === "number", `Result Salah: ${quizAfterData.data.result.incorrectCount}`);

  // TEST 10: HTML Page Rendering
  console.log("\nTEST GROUP 10: HTML PAGE RENDERING");
  const quizListPage = await fetch(`${BASE_URL}/siswa/quiz`, {
    headers: { Cookie: siswa1.cookie },
  });
  assert(quizListPage.status === 200, "GET /siswa/quiz rendered successfully (200)");

  const quizDetailPage = await fetch(`${BASE_URL}/siswa/quiz/${quizTargetId}`, {
    headers: { Cookie: siswa1.cookie },
  });
  assert(quizDetailPage.status === 200, "GET /siswa/quiz/[id] rendered successfully (200)");

  // TEST 11: Phase 4 Assignments Regression
  console.log("\nTEST GROUP 11: REGRESSION CHECKS PHASE 4 (ASSIGNMENTS)");
  const p4List = await fetch(`${BASE_URL}/api/siswa/assignments`, {
    headers: { Cookie: siswa1.cookie },
  });
  assert(p4List.status === 200, "GET /api/siswa/assignments returns 200 OK");

  // TEST 12: Phase 3 Dashboard Regression
  console.log("\nTEST GROUP 12: REGRESSION CHECKS PHASE 3 (DASHBOARD & COURSES)");
  const p3Dash = await fetch(`${BASE_URL}/api/siswa/dashboard`, {
    headers: { Cookie: siswa1.cookie },
  });
  assert(p3Dash.status === 200, "GET /api/siswa/dashboard returns 200 OK");

  const p3Courses = await fetch(`${BASE_URL}/api/siswa/courses`, {
    headers: { Cookie: siswa1.cookie },
  });
  assert(p3Courses.status === 200, "GET /api/siswa/courses returns 200 OK");

  // TEST 13: Guru Module Regression
  console.log("\nTEST GROUP 13: REGRESSION CHECKS GURU MODULE");
  const guruDash = await fetch(`${BASE_URL}/api/guru/dashboard`, {
    headers: { Cookie: guru.cookie },
  });
  assert(guruDash.status === 200, "GET /api/guru/dashboard returns 200 OK");

  const guruClasses = await fetch(`${BASE_URL}/api/guru/classes`, {
    headers: { Cookie: guru.cookie },
  });
  assert(guruClasses.status === 200, "GET /api/guru/classes returns 200 OK");

  const guruGrades = await fetch(`${BASE_URL}/api/guru/grades`, {
    headers: { Cookie: guru.cookie },
  });
  assert(guruGrades.status === 200, "GET /api/guru/grades returns 200 OK");

  console.log("\n==================================================");
  console.log("✅ ALL PHASE 5 TESTS & REGRESSION CHECKS PASSED!");
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
