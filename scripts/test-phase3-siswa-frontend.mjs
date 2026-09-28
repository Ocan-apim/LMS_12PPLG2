/**
 * Automated Verification for Phase 3: Siswa Dashboard & Mata Pelajaran
 * Run: node --env-file=.env.local scripts/test-phase3-siswa-frontend.mjs
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
  console.log("STARTING PHASE 3 SISWA FRONTEND & API VERIFICATION");
  console.log(`Target: ${BASE_URL}`);
  console.log("==================================================\n");

  // 1. Siswa 1 (Ahmad Bagus Pratama) - Member of BASISDATA10PPLG
  console.log("TEST GROUP 1: SISWA 1 DASHBOARD & COURSES DATA");
  const siswa1 = await login("0098273645", "password123", "siswa");
  assert(siswa1.user.role === "siswa", `Authenticated as Siswa 1: ${siswa1.user.name}`);

  // Fetch Dashboard API
  const dashRes = await fetch(`${BASE_URL}/api/siswa/dashboard`, {
    headers: { Cookie: siswa1.cookie },
  });
  const dashData = await dashRes.json();
  assert(dashRes.status === 200, "GET /api/siswa/dashboard returned 200 OK");
  assert(dashData.success === true, "Dashboard payload success === true");
  assert(typeof dashData.data.averageGrade === "number", `Average Grade is calculated: ${dashData.data.averageGrade}`);
  assert(Array.isArray(dashData.data.classes), "Classes array present in dashboard data");
  assert(Array.isArray(dashData.data.upcomingAssignments), "Upcoming assignments array present in dashboard data");
  assert(Array.isArray(dashData.data.recentFiles), "Recent files array present in dashboard data");

  // Fetch Courses API
  const coursesRes = await fetch(`${BASE_URL}/api/siswa/courses`, {
    headers: { Cookie: siswa1.cookie },
  });
  const coursesData = await coursesRes.json();
  assert(coursesRes.status === 200, "GET /api/siswa/courses returned 200 OK");
  assert(Array.isArray(coursesData.data), "Courses data is an array");
  assert(coursesData.data.length >= 1, `Found ${coursesData.data.length} joined courses for Siswa 1`);

  const targetClass = coursesData.data[0];
  const targetClassId = targetClass._id;
  console.log(`\nTEST GROUP 2: DETAIL KELAS (ID: ${targetClassId})`);
  
  // Fetch Detail Kelas API
  const detailRes = await fetch(`${BASE_URL}/api/siswa/courses/${targetClassId}`, {
    headers: { Cookie: siswa1.cookie },
  });
  const detailData = await detailRes.json();
  assert(detailRes.status === 200, `GET /api/siswa/courses/${targetClassId} returned 200 OK`);
  assert(detailData.success === true, "Course detail payload success === true");
  assert(detailData.data.name === targetClass.name, `Course name matches: ${detailData.data.name}`);
  assert(detailData.data.teacher != null, "Teacher info present in course detail");
  assert(Array.isArray(detailData.data.assignments), "Assignments array present");
  assert(Array.isArray(detailData.data.posts), "Stream posts array present");
  assert(Array.isArray(detailData.data.sharedFiles), "Shared files array present");

  // Test HTML page access
  console.log("\nTEST GROUP 3: HTML PAGE ACCESS");
  const dashPageRes = await fetch(`${BASE_URL}/siswa`, {
    headers: { Cookie: siswa1.cookie },
  });
  assert(dashPageRes.status === 200, "GET /siswa rendered successfully (200)");

  const coursesPageRes = await fetch(`${BASE_URL}/siswa/courses`, {
    headers: { Cookie: siswa1.cookie },
  });
  assert(coursesPageRes.status === 200, "GET /siswa/courses rendered successfully (200)");

  const courseDetailPageRes = await fetch(`${BASE_URL}/siswa/courses/${targetClassId}`, {
    headers: { Cookie: siswa1.cookie },
  });
  assert(courseDetailPageRes.status === 200, "GET /siswa/courses/[id] rendered successfully (200)");

  // 4. Siswa 2 (Siti Aminah) - Non-member access test
  console.log("\nTEST GROUP 4: MEMBERSHIP ISOLATION & NON-MEMBER ACCESS (Siti Aminah)");
  const siswa2 = await login("0098273646", "password123", "siswa");
  assert(siswa2.user.role === "siswa", `Authenticated as Siswa 2: ${siswa2.user.name}`);

  const forbiddenDetail = await fetch(`${BASE_URL}/api/siswa/courses/${targetClassId}`, {
    headers: { Cookie: siswa2.cookie },
  });
  assert(forbiddenDetail.status === 403, "Non-member Siswa 2 blocked from accessing Siswa 1's class detail (403 Forbidden)");

  // Siswa 2's dashboard should be empty or isolated
  const siswa2Dash = await fetch(`${BASE_URL}/api/siswa/dashboard`, {
    headers: { Cookie: siswa2.cookie },
  });
  const siswa2DashData = await siswa2Dash.json();
  assert(siswa2Dash.status === 200, "Siswa 2 dashboard returns 200");
  assert(siswa2DashData.data.classes.length === 0, "Siswa 2 has 0 joined courses (clean isolation)");

  // 5. Non-existent Course Check
  console.log("\nTEST GROUP 5: INVALID COURSE ID HANDLING");
  const notFoundRes = await fetch(`${BASE_URL}/api/siswa/courses/654321654321654321654321`, {
    headers: { Cookie: siswa1.cookie },
  });
  assert(notFoundRes.status === 404, "Non-existent course ID returns 404 Not Found");

  // 6. Guru Module Regression Verification
  console.log("\nTEST GROUP 6: GURU MODULE REGRESSION CHECKS");
  const guru = await login("budi.pratama@sekolah.sch.id", "password123", "guru");
  assert(guru.user.role === "guru", `Authenticated as Guru: ${guru.user.name}`);

  const guruDash = await fetch(`${BASE_URL}/api/guru/dashboard`, {
    headers: { Cookie: guru.cookie },
  });
  assert(guruDash.status === 200, "GET /api/guru/dashboard returns 200 OK (no regression)");

  const guruClasses = await fetch(`${BASE_URL}/api/guru/classes`, {
    headers: { Cookie: guru.cookie },
  });
  assert(guruClasses.status === 200, "GET /api/guru/classes returns 200 OK (no regression)");

  const guruGrades = await fetch(`${BASE_URL}/api/guru/grades`, {
    headers: { Cookie: guru.cookie },
  });
  assert(guruGrades.status === 200, "GET /api/guru/grades returns 200 OK (no regression)");

  console.log("\n==================================================");
  console.log("✅ ALL PHASE 3 VERIFICATION TESTS PASSED SUCCESSFULLY!");
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
