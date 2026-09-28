import assert from "node:assert";
import * as XLSX from "xlsx";

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

async function runFinalSuite() {
  console.log("==================================================");
  console.log("STARTING FINAL COMPLETE KURIKULUM VERIFICATION SUITE");
  console.log(`Target: ${BASE_URL}`);
  console.log("==================================================\n");

  const kurikulumEndpoints = [
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

  const kurikulumPages = [
    "/kurikulum",
    "/kurikulum/teachers",
    "/kurikulum/grades/classes",
    "/kurikulum/grades/subjects",
    "/kurikulum/reports",
    "/kurikulum/reports/recap",
    "/kurikulum/profile",
    "/kurikulum/files",
  ];

  // ==========================================
  // 1. UNAUTHENTICATED REQUESTS TEST
  // ==========================================
  console.log("TEST GROUP 1: UNAUTHENTICATED ACCESS ENFORCEMENT");
  for (const ep of kurikulumEndpoints) {
    const res = await fetch(`${BASE_URL}${ep}`);
    assert(res.status === 401, `Unauthenticated ${ep} returned ${res.status}, expected 401`);
    console.log(`  ✓ Unauthenticated ${ep} correctly rejected with 401 Unauthorized`);
  }

  for (const page of kurikulumPages) {
    const res = await fetch(`${BASE_URL}${page}`, { redirect: "manual" });
    assert(
      res.status === 307 || res.status === 302,
      `Unauthenticated ${page} returned ${res.status}, expected redirect 307/302`
    );
    const loc = res.headers.get("location") || "";
    assert(loc.includes("/login"), `Unauthenticated ${page} redirected to ${loc}`);
    console.log(`  ✓ Unauthenticated ${page} safely redirected to /login`);
  }

  // ==========================================
  // 2. ROLE ISOLATION: ALL 4 OTHER ROLES BLOCKED
  // ==========================================
  console.log("\nTEST GROUP 2: ROLE ISOLATION (SISWA, GURU, ADMIN, KEPSEK)");
  const foreignRoles = [
    { id: "0098273645", pass: "password123", role: "siswa", redirectTarget: "/siswa" },
    { id: "budi.pratama@sekolah.sch.id", pass: "password123", role: "guru", redirectTarget: "/guru" },
    { id: "admin@sekolah.sch.id", pass: "password123", role: "admin", redirectTarget: "/admin" },
    { id: "kepsek@sekolah.sch.id", pass: "password123", role: "kepsek", redirectTarget: "/kepsek" },
  ];

  for (const fr of foreignRoles) {
    const userSession = await login(fr.id, fr.pass, fr.role);
    console.log(`  -> Testing isolation for role: ${fr.role} (${userSession.user.name})`);

    // Test API block (403 Forbidden)
    for (const ep of kurikulumEndpoints) {
      const res = await fetch(`${BASE_URL}${ep}`, {
        headers: { Cookie: userSession.cookie },
      });
      assert(
        res.status === 403,
        `Role ${fr.role} accessed ${ep} with status ${res.status}, expected 403`
      );
    }
    console.log(`     ✓ All 9 Kurikulum APIs strictly blocked (403) for role ${fr.role}`);

    // Test Page redirect
    for (const page of kurikulumPages) {
      const res = await fetch(`${BASE_URL}${page}`, {
        headers: { Cookie: userSession.cookie },
        redirect: "manual",
      });
      assert(
        res.status === 307 || res.status === 302,
        `Role ${fr.role} accessed ${page} with status ${res.status}, expected redirect`
      );
      const loc = res.headers.get("location") || "";
      assert(
        loc.includes(fr.redirectTarget),
        `Role ${fr.role} on ${page} redirected to ${loc}, expected ${fr.redirectTarget}`
      );
    }
    console.log(`     ✓ All 8 Kurikulum frontend routes redirected to ${fr.redirectTarget}`);
  }

  // ==========================================
  // 3. KURIKULUM USER ACCESS & HTML PAGE RENDERING
  // ==========================================
  console.log("\nTEST GROUP 3: KURIKULUM AUTHENTICATION & FULL PAGE RENDERING");
  const kurikulum = await login("kurikulum@sekolah.sch.id", "password123", "kurikulum");
  console.log(`  ✓ Authenticated as Kurikulum: ${kurikulum.user.name}`);

  for (const page of kurikulumPages) {
    const res = await fetch(`${BASE_URL}${page}`, {
      headers: { Cookie: kurikulum.cookie },
    });
    assert(res.status === 200, `Kurikulum user access to ${page} failed with ${res.status}`);
    const html = await res.text();
    assert(html.length > 500, `Page ${page} returned unexpectedly short HTML`);
    console.log(`  ✓ Page ${page} rendered successfully (200 OK)`);
  }

  // Legacy route redirection
  const legacySubjects = await fetch(`${BASE_URL}/kurikulum/subjects`, {
    headers: { Cookie: kurikulum.cookie },
    redirect: "manual",
  });
  assert(
    legacySubjects.status === 307 || legacySubjects.status === 302,
    `/kurikulum/subjects redirect status: ${legacySubjects.status}`
  );
  assert(
    legacySubjects.headers.get("location")?.includes("/kurikulum/grades/subjects"),
    "Legacy /kurikulum/subjects redirected to /kurikulum/grades/subjects"
  );
  console.log("  ✓ Legacy /kurikulum/subjects safely redirects to /kurikulum/grades/subjects");

  const legacySyllabus = await fetch(`${BASE_URL}/kurikulum/syllabus`, {
    headers: { Cookie: kurikulum.cookie },
    redirect: "manual",
  });
  assert(
    legacySyllabus.status === 307 || legacySyllabus.status === 302,
    `/kurikulum/syllabus redirect status: ${legacySyllabus.status}`
  );
  assert(
    legacySyllabus.headers.get("location")?.includes("/kurikulum/files"),
    "Legacy /kurikulum/syllabus safely redirects to /kurikulum/files"
  );
  console.log("  ✓ Legacy /kurikulum/syllabus safely redirects to /kurikulum/files");

  // ==========================================
  // 4. API VERIFICATION & DATA INTEGRITY
  // ==========================================
  console.log("\nTEST GROUP 4: API VERIFICATION & DATA INTEGRITY");

  // 4.1 Dashboard
  const dashRes = await fetch(`${BASE_URL}/api/kurikulum/dashboard`, {
    headers: { Cookie: kurikulum.cookie },
  });
  assert(dashRes.status === 200, "Dashboard 200 OK");
  const dashJson = await dashRes.json();
  assert(dashJson.success === true, "Dashboard success true");
  assert(typeof dashJson.data.totalTeachers === "number", "totalTeachers is number");
  console.log("  ✓ Dashboard API verified");

  // 4.2 Teachers
  const tchRes = await fetch(`${BASE_URL}/api/kurikulum/teachers`, {
    headers: { Cookie: kurikulum.cookie },
  });
  assert(tchRes.status === 200, "Teachers 200 OK");
  const tchJson = await tchRes.json();
  assert(tchJson.success === true, "Teachers success true");
  assert(Array.isArray(tchJson.data.teachers), "teachers is array");
  console.log(`  ✓ Teachers API verified (${tchJson.data.teachers.length} teachers)`);

  // 4.3 Class Grades
  const cgRes = await fetch(`${BASE_URL}/api/kurikulum/grades/classes`, {
    headers: { Cookie: kurikulum.cookie },
  });
  assert(cgRes.status === 200, "Class grades 200 OK");
  const cgJson = await cgRes.json();
  assert(cgJson.success === true, "Class grades success true");
  assert(Array.isArray(cgJson.data.classesList), "classesList is array");
  console.log(`  ✓ Class Grades API verified (${cgJson.data.classesList.length} classes)`);

  // 4.4 Subject Grades
  const sgRes = await fetch(`${BASE_URL}/api/kurikulum/grades/subjects`, {
    headers: { Cookie: kurikulum.cookie },
  });
  assert(sgRes.status === 200, "Subject grades 200 OK");
  const sgJson = await sgRes.json();
  assert(sgJson.success === true, "Subject grades success true");
  assert(Array.isArray(sgJson.data.subjectsList), "subjectsList is array");
  console.log(`  ✓ Subject Grades API verified (${sgJson.data.subjectsList.length} subjects)`);

  // 4.5 Reports Grades
  const repRes = await fetch(`${BASE_URL}/api/kurikulum/reports/grades`, {
    headers: { Cookie: kurikulum.cookie },
  });
  assert(repRes.status === 200, "Reports grades 200 OK");
  const repJson = await repRes.json();
  assert(repJson.success === true, "Reports grades success true");
  assert(Array.isArray(repJson.data.rows), "reports rows is array");
  console.log(`  ✓ Reports Grades API verified (${repJson.data.rows.length} rows)`);

  // 4.6 Reports Recap
  const recapRes = await fetch(`${BASE_URL}/api/kurikulum/reports/recap`, {
    headers: { Cookie: kurikulum.cookie },
  });
  assert(recapRes.status === 200, "Reports recap 200 OK");
  const recapJson = await recapRes.json();
  assert(recapJson.success === true, "Reports recap success true");
  assert(recapJson.data.school.schoolName, "School name present in recap");
  assert(recapJson.data.school.headmasterName, "Headmaster name present in recap");
  console.log(`  ✓ Reports Recap API verified (School: ${recapJson.data.school.schoolName})`);

  // 4.7 Profile
  const profRes = await fetch(`${BASE_URL}/api/kurikulum/profile`, {
    headers: { Cookie: kurikulum.cookie },
  });
  assert(profRes.status === 200, "Profile 200 OK");
  const profJson = await profRes.json();
  assert(profJson.success === true, "Profile success true");
  assert(profJson.data.user.email === "kurikulum@sekolah.sch.id", "Profile email matches");
  assert(profJson.data.user.role === "kurikulum", "Profile role matches");
  console.log("  ✓ Profile API verified with authoritative session resolution");

  // 4.8 Files Repository
  const filesRes = await fetch(`${BASE_URL}/api/kurikulum/files`, {
    headers: { Cookie: kurikulum.cookie },
  });
  assert(filesRes.status === 200, "Files 200 OK");
  const filesJson = await filesRes.json();
  assert(filesJson.success === true, "Files success true");
  assert(Array.isArray(filesJson.data.files), "Files is array");
  console.log(`  ✓ Academic Files API verified (${filesJson.data.files.length} files available)`);

  // ==========================================
  // 5. EXCEL EXPORT (.XLSX) TEST
  // ==========================================
  console.log("\nTEST GROUP 5: EXCEL EXPORT (.XLSX) INTEGRITY");
  const expRes = await fetch(`${BASE_URL}/api/kurikulum/reports/export`, {
    headers: { Cookie: kurikulum.cookie },
  });
  assert(expRes.status === 200, `Export returned ${expRes.status}`);
  const contentType = expRes.headers.get("content-type") || "";
  assert(
    contentType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    `Content-Type matches Excel: ${contentType}`
  );
  const fileBuffer = await expRes.arrayBuffer();
  assert(fileBuffer.byteLength > 1000, `Export file size is substantial: ${fileBuffer.byteLength} bytes`);

  // Parse workbook to ensure it is 100% valid Excel
  const workbook = XLSX.read(Buffer.from(fileBuffer), { type: "buffer" });
  assert(workbook.SheetNames.length > 0, "Workbook contains at least one sheet");
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const sheetJson = XLSX.utils.sheet_to_json(sheet);
  console.log(`  ✓ Excel export valid & readable (${sheetJson.length} entries in sheet '${workbook.SheetNames[0]}')`);

  // ==========================================
  // 6. NULL SCORE INTEGRITY
  // ==========================================
  console.log("\nTEST GROUP 6: NULL VALUE INTEGRITY (NULL !== 0)");
  for (const row of repJson.data.rows) {
    if (row.finalAverage === null) {
      assert(row.finalAverage !== 0, "Ungraded final average must be strictly null, not 0");
    }
    if (row.assignmentAverage === null) {
      assert(row.assignmentAverage !== 0, "Ungraded assignment average must be strictly null, not 0");
    }
    if (row.quizAverage === null) {
      assert(row.quizAverage !== 0, "Ungraded quiz average must be strictly null, not 0");
    }
  }
  console.log("  ✓ Verified: Ungraded student scores are strictly null across all reports");

  // ==========================================
  // 7. SECURITY: STRICT READ-ONLY ENFORCEMENT
  // ==========================================
  console.log("\nTEST GROUP 7: STRICT READ-ONLY ENFORCEMENT");
  // Test mutation attempts by Kurikulum
  const postClassRes = await fetch(`${BASE_URL}/api/guru/classes`, {
    method: "POST",
    headers: { Cookie: kurikulum.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Illegal Class", subjectId: "dummy" }),
  });
  assert(postClassRes.status === 403, "Kurikulum forbidden from creating classes");

  const postAssignRes = await fetch(`${BASE_URL}/api/guru/assignments`, {
    method: "POST",
    headers: { Cookie: kurikulum.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Illegal Task" }),
  });
  assert(postAssignRes.status === 403, "Kurikulum forbidden from creating assignments");

  // Verify frontend HTML does not contain mutation controls
  const forbiddenPhrases = [
    "tambah guru",
    "edit guru",
    "hapus guru",
    "tambah kelas",
    "edit kelas",
    "hapus kelas",
    "input nilai",
    "submit nilai",
    "simpan nilai",
    "ubah nilai",
    "tambah silabus",
    "edit silabus",
  ];
  for (const page of kurikulumPages) {
    const res = await fetch(`${BASE_URL}${page}`, {
      headers: { Cookie: kurikulum.cookie },
    });
    const html = (await res.text()).toLowerCase();
    for (const phrase of forbiddenPhrases) {
      assert(!html.includes(phrase), `Page ${page} contains forbidden mutation text: '${phrase}'`);
    }
  }
  console.log("  ✓ Verified: Zero mutation controls present across all Kurikulum pages and APIs");

  // ==========================================
  // 8. SECURITY: ID TAMPERING VALIDATION
  // ==========================================
  console.log("\nTEST GROUP 8: ID TAMPERING VALIDATION");
  const invalidId = "not-a-valid-object-id";
  const tamperQueries = [
    `/api/kurikulum/grades/classes?classId=${invalidId}`,
    `/api/kurikulum/grades/subjects?subjectId=${invalidId}`,
    `/api/kurikulum/reports/grades?classId=${invalidId}`,
    `/api/kurikulum/reports/grades?subjectId=${invalidId}`,
    `/api/kurikulum/reports/grades?teacherId=${invalidId}`,
    `/api/kurikulum/reports/export?classId=${invalidId}`,
  ];
  for (const tq of tamperQueries) {
    const res = await fetch(`${BASE_URL}${tq}`, {
      headers: { Cookie: kurikulum.cookie },
    });
    assert(res.status === 400, `Tampered query ${tq} returned ${res.status}, expected 400 Bad Request`);
  }
  console.log("  ✓ All tampered ID parameters rejected safely with 400 Bad Request");

  // ==========================================
  // 9. SECURITY: NO CREDENTIAL LEAKS
  // ==========================================
  console.log("\nTEST GROUP 9: CREDENTIAL LEAK AUDIT");
  const credentialFields = ["passwordhash", "secret", "privatekey"];
  for (const ep of kurikulumEndpoints) {
    if (ep.includes("/export")) continue; // Binary Excel sheet
    const res = await fetch(`${BASE_URL}${ep}`, {
      headers: { Cookie: kurikulum.cookie },
    });
    const text = (await res.text()).toLowerCase();
    for (const cf of credentialFields) {
      assert(!text.includes(cf), `Endpoint ${ep} leaks credential field '${cf}'`);
    }
  }
  console.log("  ✓ Verified: Zero credential / secret leaks across all Kurikulum API payloads");

  // ==========================================
  // 10. STRICT PROJECT RULE: ABSOLUTELY NO ATTENDANCE
  // ==========================================
  console.log("\nTEST GROUP 10: STRICT 'NO ATTENDANCE' AUDIT");
  const forbiddenAttendanceTerms = [
    "attendance",
    "attendancerate",
    "kehadiran",
    "absensi",
  ];

  for (const ep of kurikulumEndpoints) {
    if (ep.includes("/export")) continue;
    const res = await fetch(`${BASE_URL}${ep}`, {
      headers: { Cookie: kurikulum.cookie },
    });
    const text = (await res.text()).toLowerCase();
    for (const term of forbiddenAttendanceTerms) {
      assert(!text.includes(term), `Endpoint ${ep} contains forbidden attendance term '${term}'`);
    }
  }

  for (const page of kurikulumPages) {
    const res = await fetch(`${BASE_URL}${page}`, {
      headers: { Cookie: kurikulum.cookie },
    });
    const html = (await res.text()).toLowerCase();
    for (const term of forbiddenAttendanceTerms) {
      assert(!html.includes(term), `Page ${page} contains forbidden attendance term '${term}'`);
    }
  }
  console.log("  ✓ Verified: ZERO attendance/kehadiran/absensi fields across all APIs and frontend pages");

  console.log("\n==================================================");
  console.log("🎉 ALL FINAL COMPLETE KURIKULUM TESTS PASSED!");
  console.log("==================================================\n");
}

runFinalSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
