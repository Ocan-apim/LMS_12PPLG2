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

async function runSupportTestSuite() {
  console.log("==================================================");
  console.log("STARTING HELPDESK & SUPPORT SYSTEM TEST SUITE");
  console.log(`Target: ${BASE_URL}`);
  console.log("==================================================\n");

  // ==========================================
  // 1. UNAUTHENTICATED REQUESTS
  // ==========================================
  console.log("TEST GROUP 1: UNAUTHENTICATED REQUESTS");
  const unauthSiswa = await fetch(`${BASE_URL}/api/siswa/support`);
  assert(unauthSiswa.status === 401, "GET /api/siswa/support rejects unauthenticated (401)");

  const unauthAdmin = await fetch(`${BASE_URL}/api/admin/support`);
  assert(unauthAdmin.status === 401, "GET /api/admin/support rejects unauthenticated (401)");

  const unauthPageSiswa = await fetch(`${BASE_URL}/siswa/support`, { redirect: "manual" });
  assert(unauthPageSiswa.status === 307 || unauthPageSiswa.status === 302, "Unauthenticated /siswa/support redirected");

  const unauthPageAdmin = await fetch(`${BASE_URL}/admin/support`, { redirect: "manual" });
  assert(unauthPageAdmin.status === 307 || unauthPageAdmin.status === 302, "Unauthenticated /admin/support redirected");
  console.log("  ✓ Unauthenticated API requests return 401, pages redirect to /login");

  // ==========================================
  // 2. ROLE ISOLATION: GURU, KURIKULUM, KEPSEK
  // ==========================================
  console.log("\nTEST GROUP 2: ROLE ISOLATION (GURU, KURIKULUM, KEPSEK BLOCKED FROM ADMIN HELPDESK)");
  const guru = await login("budi.pratama@sekolah.sch.id", "password123", "guru");
  const kurikulum = await login("kurikulum@sekolah.sch.id", "password123", "kurikulum");
  const kepsek = await login("kepsek@sekolah.sch.id", "password123", "kepsek");

  for (const roleUser of [guru, kurikulum, kepsek]) {
    const resAdmin = await fetch(`${BASE_URL}/api/admin/support`, {
      headers: { Cookie: roleUser.cookie },
    });
    assert(resAdmin.status === 403, `Role ${roleUser.user.role} blocked from /api/admin/support (403)`);

    const resSiswa = await fetch(`${BASE_URL}/api/siswa/support`, {
      headers: { Cookie: roleUser.cookie },
    });
    assert(resSiswa.status === 403, `Role ${roleUser.user.role} blocked from /api/siswa/support (403)`);
  }
  console.log("  ✓ Guru, Kurikulum, and Kepsek strictly blocked (403) from both Admin and Siswa support APIs");

  // ==========================================
  // 3. STUDENT 1 CREATES SUPPORT TICKET
  // ==========================================
  console.log("\nTEST GROUP 3: STUDENT CREATES SUPPORT TICKET");
  const siswa1 = await login("0098273645", "password123", "siswa");
  console.log(`  ✓ Authenticated as Siswa 1: ${siswa1.user.name}`);

  // Test invalid category validation
  const invalidCatRes = await fetch(`${BASE_URL}/api/siswa/support`, {
    method: "POST",
    headers: { Cookie: siswa1.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      category: "Kategori Palsu",
      subject: "Test",
      message: "Test message",
    }),
  });
  assert(invalidCatRes.status === 400, "Invalid category rejected with 400 Bad Request");
  console.log("  ✓ Invalid category safely rejected with 400 Bad Request");

  // Test user tampering attempt
  const createTicketRes = await fetch(`${BASE_URL}/api/siswa/support`, {
    method: "POST",
    headers: { Cookie: siswa1.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      category: "Lupa Password",
      subject: "Kendala Akses: Lupa Kata Sandi",
      message: "Halo Admin, saya lupa kata sandi akun LMS saya. Mohon bantuan reset kata sandi.",
      userId: "fake_user_id_tamper_attempt",
    }),
  });
  assert(createTicketRes.status === 201, "POST /api/siswa/support created successfully (201)");
  const createJson = await createTicketRes.json();
  assert(createJson.success === true, "Create ticket success is true");
  const ticket1Id = createJson.data.ticket.id;
  assert(ticket1Id, "Ticket ID generated");
  console.log(`  ✓ Ticket created with ID: ${ticket1Id} (Category: ${createJson.data.ticket.category})`);

  // ==========================================
  // 4. STUDENT LISTS OWN TICKETS
  // ==========================================
  console.log("\nTEST GROUP 4: STUDENT LISTS OWN TICKETS");
  const listRes = await fetch(`${BASE_URL}/api/siswa/support`, {
    headers: { Cookie: siswa1.cookie },
  });
  assert(listRes.status === 200, "GET /api/siswa/support returned 200 OK");
  const listJson = await listRes.json();
  assert(listJson.success === true, "List tickets success true");
  assert(Array.isArray(listJson.data.tickets), "Tickets is an array");
  const foundTicket = listJson.data.tickets.find((t) => t.id === ticket1Id);
  assert(foundTicket, "Newly created ticket present in student list");
  assert(foundTicket.status === "WAITING", "Initial status is WAITING");
  console.log(`  ✓ Student ticket list verified (${listJson.data.tickets.length} tickets found)`);

  // ==========================================
  // 5. STUDENT DETAILS OWN TICKET
  // ==========================================
  console.log("\nTEST GROUP 5: STUDENT DETAILS OWN TICKET");
  const detailRes = await fetch(`${BASE_URL}/api/siswa/support/${ticket1Id}`, {
    headers: { Cookie: siswa1.cookie },
  });
  assert(detailRes.status === 200, "GET /api/siswa/support/[id] returned 200 OK");
  const detailJson = await detailRes.json();
  assert(detailJson.success === true, "Detail success true");
  assert(detailJson.data.ticket.id === ticket1Id, "Returned ticket matches requested ID");
  assert(Array.isArray(detailJson.data.messages), "Messages is an array");
  assert(detailJson.data.messages.length >= 1, "Initial message present in thread");
  assert(detailJson.data.messages[0].sender.isSelf === true, "Sender isSelf is true for student");
  console.log(`  ✓ Ticket detail verified with ${detailJson.data.messages.length} messages in conversation`);

  // ==========================================
  // 6. OWNERSHIP ISOLATION: STUDENT 2 BLOCKED FROM STUDENT 1 TICKET
  // ==========================================
  console.log("\nTEST GROUP 6: OWNERSHIP ISOLATION & UNAUTHORIZED ACCESS");
  const siswa2 = await login("0098273646", "password123", "siswa");
  console.log(`  ✓ Authenticated as Siswa 2: ${siswa2.user.name}`);

  // Siswa 2 tries to read Siswa 1 ticket
  const foreignReadRes = await fetch(`${BASE_URL}/api/siswa/support/${ticket1Id}`, {
    headers: { Cookie: siswa2.cookie },
  });
  assert(foreignReadRes.status === 403, `Siswa 2 blocked from reading Siswa 1 ticket (status: ${foreignReadRes.status})`);

  // Siswa 2 tries to send message on Siswa 1 ticket
  const foreignPostRes = await fetch(`${BASE_URL}/api/siswa/support/${ticket1Id}/messages`, {
    method: "POST",
    headers: { Cookie: siswa2.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Intruder message" }),
  });
  assert(foreignPostRes.status === 403, `Siswa 2 blocked from posting on Siswa 1 ticket (status: ${foreignPostRes.status})`);
  console.log("  ✓ Clean Ownership Isolation: Siswa 2 strictly blocked (403) from Siswa 1's ticket");

  // ==========================================
  // 7. STUDENT SENDS MESSAGE
  // ==========================================
  console.log("\nTEST GROUP 7: STUDENT SENDS FOLLOW-UP MESSAGE");
  const sendMsgRes = await fetch(`${BASE_URL}/api/siswa/support/${ticket1Id}/messages`, {
    method: "POST",
    headers: { Cookie: siswa1.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Sebagai info tambahan, NIS saya adalah 0098273645. Terima kasih Admin.",
      senderId: "fake_admin_sender_id", // Tampering attempt
    }),
  });
  assert(sendMsgRes.status === 201, "POST message returned 201 Created");
  const sendMsgJson = await sendMsgRes.json();
  assert(sendMsgJson.success === true, "Send message success true");
  assert(sendMsgJson.data.message.sender.role === "siswa", "Sender role strictly resolved as 'siswa'");
  assert(sendMsgJson.data.message.sender.id === siswa1.user.id, "Sender ID strictly resolved from session");
  console.log("  ✓ Message sent successfully; sender tampering safely ignored");

  // ==========================================
  // 8. ADMIN LISTS TICKETS & SUMMARY
  // ==========================================
  console.log("\nTEST GROUP 8: ADMIN LISTS TICKETS & SUMMARY");
  const admin = await login("admin@sekolah.sch.id", "password123", "admin");
  console.log(`  ✓ Authenticated as Admin: ${admin.user.name}`);

  const adminListRes = await fetch(`${BASE_URL}/api/admin/support`, {
    headers: { Cookie: admin.cookie },
  });
  assert(adminListRes.status === 200, "Admin support list returned 200 OK");
  const adminListJson = await adminListRes.json();
  assert(adminListJson.success === true, "Admin list success true");
  assert(typeof adminListJson.data.summary.total === "number", "Summary total is number");
  assert(typeof adminListJson.data.summary.waiting === "number", "Summary waiting is number");
  assert(Array.isArray(adminListJson.data.tickets), "Tickets is an array");
  console.log(`  ✓ Admin tickets count: ${adminListJson.data.tickets.length} (Waiting: ${adminListJson.data.summary.waiting})`);

  // ==========================================
  // 9. ADMIN DETAILS TICKET
  // ==========================================
  console.log("\nTEST GROUP 9: ADMIN DETAILS TICKET");
  const adminDetailRes = await fetch(`${BASE_URL}/api/admin/support/${ticket1Id}`, {
    headers: { Cookie: admin.cookie },
  });
  assert(adminDetailRes.status === 200, "Admin ticket detail returned 200 OK");
  const adminDetailJson = await adminDetailRes.json();
  assert(adminDetailJson.success === true, "Admin detail success true");
  assert(adminDetailJson.data.ticket.student.name === siswa1.user.name, "Student name matches");
  assert(adminDetailJson.data.messages.length === 2, "Conversation contains 2 messages from student");
  console.log(`  ✓ Admin verified ticket student: ${adminDetailJson.data.ticket.student.name}`);

  // ==========================================
  // 10. ADMIN REPLIES TO TICKET
  // ==========================================
  console.log("\nTEST GROUP 10: ADMIN REPLIES TO TICKET");
  const adminReplyRes = await fetch(`${BASE_URL}/api/admin/support/${ticket1Id}/messages`, {
    method: "POST",
    headers: { Cookie: admin.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Halo Ahmad, baik kami periksa dan segera lakukan reset kata sandi akun Anda.",
    }),
  });
  assert(adminReplyRes.status === 201, "Admin reply returned 201 Created");
  const adminReplyJson = await adminReplyRes.json();
  assert(adminReplyJson.data.message.sender.role === "admin", "Sender role is admin");
  console.log("  ✓ Admin reply sent successfully");

  // ==========================================
  // 11. ADMIN CHANGES STATUS
  // ==========================================
  console.log("\nTEST GROUP 11: ADMIN CHANGES STATUS");
  const statusRes = await fetch(`${BASE_URL}/api/admin/support/${ticket1Id}`, {
    method: "PATCH",
    headers: { Cookie: admin.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "IN_PROGRESS" }),
  });
  assert(statusRes.status === 200, "PATCH status returned 200 OK");
  const statusJson = await statusRes.json();
  assert(statusJson.data.ticket.status === "IN_PROGRESS", "Ticket status updated to IN_PROGRESS");
  console.log("  ✓ Status successfully updated to IN_PROGRESS");

  // ==========================================
  // 12. ADMIN RESETS STUDENT PASSWORD SECURELY
  // ==========================================
  console.log("\nTEST GROUP 12: ADMIN RESETS STUDENT PASSWORD SECURELY");
  const resetRes = await fetch(`${BASE_URL}/api/admin/support/${ticket1Id}/reset-password`, {
    method: "POST",
    headers: { Cookie: admin.cookie },
  });
  assert(resetRes.status === 200, "Reset password returned 200 OK");
  const resetJson = await resetRes.json();
  assert(resetJson.success === true, "Reset password success true");
  const tempPassword = resetJson.data.tempPassword;
  assert(typeof tempPassword === "string" && tempPassword.startsWith("Learnix#"), "Valid temp password returned");
  console.log(`  ✓ Generated temporary password: ${tempPassword}`);

  // Test student logging in with the new temporary password!
  const loginWithTemp = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "0098273645",
      password: tempPassword,
      role: "siswa",
    }),
  });
  assert(loginWithTemp.status === 200, "Student successfully logged in with new temporary password");
  console.log("  ✓ Student authenticated successfully using new temporary password");

  // Verify old password no longer works!
  const loginWithOld = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "0098273645",
      password: "password123",
      role: "siswa",
    }),
  });
  assert(loginWithOld.status === 401, "Old password safely rejected (401)");
  console.log("  ✓ Old password safely invalidated (cannot be reused)");

  // Re-restore default password so other test suites won't fail
  // We can login as admin and use reset password or update
  // Let's reset it back to password123 using Admin or bcrypt directly if needed
  // Or let's test resetting via student profile or admin student endpoint
  const adminStudentRestore = await fetch(`${BASE_URL}/api/admin/students/${siswa1.user.id}`, {
    method: "PUT",
    headers: { Cookie: admin.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: siswa1.user.name,
      nisn: "0098273645",
      nis: "0098273645",
      email: siswa1.user.email,
    }),
  });
  // Since we also want password123 restored for full regression suites, let's restore it with seed or direct update
  // Let's verify student can login back after we set it back or let's update password
  // Let's create a scratch script or use node to set password back to password123 for regression tests
  // We'll do that at the end of this script!

  // ==========================================
  // 13. ID TAMPERING VALIDATION
  // ==========================================
  console.log("\nTEST GROUP 13: ID TAMPERING VALIDATION");
  const invalidId = "invalid_non_object_id";
  const tamperStudentGet = await fetch(`${BASE_URL}/api/siswa/support/${invalidId}`, {
    headers: { Cookie: siswa1.cookie },
  });
  assert(tamperStudentGet.status === 400, "Invalid ID on siswa detail returns 400 Bad Request");

  const tamperAdminGet = await fetch(`${BASE_URL}/api/admin/support/${invalidId}`, {
    headers: { Cookie: admin.cookie },
  });
  assert(tamperAdminGet.status === 400, "Invalid ID on admin detail returns 400 Bad Request");
  console.log("  ✓ Malformed / invalid IDs safely rejected with 400 Bad Request");

  // ==========================================
  // 14. CREDENTIAL LEAK PROTECTION
  // ==========================================
  console.log("\nTEST GROUP 14: CREDENTIAL LEAK AUDIT");
  const endpointsToAudit = [
    { url: `${BASE_URL}/api/siswa/support`, cookie: siswa1.cookie },
    { url: `${BASE_URL}/api/siswa/support/${ticket1Id}`, cookie: siswa1.cookie },
    { url: `${BASE_URL}/api/admin/support`, cookie: admin.cookie },
    { url: `${BASE_URL}/api/admin/support/${ticket1Id}`, cookie: admin.cookie },
  ];

  for (const item of endpointsToAudit) {
    const res = await fetch(item.url, { headers: { Cookie: item.cookie } });
    const text = (await res.text()).toLowerCase();
    assert(!text.includes("passwordhash"), `Endpoint ${item.url} leaks passwordHash`);
    assert(!text.includes('"password":'), `Endpoint ${item.url} leaks raw password field`);
    assert(!text.includes("jwt_secret"), `Endpoint ${item.url} leaks secret`);
  }
  console.log("  ✓ Verified: Zero password hash or credential leaks in API responses");

  // ==========================================
  // 15. STRICT NO ATTENDANCE AUDIT
  // ==========================================
  console.log("\nTEST GROUP 15: STRICT 'NO ATTENDANCE' AUDIT");
  const attendanceKeywords = ["attendance", "attendancerate", "kehadiran", "absensi"];
  for (const item of endpointsToAudit) {
    const res = await fetch(item.url, { headers: { Cookie: item.cookie } });
    const text = (await res.text()).toLowerCase();
    for (const kw of attendanceKeywords) {
      assert(!text.includes(kw), `Endpoint ${item.url} contains forbidden attendance keyword: ${kw}`);
    }
  }
  console.log("  ✓ Verified: ZERO attendance/kehadiran/absensi fields across Helpdesk APIs");

  // ==========================================
  // 16. FRONTEND PAGES RENDERING (200 OK)
  // ==========================================
  console.log("\nTEST GROUP 16: FRONTEND PAGES RENDERING");
  const studentPageRes = await fetch(`${BASE_URL}/siswa/support`, {
    headers: { Cookie: siswa1.cookie },
  });
  assert(studentPageRes.status === 200, "GET /siswa/support rendered with 200 OK");
  const studentHtml = await studentPageRes.text();
  assert(studentHtml.includes("Bantuan"), "Page contains 'Bantuan'");

  const studentDetailRes = await fetch(`${BASE_URL}/siswa/support/${ticket1Id}`, {
    headers: { Cookie: siswa1.cookie },
  });
  assert(studentDetailRes.status === 200, "GET /siswa/support/[id] rendered with 200 OK");

  const adminPageRes = await fetch(`${BASE_URL}/admin/support`, {
    headers: { Cookie: admin.cookie },
  });
  assert(adminPageRes.status === 200, "GET /admin/support rendered with 200 OK");
  const adminHtml = await adminPageRes.text();
  assert(adminHtml.includes("Bantuan Siswa") || adminHtml.includes("Tiket Siswa"), "Page contains Admin support text");

  const adminDetailRes = await fetch(`${BASE_URL}/admin/support/${ticket1Id}`, {
    headers: { Cookie: admin.cookie },
  });
  assert(adminDetailRes.status === 200, "GET /admin/support/[id] rendered with 200 OK");
  console.log("  ✓ All 4 Helpdesk frontend pages rendered successfully with 200 OK");

  // Restore student password to password123 for downstream regression suites
  console.log("\nRESTORING STUDENT 1 PASSWORD FOR DOWNSTREAM REGRESSIONS...");
  const bcrypt = await import("bcryptjs");
  const mongoose = await import("mongoose");
  const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/lms";
  await mongoose.default.connect(MONGODB_URI);
  const hash = await bcrypt.default.hash("password123", 10);
  await mongoose.default.connection.collection("users").updateOne(
    { email: "0098273645@sekolah.sch.id" },
    { $set: { password: hash } }
  );
  await mongoose.default.connection.collection("users").updateOne(
    { nis: "0098273645" },
    { $set: { password: hash } }
  );
  await mongoose.default.disconnect();
  console.log("  ✓ Student 1 password restored to 'password123'");

  console.log("\n==================================================");
  console.log("🎉 ALL HELPDESK & SUPPORT SYSTEM TESTS PASSED!");
  console.log("==================================================\n");
}

runSupportTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
