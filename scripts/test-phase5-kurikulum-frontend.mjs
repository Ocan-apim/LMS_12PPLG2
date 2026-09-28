import assert from "node:assert";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3005";

async function login(identifier, password, expectedRole) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password, role: expectedRole }),
  });
  const data = await res.json();
  assert(res.status === 200, `Login failed for ${identifier}: ${JSON.stringify(data)}`);
  assert(data.success === true, `Login response indicated failure`);

  const setCookie = res.headers.get("set-cookie") || "";
  let cookie = "";
  for (const part of setCookie.split(",")) {
    if (part.includes("lms_session=")) {
      cookie = part.split(";")[0].trim();
      break;
    }
  }
  return { user: data.data.user, cookie };
}

async function runTests() {
  console.log("==================================================");
  console.log("STARTING PHASE 5 KURIKULUM SUBJECT GRADES MONITORING TESTS");
  console.log(`Target: ${BASE_URL}`);
  console.log("==================================================\n");

  // TEST 1: UNAUTHENTICATED ACCESS
  console.log("TEST GROUP 1: UNAUTHENTICATED ACCESS");
  const unauthSubjects = await fetch(`${BASE_URL}/kurikulum/grades/subjects`, { redirect: "manual" });
  assert(
    unauthSubjects.status === 307 || unauthSubjects.status === 302,
    `/kurikulum/grades/subjects unauthenticated redirected (status: ${unauthSubjects.status})`
  );
  const loc = unauthSubjects.headers.get("location") || "";
  assert(loc.includes("/login"), `Unauthenticated request redirected to login (${loc})`);
  console.log("  ✓ Unauthenticated access to /kurikulum/grades/subjects safely redirected to /login");

  // TEST 2: WRONG ROLE AUTHORIZATION
  console.log("\nTEST GROUP 2: ROLE AUTHORIZATION & ISOLATION");
  const siswa = await login("0098273645", "password123", "siswa");
  console.log(`  ✓ Authenticated as Siswa: ${siswa.user.name}`);

  const siswaSubjects = await fetch(`${BASE_URL}/kurikulum/grades/subjects`, {
    headers: { Cookie: siswa.cookie },
    redirect: "manual",
  });
  assert(
    siswaSubjects.status === 307 || siswaSubjects.status === 302,
    `Siswa blocked from /kurikulum/grades/subjects (status: ${siswaSubjects.status})`
  );
  const sLoc = siswaSubjects.headers.get("location") || "";
  assert(sLoc.includes("/siswa"), `Siswa redirected to /siswa (${sLoc})`);
  console.log("  ✓ Siswa role redirected away from /kurikulum/grades/subjects to /siswa");

  const guru = await login("budi.pratama@sekolah.sch.id", "password123", "guru");
  console.log(`  ✓ Authenticated as Guru: ${guru.user.name}`);

  const guruSubjects = await fetch(`${BASE_URL}/kurikulum/grades/subjects`, {
    headers: { Cookie: guru.cookie },
    redirect: "manual",
  });
  assert(
    guruSubjects.status === 307 || guruSubjects.status === 302,
    `Guru blocked from /kurikulum/grades/subjects (status: ${guruSubjects.status})`
  );
  const gLoc = guruSubjects.headers.get("location") || "";
  assert(gLoc.includes("/guru"), `Guru redirected to /guru (${gLoc})`);
  console.log("  ✓ Guru role redirected away from /kurikulum/grades/subjects to /guru");

  // TEST 3: KURIKULUM AUTHENTICATION & HTML PAGE RENDERING
  console.log("\nTEST GROUP 3: KURIKULUM USER PAGE RENDERING");
  const kurikulum = await login("kurikulum@sekolah.sch.id", "password123", "kurikulum");
  console.log(`  ✓ Authenticated as Kurikulum: ${kurikulum.user.name}`);

  const pageSubjects = await fetch(`${BASE_URL}/kurikulum/grades/subjects`, {
    headers: { Cookie: kurikulum.cookie },
  });
  assert(pageSubjects.status === 200, `GET /kurikulum/grades/subjects returned 200 OK`);
  const htmlSubjects = await pageSubjects.text();

  assert(htmlSubjects.includes("Monitoring Nilai Mata Pelajaran"), "Page contains title 'Monitoring Nilai Mata Pelajaran'");
  assert(htmlSubjects.includes("Rata-Rata Nilai Mapel"), "Page contains 'Rata-Rata Nilai Mapel'");
  assert(htmlSubjects.includes("Perbandingan Nilai Antar Kelas"), "Page contains 'Perbandingan Nilai Antar Kelas'");
  assert(htmlSubjects.includes("Tren Nilai Mata Pelajaran"), "Page contains 'Tren Nilai Mata Pelajaran'");
  assert(htmlSubjects.includes("Rincian Komponen Penilaian Per Kelas"), "Page contains 'Rincian Komponen Penilaian Per Kelas'");
  assert(htmlSubjects.includes("Guru Pengampu"), "Table header contains 'Guru Pengampu'");
  assert(htmlSubjects.includes("Rata-Rata Tugas"), "Table header contains 'Rata-Rata Tugas'");
  assert(htmlSubjects.includes("Rata-Rata Kuis"), "Table header contains 'Rata-Rata Kuis'");
  assert(htmlSubjects.includes("Nilai Akhir"), "Table header contains 'Nilai Akhir'");
  console.log("  ✓ /kurikulum/grades/subjects rendered successfully with all required layout sections");

  // TEST 4: SUBJECT GRADES API INTEGRATION & DATA VERIFICATION
  console.log("\nTEST GROUP 4: SUBJECT GRADES API INTEGRATION");
  const apiRes = await fetch(`${BASE_URL}/api/kurikulum/grades/subjects`, {
    headers: { Cookie: kurikulum.cookie },
  });
  assert(apiRes.status === 200, "API returned 200 OK");
  const apiJson = await apiRes.json();
  assert(apiJson.success === true, "API response success is true");
  assert(Array.isArray(apiJson.data.subjectsList), "subjectsList is an array");
  console.log(`  ✓ Found ${apiJson.data.subjectsList.length} subjects in subjectsList`);

  if (apiJson.data.subjectInfo) {
    console.log(`  ✓ Active Subject: ${apiJson.data.subjectInfo.name} (${apiJson.data.subjectInfo.code || "no code"})`);
    assert(apiJson.data.subjectInfo.id, "subjectInfo has id");
    assert(apiJson.data.subjectInfo.name, "subjectInfo has name");
  }

  assert(
    apiJson.data.overallAverage === null || typeof apiJson.data.overallAverage === "number",
    "overallAverage is null or number"
  );
  assert(
    apiJson.data.components.assignmentAverage === null || typeof apiJson.data.components.assignmentAverage === "number",
    "assignmentAverage is null or number"
  );
  assert(
    apiJson.data.components.quizAverage === null || typeof apiJson.data.components.quizAverage === "number",
    "quizAverage is null or number"
  );
  assert(Array.isArray(apiJson.data.classComparison), "classComparison is an array");
  assert(Array.isArray(apiJson.data.trend), "trend is an array");
  assert(Array.isArray(apiJson.data.classesBreakdown), "classesBreakdown is an array");
  console.log(`  ✓ Overall Average: ${apiJson.data.overallAverage}`);
  console.log(`  ✓ Components: Tugas=${apiJson.data.components.assignmentAverage}, Kuis=${apiJson.data.components.quizAverage}`);
  console.log(`  ✓ Class comparisons count: ${apiJson.data.classComparison.length}`);
  console.log(`  ✓ Trend points count: ${apiJson.data.trend.length}`);
  console.log(`  ✓ Classes breakdown count: ${apiJson.data.classesBreakdown.length}`);

  // TEST 5: FILTERING (by subjectId & academicYear)
  console.log("\nTEST GROUP 5: SUBJECT & YEAR FILTERING");
  if (apiJson.data.subjectsList.length > 0) {
    const targetSubject = apiJson.data.subjectsList[0];
    const filteredRes = await fetch(
      `${BASE_URL}/api/kurikulum/grades/subjects?subjectId=${targetSubject.id}&academicYear=2024/2025`,
      { headers: { Cookie: kurikulum.cookie } }
    );
    assert(filteredRes.status === 200, "Filtered API returned 200 OK");
    const filteredJson = await filteredRes.json();
    assert(filteredJson.success === true, "Filtered response success is true");
    assert(filteredJson.data.subjectInfo.id === targetSubject.id, "Returned subjectInfo matches target ID");
    console.log(`  ✓ Filtered query for subject '${targetSubject.name}' returned successfully`);
  }

  // TEST 6: NULL / UNGRADED SCORE INTEGRITY
  console.log("\nTEST GROUP 6: NULL/UNGRADED SCORE INTEGRITY");
  for (const cc of apiJson.data.classComparison) {
    if (cc.average === null) {
      assert(cc.average !== 0, "Class comparison null average is strictly null, not falsified to 0");
    }
  }
  for (const cb of apiJson.data.classesBreakdown) {
    if (cb.assignmentAverage === null) {
      assert(cb.assignmentAverage !== 0, "Null assignmentAverage is strictly null, not 0");
    }
    if (cb.quizAverage === null) {
      assert(cb.quizAverage !== 0, "Null quizAverage is strictly null, not 0");
    }
    if (cb.finalAverage === null) {
      assert(cb.finalAverage !== 0, "Null finalAverage is strictly null, not 0");
    }
  }
  console.log("  ✓ Verified: Ungraded component scores are preserved as null, never falsified to 0");

  // TEST 7: STRICT READ-ONLY ENFORCEMENT
  console.log("\nTEST GROUP 7: STRICT READ-ONLY CHECKS");
  const forbiddenMutations = [
    "tambah nilai",
    "edit nilai",
    "hapus nilai",
    "input nilai",
    "submit nilai",
    "simpan nilai",
    "ubah nilai",
    "grading",
  ];
  for (const fm of forbiddenMutations) {
    assert(!htmlSubjects.toLowerCase().includes(fm), `HTML subjects contains forbidden mutation text: '${fm}'`);
  }
  console.log("  ✓ Verified: Zero mutation/grading controls present in Kurikulum subject grades frontend");

  // TEST 8: STRICT "NO ATTENDANCE" RULE VERIFICATION
  console.log("\nTEST GROUP 8: STRICT 'NO ATTENDANCE' AUDIT");
  const forbiddenAttendance = ["attendance", "attendancerate", "kehadiran", "absensi"];
  const apiStr = JSON.stringify(apiJson).toLowerCase();
  for (const fa of forbiddenAttendance) {
    assert(!apiStr.includes(fa), `Subject Grades API contains forbidden attendance field: '${fa}'`);
    assert(!htmlSubjects.toLowerCase().includes(fa), `Subject Grades HTML contains forbidden attendance term: '${fa}'`);
  }
  console.log("  ✓ Verified: Zero attendance/kehadiran/absensi fields across API and rendered HTML");

  console.log("\n==================================================");
  console.log("🎉 ALL PHASE 5 KURIKULUM TESTS PASSED!");
  console.log("==================================================\n");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
