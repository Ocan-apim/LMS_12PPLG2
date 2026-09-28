/**
 * Automated Verification for Kurikulum Phase 2: Backend & API Implementation
 * Run: node --env-file=.env.local scripts/test-phase2-kurikulum-backend.mjs
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
  console.log("STARTING PHASE 2 KURIKULUM BACKEND & API TESTS");
  console.log(`Target: ${BASE_URL}`);
  console.log("==================================================\n");

  const endpoints = [
    "/api/kurikulum/dashboard",
    "/api/kurikulum/teachers",
    "/api/kurikulum/grades/classes",
    "/api/kurikulum/grades/subjects",
    "/api/kurikulum/reports/grades",
    "/api/kurikulum/reports/export",
    "/api/kurikulum/reports/recap",
    "/api/kurikulum/profile",
    "/api/kurikulum/files",
  ];

  // TEST 1: Unauthenticated Requests (401 Unauthorized)
  console.log("TEST GROUP 1: UNAUTHENTICATED REQUESTS");
  for (const ep of endpoints) {
    const res = await fetch(`${BASE_URL}${ep}`);
    assert(res.status === 401, `GET ${ep} rejects unauthenticated (401)`);
  }

  // TEST 2: Wrong Role Authorization (403 Forbidden)
  console.log("\nTEST GROUP 2: WRONG ROLE AUTHORIZATION");
  const siswa = await login("0098273645", "password123", "siswa");
  assert(siswa.user.role === "siswa", `Authenticated as Siswa: ${siswa.user.name}`);

  for (const ep of endpoints) {
    const res = await fetch(`${BASE_URL}${ep}`, {
      headers: { Cookie: siswa.cookie },
    });
    assert(res.status === 403, `Siswa blocked from GET ${ep} (403 Forbidden)`);
  }

  const guru = await login("budi.pratama@sekolah.sch.id", "password123", "guru");
  assert(guru.user.role === "guru", `Authenticated as Guru: ${guru.user.name}`);

  for (const ep of endpoints) {
    const res = await fetch(`${BASE_URL}${ep}`, {
      headers: { Cookie: guru.cookie },
    });
    assert(res.status === 403, `Guru blocked from GET ${ep} (403 Forbidden)`);
  }

  // TEST 3: Kurikulum Authentication & Dashboard API
  console.log("\nTEST GROUP 3: KURIKULUM DASHBOARD API");
  const kurikulum = await login("kurikulum@sekolah.sch.id", "password123", "kurikulum");
  assert(kurikulum.user.role === "kurikulum", `Authenticated as Kurikulum: ${kurikulum.user.name}`);

  const dashRes = await fetch(`${BASE_URL}/api/kurikulum/dashboard`, {
    headers: { Cookie: kurikulum.cookie },
  });
  const dashData = await dashRes.json();
  assert(dashRes.status === 200, "GET /api/kurikulum/dashboard returned 200 OK");
  assert(dashData.success === true, "Dashboard payload success is true");
  assert(typeof dashData.data.totalActiveClasses === "number", `Active classes: ${dashData.data.totalActiveClasses}`);
  assert(typeof dashData.data.totalStudents === "number", `Total students: ${dashData.data.totalStudents}`);
  assert(typeof dashData.data.totalTeachers === "number", `Total teachers: ${dashData.data.totalTeachers}`);
  assert(typeof dashData.data.totalSubjects === "number", `Total subjects: ${dashData.data.totalSubjects}`);
  assert(Array.isArray(dashData.data.recentActivities), "Recent activities is an array");
  console.log(`  ✓ Dashboard loaded with ${dashData.data.recentActivities.length} recent learning activities`);

  // TEST 4: Kurikulum Teachers Monitoring API
  console.log("\nTEST GROUP 4: KURIKULUM TEACHERS MONITORING API");
  const teachersRes = await fetch(`${BASE_URL}/api/kurikulum/teachers`, {
    headers: { Cookie: kurikulum.cookie },
  });
  const teachersData = await teachersRes.json();
  assert(teachersRes.status === 200, "GET /api/kurikulum/teachers returned 200 OK");
  assert(teachersData.success === true, "Teachers payload success is true");
  assert(Array.isArray(teachersData.data.teachers), "Teachers returned as array");
  assert(teachersData.data.teachers.length >= 1, `Found ${teachersData.data.teachers.length} teachers`);

  const t1 = teachersData.data.teachers[0];
  assert(typeof t1.id === "string", "Teacher has id");
  assert(typeof t1.name === "string", `Teacher name: ${t1.name}`);
  assert(typeof t1.teachingLoad === "number", `Teaching load: ${t1.teachingLoad}`);
  assert(Array.isArray(t1.subjects), "Teacher subjects is an array");
  assert(t1.password === undefined, "Security: Password strictly omitted");

  // TEST 5: Class Grade Monitoring API
  console.log("\nTEST GROUP 5: CLASS GRADE MONITORING API");
  const classGradesRes = await fetch(`${BASE_URL}/api/kurikulum/grades/classes`, {
    headers: { Cookie: kurikulum.cookie },
  });
  const classGradesData = await classGradesRes.json();
  assert(classGradesRes.status === 200, "GET /api/kurikulum/grades/classes returned 200 OK");
  assert(classGradesData.success === true, "Class grades payload success is true");
  assert(Array.isArray(classGradesData.data.classesList), "Classes list is an array");
  assert(typeof classGradesData.data.summary === "object", "Summary object present");
  assert(typeof classGradesData.data.summary.distribution === "object", "Grade distribution present");
  assert(typeof classGradesData.data.summary.academicProgress === "number", `Academic progress: ${classGradesData.data.summary.academicProgress}%`);
  assert(Array.isArray(classGradesData.data.students), "Students list is an array");

  // TEST 6: Subject Grade Monitoring API
  console.log("\nTEST GROUP 6: SUBJECT GRADE MONITORING API");
  const subjGradesRes = await fetch(`${BASE_URL}/api/kurikulum/grades/subjects`, {
    headers: { Cookie: kurikulum.cookie },
  });
  const subjGradesData = await subjGradesRes.json();
  assert(subjGradesRes.status === 200, "GET /api/kurikulum/grades/subjects returned 200 OK");
  assert(subjGradesData.success === true, "Subject grades payload success is true");
  assert(Array.isArray(subjGradesData.data.subjectsList), "Subjects list is an array");
  assert(Array.isArray(subjGradesData.data.classComparison), "Class comparison is an array");
  assert(Array.isArray(subjGradesData.data.trend), "Trend is an array");
  assert(typeof subjGradesData.data.components === "object", "Components object present");
  assert(Array.isArray(subjGradesData.data.classesBreakdown), "Classes breakdown is an array");

  // TEST 7: Academic Grade Report Preview API
  console.log("\nTEST GROUP 7: ACADEMIC GRADE REPORT PREVIEW API");
  const reportRes = await fetch(`${BASE_URL}/api/kurikulum/reports/grades`, {
    headers: { Cookie: kurikulum.cookie },
  });
  const reportData = await reportRes.json();
  assert(reportRes.status === 200, "GET /api/kurikulum/reports/grades returned 200 OK");
  assert(reportData.success === true, "Report payload success is true");
  assert(typeof reportData.data.filters === "object", "Filters object present");
  assert(Array.isArray(reportData.data.rows), "Report rows is an array");

  // TEST 8: Academic Grade Report Excel Export (.xlsx)
  console.log("\nTEST GROUP 8: ACADEMIC GRADE REPORT EXCEL EXPORT (.XLSX)");
  const exportRes = await fetch(`${BASE_URL}/api/kurikulum/reports/export`, {
    headers: { Cookie: kurikulum.cookie },
  });
  assert(exportRes.status === 200, "GET /api/kurikulum/reports/export returned 200 OK");
  const contentType = exportRes.headers.get("content-type") || "";
  assert(
    contentType.includes("spreadsheetml.sheet") || contentType.includes("octet-stream"),
    `Content-Type is valid Excel sheet: ${contentType}`
  );
  const blob = await exportRes.arrayBuffer();
  assert(blob.byteLength > 1000, `Excel file received successfully (${blob.byteLength} bytes)`);

  // TEST 9: Report Recap Document Preview API
  console.log("\nTEST GROUP 9: REPORT RECAP DOCUMENT PREVIEW API");
  const recapRes = await fetch(`${BASE_URL}/api/kurikulum/reports/recap`, {
    headers: { Cookie: kurikulum.cookie },
  });
  const recapData = await recapRes.json();
  assert(recapRes.status === 200, "GET /api/kurikulum/reports/recap returned 200 OK");
  assert(recapData.success === true, "Recap payload success is true");
  assert(typeof recapData.data.school === "object", "School setting object present");
  assert(typeof recapData.data.school.schoolName === "string", `School name: ${recapData.data.school.schoolName}`);
  assert(Array.isArray(recapData.data.rows), "Recap student rows is an array");

  // TEST 10: Kurikulum Profile API & session.id Resolution
  console.log("\nTEST GROUP 10: KURIKULUM PROFILE API & SESSION RESOLUTION");
  const profileRes = await fetch(`${BASE_URL}/api/kurikulum/profile?id=fakeId123456`, {
    headers: { Cookie: kurikulum.cookie },
  });
  const profileData = await profileRes.json();
  assert(profileRes.status === 200, "GET /api/kurikulum/profile returned 200 OK");
  assert(profileData.data.user.email === kurikulum.user.email, `Profile email strictly matches session: ${profileData.data.user.email}`);
  assert(profileData.data.user.role === "kurikulum", "Profile role is strictly 'kurikulum'");
  assert(profileData.data.user.password === undefined, "Password hash is strictly omitted");

  // TEST 11: Kurikulum Academic Files API
  console.log("\nTEST GROUP 11: KURIKULUM ACADEMIC FILES API");
  const filesRes = await fetch(`${BASE_URL}/api/kurikulum/files`, {
    headers: { Cookie: kurikulum.cookie },
  });
  const filesData = await filesRes.json();
  assert(filesRes.status === 200, "GET /api/kurikulum/files returned 200 OK");
  assert(filesData.success === true, "Files payload success is true");
  assert(Array.isArray(filesData.data.files), "Files returned as array");

  // TEST 12: Read-Only Enforcement (Mutation Block)
  console.log("\nTEST GROUP 12: READ-ONLY ENFORCEMENT (MUTATION BLOCK)");
  // Kurikulum attempts to create a class
  const mutateClass = await fetch(`${BASE_URL}/api/guru/classes`, {
    method: "POST",
    headers: { Cookie: kurikulum.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Hacked Class", code: "HACK1" }),
  });
  assert(mutateClass.status === 403, "Kurikulum blocked from POST /api/guru/classes (403 Forbidden)");

  // Kurikulum attempts to grade a submission
  const mutateGrade = await fetch(`${BASE_URL}/api/guru/submissions/6ab914600e99eff615f8fc61/grade`, {
    method: "POST",
    headers: { Cookie: kurikulum.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ score: 100 }),
  });
  assert(mutateGrade.status === 403, "Kurikulum blocked from grading submissions (403 Forbidden)");

  // TEST 13: ID Tampering Validation
  console.log("\nTEST GROUP 13: ID TAMPERING VALIDATION");
  const tamperClass = await fetch(`${BASE_URL}/api/kurikulum/grades/classes?classId=invalid-non-mongo-id`, {
    headers: { Cookie: kurikulum.cookie },
  });
  assert(tamperClass.status === 400, "Invalid classId format returns 400 Bad Request");

  const tamperSubject = await fetch(`${BASE_URL}/api/kurikulum/grades/subjects?subjectId=invalid-non-mongo-id`, {
    headers: { Cookie: kurikulum.cookie },
  });
  assert(tamperSubject.status === 400, "Invalid subjectId format returns 400 Bad Request");

  // TEST 14: Strict "No Attendance" Verification
  console.log("\nTEST GROUP 14: STRICT 'NO ATTENDANCE' VERIFICATION");
  const allPayloads = [
    JSON.stringify(dashData),
    JSON.stringify(teachersData),
    JSON.stringify(classGradesData),
    JSON.stringify(subjGradesData),
    JSON.stringify(reportData),
    JSON.stringify(recapData),
    JSON.stringify(filesData),
  ];

  const forbiddenWords = ["attendance", "attendancerate", "kehadiran", "absensi"];
  for (const payload of allPayloads) {
    const lower = payload.toLowerCase();
    for (const word of forbiddenWords) {
      assert(
        !lower.includes(`"${word}"`) && !lower.includes(`"${word}:`),
        `Payload does not contain forbidden attendance property: '${word}'`
      );
    }
  }

  console.log("\n==================================================");
  console.log("PHASE 2 KURIKULUM BACKEND & API TESTS");
  console.log("==================================================");
  console.log("Test 1 - Unauthenticated Requests ......... PASS");
  console.log("Test 2 - Wrong Role Authorization ........ PASS");
  console.log("Test 3 - Dashboard API ................... PASS");
  console.log("Test 4 - Teachers Monitoring API ......... PASS");
  console.log("Test 5 - Class Grade Monitoring .......... PASS");
  console.log("Test 6 - Subject Grade Monitoring ........ PASS");
  console.log("Test 7 - Academic Report Preview ......... PASS");
  console.log("Test 8 - Excel Export (.xlsx) ............ PASS");
  console.log("Test 9 - Report Recap Document ........... PASS");
  console.log("Test 10 - Profile Ownership & Security ... PASS");
  console.log("Test 11 - Academic Files Repository ...... PASS");
  console.log("Test 12 - Read-Only Mutation Block ....... PASS");
  console.log("Test 13 - ID Tampering Validation ........ PASS");
  console.log("Test 14 - Zero Attendance Rule .......... PASS");
  console.log("==================================================");
  console.log("RESULT: ALL PHASE 2 TESTS PASSED");
  console.log("==================================================\n");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
