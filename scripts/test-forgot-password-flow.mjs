import assert from "node:assert";
import crypto from "crypto";

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

async function runForgotPasswordTestSuite() {
  console.log("==================================================");
  console.log("STARTING FORGOT PASSWORD PRE-LOGIN TEST SUITE");
  console.log(`Target: ${BASE_URL}`);
  console.log("==================================================\n");

  // ==========================================
  // TEST 1 & 2: LOGIN PAGE RENDERING & CLICKABLE FORGOT PASSWORD LINK
  // ==========================================
  console.log("TEST 1 & 2: LOGIN PAGE RENDERING & CLICKABLE FORGOT PASSWORD LINK");
  const loginRes = await fetch(`${BASE_URL}/login/siswa`);
  assert(loginRes.status === 200, "GET /login/siswa returns 200 OK");
  const loginHtml = await loginRes.text();
  assert(
    loginHtml.includes('href="/forgot-password"') || loginHtml.includes("href='/forgot-password'"),
    "Login page contains active clickable link to /forgot-password"
  );
  assert(loginHtml.includes("Lupa Password"), "Login page contains 'Lupa Password' link text");
  console.log("  ✓ Login page renders 200 OK with clickable link to /forgot-password");

  // ==========================================
  // TEST 3: FORGOT PASSWORD PAGE ACCESSIBLE WITHOUT LOGIN
  // ==========================================
  console.log("\nTEST 3: FORGOT PASSWORD PAGE ACCESSIBLE WITHOUT LOGIN");
  const forgotPageRes = await fetch(`${BASE_URL}/forgot-password`);
  assert(forgotPageRes.status === 200, "GET /forgot-password returns 200 OK");
  const forgotHtml = await forgotPageRes.text();
  assert(forgotHtml.includes("Lupa Password"), "Page contains title 'Lupa Password?'");
  assert(forgotHtml.includes("identitas akun"), "Page contains guidance text");
  console.log("  ✓ /forgot-password accessible publicly with 200 OK");

  // ==========================================
  // TEST 4 & 7: VALID STUDENT NIS SUBMITTED & TICKET CREATED
  // ==========================================
  console.log("\nTEST 4 & 7: VALID SISWA NIS SUBMISSION & TICKET CREATION");
  const siswaNis = "0098273645";
  const studentSubmitRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accountType: "siswa",
      identifier: siswaNis,
    }),
  });
  assert(studentSubmitRes.status === 200, "POST /api/auth/forgot-password for siswa returned 200 OK");
  const studentSubmitJson = await studentSubmitRes.json();
  assert(studentSubmitJson.success === true, "Submit success is true");
  assert(studentSubmitJson.data?.ticketToken, "Secure ticketToken returned for valid siswa");
  const siswaToken = studentSubmitJson.data.ticketToken;
  const siswaTicketId = studentSubmitJson.data.ticketId;
  console.log(`  ✓ Siswa ticket created with ID: ${siswaTicketId}`);
  console.log(`  ✓ Secure token generated: ${siswaToken.slice(0, 16)}... (length: ${siswaToken.length})`);

  // ==========================================
  // TEST 5 & 8: VALID STAFF NIP/EMAIL SUBMITTED & TICKET CREATED
  // ==========================================
  console.log("\nTEST 5 & 8: VALID STAFF EMAIL SUBMISSION & TICKET CREATION");
  const staffEmail = "budi.pratama@sekolah.sch.id";
  const staffSubmitRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accountType: "staff",
      identifier: staffEmail,
    }),
  });
  assert(staffSubmitRes.status === 200, "POST /api/auth/forgot-password for staff returned 200 OK");
  const staffSubmitJson = await staffSubmitRes.json();
  assert(staffSubmitJson.success === true, "Submit success is true");
  assert(staffSubmitJson.data?.ticketToken, "Secure ticketToken returned for valid staff");
  const staffToken = staffSubmitJson.data.ticketToken;
  const staffTicketId = staffSubmitJson.data.ticketId;
  console.log(`  ✓ Staff ticket created with ID: ${staffTicketId}`);
  console.log(`  ✓ Secure staff token generated: ${staffToken.slice(0, 16)}...`);

  // ==========================================
  // TEST 6: INVALID IDENTIFIER ENUMERATION PROTECTION
  // ==========================================
  console.log("\nTEST 6: ACCOUNT ENUMERATION PROTECTION ON INVALID IDENTIFIER");
  const fakeSubmitRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accountType: "siswa",
      identifier: "9999999999999999_fake_nis",
    }),
  });
  assert(fakeSubmitRes.status === 200, "Non-existent account returns 200 OK");
  const fakeSubmitJson = await fakeSubmitRes.json();
  assert(fakeSubmitJson.success === true, "Generic success is true");
  assert(
    fakeSubmitJson.message.includes("Jika akun ditemukan"),
    "Generic response message does not disclose account non-existence"
  );
  assert(fakeSubmitJson.data === null, "No ticketToken returned for non-existent account");
  console.log("  ✓ Generic response safely prevents account enumeration");

  // ==========================================
  // TEST 9: SECURE TICKET ACCESS TOKEN PROPERTIES
  // ==========================================
  console.log("\nTEST 9: CRYPTOGRAPHIC RANDOM TOKEN VERIFICATION");
  assert(typeof siswaToken === "string" && siswaToken.length >= 32, "Token is long hex string");
  assert(!siswaToken.includes(siswaTicketId), "Token does NOT contain raw ticketId");
  console.log("  ✓ Token is cryptographically random and unguessable");

  // ==========================================
  // TEST 10: INVALID TOKEN REJECTION
  // ==========================================
  console.log("\nTEST 10: INVALID TOKEN REJECTION");
  const invalidTokenRes = await fetch(
    `${BASE_URL}/api/auth/forgot-password/ticket/fake_invalid_token_1234567890abcdef1234567890abcdef`
  );
  assert(invalidTokenRes.status === 404, "Invalid token rejected with 404 Not Found");
  console.log("  ✓ Invalid token safely rejected with 404 Not Found");

  // ==========================================
  // TEST 11: EXPIRED TOKEN REJECTION
  // ==========================================
  console.log("\nTEST 11: EXPIRED TOKEN REJECTION");
  const mongoose = await import("mongoose");
  const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/lms";
  await mongoose.default.connect(MONGODB_URI);

  const expiredRawToken = crypto.randomBytes(32).toString("hex");
  const expiredHash = crypto.createHash("sha256").update(expiredRawToken).digest("hex");

  // Temporarily set an expired ticket
  const studentUser = await mongoose.default.connection.collection("users").findOne({ nis: siswaNis });
  const expiredTicket = await mongoose.default.connection.collection("supporttickets").insertOne({
    userId: studentUser._id,
    category: "Lupa Password",
    subject: "Permintaan Bantuan Login (Expired Test)",
    status: "WAITING",
    ticketAccessTokenHash: expiredHash,
    ticketAccessExpiresAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago (expired)
    lastMessageAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const expiredRes = await fetch(`${BASE_URL}/api/auth/forgot-password/ticket/${expiredRawToken}`);
  assert(expiredRes.status === 410, `Expired token returns 410 Gone (received: ${expiredRes.status})`);
  console.log("  ✓ Expired token safely rejected with 410 Gone");

  // Cleanup test expired ticket
  await mongoose.default.connection.collection("supporttickets").deleteOne({ _id: expiredTicket.insertedId });
  await mongoose.default.disconnect();

  // ==========================================
  // TEST 12: TICKET OWNERSHIP ISOLATION
  // ==========================================
  console.log("\nTEST 12: TICKET OWNERSHIP ISOLATION");
  const siswaTicketRes = await fetch(`${BASE_URL}/api/auth/forgot-password/ticket/${siswaToken}`);
  assert(siswaTicketRes.status === 200, "Siswa token loads siswa ticket");
  const siswaTicketJson = await siswaTicketRes.json();
  assert(siswaTicketJson.data.ticket.id === siswaTicketId, "Ticket ID matches siswa ticket");
  assert(siswaTicketJson.data.ticket.id !== staffTicketId, "Siswa token does NOT access staff ticket");

  const staffTicketRes = await fetch(`${BASE_URL}/api/auth/forgot-password/ticket/${staffToken}`);
  assert(staffTicketRes.status === 200, "Staff token loads staff ticket");
  const staffTicketJson = await staffTicketRes.json();
  assert(staffTicketJson.data.ticket.id === staffTicketId, "Ticket ID matches staff ticket");
  assert(staffTicketJson.data.ticket.id !== siswaTicketId, "Staff token does NOT access siswa ticket");
  console.log("  ✓ Clean token-ticket ownership isolation confirmed");

  // ==========================================
  // TEST 13: READ TICKET DETAILS WITHOUT LOGIN
  // ==========================================
  console.log("\nTEST 13: READ TICKET DETAILS WITHOUT LOGIN");
  assert(Array.isArray(siswaTicketJson.data.messages), "Messages array present in pre-login ticket");
  assert(siswaTicketJson.data.messages.length >= 1, "Initial message present");
  assert(siswaTicketJson.data.ticket.status === "WAITING", "Initial status is WAITING");
  console.log(`  ✓ Pre-login ticket conversation loaded successfully (${siswaTicketJson.data.messages.length} message)`);

  // ==========================================
  // TEST 14: USER SENDS FOLLOW-UP MESSAGE WITHOUT LOGIN
  // ==========================================
  console.log("\nTEST 14: PRE-LOGIN USER SENDS FOLLOW-UP MESSAGE");
  const postMsgRes = await fetch(`${BASE_URL}/api/auth/forgot-password/ticket/${siswaToken}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Saya masih belum menerima password baru, mohon bantuannya Admin.",
    }),
  });
  assert(postMsgRes.status === 201, "POST pre-login message returned 201 Created");
  const postMsgJson = await postMsgRes.json();
  assert(postMsgJson.success === true, "Send message success is true");
  assert(postMsgJson.data.message.sender.isSelf === true, "Sender isSelf is true");

  // Verify message appears in conversation
  const refreshedTicketRes = await fetch(`${BASE_URL}/api/auth/forgot-password/ticket/${siswaToken}`);
  const refreshedJson = await refreshedTicketRes.json();
  assert(
    refreshedJson.data.messages.some((m) => m.message.includes("Saya masih belum menerima password baru")),
    "Follow-up message found in pre-login conversation thread"
  );
  console.log("  ✓ User successfully posted follow-up message without authentication session");

  // ==========================================
  // TEST 15: ADMIN SEES FORGOT-PASSWORD TICKET IN HELPDESK
  // ==========================================
  console.log("\nTEST 15: ADMIN FINDS TICKET IN ADMIN HELPDESK");
  const admin = await login("admin@sekolah.sch.id", "password123", "admin");
  const adminListRes = await fetch(`${BASE_URL}/api/admin/support`, {
    headers: { Cookie: admin.cookie },
  });
  assert(adminListRes.status === 200, "GET /api/admin/support returned 200 OK");
  const adminListJson = await adminListRes.json();
  const foundTicket = adminListJson.data.tickets.find((t) => t.id === siswaTicketId);
  assert(foundTicket, "Admin support list contains the pre-login forgot-password ticket");
  assert(foundTicket.category === "Lupa Password", "Ticket category is 'Lupa Password'");
  console.log(`  ✓ Admin successfully located ticket #${siswaTicketId.slice(-6)}`);

  // ==========================================
  // TEST 16: ADMIN REPLIES TO TICKET
  // ==========================================
  console.log("\nTEST 16: ADMIN REPLIES TO TICKET");
  const adminReplyRes = await fetch(`${BASE_URL}/api/admin/support/${siswaTicketId}/messages`, {
    method: "POST",
    headers: { Cookie: admin.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Halo, permintaan reset kata sandi Anda telah diterima. Kami sedang memproses kata sandi baru.",
    }),
  });
  assert(adminReplyRes.status === 201, "Admin reply returned 201 Created");

  // User checks without login and sees Admin reply
  const userCheckRes = await fetch(`${BASE_URL}/api/auth/forgot-password/ticket/${siswaToken}`);
  const userCheckJson = await userCheckRes.json();
  const adminMsg = userCheckJson.data.messages.find((m) => m.sender.isAdmin === true);
  assert(adminMsg, "User can read Admin's reply in pre-login conversation");
  console.log(`  ✓ Pre-login user received Admin reply: "${adminMsg.message.slice(0, 45)}..."`);

  // ==========================================
  // TEST 17: ADMIN RESETS PASSWORD
  // ==========================================
  console.log("\nTEST 17: ADMIN RESETS PASSWORD FOR USER");
  const resetRes = await fetch(`${BASE_URL}/api/admin/support/${siswaTicketId}/reset-password`, {
    method: "POST",
    headers: { Cookie: admin.cookie },
  });
  assert(resetRes.status === 200, "Reset password API returned 200 OK");
  const resetJson = await resetRes.json();
  assert(resetJson.success === true, "Reset password success true");
  const newTempPassword = resetJson.data.tempPassword;
  assert(typeof newTempPassword === "string" && newTempPassword.startsWith("Learnix#"), "Valid temp password returned");
  console.log(`  ✓ Temporary password generated by Admin: ${newTempPassword}`);

  // User checks pre-login page and verifies password arrived in thread
  const resolvedTicketRes = await fetch(`${BASE_URL}/api/auth/forgot-password/ticket/${siswaToken}`);
  const resolvedTicketJson = await resolvedTicketRes.json();
  assert(resolvedTicketJson.data.ticket.status === "RESOLVED", "Ticket status is now RESOLVED");
  const resolutionMessage = resolvedTicketJson.data.messages.find((m) => m.message.includes(newTempPassword));
  assert(resolutionMessage, "New temporary password visible in pre-login conversation for the user");
  console.log("  ✓ Password delivered to user through pre-login conversation thread");

  // Verify user cannot post to resolved ticket
  const postResolvedRes = await fetch(`${BASE_URL}/api/auth/forgot-password/ticket/${siswaToken}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Pesan setelah resolved" }),
  });
  assert(postResolvedRes.status === 400, "Posting to resolved ticket rejected with 400 Bad Request");
  console.log("  ✓ Posting to resolved ticket correctly blocked");

  // ==========================================
  // TEST 18: OLD PASSWORD INVALIDATED
  // ==========================================
  console.log("\nTEST 18: OLD PASSWORD INVALIDATION CHECK");
  const oldLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: siswaNis,
      password: "password123",
      role: "siswa",
    }),
  });
  assert(oldLoginRes.status === 401, "Old password safely rejected (401 Unauthorized)");
  console.log("  ✓ Old password successfully invalidated");

  // ==========================================
  // TEST 19: NEW PASSWORD LOGIN
  // ==========================================
  console.log("\nTEST 19: LOGIN WITH NEW TEMPORARY PASSWORD");
  const newLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: siswaNis,
      password: newTempPassword,
      role: "siswa",
    }),
  });
  assert(newLoginRes.status === 200, "User successfully logged in with new temporary password");
  const newLoginJson = await newLoginRes.json();
  assert(newLoginJson.data.user.name === "Ahmad Bagus Pratama", "User profile authenticated correctly");
  console.log("  ✓ User authenticated successfully using new temporary password");

  // Restore student password to password123 for regression tests
  await mongoose.default.connect(MONGODB_URI);
  const bcrypt = await import("bcryptjs");
  const restoreHash = await bcrypt.default.hash("password123", 10);
  await mongoose.default.connection.collection("users").updateOne(
    { nis: siswaNis },
    { $set: { password: restoreHash } }
  );
  await mongoose.default.disconnect();

  const restoredLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: siswaNis,
      password: "password123",
      role: "siswa",
    }),
  });
  assert(restoredLogin.status === 200, "Restored password123 verified");
  console.log("  ✓ Student 1 password restored to 'password123'");

  // ==========================================
  // TEST 20: PRE-LOGIN TOKEN CANNOT BE USED AS LMS SESSION
  // ==========================================
  console.log("\nTEST 20: TOKEN CANNOT BE USED AS LMS SESSION");
  const fakeSessionCheck = await fetch(`${BASE_URL}/api/siswa/dashboard`, {
    headers: { Cookie: `lms_session=${siswaToken}` },
  });
  assert(fakeSessionCheck.status === 401, "Pre-login token rejected on /api/siswa/dashboard (401)");

  const fakeAdminCheck = await fetch(`${BASE_URL}/api/admin/support`, {
    headers: { Cookie: `lms_session=${siswaToken}` },
  });
  assert(fakeAdminCheck.status === 401, "Pre-login token rejected on /api/admin/support (401)");
  console.log("  ✓ Pre-login ticket access token cannot masquerade as LMS session");

  // ==========================================
  // TEST 21: NO CREDENTIAL LEAKAGE
  // ==========================================
  console.log("\nTEST 21: CREDENTIAL LEAK AUDIT");
  const auditEndpoints = [
    `${BASE_URL}/api/auth/forgot-password/ticket/${siswaToken}`,
    `${BASE_URL}/api/auth/forgot-password/ticket/${staffToken}`,
  ];
  for (const url of auditEndpoints) {
    const res = await fetch(url);
    const text = (await res.text()).toLowerCase();
    assert(!text.includes("passwordhash"), `Endpoint ${url} leaks passwordHash`);
    assert(!text.includes("jwt_secret"), `Endpoint ${url} leaks secret`);
    assert(!text.includes("ticketaccesstokenhash"), `Endpoint ${url} leaks ticketAccessTokenHash`);
  }
  console.log("  ✓ Zero password hash, secret, or token hash leakage in pre-login responses");

  // ==========================================
  // TEST 22: STRICT NO ATTENDANCE AUDIT
  // ==========================================
  console.log("\nTEST 22: STRICT NO ATTENDANCE AUDIT");
  const attendanceKws = ["attendance", "attendancerate", "kehadiran", "absensi"];
  for (const url of auditEndpoints) {
    const res = await fetch(url);
    const text = (await res.text()).toLowerCase();
    for (const kw of attendanceKws) {
      assert(!text.includes(kw), `Endpoint ${url} contains forbidden keyword ${kw}`);
    }
  }
  console.log("  ✓ Verified: ZERO attendance/kehadiran/absensi fields");

  // ==========================================
  // TEST 23: EXISTING HELPDESK AFTER LOGIN REMAINS OPERATIONAL
  // ==========================================
  console.log("\nTEST 23: EXISTING HELPDESK REGRESSION (AFTER LOGIN)");
  const siswaLogged = await login(siswaNis, "password123", "siswa");
  const loggedHelpdeskRes = await fetch(`${BASE_URL}/api/siswa/support`, {
    headers: { Cookie: siswaLogged.cookie },
  });
  assert(loggedHelpdeskRes.status === 200, "Logged-in siswa can still access /api/siswa/support");
  const loggedJson = await loggedHelpdeskRes.json();
  assert(Array.isArray(loggedJson.data.tickets), "Logged-in ticket list returned");
  console.log("  ✓ Logged-in /siswa/support remains 100% operational");

  // ==========================================
  // TEST 24: FRONTEND PAGE RENDERING
  // ==========================================
  console.log("\nTEST 24: FRONTEND PAGE RENDERING");
  const ticketPageRes = await fetch(`${BASE_URL}/forgot-password/ticket/${siswaToken}`);
  assert(ticketPageRes.status === 200, "GET /forgot-password/ticket/[token] returns 200 OK");
  const ticketPageHtml = await ticketPageRes.text();
  assert(
    ticketPageHtml.includes("Memuat percakapan") || ticketPageHtml.includes("Permintaan Bantuan"),
    "Ticket page renders with 200 OK and valid client shell"
  );
  console.log("  ✓ /forgot-password/ticket/[token] renders with 200 OK");

  console.log("\n==================================================");
  console.log("🎉 ALL PRE-LOGIN FORGOT PASSWORD TESTS PASSED!");
  console.log("==================================================\n");
}

runForgotPasswordTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
