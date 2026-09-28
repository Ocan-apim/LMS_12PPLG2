/**
 * Automated Test for Phase 2: Siswa Backend APIs & Authorization
 * Run: node --env-file=.env.local scripts/test-phase2-siswa-apis.mjs
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
  console.log("STARTING PHASE 2 SISWA API & AUTHORIZATION TESTS");
  console.log(`Target: ${BASE_URL}`);
  console.log("==================================================\n");

  // 1. Unauthenticated Checks
  console.log("TEST GROUP 1: UNAUTHENTICATED ACCESS");
  const unauth1 = await fetch(`${BASE_URL}/api/siswa/courses`);
  assert(unauth1.status === 401, `GET /api/siswa/courses rejects unauthenticated request (401)`);

  const unauth2 = await fetch(`${BASE_URL}/api/siswa/courses/654321654321654321654321`);
  assert(unauth2.status === 401, `GET /api/siswa/courses/[id] rejects unauthenticated request (401)`);

  const unauth3 = await fetch(`${BASE_URL}/api/siswa/dashboard`);
  assert(unauth3.status === 401, `GET /api/siswa/dashboard rejects unauthenticated request (401)`);

  // 2. Wrong Role Checks (Guru trying to access Siswa endpoints)
  console.log("\nTEST GROUP 2: ROLE AUTHORIZATION (GURU)");
  const guru = await login("budi.pratama@sekolah.sch.id", "password123", "guru");
  assert(guru.user.role === "guru", `Authenticated as Guru: ${guru.user.name}`);

  const guruOnSiswaCourses = await fetch(`${BASE_URL}/api/siswa/courses`, {
    headers: { Cookie: guru.cookie },
  });
  assert(guruOnSiswaCourses.status === 403, `Guru blocked from /api/siswa/courses (403)`);

  const guruOnSiswaDetail = await fetch(`${BASE_URL}/api/siswa/courses/654321654321654321654321`, {
    headers: { Cookie: guru.cookie },
  });
  assert(guruOnSiswaDetail.status === 403, `Guru blocked from /api/siswa/courses/[id] (403)`);

  const guruOnSiswaDashboard = await fetch(`${BASE_URL}/api/siswa/dashboard`, {
    headers: { Cookie: guru.cookie },
  });
  assert(guruOnSiswaDashboard.status === 403, `Guru blocked from /api/siswa/dashboard (403)`);

  // 3. Siswa 1 (Ahmad Bagus Pratama) - Member of BASISDATA10PPLG
  console.log("\nTEST GROUP 3: SISWA 1 (Ahmad Bagus Pratama)");
  const siswa1 = await login("0098273645", "password123", "siswa");
  assert(siswa1.user.role === "siswa", `Authenticated as Siswa 1: ${siswa1.user.name} (${siswa1.user.nis})`);

  // Test GET /api/siswa/courses
  const coursesRes = await fetch(`${BASE_URL}/api/siswa/courses`, {
    headers: { Cookie: siswa1.cookie },
  });
  const coursesData = await coursesRes.json();
  assert(coursesRes.status === 200, "GET /api/siswa/courses returned 200 OK");
  assert(coursesData.success === true, "Payload contains success: true");
  assert(Array.isArray(coursesData.data), "data is an array of joined classes");
  assert(coursesData.data.length >= 1, `Siswa 1 has ${coursesData.data.length} joined class(es)`);
  
  const joinedClass = coursesData.data[0];
  assert(joinedClass.name === "BASISDATA10PPLG", `Found joined class: ${joinedClass.name}`);
  assert(typeof joinedClass.totalAssignments === "number", `Total assignments in class: ${joinedClass.totalAssignments}`);
  assert(typeof joinedClass.completedAssignments === "number", `Completed assignments: ${joinedClass.completedAssignments}`);
  assert(typeof joinedClass.progress === "number", `Calculated progress: ${joinedClass.progress}%`);

  const joinedClassId = joinedClass._id;

  // Test GET /api/siswa/courses/[id] for joined class
  console.log("\nTEST GROUP 4: DETAIL KELAS - AUTHORIZED MEMBER");
  const classDetailRes = await fetch(`${BASE_URL}/api/siswa/courses/${joinedClassId}`, {
    headers: { Cookie: siswa1.cookie },
  });
  const classDetailData = await classDetailRes.json();
  assert(classDetailRes.status === 200, "GET /api/siswa/courses/[id] returned 200 OK for member");
  assert(classDetailData.data.name === "BASISDATA10PPLG", "Returned correct class name");
  assert(Array.isArray(classDetailData.data.assignments), "Included upcoming assignments");
  assert(Array.isArray(classDetailData.data.posts), "Included activity stream posts");
  assert(Array.isArray(classDetailData.data.sharedFiles), "Included shared files");
  
  // Verify assignment submission status belongs to Siswa 1
  if (classDetailData.data.assignments.length > 0) {
    const firstTask = classDetailData.data.assignments[0];
    assert(
      ["assigned", "turned_in", "late", "graded"].includes(firstTask.submissionStatus),
      `Task submission status for student is valid: '${firstTask.submissionStatus}'`
    );
  }

  // Test GET /api/siswa/dashboard
  console.log("\nTEST GROUP 5: SISWA DASHBOARD AGGREGATION");
  const dashRes = await fetch(`${BASE_URL}/api/siswa/dashboard`, {
    headers: { Cookie: siswa1.cookie },
  });
  const dashData = await dashRes.json();
  assert(dashRes.status === 200, "GET /api/siswa/dashboard returned 200 OK");
  assert(typeof dashData.data.averageGrade === "number", `Student real average grade: ${dashData.data.averageGrade}`);
  assert(dashData.data.averageGrade === 95 || dashData.data.averageGrade === 94.5, `Average grade matches Siswa 1's actual graded submission (${dashData.data.averageGrade})`);
  assert(typeof dashData.data.totalGraded === "number", `Total graded tasks: ${dashData.data.totalGraded}`);
  assert(Array.isArray(dashData.data.classes), "Contains joined classes summary");
  assert(Array.isArray(dashData.data.upcomingAssignments), "Contains upcoming assignments");
  assert(Array.isArray(dashData.data.recentFiles), "Contains recent shared files from student classes");

  // 4. Siswa 2 (Siti Nurbaya) - NOT a member of BASISDATA10PPLG
  console.log("\nTEST GROUP 6: NON-MEMBER ACCESS & DATA ISOLATION (Siti Nurbaya)");
  const siswa2 = await login("0098273646", "password123", "siswa");
  assert(siswa2.user.role === "siswa", `Authenticated as Siswa 2: ${siswa2.user.name} (${siswa2.user.nis})`);

  // Siswa 2 attempts to access Siswa 1's class detail
  const unauthClassAccess = await fetch(`${BASE_URL}/api/siswa/courses/${joinedClassId}`, {
    headers: { Cookie: siswa2.cookie },
  });
  assert(unauthClassAccess.status === 403, `Non-member Siswa 2 is blocked with 403 Forbidden`);

  // Siswa 2 dashboard has separate grade (she has no graded submissions in this class)
  const siswa2DashRes = await fetch(`${BASE_URL}/api/siswa/dashboard`, {
    headers: { Cookie: siswa2.cookie },
  });
  const siswa2DashData = await siswa2DashRes.json();
  assert(siswa2DashRes.status === 200, "Siswa 2 dashboard returned 200 OK");
  assert(siswa2DashData.data.averageGrade === 0, `Siswa 2 average grade is isolated (0, not 95)`);
  assert(siswa2DashData.data.totalJoinedClasses === 0, `Siswa 2 has not joined BASISDATA10PPLG (totalJoinedClasses: 0)`);

  // 5. Guru Module Regression Verification
  console.log("\nTEST GROUP 7: GURU MODULE REGRESSION VERIFICATION");
  const guruDashRes = await fetch(`${BASE_URL}/api/guru/dashboard`, {
    headers: { Cookie: guru.cookie },
  });
  assert(guruDashRes.status === 200, "Guru dashboard API still returns 200 OK");

  const guruClassesRes = await fetch(`${BASE_URL}/api/guru/classes`, {
    headers: { Cookie: guru.cookie },
  });
  assert(guruClassesRes.status === 200, "Guru classes API still returns 200 OK");

  const guruGradesRes = await fetch(`${BASE_URL}/api/guru/grades`, {
    headers: { Cookie: guru.cookie },
  });
  assert(guruGradesRes.status === 200, "Guru grades API still returns 200 OK");

  console.log("\n==================================================");
  console.log("🎉 ALL PHASE 2 BACKEND API & SECURITY TESTS PASSED!");
  console.log("==================================================\n");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
