/**
 * Comprehensive End-to-End Verification Suite for:
 * Learnix LMS — Mandatory First-Login Account Activation for Guru and Kurikulum
 *
 * Covers:
 * - TASK 7.1: First-login activation (Guru & Kurikulum creation, initial login, mandatory popup state,
 *   changing username, keeping assigned username, password validation & mismatch, invalid/profane username,
 *   duplicate username within same role, same username across Guru & Kurikulum, activation persistence,
 *   logout and subsequent login)
 * - TASK 7.2: Activation restrictions (mandatory non-dismissible popup UI, direct URL redirects,
 *   protected API blocking with 403 ACTIVATION_REQUIRED, refresh/new tab persistence, logout & re-login
 *   before activation, expired/invalid session during activation)
 * - TASK 7.3: Biodata protection (strict 403 rejection on name, nip, birthPlace, birthDate, gender, role,
 *   employment info, account status, permissions, cross-user ID tampering; Admin retains biodata management
 *   without altering loginUsername)
 * - TASK 7.4: Authentication regression (activated Guru & Kurikulum username login, case-insensitivity,
 *   rejection of old NIP/email after activation, existing account compatibility, Admin/Siswa/Kepsek login
 *   preservation, authorized routes & permissions preservation)
 *
 * Run with: node --env-file=.env.local scripts/test-first-login-activation.mjs
 */

import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

const BASE_URL = process.env.TEST_URL || "http://localhost:3000";
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lms";

let totalTests = 0;
let passedTests = 0;

function assert(condition, message, detail = "") {
  totalTests++;
  if (!condition) {
    console.error(`  ✖ FAIL: ${message}${detail ? ` — ${detail}` : ""}`);
    process.exit(1);
  }
  passedTests++;
  console.log(`  ✔ ${message}`);
}

function extractCookie(res) {
  const cookiesList =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie")].filter(Boolean);

  for (const c of cookiesList) {
    const match = c.match(/lms_session=([^;]+)/);
    if (match) {
      return `lms_session=${match[1]}`;
    }
  }
  return "";
}

async function apiRequest(
  urlPath,
  method = "GET",
  cookie = "",
  body = undefined
) {
  const headers = {};
  if (cookie) headers["Cookie"] = cookie;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE_URL}${urlPath}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });

  let json = null;
  let text = "";
  try {
    text = await res.text();
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return {
    status: res.status,
    headers: res.headers,
    cookie: extractCookie(res) || cookie,
    json,
    text,
  };
}

async function loginRequest(payload) {
  return apiRequest("/api/auth/login", "POST", "", payload);
}

async function run() {
  console.log("\n==============================================================");
  console.log(" LEARNIX LMS — FIRST-LOGIN ACTIVATION & BIODATA SECURITY SUITE");
  console.log(` Target: ${BASE_URL}`);
  console.log("==============================================================\n");

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const usersCol = db.collection("users");

  // Track created test user IDs for guaranteed cleanup
  const createdUserIds = [];

  // Clean up any leftover test accounts from previous interrupted runs
  await usersCol.deleteMany({
    email: {
      $in: [
        "ahmad.fauzan.test@sekolah.sch.id",
        "rina.keep.test@sekolah.sch.id",
        "dewi.kurikulum.test@sekolah.sch.id",
        "shared.kurikulum.test@sekolah.sch.id",
      ],
    },
  });

  try {
    // =========================================================================
    // 0. STATIC UI & COMPONENT VERIFICATION (Popup & Login Form Requirements)
    // =========================================================================
    console.log("--- 0. Static Component & Popup Structure Verification ---");
    const modalSrc = fs.readFileSync(
      path.join(process.cwd(), "src/components/auth/AccountActivationModal.tsx"),
      "utf8"
    );
    assert(
      modalSrc.includes("Aktivasi Akun Learnix") &&
        modalSrc.includes(
          "Lengkapi pengaturan akun Anda sebelum melanjutkan ke Learnix."
        ) &&
        modalSrc.includes("Aktifkan Akun"),
      "AccountActivationModal includes required title 'Aktivasi Akun Learnix', description, and 'Aktifkan Akun' button"
    );
    assert(
      modalSrc.includes('e.key === "Escape"') &&
        modalSrc.includes("e.preventDefault()"),
      "AccountActivationModal blocks Escape key dismissal (mandatory non-closable popup)"
    );

    const loginFormSrc = fs.readFileSync(
      path.join(process.cwd(), "src/components/auth/LoginForm.tsx"),
      "utf8"
    );
    assert(
      loginFormSrc.includes("Username Guru") &&
        loginFormSrc.includes("Username Kurikulum") &&
        loginFormSrc.includes("isUsernameRole"),
      "LoginForm communicates that Username is expected for Guru and Kurikulum and uses text input"
    );

    // =========================================================================
    // 1. EXISTING ACCOUNT COMPATIBILITY & MIGRATION CHECK (TASK 1.2)
    // =========================================================================
    console.log("\n--- 1. Existing Account Compatibility (Task 1.2) ---");
    const existingStaff = await usersCol
      .find({
        role: { $in: ["guru", "kurikulum"] },
        email: {
          $in: [
            "budi.pratama@sekolah.sch.id",
            "siti.lestari@sekolah.sch.id",
            "agus.wijaya@sekolah.sch.id",
            "rina.s@sekolah.sch.id",
            "budi.santoso@sekolah.sch.id",
            "kurikulum@sekolah.sch.id",
          ],
        },
      })
      .toArray();

    assert(
      existingStaff.length === 6,
      "All 6 pre-existing Guru and Kurikulum accounts remain intact in MongoDB"
    );
    assert(
      existingStaff.every(
        (u) =>
          u.isActivated === true &&
          u.mustChangePassword === false &&
          typeof u.loginUsername === "string" &&
          u.loginUsername.length >= 3
      ),
      "Existing Guru & Kurikulum accounts are migrated with loginUsername and isActivated=true (not blindly marked unactivated)"
    );

    // Existing Guru can log in with their username ('budi.pratama') and access dashboard without activation popup
    const existingGuruLogin = await loginRequest({
      identifier: "budi.pratama",
      password: "password123",
      role: "guru",
    });
    assert(
      existingGuruLogin.status === 200 &&
        existingGuruLogin.json?.success === true &&
        existingGuruLogin.json?.data?.requiresActivation === false &&
        existingGuruLogin.json?.data?.user?.name === "Budi Pratama, S.Pd.",
      "Existing Guru (Budi Pratama, S.Pd.) can log in with username 'budi.pratama' and has requiresActivation=false"
    );

    // Existing Kurikulum can log in with their username ('kurikulum') and access dashboard without activation popup
    const existingKurikulumLogin = await loginRequest({
      identifier: "kurikulum",
      password: "password123",
      role: "kurikulum",
    });
    assert(
      existingKurikulumLogin.status === 200 &&
        existingKurikulumLogin.json?.success === true &&
        existingKurikulumLogin.json?.data?.requiresActivation === false &&
        existingKurikulumLogin.json?.data?.user?.name ===
          "Dra. Siti Rahayu, M.Pd.",
      "Existing Kurikulum (Dra. Siti Rahayu, M.Pd.) can log in with username 'kurikulum' and has requiresActivation=false"
    );

    // =========================================================================
    // 2. ADMIN CREATES NEW GURU & KURIKULUM ACCOUNTS (TASK 1.1)
    // =========================================================================
    console.log(
      "\n--- 2. Admin Creates New Guru & Kurikulum Accounts (Task 1.1) ---"
    );
    const adminLogin = await loginRequest({
      identifier: "admin@sekolah.sch.id",
      password: "password123",
      role: "admin",
    });
    assert(
      adminLogin.status === 200 && Boolean(adminLogin.cookie),
      "Logged in as Admin"
    );
    const adminCookie = adminLogin.cookie;

    // 2A. Admin creates Guru 1 (Ahmad Fauzan) with initial credentials
    const createGuru1Res = await apiRequest(
      "/api/admin/teachers",
      "POST",
      adminCookie,
      {
        name: "Ahmad Fauzan",
        degree: "S.Kom.",
        nip: "19881122 201501 1 009",
        email: "ahmad.fauzan.test@sekolah.sch.id",
        loginUsername: "ahmad.fauzan",
        password: "InitialGuru123!",
        lastEducation: "S1 / Sarjana",
      }
    );
    assert(
      createGuru1Res.status === 201 && createGuru1Res.json?.success === true,
      "Admin created new Guru account 'Ahmad Fauzan' (201 Created)"
    );
    const guru1 = createGuru1Res.json.data;
    createdUserIds.push(guru1._id);
    assert(
      guru1.name === "Ahmad Fauzan" &&
        guru1.nip === "19881122 201501 1 009" &&
        guru1.role === "guru" &&
        guru1.loginUsername === "ahmad.fauzan" &&
        guru1.isActivated === false &&
        guru1.mustChangePassword === true,
      "New Guru account has official name, NIP, loginUsername='ahmad.fauzan', isActivated=false, mustChangePassword=true"
    );

    // 2B. Admin creates Guru 2 (Rina Kusuma) WITHOUT specifying loginUsername (auto-generated from email)
    const createGuru2Res = await apiRequest(
      "/api/admin/teachers",
      "POST",
      adminCookie,
      {
        name: "Rina Kusuma",
        degree: "S.Pd.",
        nip: "19900210 201801 2 011",
        email: "rina.keep.test@sekolah.sch.id",
        password: "InitialRina123!",
        lastEducation: "S1 / Sarjana",
      }
    );
    assert(
      createGuru2Res.status === 201 && createGuru2Res.json?.success === true,
      "Admin created second Guru account 'Rina Kusuma' with auto-generated initial loginUsername"
    );
    const guru2 = createGuru2Res.json.data;
    createdUserIds.push(guru2._id);
    assert(
      guru2.loginUsername === "rina.keep.test" &&
        guru2.isActivated === false &&
        guru2.mustChangePassword === true,
      `Guru 2 assigned auto-generated initial loginUsername '${guru2.loginUsername}', isActivated=false, mustChangePassword=true`
    );

    // 2C. Admin creates Kurikulum 1 (Dewi Kartika, M.Pd.)
    const createKur1Res = await apiRequest(
      "/api/admin/users",
      "POST",
      adminCookie,
      {
        name: "Dewi Kartika, M.Pd.",
        nip: "19810314 200902 2 005",
        email: "dewi.kurikulum.test@sekolah.sch.id",
        loginUsername: "kurikulum01",
        password: "InitialKur123!",
        role: "kurikulum",
      }
    );
    assert(
      createKur1Res.status === 201 && createKur1Res.json?.success === true,
      "Admin created new Kurikulum account 'Dewi Kartika, M.Pd.' (201 Created)"
    );
    const kur1 = createKur1Res.json.data;
    createdUserIds.push(kur1._id);
    assert(
      kur1.name === "Dewi Kartika, M.Pd." &&
        kur1.nip === "19810314 200902 2 005" &&
        kur1.role === "kurikulum" &&
        kur1.loginUsername === "kurikulum01" &&
        kur1.isActivated === false &&
        kur1.mustChangePassword === true,
      "New Kurikulum account has official name, NIP, loginUsername='kurikulum01', isActivated=false, mustChangePassword=true"
    );

    // =========================================================================
    // 3. INITIAL LOGIN & ACTIVATION RESTRICTIONS BEFORE ACTIVATION (TASK 7.1 & 7.2)
    // =========================================================================
    console.log(
      "\n--- 3. Initial Login & Activation Restrictions Before Activation (Task 7.1 & 7.2) ---"
    );

    // 3A. Initial login for Guru 1 using initial NIP assigned by Admin
    const guru1InitialLoginNip = await loginRequest({
      identifier: "19881122 201501 1 009",
      password: "InitialGuru123!",
      role: "guru",
    });
    assert(
      guru1InitialLoginNip.status === 200 &&
        guru1InitialLoginNip.json?.data?.requiresActivation === true,
      "Unactivated Guru can perform initial login using initial NIP assigned by Admin"
    );

    // 3B. Initial login for Guru 1 using initial Email assigned by Admin
    const guru1InitialLoginEmail = await loginRequest({
      identifier: "ahmad.fauzan.test@sekolah.sch.id",
      password: "InitialGuru123!",
      role: "guru",
    });
    assert(
      guru1InitialLoginEmail.status === 200 &&
        guru1InitialLoginEmail.json?.data?.requiresActivation === true,
      "Unactivated Guru can perform initial login using initial Email assigned by Admin"
    );

    // 3C. Initial login for Guru 1 using initial assigned username
    const guru1InitialLoginUser = await loginRequest({
      identifier: "ahmad.fauzan",
      password: "InitialGuru123!",
      role: "guru",
    });
    assert(
      guru1InitialLoginUser.status === 200 &&
        guru1InitialLoginUser.json?.data?.requiresActivation === true,
      "Unactivated Guru can perform initial login using initial loginUsername assigned by Admin"
    );
    let guru1Cookie = guru1InitialLoginUser.cookie;

    // 3D. Initial login for Kurikulum 1 using initial Email assigned by Admin
    const kur1InitialLogin = await loginRequest({
      identifier: "dewi.kurikulum.test@sekolah.sch.id",
      password: "InitialKur123!",
      role: "kurikulum",
    });
    assert(
      kur1InitialLogin.status === 200 &&
        kur1InitialLogin.json?.data?.requiresActivation === true,
      "Unactivated Kurikulum can perform initial login using initial credentials assigned by Admin"
    );
    let kur1Cookie = kur1InitialLogin.cookie;

    // 3E. Attempt to access protected Guru APIs before activation -> all must be rejected with 403 ACTIVATION_REQUIRED
    for (const protectedPath of [
      "/api/guru/dashboard",
      "/api/guru/classes",
      "/api/guru/assignments",
      "/api/guru/grades",
      "/api/guru/profile",
      "/api/profile",
      "/api/search?q=basis",
    ]) {
      const blockedRes = await apiRequest(protectedPath, "GET", guru1Cookie);
      assert(
        blockedRes.status === 403 &&
          blockedRes.json?.code === "ACTIVATION_REQUIRED" &&
          blockedRes.json?.requiresActivation === true,
        `Unactivated Guru blocked from ${protectedPath} with 403 ACTIVATION_REQUIRED`
      );
    }

    // 3F. Attempt to access protected Kurikulum APIs before activation -> all must be rejected with 403 ACTIVATION_REQUIRED
    for (const protectedPath of [
      "/api/kurikulum/dashboard",
      "/api/kurikulum/teachers",
      "/api/kurikulum/grades/classes",
      "/api/kurikulum/reports/grades",
      "/api/kurikulum/profile",
      "/api/profile",
      "/api/search?q=guru",
    ]) {
      const blockedRes = await apiRequest(protectedPath, "GET", kur1Cookie);
      assert(
        blockedRes.status === 403 &&
          blockedRes.json?.code === "ACTIVATION_REQUIRED" &&
          blockedRes.json?.requiresActivation === true,
        `Unactivated Kurikulum blocked from ${protectedPath} with 403 ACTIVATION_REQUIRED`
      );
    }

    // 3G. Attempt to access protected sub-pages directly via URL before activation -> redirected to role root
    for (const subPage of [
      "/guru/classes",
      "/guru/assignments",
      "/guru/grades",
      "/guru/profile",
    ]) {
      const pageRes = await apiRequest(subPage, "GET", guru1Cookie);
      const location = pageRes.headers.get("location") || "";
      assert(
        (pageRes.status === 307 || pageRes.status === 308) &&
          location.endsWith("/guru"),
        `Direct URL navigation to ${subPage} before activation redirected to /guru`
      );
    }

    for (const subPage of [
      "/kurikulum/teachers",
      "/kurikulum/reports",
      "/kurikulum/profile",
    ]) {
      const pageRes = await apiRequest(subPage, "GET", kur1Cookie);
      const location = pageRes.headers.get("location") || "";
      assert(
        (pageRes.status === 307 || pageRes.status === 308) &&
          location.endsWith("/kurikulum"),
        `Direct URL navigation to ${subPage} before activation redirected to /kurikulum`
      );
    }

    // 3H. Fetching /guru or /kurikulum HTML before activation renders mandatory popup and suppresses dashboard content
    const guruRootHtml = await apiRequest("/guru", "GET", guru1Cookie);
    assert(
      guruRootHtml.status === 200 &&
        guruRootHtml.text.includes("Aktivasi Akun Learnix") &&
        guruRootHtml.text.includes(
          "Lengkapi pengaturan akun Anda sebelum melanjutkan ke Learnix."
        ) &&
        guruRootHtml.text.includes("Aktifkan Akun"),
      "Server-rendered /guru page for unactivated Guru displays mandatory 'Aktivasi Akun Learnix' popup"
    );

    const kurRootHtml = await apiRequest("/kurikulum", "GET", kur1Cookie);
    assert(
      kurRootHtml.status === 200 &&
        kurRootHtml.text.includes("Aktivasi Akun Learnix") &&
        kurRootHtml.text.includes("Aktifkan Akun"),
      "Server-rendered /kurikulum page for unactivated Kurikulum displays mandatory 'Aktivasi Akun Learnix' popup"
    );

    // 3I. Browser refresh & new tab persistence before activation
    const meRefresh1 = await apiRequest("/api/auth/me", "GET", guru1Cookie);
    const meRefresh2 = await apiRequest("/api/auth/me", "GET", guru1Cookie);
    assert(
      meRefresh1.status === 200 &&
        meRefresh1.json?.data?.requiresActivation === true &&
        meRefresh2.json?.data?.requiresActivation === true &&
        meRefresh2.json?.data?.user?.isActivated === false,
      "Activation requirement persists across browser refresh and new tab sessions"
    );

    // 3J. Logout before completing activation and log in again -> account remains unactivated
    const logoutBeforeAct = await apiRequest(
      "/api/auth/logout",
      "POST",
      guru1Cookie
    );
    assert(
      logoutBeforeAct.status === 200,
      "Unactivated Guru can log out before completing activation"
    );

    const reloginBeforeAct = await loginRequest({
      identifier: "ahmad.fauzan",
      password: "InitialGuru123!",
      role: "guru",
    });
    assert(
      reloginBeforeAct.status === 200 &&
        reloginBeforeAct.json?.data?.requiresActivation === true &&
        reloginBeforeAct.json?.data?.user?.isActivated === false,
      "After logging out and logging in again before activation, account remains unactivated and popup is still required"
    );
    guru1Cookie = reloginBeforeAct.cookie;

    // 3K. Expired / missing session during activation attempt -> rejected with 401
    const expiredSessionAct = await apiRequest(
      "/api/auth/activate",
      "POST",
      "lms_session=expired.or.invalid.token",
      {
        username: "fauzan.guru",
        newPassword: "NewSecurePass123!",
        confirmPassword: "NewSecurePass123!",
      }
    );
    assert(
      expiredSessionAct.status === 401,
      "Activation submission with expired or invalid session token rejected with 401 Unauthorized"
    );

    // =========================================================================
    // 4. ACTIVATION VALIDATION & ROLE-SCOPED USERNAME UNIQUENESS (TASK 2.2, 3.3, 7.1)
    // =========================================================================
    console.log(
      "\n--- 4. Activation Validation & Role-Scoped Username Rules (Task 2.2, 3.3, 7.1) ---"
    );

    // 4A. Password confirmation mismatch
    const mismatchRes = await apiRequest(
      "/api/auth/activate",
      "POST",
      guru1Cookie,
      {
        username: "fauzan.guru",
        newPassword: "NewSecurePass123!",
        confirmPassword: "DifferentPass123!",
      }
    );
    assert(
      mismatchRes.status === 400 && mismatchRes.json?.success === false,
      `Password confirmation mismatch rejected (400: "${mismatchRes.json?.message}")`
    );

    // 4B. Password too short (< 6 chars)
    const shortPassRes = await apiRequest(
      "/api/auth/activate",
      "POST",
      guru1Cookie,
      {
        username: "fauzan.guru",
        newPassword: "123",
        confirmPassword: "123",
      }
    );
    assert(
      shortPassRes.status === 400 && shortPassRes.json?.success === false,
      `Short password (< 6 chars) rejected (400: "${shortPassRes.json?.message}")`
    );

    // 4C. Empty username and invalid username formats
    for (const invalidUsername of [
      "",
      "   ",
      "ab",
      "fauzan@sekolah.sch.id",
      "fauzan guru",
      ".fauzan",
      "fauzan.",
      "fauzan..guru",
      "anjing.guru",
    ]) {
      const invRes = await apiRequest(
        "/api/auth/activate",
        "POST",
        guru1Cookie,
        {
          username: invalidUsername,
          newPassword: "NewSecurePass123!",
          confirmPassword: "NewSecurePass123!",
        }
      );
      assert(
        invRes.status === 400 && invRes.json?.success === false,
        `Invalid/prohibited username "${invalidUsername}" rejected with 400 ("${invRes.json?.message}")`
      );
    }

    // 4D. Duplicate username within the SAME role (case-insensitive check against existing Guru 'budi.pratama')
    const dupSameRoleRes = await apiRequest(
      "/api/auth/activate",
      "POST",
      guru1Cookie,
      {
        username: "  Budi.Pratama  ",
        newPassword: "NewSecurePass123!",
        confirmPassword: "NewSecurePass123!",
      }
    );
    assert(
      dupSameRoleRes.status === 400 && dupSameRoleRes.json?.success === false,
      `Duplicate username within Guru role ('Budi.Pratama') rejected case-insensitively (400: "${dupSameRoleRes.json?.message}")`
    );

    // 4E. Successful activation for Guru 1 (Ahmad Fauzan) with customized username 'fauzan.guru' (with mixed case & spaces to verify trim + lowercase normalization)
    const activateGuru1Res = await apiRequest(
      "/api/auth/activate",
      "POST",
      guru1Cookie,
      {
        username: "  Fauzan.Guru  ",
        newPassword: "FauzanGuruPass123!",
        confirmPassword: "FauzanGuruPass123!",
      }
    );
    assert(
      activateGuru1Res.status === 200 &&
        activateGuru1Res.json?.success === true &&
        activateGuru1Res.json?.data?.user?.loginUsername === "fauzan.guru" &&
        activateGuru1Res.json?.data?.user?.isActivated === true &&
        activateGuru1Res.json?.data?.user?.mustChangePassword === false &&
        activateGuru1Res.json?.data?.user?.name === "Ahmad Fauzan",
      "Guru 1 (Ahmad Fauzan) successfully activated account with customized username 'fauzan.guru' while keeping official name 'Ahmad Fauzan'"
    );
    guru1Cookie = activateGuru1Res.cookie;

    // Verify database state for Guru 1
    const guru1Db = await usersCol.findOne({
      _id: new mongoose.Types.ObjectId(guru1._id),
    });
    assert(
      guru1Db.isActivated === true &&
        guru1Db.mustChangePassword === false &&
        guru1Db.loginUsername === "fauzan.guru" &&
        guru1Db.activatedAt instanceof Date &&
        guru1Db.name === "Ahmad Fauzan" &&
        guru1Db.nip === "19881122 201501 1 009",
      "MongoDB record for Guru 1 has isActivated=true, mustChangePassword=false, activatedAt Date, loginUsername='fauzan.guru', and untouched biodata"
    );

    // Verify Guru 1 can now access protected Guru dashboard & profile APIs immediately with reissued JWT cookie
    const guru1DashAfter = await apiRequest(
      "/api/guru/dashboard",
      "GET",
      guru1Cookie
    );
    assert(
      guru1DashAfter.status === 200 && guru1DashAfter.json?.success === true,
      "Activated Guru 1 can immediately access /api/guru/dashboard (200 OK)"
    );

    // 4F. Successful activation for Guru 2 (Rina Kusuma) KEEPING the assigned username unchanged
    const guru2Login = await loginRequest({
      identifier: "rina.keep.test@sekolah.sch.id",
      password: "InitialRina123!",
      role: "guru",
    });
    assert(guru2Login.status === 200, "Guru 2 logged in for initial activation");
    const activateGuru2Res = await apiRequest(
      "/api/auth/activate",
      "POST",
      guru2Login.cookie,
      {
        username: guru2.loginUsername, // unchanged
        newPassword: "RinaNewPass123!",
        confirmPassword: "RinaNewPass123!",
      }
    );
    assert(
      activateGuru2Res.status === 200 &&
        activateGuru2Res.json?.data?.user?.loginUsername === "rina.keep.test" &&
        activateGuru2Res.json?.data?.user?.isActivated === true,
      "Guru 2 successfully activated account while keeping assigned initial username unchanged"
    );

    // 4G. Successful activation for Kurikulum 1 (Dewi Kartika) keeping assigned username 'kurikulum01'
    // First test duplicate within Kurikulum role against existing 'kurikulum' account
    const dupKurRes = await apiRequest(
      "/api/auth/activate",
      "POST",
      kur1Cookie,
      {
        username: "KURIKULUM",
        newPassword: "DewiKurPass123!",
        confirmPassword: "DewiKurPass123!",
      }
    );
    assert(
      dupKurRes.status === 400 && dupKurRes.json?.success === false,
      "Duplicate username within Kurikulum role ('KURIKULUM') rejected case-insensitively (400)"
    );

    const activateKur1Res = await apiRequest(
      "/api/auth/activate",
      "POST",
      kur1Cookie,
      {
        username: "kurikulum01",
        newPassword: "DewiKurPass123!",
        confirmPassword: "DewiKurPass123!",
      }
    );
    assert(
      activateKur1Res.status === 200 &&
        activateKur1Res.json?.data?.user?.loginUsername === "kurikulum01" &&
        activateKur1Res.json?.data?.user?.isActivated === true &&
        activateKur1Res.json?.data?.user?.name === "Dewi Kartika, M.Pd.",
      "Kurikulum 1 (Dewi Kartika, M.Pd.) successfully activated account with username 'kurikulum01'"
    );
    kur1Cookie = activateKur1Res.cookie;

    // Verify Kurikulum 1 can now access protected Kurikulum dashboard & profile APIs
    const kur1DashAfter = await apiRequest(
      "/api/kurikulum/dashboard",
      "GET",
      kur1Cookie
    );
    assert(
      kur1DashAfter.status === 200 && kur1DashAfter.json?.success === true,
      "Activated Kurikulum 1 can immediately access /api/kurikulum/dashboard (200 OK)"
    );

    // 4H. Verify SAME username across Guru and Kurikulum IS allowed (role-scoped uniqueness)
    const createKurSharedRes = await apiRequest(
      "/api/admin/users",
      "POST",
      adminCookie,
      {
        name: "Hendra Kurikulum, M.Pd.",
        nip: "19790817 200501 1 012",
        email: "shared.kurikulum.test@sekolah.sch.id",
        password: "InitialShared123!",
        role: "kurikulum",
      }
    );
    assert(
      createKurSharedRes.status === 201,
      "Created second Kurikulum account to test cross-role username sharing"
    );
    const kurShared = createKurSharedRes.json.data;
    createdUserIds.push(kurShared._id);

    const kurSharedLogin = await loginRequest({
      identifier: "shared.kurikulum.test@sekolah.sch.id",
      password: "InitialShared123!",
      role: "kurikulum",
    });
    // Activate Kurikulum 2 using 'fauzan.guru' (which is already used by Guru 1, but NOT by any Kurikulum!)
    const activateKurSharedRes = await apiRequest(
      "/api/auth/activate",
      "POST",
      kurSharedLogin.cookie,
      {
        username: "fauzan.guru",
        newPassword: "SharedKurPass123!",
        confirmPassword: "SharedKurPass123!",
      }
    );
    assert(
      activateKurSharedRes.status === 200 &&
        activateKurSharedRes.json?.data?.user?.loginUsername === "fauzan.guru",
      "A Guru and a Kurikulum account CAN share the same username ('fauzan.guru') because uniqueness is scoped per role"
    );

    // =========================================================================
    // 5. STRICT BIODATA PROTECTION (TASK 4 & TASK 7.3)
    // =========================================================================
    console.log("\n--- 5. Official Biodata Protection (Task 4 & Task 7.3) ---");

    // 5A. Guru attempting to modify official biodata via /api/guru/profile, /api/profile, or /api/auth/activate
    const protectedPayloads = [
      { name: "Nama Palsu Guru" },
      { nip: "99999999 999999 9 999" },
      { birthPlace: "Tokyo" },
      { birthDate: "1990-01-01" },
      { gender: "Perempuan" },
      { role: "admin" },
      { degree: "Prof. Dr." },
      { lastEducation: "S3 / Doktoral" },
      { subjects: [] },
      { joinDate: "2020-01-01" },
      { tahunBergabung: "2020" },
      { joinYear: 2020 },
      { isHomeroomTeacher: true },
      { isActive: false },
      { isActivated: false },
      { mustChangePassword: true },
      { permissions: { canEditAccount: true, isAdmin: true } },
      { _id: String(existingStaff[0]._id), email: "tamper@sekolah.sch.id" },
    ];

    for (const payload of protectedPayloads) {
      const fieldName = Object.keys(payload)[0];
      const guruProfAttempt = await apiRequest(
        "/api/guru/profile",
        "PATCH",
        guru1Cookie,
        payload
      );
      assert(
        guruProfAttempt.status === 403,
        `Guru blocked with 403 from modifying protected field '${fieldName}' via PATCH /api/guru/profile`
      );

      const guruActivateAttempt = await apiRequest(
        "/api/auth/activate",
        "POST",
        guru1Cookie,
        {
          username: "fauzan.guru",
          newPassword: "FauzanGuruPass123!",
          confirmPassword: "FauzanGuruPass123!",
          ...payload,
        }
      );
      assert(
        guruActivateAttempt.status === 403,
        `Guru blocked with 403 from injecting protected field '${fieldName}' via POST /api/auth/activate`
      );

      const kurProfAttempt = await apiRequest(
        "/api/kurikulum/profile",
        "PATCH",
        kur1Cookie,
        payload
      );
      assert(
        kurProfAttempt.status === 403,
        `Kurikulum blocked with 403 from modifying protected field '${fieldName}' via PATCH /api/kurikulum/profile`
      );
    }

    // Verify Guru 1 & Kurikulum 1 profile GET endpoints return official biodata AND loginUsername separately
    const guru1ProfileGet = await apiRequest(
      "/api/guru/profile",
      "GET",
      guru1Cookie
    );
    assert(
      guru1ProfileGet.status === 200 &&
        guru1ProfileGet.json?.data?.user?.name === "Ahmad Fauzan" &&
        guru1ProfileGet.json?.data?.user?.nip === "19881122 201501 1 009" &&
        guru1ProfileGet.json?.data?.user?.loginUsername === "fauzan.guru" &&
        guru1ProfileGet.json?.data?.permissions?.canEditIdentificationNumber ===
          false,
      "GET /api/guru/profile displays official name, official NIP (read-only), and loginUsername separately"
    );

    const kur1ProfileGet = await apiRequest(
      "/api/kurikulum/profile",
      "GET",
      kur1Cookie
    );
    assert(
      kur1ProfileGet.status === 200 &&
        kur1ProfileGet.json?.data?.user?.name === "Dewi Kartika, M.Pd." &&
        kur1ProfileGet.json?.data?.user?.nip === "19810314 200902 2 005" &&
        kur1ProfileGet.json?.data?.user?.loginUsername === "kurikulum01" &&
        kur1ProfileGet.json?.data?.permissions?.isReadOnly === true,
      "GET /api/kurikulum/profile displays official name, official NIP (read-only), and loginUsername separately"
    );

    // 5B. Verify Admin CAN edit official biodata (name, NIP, degree) and loginUsername remains unchanged
    const adminEditGuruRes = await apiRequest(
      `/api/admin/teachers/${guru1._id}`,
      "PUT",
      adminCookie,
      {
        name: "Ahmad Fauzan Ramadhan",
        nip: "19881122 201501 1 099",
        degree: "M.Kom.",
      }
    );
    assert(
      adminEditGuruRes.status === 200 &&
        adminEditGuruRes.json?.data?.name === "Ahmad Fauzan Ramadhan" &&
        adminEditGuruRes.json?.data?.nip === "19881122 201501 1 099" &&
        adminEditGuruRes.json?.data?.degree === "M.Kom." &&
        adminEditGuruRes.json?.data?.loginUsername === "fauzan.guru",
      "Admin can update Guru official name, NIP, and degree while loginUsername ('fauzan.guru') remains unchanged"
    );

    const adminEditKurRes = await apiRequest(
      `/api/admin/users/${kur1._id}`,
      "PATCH",
      adminCookie,
      {
        name: "Dra. Dewi Kartika, M.Pd.",
        nip: "19810314 200902 2 099",
      }
    );
    assert(
      adminEditKurRes.status === 200 &&
        adminEditKurRes.json?.data?.name === "Dra. Dewi Kartika, M.Pd." &&
        adminEditKurRes.json?.data?.nip === "19810314 200902 2 099" &&
        adminEditKurRes.json?.data?.loginUsername === "kurikulum01",
      "Admin can update Kurikulum official name and NIP while loginUsername ('kurikulum01') remains unchanged"
    );

    // =========================================================================
    // 6. AUTHENTICATION REGRESSION & POST-ACTIVATION LOGIN (TASK 2.1 & 7.4)
    // =========================================================================
    console.log(
      "\n--- 6. Post-Activation Username Login & Auth Regression (Task 2.1 & 7.4) ---"
    );

    // 6A. Activated Guru can log in using username (case-insensitive) and new password
    const guruPostActLogin = await loginRequest({
      identifier: "  FAUZAN.GURU  ",
      password: "FauzanGuruPass123!",
      role: "guru",
    });
    assert(
      guruPostActLogin.status === 200 &&
        guruPostActLogin.json?.success === true &&
        guruPostActLogin.json?.data?.user?.name === "Ahmad Fauzan Ramadhan" &&
        guruPostActLogin.json?.data?.user?.loginUsername === "fauzan.guru" &&
        guruPostActLogin.json?.data?.requiresActivation === false,
      "Activated Guru can log in using customized username (case-insensitive) and new password"
    );

    // 6B. Activated Kurikulum can log in using username (case-insensitive) and new password
    const kurPostActLogin = await loginRequest({
      identifier: "KURIKULUM01",
      password: "DewiKurPass123!",
      role: "kurikulum",
    });
    assert(
      kurPostActLogin.status === 200 &&
        kurPostActLogin.json?.success === true &&
        kurPostActLogin.json?.data?.user?.name === "Dra. Dewi Kartika, M.Pd." &&
        kurPostActLogin.json?.data?.user?.loginUsername === "kurikulum01" &&
        kurPostActLogin.json?.data?.requiresActivation === false,
      "Activated Kurikulum can log in using customized username (case-insensitive) and new password"
    );

    // 6C. Both Guru ('fauzan.guru') and Kurikulum ('fauzan.guru') sharing the same username authenticate into their own role accurately
    const kurSharedPostLogin = await loginRequest({
      identifier: "fauzan.guru",
      password: "SharedKurPass123!",
      role: "kurikulum",
    });
    assert(
      kurSharedPostLogin.status === 200 &&
        kurSharedPostLogin.json?.data?.user?.role === "kurikulum" &&
        kurSharedPostLogin.json?.data?.user?.name ===
          "Hendra Kurikulum, M.Pd.",
      "Kurikulum sharing username 'fauzan.guru' with a Guru logs in accurately as Kurikulum"
    );

    // 6D. Old NIP and old Email login are NOT accepted for activated Guru and Kurikulum accounts!
    for (const oldGuruIdentifier of [
      "19881122 201501 1 009",
      "19881122 201501 1 099",
      "ahmad.fauzan.test@sekolah.sch.id",
    ]) {
      const oldGuruLogin = await loginRequest({
        identifier: oldGuruIdentifier,
        password: "FauzanGuruPass123!",
        role: "guru",
      });
      assert(
        oldGuruLogin.status === 401 && oldGuruLogin.json?.success === false,
        `Old NIP/email '${oldGuruIdentifier}' rejected with 401 for activated Guru account`
      );
    }

    for (const oldKurIdentifier of [
      "19810314 200902 2 005",
      "19810314 200902 2 099",
      "dewi.kurikulum.test@sekolah.sch.id",
    ]) {
      const oldKurLogin = await loginRequest({
        identifier: oldKurIdentifier,
        password: "DewiKurPass123!",
        role: "kurikulum",
      });
      assert(
        oldKurLogin.status === 401 && oldKurLogin.json?.success === false,
        `Old NIP/email '${oldKurIdentifier}' rejected with 401 for activated Kurikulum account`
      );
    }

    // 6E. Old password is NOT accepted for activated accounts
    const oldPwdGuruLogin = await loginRequest({
      identifier: "fauzan.guru",
      password: "InitialGuru123!",
      role: "guru",
    });
    assert(
      oldPwdGuruLogin.status === 401,
      "Old initial password rejected with 401 after activation"
    );

    // 6F. Other roles' login methods remain completely unchanged (Admin, Siswa, Kepsek)
    const adminRegLogin = await loginRequest({
      identifier: "admin@sekolah.sch.id",
      password: "password123",
      role: "admin",
    });
    assert(
      adminRegLogin.status === 200 &&
        adminRegLogin.json?.data?.user?.role === "admin",
      "Admin login via email remains unchanged (200 OK)"
    );

    const siswaRegLogin = await loginRequest({
      identifier: "0098273645",
      password: "password123",
      role: "siswa",
    });
    assert(
      siswaRegLogin.status === 200 &&
        siswaRegLogin.json?.data?.user?.role === "siswa" &&
        siswaRegLogin.json?.data?.user?.name === "Ahmad Bagus Pratama",
      "Siswa login via NIS remains unchanged (200 OK)"
    );

    const kepsekRegLogin = await loginRequest({
      identifier: "kepsek@sekolah.sch.id",
      password: "password123",
      role: "kepsek",
    });
    assert(
      kepsekRegLogin.status === 200 &&
        kepsekRegLogin.json?.data?.user?.role === "kepsek" &&
        kepsekRegLogin.json?.data?.user?.name === "Drs. H. Mulyadi, M.Pd.",
      "Kepsek login via email remains unchanged (200 OK)"
    );
  } finally {
    // Cleanup temporary test users created during the test run
    if (createdUserIds.length > 0) {
      await usersCol.deleteMany({
        _id: {
          $in: createdUserIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
      });
    }
    await mongoose.disconnect();
  }

  console.log("\n==============================================================");
  console.log(
    ` ALL ${passedTests}/${totalTests} FIRST-LOGIN ACTIVATION & SECURITY CHECKS PASSED!`
  );
  console.log("==============================================================\n");
}

run().catch(async (err) => {
  console.error("Test execution failed:", err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
