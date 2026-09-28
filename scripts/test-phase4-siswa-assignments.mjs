/**
 * Automated Verification for Phase 4: Siswa Assignments & Submissions
 * Run: node --env-file=.env.local scripts/test-phase4-siswa-assignments.mjs
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
  console.log("STARTING PHASE 4 SISWA ASSIGNMENTS & SUBMISSION TESTS");
  console.log(`Target: ${BASE_URL}`);
  console.log("==================================================\n");

  // TEST 1: Unauthenticated Requests
  console.log("TEST GROUP 1: UNAUTHENTICATED REQUESTS");
  const unauth1 = await fetch(`${BASE_URL}/api/siswa/assignments`);
  assert(unauth1.status === 401, "GET /api/siswa/assignments rejects unauthenticated (401)");

  const unauth2 = await fetch(`${BASE_URL}/api/siswa/assignments/654321654321654321654321`);
  assert(unauth2.status === 401, "GET /api/siswa/assignments/[id] rejects unauthenticated (401)");

  const unauth3 = await fetch(`${BASE_URL}/api/siswa/assignments/654321654321654321654321/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "test" }),
  });
  assert(unauth3.status === 401, "POST /api/siswa/assignments/[id]/submit rejects unauthenticated (401)");

  // TEST 2: Wrong Role Check (Guru trying to access Siswa endpoints)
  console.log("\nTEST GROUP 2: ROLE AUTHORIZATION (GURU BLOCKED FROM SISWA ENDPOINTS)");
  const guru = await login("budi.pratama@sekolah.sch.id", "password123", "guru");
  assert(guru.user.role === "guru", `Authenticated as Guru: ${guru.user.name}`);

  const guruOnList = await fetch(`${BASE_URL}/api/siswa/assignments`, {
    headers: { Cookie: guru.cookie },
  });
  assert(guruOnList.status === 403, "Guru blocked from GET /api/siswa/assignments (403)");

  const guruOnDetail = await fetch(`${BASE_URL}/api/siswa/assignments/654321654321654321654321`, {
    headers: { Cookie: guru.cookie },
  });
  assert(guruOnDetail.status === 403, "Guru blocked from GET /api/siswa/assignments/[id] (403)");

  const guruOnSubmit = await fetch(`${BASE_URL}/api/siswa/assignments/654321654321654321654321/submit`, {
    method: "POST",
    headers: { Cookie: guru.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ content: "test" }),
  });
  assert(guruOnSubmit.status === 403, "Guru blocked from POST /api/siswa/assignments/[id]/submit (403)");

  // TEST 3: Siswa 1 (Enrolled Member) - Assignment List & Summary
  console.log("\nTEST GROUP 3: SISWA 1 (Ahmad Bagus Pratama) ASSIGNMENT LIST");
  const siswa1 = await login("0098273645", "password123", "siswa");
  assert(siswa1.user.role === "siswa", `Authenticated as Siswa 1: ${siswa1.user.name}`);

  const listRes = await fetch(`${BASE_URL}/api/siswa/assignments`, {
    headers: { Cookie: siswa1.cookie },
  });
  const listData = await listRes.json();
  assert(listRes.status === 200, "GET /api/siswa/assignments returned 200 OK");
  assert(listData.success === true, "Payload success is true");
  assert(listData.data.summary != null, "Summary object present");
  assert(typeof listData.data.summary.needsAttention === "number", `needsAttention count: ${listData.data.summary.needsAttention}`);
  assert(typeof listData.data.summary.dueThisWeek === "number", `dueThisWeek count: ${listData.data.summary.dueThisWeek}`);
  assert(typeof listData.data.summary.averageScore === "number", `averageScore: ${listData.data.summary.averageScore}%`);
  assert(Array.isArray(listData.data.assignments), "Assignments is an array");
  assert(listData.data.assignments.length >= 1, `Found ${listData.data.assignments.length} assignments for Siswa 1`);

  const targetAssignment = listData.data.assignments[0];
  const targetId = targetAssignment._id;
  console.log(`Target Assignment: ${targetAssignment.title} (ID: ${targetId})`);

  // TEST 4: Siswa 1 - Assignment Detail
  console.log("\nTEST GROUP 4: SISWA 1 ASSIGNMENT DETAIL");
  const detailRes = await fetch(`${BASE_URL}/api/siswa/assignments/${targetId}`, {
    headers: { Cookie: siswa1.cookie },
  });
  const detailData = await detailRes.json();
  assert(detailRes.status === 200, "GET /api/siswa/assignments/[id] returned 200 OK");
  assert(detailData.success === true, "Detail payload success is true");
  assert(detailData.data._id === targetId, "Returned assignment ID matches requested");
  assert(detailData.data.title === targetAssignment.title, `Title matches: ${detailData.data.title}`);
  assert(detailData.data.teacher != null, "Teacher info present");
  assert(detailData.data.courseClass != null, "Course class info present");
  assert(Array.isArray(detailData.data.attachments), "Attachments is an array");
  assert(Array.isArray(detailData.data.comments), "Comments is an array");

  // TEST 5: Siswa 1 - Submit Assignment & Check Grade-Field Protection
  console.log("\nTEST GROUP 5: SISWA 1 SUBMIT ASSIGNMENT & GRADE-FIELD PROTECTION");
  const submitRes = await fetch(`${BASE_URL}/api/siswa/assignments/${targetId}/submit`, {
    method: "POST",
    headers: {
      Cookie: siswa1.cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: "Laporan tugas pengerjaan basis data relasional",
      attachments: [
        {
          name: "laporan_basis_data.pdf",
          url: "/uploads/submissions/test_laporan.pdf",
          size: "2.4 MB",
          type: "document",
        },
      ],
      // Tampering attempt by client:
      score: 100,
      feedback: "Hacked: Nilai sempurna!",
    }),
  });
  const submitData = await submitRes.json();
  assert(submitRes.status === 200, "POST /api/siswa/assignments/[id]/submit returned 200 OK");
  assert(submitData.success === true, "Submission payload success is true");
  assert(
    submitData.data.status === "turned_in" || submitData.data.status === "late" || submitData.data.status === "graded",
    `Submission status is valid: ${submitData.data.status}`
  );
  // Verify tampering attempt was ignored/protected
  assert(
    submitData.data.feedback !== "Hacked: Nilai sempurna!",
    "Security Check Passed: Student cannot tamper with teacher feedback"
  );

  // TEST 6: Non-member Student Isolation (Siti Nurbaya)
  console.log("\nTEST GROUP 6: NON-MEMBER STUDENT ISOLATION (Siti Nurbaya)");
  const siswa2 = await login("0098273646", "password123", "siswa");
  assert(siswa2.user.role === "siswa", `Authenticated as Siswa 2: ${siswa2.user.name}`);

  // Siswa 2 tries to GET Siswa 1's assignment detail
  const forbiddenDetail = await fetch(`${BASE_URL}/api/siswa/assignments/${targetId}`, {
    headers: { Cookie: siswa2.cookie },
  });
  assert(forbiddenDetail.status === 403, "Non-member blocked from GET /api/siswa/assignments/[id] (403 Forbidden)");

  // Siswa 2 tries to submit to Siswa 1's assignment
  const forbiddenSubmit = await fetch(`${BASE_URL}/api/siswa/assignments/${targetId}/submit`, {
    method: "POST",
    headers: {
      Cookie: siswa2.cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content: "Malicious submission" }),
  });
  assert(forbiddenSubmit.status === 403, "Non-member blocked from POST /api/siswa/assignments/[id]/submit (403 Forbidden)");

  // Siswa 2 assignment list does not leak Siswa 1's class assignments
  const siswa2ListRes = await fetch(`${BASE_URL}/api/siswa/assignments`, {
    headers: { Cookie: siswa2.cookie },
  });
  const siswa2ListData = await siswa2ListRes.json();
  assert(siswa2ListRes.status === 200, "Siswa 2 assignment list returns 200 OK");
  assert(
    !siswa2ListData.data.assignments.some((a) => a._id === targetId),
    "Data Isolation Passed: Siswa 2 cannot see Siswa 1's class assignments"
  );

  // TEST 7: Comments Verification
  console.log("\nTEST GROUP 7: COMMENTS VERIFICATION");
  const commentPostRes = await fetch(`${BASE_URL}/api/guru/assignments/${targetId}/comments`, {
    method: "POST",
    headers: {
      Cookie: siswa1.cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: "Pak, apakah format diagram ERD harus Chen notation?" }),
  });
  assert(commentPostRes.status === 201 || commentPostRes.status === 200, "Enrolled student can post comment to assignment (201 Created)");

  const commentGetRes = await fetch(`${BASE_URL}/api/guru/assignments/${targetId}/comments`, {
    headers: { Cookie: siswa1.cookie },
  });
  const commentGetData = await commentGetRes.json();
  assert(commentGetRes.status === 200, "Enrolled student can read comments (200 OK)");
  assert(Array.isArray(commentGetData.data), "Comments data is an array");
  assert(
    commentGetData.data.some((c) => c.message.includes("Chen notation")),
    "Posted comment found in comment list"
  );

  // Non-member trying to comment on assignment
  const forbiddenComment = await fetch(`${BASE_URL}/api/guru/assignments/${targetId}/comments`, {
    method: "POST",
    headers: {
      Cookie: siswa2.cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: "Illegal comment" }),
  });
  assert(forbiddenComment.status === 403, "Non-member student blocked from commenting (403 Forbidden)");

  // TEST 8: HTML Page Accessibility
  console.log("\nTEST GROUP 8: HTML PAGE RENDERING");
  const assignmentsPage = await fetch(`${BASE_URL}/siswa/assignments`, {
    headers: { Cookie: siswa1.cookie },
  });
  assert(assignmentsPage.status === 200, "GET /siswa/assignments rendered successfully (200)");

  const assignmentDetailPage = await fetch(`${BASE_URL}/siswa/assignments/${targetId}`, {
    headers: { Cookie: siswa1.cookie },
  });
  assert(assignmentDetailPage.status === 200, "GET /siswa/assignments/[id] rendered successfully (200)");

  // TEST 9: Regression Test Phase 3
  console.log("\nTEST GROUP 9: REGRESSION CHECKS PHASE 3");
  const p3Dash = await fetch(`${BASE_URL}/api/siswa/dashboard`, {
    headers: { Cookie: siswa1.cookie },
  });
  assert(p3Dash.status === 200, "GET /api/siswa/dashboard returns 200 OK (no regression)");

  const p3Courses = await fetch(`${BASE_URL}/api/siswa/courses`, {
    headers: { Cookie: siswa1.cookie },
  });
  assert(p3Courses.status === 200, "GET /api/siswa/courses returns 200 OK (no regression)");

  // TEST 10: Regression Test Guru Module
  console.log("\nTEST GROUP 10: REGRESSION CHECKS GURU MODULE");
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
  console.log("✅ ALL PHASE 4 TESTS & REGRESSION CHECKS PASSED!");
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
