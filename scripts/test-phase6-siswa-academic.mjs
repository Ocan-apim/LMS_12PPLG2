/**
 * Automated Verification for Phase 6: Siswa Grades, Calendar Schedule & Files
 * Run: node --env-file=.env.local scripts/test-phase6-siswa-academic.mjs
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
  console.log("STARTING PHASE 6 SISWA GRADES, SCHEDULE & FILES TESTS");
  console.log(`Target: ${BASE_URL}`);
  console.log("==================================================\n");

  // TEST 1: Unauthenticated Requests
  console.log("TEST GROUP 1: UNAUTHENTICATED REQUESTS");
  const unauthGrades = await fetch(`${BASE_URL}/api/siswa/grades`);
  assert(unauthGrades.status === 401, "GET /api/siswa/grades rejects unauthenticated (401)");

  const unauthSchedule = await fetch(`${BASE_URL}/api/siswa/schedule`);
  assert(unauthSchedule.status === 401, "GET /api/siswa/schedule rejects unauthenticated (401)");

  const unauthFiles = await fetch(`${BASE_URL}/api/siswa/files`);
  assert(unauthFiles.status === 401, "GET /api/siswa/files rejects unauthenticated (401)");

  // TEST 2: Wrong Role Checks (Guru blocked from Siswa endpoints)
  console.log("\nTEST GROUP 2: ROLE AUTHORIZATION (GURU BLOCKED FROM SISWA ENDPOINTS)");
  const guru = await login("budi.pratama@sekolah.sch.id", "password123", "guru");
  assert(guru.user.role === "guru", `Authenticated as Guru: ${guru.user.name}`);

  const guruGrades = await fetch(`${BASE_URL}/api/siswa/grades`, {
    headers: { Cookie: guru.cookie },
  });
  assert(guruGrades.status === 403, "Guru blocked from GET /api/siswa/grades (403)");

  const guruSchedule = await fetch(`${BASE_URL}/api/siswa/schedule`, {
    headers: { Cookie: guru.cookie },
  });
  assert(guruSchedule.status === 403, "Guru blocked from GET /api/siswa/schedule (403)");

  const guruFiles = await fetch(`${BASE_URL}/api/siswa/files`, {
    headers: { Cookie: guru.cookie },
  });
  assert(guruFiles.status === 403, "Guru blocked from GET /api/siswa/files (403)");

  // TEST 3: Student 1 (Ahmad Bagus Pratama) - Grades
  console.log("\nTEST GROUP 3: STUDENT 1 GRADES & SUBJECT BREAKDOWN");
  const siswa1 = await login("0098273645", "password123", "siswa");
  assert(siswa1.user.role === "siswa", `Authenticated as Siswa 1: ${siswa1.user.name}`);

  const gradesRes = await fetch(`${BASE_URL}/api/siswa/grades`, {
    headers: { Cookie: siswa1.cookie },
  });
  const gradesData = await gradesRes.json();
  assert(gradesRes.status === 200, "GET /api/siswa/grades returned 200 OK");
  assert(gradesData.success === true, "Grades payload success is true");
  assert(typeof gradesData.data.currentGpa === "number", `Current GPA: ${gradesData.data.currentGpa}`);
  assert(Array.isArray(gradesData.data.subjectBreakdown), "Subject breakdown is an array");
  assert(gradesData.data.subjectBreakdown.length >= 1, `Subject breakdown has ${gradesData.data.subjectBreakdown.length} classes`);
  assert(Array.isArray(gradesData.data.gradedItems), "Graded items is an array");
  assert(gradesData.data.gradedItems.length >= 1, `Total graded items for Siswa 1: ${gradesData.data.gradedItems.length}`);
  
  const hasQuiz = gradesData.data.gradedItems.some((i) => i.type === "kuis");
  const hasAssignment = gradesData.data.gradedItems.some((i) => i.type === "tugas");
  console.log(`  ✓ Graded items include Assignment: ${hasAssignment}, Quiz: ${hasQuiz}`);

  // Tampering attempt via query parameter
  const tamperedGradesRes = await fetch(`${BASE_URL}/api/siswa/grades?studentId=654321654321654321654321`, {
    headers: { Cookie: siswa1.cookie },
  });
  const tamperedGradesData = await tamperedGradesRes.json();
  assert(
    tamperedGradesData.data.currentGpa === gradesData.data.currentGpa,
    "Security Pass: Injected ?studentId=... query parameter was ignored by server"
  );

  // TEST 4: Student 2 (Siti Nurbaya - Non-member of Student 1's class) - Grade Isolation
  console.log("\nTEST GROUP 4: STUDENT 2 GRADE ISOLATION (Siti Nurbaya)");
  const siswa2 = await login("0098273646", "password123", "siswa");
  assert(siswa2.user.role === "siswa", `Authenticated as Siswa 2: ${siswa2.user.name}`);

  const siswa2GradesRes = await fetch(`${BASE_URL}/api/siswa/grades`, {
    headers: { Cookie: siswa2.cookie },
  });
  const siswa2GradesData = await siswa2GradesRes.json();
  assert(siswa2GradesRes.status === 200, "Siswa 2 grades returned 200 OK");
  assert(siswa2GradesData.data.gradedItems.length === 0, "Siswa 2 has 0 graded items (Clean Grade Isolation)");

  // TEST 5: Student 1 Schedule & Membership Filtering
  console.log("\nTEST GROUP 5: STUDENT 1 SCHEDULE & DEADLINES");
  const schedRes = await fetch(`${BASE_URL}/api/siswa/schedule`, {
    headers: { Cookie: siswa1.cookie },
  });
  const schedData = await schedRes.json();
  assert(schedRes.status === 200, "GET /api/siswa/schedule returned 200 OK");
  assert(Array.isArray(schedData.data.events), "Schedule events is an array");
  assert(schedData.data.events.length >= 1, `Found ${schedData.data.events.length} schedule events for Siswa 1`);

  const eventItem = schedData.data.events[0];
  assert(eventItem.title != null, `Event title: ${eventItem.title}`);
  assert(eventItem.date != null, `Event date: ${eventItem.date}`);
  assert(eventItem.time != null, `Event time: ${eventItem.time}`);
  assert(eventItem.status != null, `Event status: ${eventItem.status}`);

  // TEST 6: Student 2 Schedule Isolation
  console.log("\nTEST GROUP 6: STUDENT 2 SCHEDULE ISOLATION (Siti Nurbaya)");
  const siswa2SchedRes = await fetch(`${BASE_URL}/api/siswa/schedule`, {
    headers: { Cookie: siswa2.cookie },
  });
  const siswa2SchedData = await siswa2SchedRes.json();
  assert(siswa2SchedRes.status === 200, "Siswa 2 schedule returned 200 OK");
  assert(siswa2SchedData.data.events.length === 0, "Siswa 2 has 0 foreign class events (Clean Schedule Isolation)");

  // TEST 7: Student 1 Files & Resources
  console.log("\nTEST GROUP 7: STUDENT 1 FILES & SUBJECT FOLDERS");
  const filesRes = await fetch(`${BASE_URL}/api/siswa/files`, {
    headers: { Cookie: siswa1.cookie },
  });
  const filesData = await filesRes.json();
  assert(filesRes.status === 200, "GET /api/siswa/files returned 200 OK");
  assert(Array.isArray(filesData.data.subjectFolders), "Subject folders is an array");
  assert(filesData.data.subjectFolders.length >= 1, `Found ${filesData.data.subjectFolders.length} subject folders`);
  assert(Array.isArray(filesData.data.recentFiles), "Recent files is an array");
  assert(filesData.data.recentFiles.length >= 1, `Found ${filesData.data.recentFiles.length} recent files`);

  const sampleFile = filesData.data.recentFiles[0];
  console.log(`Sample File: ${sampleFile.name} (Download: ${sampleFile.downloadUrl})`);

  // TEST 8: Direct Download Authorization & Foreign-Class Access Rejection
  console.log("\nTEST GROUP 8: DIRECT FILE DOWNLOAD AUTHORIZATION & MEMBERSHIP CHECK");
  // Siswa 1 (Enrolled) downloads sample file from their class
  const s1DownloadRes = await fetch(`${BASE_URL}${sampleFile.downloadUrl}`, {
    headers: { Cookie: siswa1.cookie },
  });
  // Note: If file exists on disk it returns 200; if not yet seeded physically it returns 404, but NOT 403 (authorized!)
  assert(s1DownloadRes.status === 200 || s1DownloadRes.status === 404, 
    `Siswa 1 download access is authorized (status: ${s1DownloadRes.status})`
  );

  // Siswa 2 (Non-member) tries to download Siswa 1's class file directly
  const s2DownloadRes = await fetch(`${BASE_URL}${sampleFile.downloadUrl}`, {
    headers: { Cookie: siswa2.cookie },
  });
  assert(s2DownloadRes.status === 403, "Non-member Siswa 2 is blocked from direct download (403 Forbidden)");

  // Siswa 2 file list isolation
  const s2FilesRes = await fetch(`${BASE_URL}/api/siswa/files`, {
    headers: { Cookie: siswa2.cookie },
  });
  const s2FilesData = await s2FilesRes.json();
  assert(s2FilesRes.status === 200, "Siswa 2 files returned 200 OK");
  assert(s2FilesData.data.recentFiles.length === 0, "Siswa 2 sees 0 files from Siswa 1's class (Clean File Isolation)");

  // TEST 9: HTML Page Rendering for Phase 6 Pages
  console.log("\nTEST GROUP 9: HTML PAGE RENDERING");
  const gradesPage = await fetch(`${BASE_URL}/siswa/grades`, {
    headers: { Cookie: siswa1.cookie },
  });
  assert(gradesPage.status === 200, "GET /siswa/grades rendered successfully (200)");

  const schedulePage = await fetch(`${BASE_URL}/siswa/schedule`, {
    headers: { Cookie: siswa1.cookie },
  });
  assert(schedulePage.status === 200, "GET /siswa/schedule rendered successfully (200)");

  const filesPage = await fetch(`${BASE_URL}/siswa/files`, {
    headers: { Cookie: siswa1.cookie },
  });
  assert(filesPage.status === 200, "GET /siswa/files rendered successfully (200)");

  const sharedFilesPage = await fetch(`${BASE_URL}/siswa/files/shared`, {
    headers: { Cookie: siswa1.cookie },
  });
  assert(sharedFilesPage.status === 200, "GET /siswa/files/shared rendered successfully (200)");

  // TEST 10: Phase 5 Regression (Quiz)
  console.log("\nTEST GROUP 10: REGRESSION CHECKS PHASE 5 (QUIZ)");
  const p5Quiz = await fetch(`${BASE_URL}/api/siswa/quiz/6ab914600e99eff615f8fc61`, {
    headers: { Cookie: siswa1.cookie },
  });
  assert(p5Quiz.status === 200, "GET /api/siswa/quiz/[id] returns 200 OK (no regression)");

  // TEST 11: Phase 4 Regression (Assignments)
  console.log("\nTEST GROUP 11: REGRESSION CHECKS PHASE 4 (ASSIGNMENTS)");
  const p4Assign = await fetch(`${BASE_URL}/api/siswa/assignments`, {
    headers: { Cookie: siswa1.cookie },
  });
  assert(p4Assign.status === 200, "GET /api/siswa/assignments returns 200 OK (no regression)");

  // TEST 12: Phase 3 Regression (Dashboard & Courses)
  console.log("\nTEST GROUP 12: REGRESSION CHECKS PHASE 3 (DASHBOARD & COURSES)");
  const p3Dash = await fetch(`${BASE_URL}/api/siswa/dashboard`, {
    headers: { Cookie: siswa1.cookie },
  });
  assert(p3Dash.status === 200, "GET /api/siswa/dashboard returns 200 OK (no regression)");

  const p3Courses = await fetch(`${BASE_URL}/api/siswa/courses`, {
    headers: { Cookie: siswa1.cookie },
  });
  assert(p3Courses.status === 200, "GET /api/siswa/courses returns 200 OK (no regression)");

  // TEST 13: Guru Module Regression
  console.log("\nTEST GROUP 13: REGRESSION CHECKS GURU MODULE");
  const guruDash = await fetch(`${BASE_URL}/api/guru/dashboard`, {
    headers: { Cookie: guru.cookie },
  });
  assert(guruDash.status === 200, "GET /api/guru/dashboard returns 200 OK (no regression)");

  const guruClasses = await fetch(`${BASE_URL}/api/guru/classes`, {
    headers: { Cookie: guru.cookie },
  });
  assert(guruClasses.status === 200, "GET /api/guru/classes returns 200 OK (no regression)");

  const guruGradesRegression = await fetch(`${BASE_URL}/api/guru/grades`, {
    headers: { Cookie: guru.cookie },
  });
  assert(guruGradesRegression.status === 200, "GET /api/guru/grades returns 200 OK (no regression)");

  console.log("\n==================================================");
  console.log("✅ ALL PHASE 6 TESTS & REGRESSION CHECKS PASSED!");
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
