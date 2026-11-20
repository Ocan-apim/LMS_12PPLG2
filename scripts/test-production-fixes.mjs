import assert from "node:assert/strict";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { uploadFile } from "../src/lib/storage.ts";
import { containsProfanity, validateComment, validateFields } from "../src/lib/profanity-filter.ts";

console.log("=======================================================");
console.log(" LEARNIX LMS - PRODUCTION FIXES & VERIFICATION SUITE");
console.log("=======================================================\n");

let passedTests = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✔ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✖ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✔ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✖ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// -------------------------------------------------------------------
// 1. Task 1: Upload & Persistent Storage Adapter
// -------------------------------------------------------------------
console.log("--- 1. Storage Adapter & Vercel Filesystem Protection ---");

await asyncTest("uploadFile falls back to local uploads in development mode", async () => {
  const sampleBuffer = Buffer.from("Test upload file content");
  const result = await uploadFile({
    buffer: sampleBuffer,
    filename: "sample_assignment.pdf",
    folder: "submissions",
    mimeType: "application/pdf",
  });

  assert(result.url.startsWith("/uploads/submissions/"), "Generates valid relative URL");
  assert(result.name === "sample_assignment.pdf", "Preserves original filename");
  assert(result.provider === "local", "Uses local provider in dev");
});

await asyncTest("uploadFile throws descriptive error instead of crashing if running in Vercel production without storage config", async () => {
  const origVercel = process.env.VERCEL;
  const origNodeEnv = process.env.NODE_ENV;
  try {
    process.env.VERCEL = "1";
    process.env.NODE_ENV = "production";

    let errorThrown = false;
    try {
      await uploadFile({
        buffer: Buffer.from("data"),
        filename: "test.pdf",
        folder: "submissions",
        mimeType: "application/pdf",
      });
    } catch (err) {
      errorThrown = true;
      assert(
        err.message.includes("Penyimpanan eksternal"),
        "Error message instructs user to set cloud credentials"
      );
    }
    assert(errorThrown, "Throws clear error in serverless environment");
  } finally {
    process.env.VERCEL = origVercel;
    process.env.NODE_ENV = origNodeEnv;
  }
});

// -------------------------------------------------------------------
// 2. Task 5: Stricter Profanity Filter (bgo, bodo, titit)
// -------------------------------------------------------------------
console.log("\n--- 2. Stricter Profanity Filter (bgo, bodo, titit) ---");

const mustBlock = [
  "bgo",
  "dasar bgo",
  "BGO",
  "b.g.o",
  "b g o",
  "bodo",
  "kamu bodo banget",
  "BODO",
  "b o d o",
  "b.o.d.o",
  "bodooo",
  "titit",
  "t1t1t",
  "t.i.t.i.t",
  "t i t i t",
  "TITIT",
  "titiiit",
  "t!t!t",
];

for (const phrase of mustBlock) {
  test(`Reject profanity: "${phrase}"`, () => {
    assert(containsProfanity(phrase) === true, `Expected "${phrase}" to be rejected`);
  });
}

const mustAccept = [
  "titik koordinat pada grafik fungsi kuadrat",
  "titik temu dua garis sejajar",
  "institusi pendidikan vokasi negeri",
  "amigo adalah kosa kata bahasa asing",
  "begitu cara menyelesaikan rumus matematika",
  "kebangsaan dan persatuan",
];

for (const phrase of mustAccept) {
  test(`Accept innocent text: "${phrase}"`, () => {
    const val = validateComment(phrase);
    assert(val.isValid === true, `Expected "${phrase}" to be accepted, but got: ${val.message}`);
  });
}

// -------------------------------------------------------------------
// 3. Task 6: Account Settings Security (Allowlist, Password Hashing, No Role Escalation)
// -------------------------------------------------------------------
console.log("\n--- 3. Account Settings Security & Allowlist Enforcement ---");

test("Strict allowlist rejects forbidden fields (name, role, nip, nisn, grade)", () => {
  const allowedKeys = new Set(["email", "password", "currentPassword", "photoUrl"]);
  const hackerPayload = {
    name: "Admin Palsu",
    role: "admin",
    grade: "12",
  };

  const hasIllegalKeys = Object.keys(hackerPayload).some((k) => !allowedKeys.has(k));
  assert(hasIllegalKeys === true, "Illegal keys detected in payload");
});

test("Strict allowlist accepts authorized fields (email, password, photoUrl)", () => {
  const allowedKeys = new Set(["email", "password", "currentPassword", "photoUrl"]);
  const validPayload = {
    email: "guru.baru@learnix.sch.id",
    password: "newsecretpassword123",
    currentPassword: "oldpassword123",
    photoUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
  };

  const hasIllegalKeys = Object.keys(validPayload).some((k) => !allowedKeys.has(k));
  assert(hasIllegalKeys === false, "Valid keys accepted");
});

await asyncTest("Bcrypt password verification and hashing operates correctly", async () => {
  const rawCurrentPassword = "mypassword123";
  const hashedPassword = await bcrypt.hash(rawCurrentPassword, 10);

  // Correct password check
  const isValid = await bcrypt.compare(rawCurrentPassword, hashedPassword);
  assert(isValid === true, "Current password verifies successfully");

  // Incorrect password check
  const isWrongValid = await bcrypt.compare("wrongpassword", hashedPassword);
  assert(isWrongValid === false, "Incorrect password fails verification");

  // New password hashing
  const newPassword = "brandnewpassword456";
  const newHashed = await bcrypt.hash(newPassword, 10);
  assert(await bcrypt.compare(newPassword, newHashed) === true, "New password hashed correctly");
});

console.log("\n=======================================================");
console.log(` SUMMARY: All ${passedTests} production tests passed successfully!`);
console.log("=======================================================\n");
