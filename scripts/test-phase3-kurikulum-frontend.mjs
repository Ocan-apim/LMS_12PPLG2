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
  console.log("STARTING PHASE 3 KURIKULUM DASHBOARD FRONTEND TESTS");
  console.log(`Target: ${BASE_URL}`);
  console.log("==================================================\n");

  // TEST 1: UNAUTHENTICATED ACCESS TO /kurikulum
  console.log("TEST GROUP 1: UNAUTHENTICATED ROUTE ACCESS");
  const unauthRes = await fetch(`${BASE_URL}/kurikulum`, { redirect: "manual" });
  assert(
    unauthRes.status === 307 || unauthRes.status === 302,
    `Unauthenticated /kurikulum redirected (status ${unauthRes.status})`
  );
  const location = unauthRes.headers.get("location") || "";
  assert(location.includes("/login"), `Redirects to login page (${location})`);
  console.log("  ✓ Unauthenticated access safely redirected to /login");

  // TEST 2: WRONG ROLE ACCESS PROTECTION
  console.log("\nTEST GROUP 2: ROLE AUTHORIZATION & REDIRECTION");
  const siswa = await login("0098273645", "password123", "siswa");
  console.log(`  ✓ Authenticated as Siswa: ${siswa.user.name}`);
  const siswaAccess = await fetch(`${BASE_URL}/kurikulum`, {
    headers: { Cookie: siswa.cookie },
    redirect: "manual",
  });
  assert(
    siswaAccess.status === 307 || siswaAccess.status === 302,
    `Siswa accessing /kurikulum redirected (status ${siswaAccess.status})`
  );
  const siswaRedirect = siswaAccess.headers.get("location") || "";
  assert(siswaRedirect.includes("/siswa"), `Siswa redirected to /siswa (${siswaRedirect})`);
  console.log("  ✓ Siswa role redirected away from /kurikulum to /siswa");

  const guru = await login("budi.pratama@sekolah.sch.id", "password123", "guru");
  console.log(`  ✓ Authenticated as Guru: ${guru.user.name}`);
  const guruAccess = await fetch(`${BASE_URL}/kurikulum`, {
    headers: { Cookie: guru.cookie },
    redirect: "manual",
  });
  assert(
    guruAccess.status === 307 || guruAccess.status === 302,
    `Guru accessing /kurikulum redirected (status ${guruAccess.status})`
  );
  const guruRedirect = guruAccess.headers.get("location") || "";
  assert(guruRedirect.includes("/guru"), `Guru redirected to /guru (${guruRedirect})`);
  console.log("  ✓ Guru role redirected away from /kurikulum to /guru");

  // TEST 3: KURIKULUM AUTHENTICATION & PAGE RENDERING
  console.log("\nTEST GROUP 3: KURIKULUM USER PAGE RENDERING");
  const kurikulum = await login("kurikulum@sekolah.sch.id", "password123", "kurikulum");
  console.log(`  ✓ Authenticated as Kurikulum: ${kurikulum.user.name}`);
  const pageRes = await fetch(`${BASE_URL}/kurikulum`, {
    headers: { Cookie: kurikulum.cookie },
  });
  assert(pageRes.status === 200, `GET /kurikulum returned 200 OK (status: ${pageRes.status})`);
  const html = await pageRes.text();
  assert(html.includes("Monitoring Aktivitas Akademik"), "Page contains 'Monitoring Aktivitas Akademik'");
  assert(html.includes("Kelas Aktif"), "Page contains summary card label 'Kelas Aktif'");
  assert(html.includes("Unduh Laporan Nilai"), "Page contains 'Unduh Laporan Nilai'");
  console.log("  ✓ /kurikulum HTML rendered successfully with expected UI structure");

  // TEST 4: DASHBOARD API DATA ACCURACY
  console.log("\nTEST GROUP 4: DASHBOARD API DATA INTEGRATION");
  const apiRes = await fetch(`${BASE_URL}/api/kurikulum/dashboard`, {
    headers: { Cookie: kurikulum.cookie },
  });
  assert(apiRes.status === 200, `GET /api/kurikulum/dashboard returned 200 OK`);
  const apiJson = await apiRes.json();
  assert(apiJson.success === true, "API payload success is true");
  assert(typeof apiJson.data.totalActiveClasses === "number", "totalActiveClasses is a number");
  assert(typeof apiJson.data.totalStudents === "number", "totalStudents is a number");
  assert(typeof apiJson.data.totalTeachers === "number", "totalTeachers is a number");
  assert(typeof apiJson.data.totalSubjects === "number", "totalSubjects is a number");
  assert(Array.isArray(apiJson.data.recentActivities), "recentActivities is an array");
  console.log(`  ✓ Live stats: ${apiJson.data.totalActiveClasses} active classes, ${apiJson.data.totalStudents} students, ${apiJson.data.totalTeachers} teachers, ${apiJson.data.totalSubjects} subjects`);
  console.log(`  ✓ Loaded ${apiJson.data.recentActivities.length} recent activities`);

  if (apiJson.data.recentActivities.length > 0) {
    const first = apiJson.data.recentActivities[0];
    assert(first.id, "Activity has id");
    assert(["assignment", "quiz", "material", "post"].includes(first.type), `Activity has valid type: ${first.type}`);
    assert(first.title, "Activity has title");
    assert(first.teacherName, "Activity has teacherName");
    assert(first.courseClassName, "Activity has courseClassName");
    assert(first.subjectName, "Activity has subjectName");
    assert(first.createdAt, "Activity has createdAt");
    console.log(`  ✓ Sample activity verified: [${first.type}] "${first.title}" by ${first.teacherName}`);
  }

  // TEST 5: STRICT "NO ATTENDANCE" RULE VERIFICATION
  console.log("\nTEST GROUP 5: STRICT 'NO ATTENDANCE' AUDIT");
  const forbiddenKeywords = ["attendance", "attendancerate", "kehadiran", "absensi"];
  const apiString = JSON.stringify(apiJson).toLowerCase();
  for (const kw of forbiddenKeywords) {
    assert(!apiString.includes(kw), `API response contains forbidden keyword '${kw}'`);
  }
  const htmlLower = html.toLowerCase();
  for (const kw of forbiddenKeywords) {
    assert(!htmlLower.includes(kw), `Rendered HTML contains forbidden keyword '${kw}'`);
  }
  console.log("  ✓ Verified: Zero attendance/kehadiran/absensi fields in API and rendered HTML");

  console.log("\n==================================================");
  console.log("🎉 ALL PHASE 3 KURIKULUM DASHBOARD TESTS PASSED!");
  console.log("==================================================\n");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
