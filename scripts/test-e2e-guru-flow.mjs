/**
 * Comprehensive End-to-End Test for Guru Flow
 * Testing all 33 steps from Section 35 of requirements.
 * Run with: node --env-file=.env.local scripts/test-e2e-guru-flow.mjs
 */

const BASE_URL = process.env.TEST_URL || "http://localhost:3005";

let guru1Cookie = "";
let guru2Cookie = "";
let createdClassId = "";
let createdClassCode = "";
let createdTaskId = "";
let targetSubmissionId = "";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
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
  console.log("STARTING 33-STEP END-TO-END GURU SCENARIO TEST");
  console.log(`Target: ${BASE_URL}`);
  console.log("==================================================\n");

  // Step 1: Login as Guru (Budi Pratama)
  console.log("Step 1: Login as Guru...");
  const guru1 = await login("budi.pratama@sekolah.sch.id", "password123");
  guru1Cookie = guru1.cookie;
  assert(guru1.user.role === "guru", `Authenticated as Guru: ${guru1.user.name}`);
  assert(guru1Cookie.length > 0, "Obtained valid session cookie");

  // Step 2: Open Dashboard
  console.log("\nStep 2: Open Dashboard...");
  const dashRes = await fetch(`${BASE_URL}/api/guru/dashboard`, {
    headers: { Cookie: guru1Cookie },
  });
  const dashData = await dashRes.json();
  assert(dashRes.status === 200, "Dashboard API returned 200 OK");
  assert(dashData.success === true, "Dashboard payload contains success: true");
  assert(typeof dashData.data.totalClasses === "number", `Dashboard totalClasses: ${dashData.data.totalClasses}`);

  // Step 3, 4, 5: Create class "BASISDATA10PPLG" with password "bucantik" and verify unique code
  console.log("\nStep 3-5: Create class BASISDATA10PPLG with password bucantik...");
  const createClassRes = await fetch(`${BASE_URL}/api/guru/classes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: guru1Cookie },
    body: JSON.stringify({
      name: "BASISDATA10PPLG",
      password: "bucantik",
      bannerColor: "blue",
    }),
  });
  const createClassData = await createClassRes.json();
  assert(createClassRes.status === 201, "Create class returned 201 Created");
  assert(createClassData.success === true, "Class created successfully");
  createdClassId = createClassData.data._id;
  createdClassCode = createClassData.data.code;
  assert(createdClassCode && createdClassCode.length === 5, `Generated unique 5-char class code: ${createdClassCode}`);
  assert(createClassData.data.password === "bucantik", "Class password matches 'bucantik'");

  // Step 6, 7: Return to Kelas Saya and verify new class appears
  console.log("\nStep 6-7: Verify new class appears in Kelas Saya...");
  const myClassesRes = await fetch(`${BASE_URL}/api/guru/classes`, {
    headers: { Cookie: guru1Cookie },
  });
  const myClassesData = await myClassesRes.json();
  assert(myClassesRes.status === 200, "Kelas Saya returned 200 OK");
  const foundInList = myClassesData.data.some((c) => c._id === createdClassId);
  assert(foundInList, `Class ${createdClassId} appears in Guru's class list`);

  // Step 8, 9: Open the class and verify details appear
  console.log("\nStep 8-9: Open the class and verify details...");
  const classDetailRes = await fetch(`${BASE_URL}/api/guru/classes/${createdClassId}`, {
    headers: { Cookie: guru1Cookie },
  });
  const classDetailData = await classDetailRes.json();
  assert(classDetailRes.status === 200, "Class detail returned 200 OK");
  assert(classDetailData.data.name === "BASISDATA10PPLG", "Class name matches 'BASISDATA10PPLG'");
  assert(classDetailData.data.code === createdClassCode, "Class code matches generated code");

  // Step 10-15: Create task, attach file, set deadline & maxScore, save and verify
  console.log("\nStep 10-15: Create task with attachment, deadline, maxScore 100...");
  const createTaskRes = await fetch(`${BASE_URL}/api/guru/assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: guru1Cookie },
    body: JSON.stringify({
      title: "Praktikum Normalisasi Database 1NF-3NF",
      instructions: "Silakan normalisasikan relasi faktur penjualan menjadi 3NF.",
      type: "tugas",
      courseClassId: createdClassId,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      maxScore: 100,
      attachments: [
        {
          name: "Studi_Kasus_Faktur.pdf",
          url: "/uploads/assignments/faktur.pdf",
          type: "application/pdf",
          size: "1.2 MB",
        },
      ],
    }),
  });
  const createTaskData = await createTaskRes.json();
  assert(createTaskRes.status === 201, "Create task returned 201 Created");
  createdTaskId = createTaskData.data._id;
  assert(createdTaskId.length > 0, `Task created with ID: ${createdTaskId}`);
  assert(createTaskData.data.attachments.length === 1, "Task attachment saved successfully");
  assert(createTaskData.data.maxScore === 100, "Max score set to 100");

  // Verify task appears in the class detail
  const verifyInClassRes = await fetch(`${BASE_URL}/api/guru/classes/${createdClassId}`, {
    headers: { Cookie: guru1Cookie },
  });
  const verifyInClassData = await verifyInClassRes.json();
  const taskInClass = verifyInClassData.data.assignments.some((a) => a._id === createdTaskId);
  assert(taskInClass, "Task appears in class assignments list");

  // Step 16-18: Open task detail, edit task, verify changes saved
  console.log("\nStep 16-18: Open task detail and edit the task...");
  const taskDetailRes = await fetch(`${BASE_URL}/api/guru/assignments/${createdTaskId}`, {
    headers: { Cookie: guru1Cookie },
  });
  const taskDetailData = await taskDetailRes.json();
  assert(taskDetailRes.status === 200, "Task detail returned 200 OK");
  assert(taskDetailData.data.title === "Praktikum Normalisasi Database 1NF-3NF", "Original title verified");

  // Edit task
  const editTaskRes = await fetch(`${BASE_URL}/api/guru/assignments/${createdTaskId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: guru1Cookie },
    body: JSON.stringify({
      title: "Praktikum Normalisasi Database 1NF-3NF (REVISI)",
      instructions: "Instruksi diperbarui: cantumkan skema relasi akhir.",
      maxScore: 100,
    }),
  });
  const editTaskData = await editTaskRes.json();
  assert(editTaskRes.status === 200, "Edit task returned 200 OK");
  assert(editTaskData.data.title.includes("REVISI"), "Edited title saved successfully");

  // Step 19-22: Open Manajemen Tugas and test filters
  console.log("\nStep 19-22: Open Manajemen Tugas and apply filters...");
  const allTasksRes = await fetch(`${BASE_URL}/api/guru/assignments`, {
    headers: { Cookie: guru1Cookie },
  });
  const allTasksData = await allTasksRes.json();
  assert(allTasksRes.status === 200, "All tasks returned 200 OK");
  const taskFoundInAll = allTasksData.data.some((t) => t._id === createdTaskId);
  assert(taskFoundInAll, "Created task appears in Manajemen Tugas list");

  // Filter by search query
  const filteredSearchRes = await fetch(`${BASE_URL}/api/guru/assignments?search=REVISI`, {
    headers: { Cookie: guru1Cookie },
  });
  const filteredSearchData = await filteredSearchRes.json();
  assert(filteredSearchData.data.length >= 1, "Filter by search 'REVISI' returned matching task");
  assert(filteredSearchData.data.every((t) => t.title.toLowerCase().includes("revisi")), "All filtered tasks match query");

  // Filter by type=kuis vs type=tugas
  const filterTypeRes = await fetch(`${BASE_URL}/api/guru/assignments?type=kuis`, {
    headers: { Cookie: guru1Cookie },
  });
  const filterTypeData = await filterTypeRes.json();
  assert(filterTypeData.data.every((t) => t.type === "kuis"), "Filter by type=kuis returns only quizzes");

  // Step 23-24: Open Penilaian (Grades)
  console.log("\nStep 23-24: Open Penilaian and verify submissions belong to Guru's classes...");
  const gradesRes = await fetch(`${BASE_URL}/api/guru/grades`, {
    headers: { Cookie: guru1Cookie },
  });
  const gradesData = await gradesRes.json();
  assert(gradesRes.status === 200, "Grades API returned 200 OK");
  assert(Array.isArray(gradesData.data.classes), "Returned list of Guru's classes");
  assert(Array.isArray(gradesData.data.matrix), "Returned student grading matrix");

  // Step 25-29: Grade submission, add feedback, save and verify
  console.log("\nStep 25-29: Open a submission, grade with score 94 and feedback...");
  // Let's get submissions list for seeded class / assignment
  const subsRes = await fetch(`${BASE_URL}/api/guru/submissions`, {
    headers: { Cookie: guru1Cookie },
  });
  const subsData = await subsRes.json();
  assert(subsRes.status === 200, "Submissions API returned 200 OK");
  assert(subsData.data.length > 0, `Found ${subsData.data.length} submissions for Guru`);
  targetSubmissionId = subsData.data[0]._id;

  // Grade the submission
  const gradeRes = await fetch(`${BASE_URL}/api/guru/submissions/${targetSubmissionId}/grade`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: guru1Cookie },
    body: JSON.stringify({
      score: 94,
      feedback: "Solusi query DDL dan relasi sangat rapi dan memenuhi standar industri.",
      status: "graded",
    }),
  });
  const gradeData = await gradeRes.json();
  assert(gradeRes.status === 200, "Grade submission returned 200 OK");
  assert(gradeData.data.score === 94, "Saved score matches 94");
  assert(gradeData.data.feedback.includes("standar industri"), "Saved feedback matches");

  // Verify in GET submission detail
  const verifySubRes = await fetch(`${BASE_URL}/api/guru/submissions/${targetSubmissionId}`, {
    headers: { Cookie: guru1Cookie },
  });
  const verifySubData = await verifySubRes.json();
  assert(verifySubRes.status === 200, "Submission detail returned 200 OK");
  assert(verifySubData.data.score === 94, "Persisted score verified: 94");
  assert(verifySubData.data.feedback.includes("standar industri"), "Persisted feedback verified");

  // Step 30-31: Generate / download Academic Report
  console.log("\nStep 30-31: Generate Academic Report and verify database data...");
  const reportClassId = gradesData.data.selectedClass._id;
  const reportRes = await fetch(`${BASE_URL}/api/guru/academic-report?courseClassId=${reportClassId}`, {
    headers: { Cookie: guru1Cookie },
  });
  assert(reportRes.status === 200, "Academic Report API returned 200 OK");
  const contentType = reportRes.headers.get("content-type") || "";
  assert(
    contentType.includes("spreadsheetml") || contentType.includes("octet-stream"),
    `Report returned valid Excel spreadsheet (Content-Type: ${contentType})`
  );
  const reportBuffer = await reportRes.arrayBuffer();
  assert(reportBuffer.byteLength > 1000, `Generated report file size is ${reportBuffer.byteLength} bytes (contains real data)`);

  // Step 32-33: Test unauthorized access using another Guru account (Siti Lestari)
  console.log("\nStep 32-33: Test unauthorized access using another Guru account...");
  const guru2 = await login("siti.lestari@sekolah.sch.id", "password123");
  guru2Cookie = guru2.cookie;
  assert(guru2.user.role === "guru", `Authenticated as Guru 2: ${guru2.user.name}`);

  // Test 1: Guru 2 tries to GET Guru 1's class
  const unauthClassRes = await fetch(`${BASE_URL}/api/guru/classes/${createdClassId}`, {
    headers: { Cookie: guru2Cookie },
  });
  assert(unauthClassRes.status === 403, `Guru 2 blocked from GET Guru 1's class (status: ${unauthClassRes.status})`);

  // Test 2: Guru 2 tries to PUT Guru 1's class
  const unauthPutClassRes = await fetch(`${BASE_URL}/api/guru/classes/${createdClassId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: guru2Cookie },
    body: JSON.stringify({ name: "HACKED_BY_GURU_2" }),
  });
  assert(unauthPutClassRes.status === 403, `Guru 2 blocked from PUT Guru 1's class (status: ${unauthPutClassRes.status})`);

  // Test 3: Guru 2 tries to DELETE Guru 1's class
  const unauthDelClassRes = await fetch(`${BASE_URL}/api/guru/classes/${createdClassId}`, {
    method: "DELETE",
    headers: { Cookie: guru2Cookie },
  });
  assert(unauthDelClassRes.status === 403, `Guru 2 blocked from DELETE Guru 1's class (status: ${unauthDelClassRes.status})`);

  // Test 4: Guru 2 tries to GET Guru 1's assignment
  const unauthTaskRes = await fetch(`${BASE_URL}/api/guru/assignments/${createdTaskId}`, {
    headers: { Cookie: guru2Cookie },
  });
  assert(unauthTaskRes.status === 403, `Guru 2 blocked from GET Guru 1's assignment (status: ${unauthTaskRes.status})`);

  // Test 5: Guru 2 tries to PUT Guru 1's assignment
  const unauthPutTaskRes = await fetch(`${BASE_URL}/api/guru/assignments/${createdTaskId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: guru2Cookie },
    body: JSON.stringify({ title: "HACKED_ASSIGNMENT" }),
  });
  assert(unauthPutTaskRes.status === 403, `Guru 2 blocked from PUT Guru 1's assignment (status: ${unauthPutTaskRes.status})`);

  // Test 6: Guru 2 tries to POST a task into Guru 1's class
  const unauthPostTaskRes = await fetch(`${BASE_URL}/api/guru/assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: guru2Cookie },
    body: JSON.stringify({
      title: "Tugas Liar",
      courseClassId: createdClassId,
      maxScore: 100,
    }),
  });
  assert(unauthPostTaskRes.status === 403, `Guru 2 blocked from creating task inside Guru 1's class (status: ${unauthPostTaskRes.status})`);

  // Test 7: Guru 2 tries to grade Guru 1's submission
  const unauthGradeRes = await fetch(`${BASE_URL}/api/guru/submissions/${targetSubmissionId}/grade`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: guru2Cookie },
    body: JSON.stringify({ score: 0, feedback: "Hacked" }),
  });
  assert(unauthGradeRes.status === 403, `Guru 2 blocked from grading Guru 1's submission (status: ${unauthGradeRes.status})`);

  // Test 8: Guru 2 tries to access academic report for Guru 1's class
  const unauthReportRes = await fetch(`${BASE_URL}/api/guru/academic-report?courseClassId=${createdClassId}`, {
    headers: { Cookie: guru2Cookie },
  });
  assert(unauthReportRes.status === 403, `Guru 2 blocked from exporting report for Guru 1's class (status: ${unauthReportRes.status})`);

  console.log("\n==================================================");
  console.log("🎉 ALL 33 SCENARIO STEPS AND SECURITY CHECKS PASSED!");
  console.log("==================================================\n");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
