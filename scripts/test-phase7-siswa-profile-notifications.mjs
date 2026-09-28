/**
 * Automated Verification for Phase 7: Siswa Profile, Notifications & Account Settings
 * Run: node --env-file=.env.local scripts/test-phase7-siswa-profile-notifications.mjs
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
  console.log("STARTING PHASE 7 STUDENT PROFILE & NOTIFICATION TESTS");
  console.log(`Target: ${BASE_URL}`);
  console.log("==================================================\n");

  // TEST 1: Unauthenticated Profile & Notifications
  console.log("TEST GROUP 1: UNAUTHENTICATED REQUESTS");
  const unauthProfile = await fetch(`${BASE_URL}/api/siswa/profile`);
  assert(unauthProfile.status === 401, "GET /api/siswa/profile rejects unauthenticated (401)");

  const unauthNotifs = await fetch(`${BASE_URL}/api/siswa/notifications`);
  assert(unauthNotifs.status === 401, "GET /api/siswa/notifications rejects unauthenticated (401)");

  const unauthPatch = await fetch(`${BASE_URL}/api/siswa/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "08123456789" }),
  });
  assert(unauthPatch.status === 401, "PATCH /api/siswa/profile rejects unauthenticated (401)");

  const unauthReadAll = await fetch(`${BASE_URL}/api/siswa/notifications/read-all`, {
    method: "PATCH",
  });
  assert(unauthReadAll.status === 401, "PATCH /api/siswa/notifications/read-all rejects unauthenticated (401)");

  // TEST 2: Wrong Role (Guru/Admin blocked from Siswa endpoints)
  console.log("\nTEST GROUP 2: ROLE AUTHORIZATION (GURU & ADMIN BLOCKED)");
  const guru = await login("budi.pratama@sekolah.sch.id", "password123", "guru");
  assert(guru.user.role === "guru", `Authenticated as Guru: ${guru.user.name}`);

  const guruProfile = await fetch(`${BASE_URL}/api/siswa/profile`, {
    headers: { Cookie: guru.cookie },
  });
  assert(guruProfile.status === 403, "Guru blocked from GET /api/siswa/profile (403)");

  const guruNotifs = await fetch(`${BASE_URL}/api/siswa/notifications`, {
    headers: { Cookie: guru.cookie },
  });
  assert(guruNotifs.status === 403, "Guru blocked from GET /api/siswa/notifications (403)");

  const guruPatchProfile = await fetch(`${BASE_URL}/api/siswa/profile`, {
    method: "PATCH",
    headers: { Cookie: guru.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "08123456789" }),
  });
  assert(guruPatchProfile.status === 403, "Guru blocked from PATCH /api/siswa/profile (403)");

  // TEST 3: Authenticated Profile & Data Integrity
  console.log("\nTEST GROUP 3: AUTHENTICATED STUDENT PROFILE ACCESS");
  const siswa1 = await login("0098273645", "password123", "siswa");
  assert(siswa1.user.role === "siswa", `Authenticated as Siswa 1: ${siswa1.user.name}`);

  const profileRes = await fetch(`${BASE_URL}/api/siswa/profile`, {
    headers: { Cookie: siswa1.cookie },
  });
  const profileData = await profileRes.json();
  assert(profileRes.status === 200, "GET /api/siswa/profile returned 200 OK");
  assert(profileData.success === true, "Profile response success is true");
  assert(profileData.data.user.name === siswa1.user.name, `Profile name matches: ${profileData.data.user.name}`);
  assert(profileData.data.user.role === "siswa", "Profile role is siswa");
  assert(profileData.data.user.password === undefined, "Password hash is strictly omitted");
  assert(typeof profileData.data.stats === "object", "Profile includes academic stats");
  assert(typeof profileData.data.stats.totalClasses === "number", `Total classes: ${profileData.data.stats.totalClasses}`);

  // TEST 4: StudentId Tampering in Query
  console.log("\nTEST GROUP 4: STUDENT ID TAMPERING IN QUERY PARAMETER");
  const tamperedProfile = await fetch(
    `${BASE_URL}/api/siswa/profile?studentId=654321654321654321654321&userId=999999999999999999999999`,
    { headers: { Cookie: siswa1.cookie } }
  );
  const tamperedData = await tamperedProfile.json();
  assert(tamperedProfile.status === 200, "Query tampering attempt does not crash server (200 OK)");
  assert(
    tamperedData.data.user._id === siswa1.user.id,
    `Server strictly resolved session.id (${siswa1.user.id}), foreign studentId ignored`
  );

  // TEST 5: Student Notifications Retrieval & Derivation
  console.log("\nTEST GROUP 5: STUDENT NOTIFICATIONS RETRIEVAL & UNREAD COUNT");
  const notifsRes = await fetch(`${BASE_URL}/api/siswa/notifications`, {
    headers: { Cookie: siswa1.cookie },
  });
  const notifsData = await notifsRes.json();
  assert(notifsRes.status === 200, "GET /api/siswa/notifications returned 200 OK");
  assert(notifsData.success === true, "Notifications response success is true");
  assert(Array.isArray(notifsData.data.notifications), "Notifications returned as array");
  assert(typeof notifsData.data.unreadCount === "number", `Unread count: ${notifsData.data.unreadCount}`);
  assert(notifsData.data.notifications.length >= 1, `Total notifications generated: ${notifsData.data.notifications.length}`);

  // Verify deduplication on immediate second call
  const notifsSecondCall = await fetch(`${BASE_URL}/api/siswa/notifications`, {
    headers: { Cookie: siswa1.cookie },
  });
  const notifsSecondData = await notifsSecondCall.json();
  assert(
    notifsSecondData.data.notifications.length === notifsData.data.notifications.length,
    `Duplicate prevention verified: ${notifsSecondData.data.notifications.length} notifications remain consistent on re-fetch`
  );

  // TEST 6: Notification Isolation (Student 2 vs Student 1)
  console.log("\nTEST GROUP 6: NOTIFICATION MEMBERSHIP ISOLATION");
  const siswa2 = await login("0098273646", "password123", "siswa");
  assert(siswa2.user.role === "siswa", `Authenticated as Siswa 2: ${siswa2.user.name}`);

  const notifsSiswa2Res = await fetch(`${BASE_URL}/api/siswa/notifications`, {
    headers: { Cookie: siswa2.cookie },
  });
  const notifsSiswa2Data = await notifsSiswa2Res.json();
  assert(notifsSiswa2Res.status === 200, "GET /api/siswa/notifications for Siswa 2 returned 200 OK");

  // Every notification returned for Siswa 2 must have recipientId === Siswa 2
  for (const n of notifsSiswa2Data.data.notifications) {
    assert(
      String(n.recipientId) === String(siswa2.user.id),
      `Notification recipientId strictly matches Siswa 2 (${siswa2.user.id})`
    );
  }

  // TEST 7: Foreign Notification Read Guard (403 Forbidden)
  console.log("\nTEST GROUP 7: FOREIGN NOTIFICATION GUARD (403 FORBIDDEN)");
  const s1Notif = notifsData.data.notifications[0];
  assert(Boolean(s1Notif?._id), `Found Siswa 1 notification: ${s1Notif?._id}`);

  // Siswa 2 attempts to mark Siswa 1's notification as read
  const foreignPatch = await fetch(`${BASE_URL}/api/siswa/notifications/${s1Notif._id}`, {
    method: "PATCH",
    headers: { Cookie: siswa2.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ read: true }),
  });
  assert(
    foreignPatch.status === 403,
    `Foreign notification PATCH rejected with 403 Forbidden (status: ${foreignPatch.status})`
  );

  // TEST 8: Own Notification Read & Unread Toggle
  console.log("\nTEST GROUP 8: OWN NOTIFICATION READ/UNREAD TOGGLE");
  const toggleRes = await fetch(`${BASE_URL}/api/siswa/notifications/${s1Notif._id}`, {
    method: "PATCH",
    headers: { Cookie: siswa1.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ read: true }),
  });
  const toggleData = await toggleRes.json();
  assert(toggleRes.status === 200, "Own notification marked as read (200 OK)");
  assert(toggleData.data.read === true, "Notification read status updated to true");

  // TEST 9: Mark All Read Isolation
  console.log("\nTEST GROUP 9: MARK ALL READ ISOLATION");
  const markAllRes = await fetch(`${BASE_URL}/api/siswa/notifications/read-all`, {
    method: "PATCH",
    headers: { Cookie: siswa1.cookie },
  });
  const markAllData = await markAllRes.json();
  assert(markAllRes.status === 200, "PATCH /api/siswa/notifications/read-all returned 200 OK");
  assert(markAllData.success === true, "Mark all read reported success");

  // Verify Siswa 1 unread count is now 0
  const s1Verify = await fetch(`${BASE_URL}/api/siswa/notifications`, {
    headers: { Cookie: siswa1.cookie },
  });
  const s1VerifyData = await s1Verify.json();
  assert(s1VerifyData.data.unreadCount === 0, "Siswa 1 unreadCount is now 0");

  // TEST 10: Role Escalation Protection
  console.log("\nTEST GROUP 10: ROLE ESCALATION PROTECTION");
  const escalateRes = await fetch(`${BASE_URL}/api/siswa/profile`, {
    method: "PATCH",
    headers: { Cookie: siswa1.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      role: "admin",
      permissions: ["all"],
      email: "hacked@learnix.sch.id",
      nis: "99999999",
    }),
  });
  const escalateData = await escalateRes.json();
  assert(escalateRes.status === 200, "PATCH handled gracefully without error");
  assert(escalateData.data.user.role === "siswa", "Role remains strictly 'siswa'");
  assert(escalateData.data.user.email === siswa1.user.email, "Email remains untouched");
  assert(escalateData.data.user.nis === siswa1.user.nis, "NIS remains untouched");

  // TEST 11: Foreign User Mutation Protection
  console.log("\nTEST GROUP 11: FOREIGN USER MUTATION PROTECTION");
  const foreignMutation = await fetch(`${BASE_URL}/api/siswa/profile`, {
    method: "PATCH",
    headers: { Cookie: siswa1.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: siswa2.user.id,
      studentId: siswa2.user.id,
      _id: siswa2.user.id,
      phone: "089988776655",
    }),
  });
  const foreignMutationData = await foreignMutation.json();
  assert(foreignMutation.status === 200, "PATCH completed");
  assert(
    foreignMutationData.data.user._id === siswa1.user.id,
    `Only authenticated user (${siswa1.user.id}) was modified, Siswa 2 unaffected`
  );

  // Check Siswa 2 profile to confirm it was not tampered with
  const checkSiswa2 = await fetch(`${BASE_URL}/api/siswa/profile`, {
    headers: { Cookie: siswa2.cookie },
  });
  const checkSiswa2Data = await checkSiswa2.json();
  assert(
    checkSiswa2Data.data.user.phone !== "089988776655",
    "Siswa 2 phone was completely protected from tampering"
  );

  // TEST 12: Student Frontend Pages Rendering
  console.log("\nTEST GROUP 12: STUDENT FRONTEND PAGES RENDERING");
  const pages = ["/siswa/profile", "/siswa/settings", "/siswa/notifications"];
  for (const p of pages) {
    const pageRes = await fetch(`${BASE_URL}${p}`, {
      headers: { Cookie: siswa1.cookie },
    });
    assert(pageRes.status === 200, `Page ${p} renders with HTTP 200`);
  }

  // TEST 13: Phase 3–6 Regressions Check
  console.log("\nTEST GROUP 13: REGRESSION CHECKS (PHASE 3 TO 6 APIS)");
  const regressionEndpoints = [
    { url: "/api/siswa/dashboard", name: "Phase 3 Dashboard" },
    { url: "/api/siswa/courses", name: "Phase 3 Courses" },
    { url: "/api/siswa/assignments", name: "Phase 4 Assignments" },
    { url: "/api/siswa/grades", name: "Phase 6 Grades" },
    { url: "/api/siswa/schedule", name: "Phase 6 Schedule" },
    { url: "/api/siswa/files", name: "Phase 6 Files" },
  ];

  for (const ep of regressionEndpoints) {
    const res = await fetch(`${BASE_URL}${ep.url}`, {
      headers: { Cookie: siswa1.cookie },
    });
    const d = await res.json();
    assert(res.status === 200 && d.success === true, `${ep.name} returns 200 OK with success: true`);
  }

  console.log("\n==================================================");
  console.log("PHASE 7 STUDENT PROFILE & NOTIFICATION TESTS");
  console.log("==================================================");
  console.log("Test 1 - Unauthenticated Profile ........ PASS");
  console.log("Test 2 - Wrong Role ...................... PASS");
  console.log("Test 3 - Profile Isolation .............. PASS");
  console.log("Test 4 - Student Notifications .......... PASS");
  console.log("Test 5 - Notification Isolation ......... PASS");
  console.log("Test 6 - Foreign Notification Guard ..... PASS");
  console.log("Test 7 - Mark All Isolation ............. PASS");
  console.log("Test 8 - Role Escalation Protection ..... PASS");
  console.log("Test 9 - Foreign Mutation Protection ... PASS");
  console.log("Test 10 - Student Pages .................. PASS");
  console.log("Test 11 - Previous Phases Regression .... PASS");
  console.log("==================================================");
  console.log("RESULT: ALL TESTS PASSED");
  console.log("==================================================\n");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
