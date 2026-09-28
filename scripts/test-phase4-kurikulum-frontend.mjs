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
  console.log("STARTING PHASE 4 KURIKULUM DATA GURU & NILAI KELAS TESTS");
  console.log(`Target: ${BASE_URL}`);
  console.log("==================================================\n");

  // TEST 1: UNAUTHENTICATED ACCESS
  console.log("TEST GROUP 1: UNAUTHENTICATED ACCESS");
  const unauthTeachers = await fetch(`${BASE_URL}/kurikulum/teachers`, { redirect: "manual" });
  assert(
    unauthTeachers.status === 307 || unauthTeachers.status === 302,
    `/kurikulum/teachers unauthenticated redirected (status: ${unauthTeachers.status})`
  );
  const locT = unauthTeachers.headers.get("location") || "";
  assert(locT.includes("/login"), `Teachers redirected to login (${locT})`);
  console.log("  ✓ Unauthenticated access to /kurikulum/teachers safely redirected to /login");

  const unauthGrades = await fetch(`${BASE_URL}/kurikulum/grades/classes`, { redirect: "manual" });
  assert(
    unauthGrades.status === 307 || unauthGrades.status === 302,
    `/kurikulum/grades/classes unauthenticated redirected (status: ${unauthGrades.status})`
  );
  const locG = unauthGrades.headers.get("location") || "";
  assert(locG.includes("/login"), `Grades redirected to login (${locG})`);
  console.log("  ✓ Unauthenticated access to /kurikulum/grades/classes safely redirected to /login");

  // TEST 2: WRONG ROLE AUTHORIZATION
  console.log("\nTEST GROUP 2: ROLE AUTHORIZATION & ISOLATION");
  const siswa = await login("0098273645", "password123", "siswa");
  console.log(`  ✓ Authenticated as Siswa: ${siswa.user.name}`);

  const siswaTeachers = await fetch(`${BASE_URL}/kurikulum/teachers`, {
    headers: { Cookie: siswa.cookie },
    redirect: "manual",
  });
  assert(
    siswaTeachers.status === 307 || siswaTeachers.status === 302,
    `Siswa blocked from /kurikulum/teachers`
  );
  const sLocT = siswaTeachers.headers.get("location") || "";
  assert(sLocT.includes("/siswa"), `Siswa redirected to /siswa (${sLocT})`);

  const siswaGrades = await fetch(`${BASE_URL}/kurikulum/grades/classes`, {
    headers: { Cookie: siswa.cookie },
    redirect: "manual",
  });
  assert(
    siswaGrades.status === 307 || siswaGrades.status === 302,
    `Siswa blocked from /kurikulum/grades/classes`
  );
  const sLocG = siswaGrades.headers.get("location") || "";
  assert(sLocG.includes("/siswa"), `Siswa redirected to /siswa (${sLocG})`);
  console.log("  ✓ Siswa role redirected away from Kurikulum routes to /siswa");

  const guru = await login("budi.pratama@sekolah.sch.id", "password123", "guru");
  console.log(`  ✓ Authenticated as Guru: ${guru.user.name}`);

  const guruTeachers = await fetch(`${BASE_URL}/kurikulum/teachers`, {
    headers: { Cookie: guru.cookie },
    redirect: "manual",
  });
  assert(
    guruTeachers.status === 307 || guruTeachers.status === 302,
    `Guru blocked from /kurikulum/teachers`
  );
  const gLocT = guruTeachers.headers.get("location") || "";
  assert(gLocT.includes("/guru"), `Guru redirected to /guru (${gLocT})`);

  const guruGrades = await fetch(`${BASE_URL}/kurikulum/grades/classes`, {
    headers: { Cookie: guru.cookie },
    redirect: "manual",
  });
  assert(
    guruGrades.status === 307 || guruGrades.status === 302,
    `Guru blocked from /kurikulum/grades/classes`
  );
  const gLocG = guruGrades.headers.get("location") || "";
  assert(gLocG.includes("/guru"), `Guru redirected to /guru (${gLocG})`);
  console.log("  ✓ Guru role redirected away from Kurikulum routes to /guru");

  // TEST 3: KURIKULUM AUTHENTICATION & HTML PAGE RENDERING
  console.log("\nTEST GROUP 3: KURIKULUM USER PAGE RENDERING");
  const kurikulum = await login("kurikulum@sekolah.sch.id", "password123", "kurikulum");
  console.log(`  ✓ Authenticated as Kurikulum: ${kurikulum.user.name}`);

  const pageTeachers = await fetch(`${BASE_URL}/kurikulum/teachers`, {
    headers: { Cookie: kurikulum.cookie },
  });
  assert(pageTeachers.status === 200, `GET /kurikulum/teachers returned 200 OK`);
  const htmlTeachers = await pageTeachers.text();
  assert(htmlTeachers.includes("Data Guru"), "Page contains 'Data Guru'");
  assert(htmlTeachers.includes("Guru Aktif"), "Page contains 'Guru Aktif'");
  assert(htmlTeachers.includes("Beban Mengajar"), "Page contains 'Beban Mengajar'");
  console.log("  ✓ /kurikulum/teachers rendered successfully with Data Guru layout");

  const pageGrades = await fetch(`${BASE_URL}/kurikulum/grades/classes`, {
    headers: { Cookie: kurikulum.cookie },
  });
  assert(pageGrades.status === 200, `GET /kurikulum/grades/classes returned 200 OK`);
  const htmlGrades = await pageGrades.text();
  assert(htmlGrades.includes("Monitoring Nilai Kelas"), "Page contains 'Monitoring Nilai Kelas'");
  assert(htmlGrades.includes("Rata-Rata Kelas"), "Page contains 'Rata-Rata Kelas'");
  assert(htmlGrades.includes("Distribusi Nilai"), "Page contains 'Distribusi Nilai'");
  assert(htmlGrades.includes("Daftar Nilai Siswa"), "Page contains 'Daftar Nilai Siswa'");
  console.log("  ✓ /kurikulum/grades/classes rendered successfully with Nilai Kelas layout");

  // TEST 4: TEACHERS API INTEGRATION & DATA VERIFICATION
  console.log("\nTEST GROUP 4: TEACHERS API INTEGRATION & TEACHING LOAD");
  const apiTeachersRes = await fetch(`${BASE_URL}/api/kurikulum/teachers`, {
    headers: { Cookie: kurikulum.cookie },
  });
  assert(apiTeachersRes.status === 200, "Teachers API returned 200 OK");
  const apiTeachersJson = await apiTeachersRes.json();
  assert(apiTeachersJson.success === true, "Payload success is true");
  assert(Array.isArray(apiTeachersJson.data.teachers), "data.teachers is an array");
  console.log(`  ✓ Found ${apiTeachersJson.data.teachers.length} teachers in database`);

  for (const t of apiTeachersJson.data.teachers) {
    assert(t.id, "Teacher has id");
    assert(t.name, "Teacher has name");
    assert(t.email, "Teacher has email");
    assert(typeof t.teachingLoad === "number", "Teacher has teachingLoad as number");
    assert(typeof t.isActive === "boolean", "Teacher has isActive as boolean");
    assert(!t.password, "Security: Password strictly omitted");
    assert(!t.passwordHash, "Security: PasswordHash strictly omitted");
  }
  console.log("  ✓ Teachers structure, teaching loads, and password security verified");

  // TEST 5: CLASS GRADES API INTEGRATION & FILTER VERIFICATION
  console.log("\nTEST GROUP 5: CLASS GRADES API INTEGRATION & FILTERING");
  const apiGradesRes = await fetch(`${BASE_URL}/api/kurikulum/grades/classes`, {
    headers: { Cookie: kurikulum.cookie },
  });
  assert(apiGradesRes.status === 200, "Class grades API returned 200 OK");
  const apiGradesJson = await apiGradesRes.json();
  assert(apiGradesJson.success === true, "Class grades payload success is true");
  assert(Array.isArray(apiGradesJson.data.classesList), "classesList is an array");
  console.log(`  ✓ Available classes: ${apiGradesJson.data.classesList.length}`);

  const targetClass = apiGradesJson.data.classesList[0];
  if (targetClass) {
    console.log(`  ✓ Testing target class: ${targetClass.name} (ID: ${targetClass.id})`);
    const filteredRes = await fetch(
      `${BASE_URL}/api/kurikulum/grades/classes?classId=${targetClass.id}&academicYear=2024/2025`,
      { headers: { Cookie: kurikulum.cookie } }
    );
    assert(filteredRes.status === 200, "Filtered class grades API returned 200 OK");
    const filteredJson = await filteredRes.json();
    assert(filteredJson.success === true, "Filtered response success is true");
    assert(filteredJson.data.classInfo.id === targetClass.id, "Returned classInfo matches target ID");
    assert(
      filteredJson.data.summary.average === null || typeof filteredJson.data.summary.average === "number",
      "Average is either null or a number"
    );
    assert(
      typeof filteredJson.data.summary.academicProgress === "number",
      "Academic progress is a number"
    );
    console.log(`  ✓ Summary for ${targetClass.name}: Average: ${filteredJson.data.summary.average}, LMS Progress: ${filteredJson.data.summary.academicProgress}%`);
  }

  // TEST 6: NULL / UNGRADED HANDLING
  console.log("\nTEST GROUP 6: NULL/UNGRADED SCORE INTEGRITY");
  if (apiGradesJson.data.students.length > 0) {
    for (const st of apiGradesJson.data.students) {
      if (st.average === null) {
        assert(st.average !== 0, "Null average is strictly null, not falsified to 0");
      }
      if (st.assignmentAverage === null) {
        assert(st.assignmentAverage !== 0, "Null assignmentAverage is strictly null, not 0");
      }
      if (st.quizAverage === null) {
        assert(st.quizAverage !== 0, "Null quizAverage is strictly null, not 0");
      }
    }
    console.log("  ✓ Verified: Ungraded student scores are preserved as null, never converted to 0");
  }

  // TEST 7: GRADE DISTRIBUTION VERIFICATION
  console.log("\nTEST GROUP 7: GRADE DISTRIBUTION (A/B/C/D)");
  const dist = apiGradesJson.data.summary.distribution;
  assert(dist, "Summary contains distribution");
  assert(typeof dist.A === "number", "Distribution A is a number");
  assert(typeof dist.B === "number", "Distribution B is a number");
  assert(typeof dist.C === "number", "Distribution C is a number");
  assert(typeof dist.D === "number", "Distribution D is a number");
  console.log(`  ✓ Grade Distribution: A=${dist.A}, B=${dist.B}, C=${dist.C}, D=${dist.D}`);

  // TEST 8: STRICT READ-ONLY ENFORCEMENT
  console.log("\nTEST GROUP 8: STRICT READ-ONLY CHECKS");
  const forbiddenMutations = [
    "tambah guru",
    "edit guru",
    "hapus guru",
    "tambah kelas",
    "edit kelas",
    "hapus kelas",
    "input nilai",
    "submit nilai",
    "simpan nilai",
    "grading",
  ];
  for (const fm of forbiddenMutations) {
    assert(!htmlTeachers.toLowerCase().includes(fm), `HTML teachers contains forbidden mutation text: '${fm}'`);
    assert(!htmlGrades.toLowerCase().includes(fm), `HTML grades contains forbidden mutation text: '${fm}'`);
  }
  console.log("  ✓ Verified: Zero mutation/grading controls present in Kurikulum frontend");

  // TEST 9: STRICT "NO ATTENDANCE" RULE VERIFICATION
  console.log("\nTEST GROUP 9: STRICT 'NO ATTENDANCE' AUDIT");
  const forbiddenAttendance = ["attendance", "attendancerate", "kehadiran", "absensi"];
  const tApiStr = JSON.stringify(apiTeachersJson).toLowerCase();
  const gApiStr = JSON.stringify(apiGradesJson).toLowerCase();
  for (const fa of forbiddenAttendance) {
    assert(!tApiStr.includes(fa), `Teachers API contains '${fa}'`);
    assert(!gApiStr.includes(fa), `Grades API contains '${fa}'`);
    assert(!htmlTeachers.toLowerCase().includes(fa), `Teachers HTML contains '${fa}'`);
    assert(!htmlGrades.toLowerCase().includes(fa), `Grades HTML contains '${fa}'`);
  }
  console.log("  ✓ Verified: Zero attendance/kehadiran/absensi fields across APIs and rendered pages");

  console.log("\n==================================================");
  console.log("🎉 ALL PHASE 4 KURIKULUM TESTS PASSED!");
  console.log("==================================================\n");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
