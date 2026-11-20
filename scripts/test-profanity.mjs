/**
 * Comprehensive Test Suite for Learnix LMS Indonesian Profanity Filter
 * Run with: node --experimental-strip-types scripts/test-profanity.mjs
 */

import {
  normalizeText,
  normalizeLeetspeak,
  normalizeUnicode,
  containsProfanity,
  validateComment,
  PROFANITY_ERROR_MESSAGE,
  EMPTY_COMMENT_ERROR_MESSAGE,
  PROFANITY_DICTIONARY,
} from "../src/lib/profanity-filter.ts";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = "") {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔\x1b[0m ${testName}`);
  } else {
    failedTests++;
    console.error(`  \x1b[31m✖\x1b[0m ${testName} ${details ? `(${details})` : ""}`);
  }
}

console.log("\n--- 0. Core Function Unit Tests ---");
assert(
  normalizeUnicode("АNJİNG") === "anjing",
  "normalizeUnicode converts homoglyphs and lowercases"
);
assert(
  normalizeLeetspeak("b4ngs4t") === "bangsat",
  "normalizeLeetspeak converts numbers/symbols to letters"
);
assert(
  normalizeText("   khooontooool   ") === "khontol",
  "normalizeText collapses repeated chars and trims whitespace"
);
assert(
  containsProfanity("ajg") === true,
  "containsProfanity detects abbreviated profanity"
);
assert(
  containsProfanity("selamat pagi") === false,
  "containsProfanity returns false for innocent text"
);
assert(
  Array.isArray(PROFANITY_DICTIONARY) && PROFANITY_DICTIONARY.length >= 3,
  "PROFANITY_DICTIONARY exposes organized categories"
);

// 1. MUST BE REJECTED (Specified in Prompt)
console.log("--- 1. Required Prohibited Terms & Variations ---");

const promptMustBeRejected = [
  "Kamu anjing!",
  "Dasar bangsat",
  "anjg",
  "ajg",
  "bngst",
  "bgts",
  "gblk",
  "tlol",
  "mmk",
  "kntl",
  "A-N-J-I-N-G",
  "a.n.j.i.n.g",
  "anjiiing",
  "b4ngs4t",
  // Additional variations required
  "jembut",
  "jmbt",
  "jembuut",
  "memek",
  "mem3k",
  "kontol",
  "kont0l",
  "ngentot",
  "ngntt",
  "ngent0t",
  "b@ngs@t",
];

for (const phrase of promptMustBeRejected) {
  const res = validateComment(phrase);
  assert(
    !res.isValid && res.message === PROFANITY_ERROR_MESSAGE,
    `Reject: "${phrase}"`,
    `Got isValid=${res.isValid}, message=${res.message}`
  );
}

// 2. EXPANDED DICTIONARY (Insults, Vulgar/Sexual, Regional)
console.log("\n--- 2. Expanded Dictionary Tests ---");

const expandedVocabulary = [
  // Insults
  { word: "bego", test: "Dasar bego kamu" },
  { word: "bajingan", test: "kamu bajingan" },
  { word: "keparat", test: "dasar keparat" },
  { word: "brengsek", test: "orang brengsek" },
  { word: "sialan", test: "sialan kamu" },
  { word: "bodoh (contextual)", test: "kamu bodoh banget" },
  { word: "bodoh (contextual)", test: "dasar bodoh" },
  // Vulgar / Sexual
  { word: "pepek", test: "pepek busuk" },
  { word: "kimak", test: "pukimak kau" },
  { word: "peler", test: "peler bau" },
  { word: "plr", test: "dasar plr" },
  { word: "toket", test: "toket besar" },
  { word: "ngaceng", test: "lagi ngaceng" },
  { word: "entot", test: "kena entot" },
  // Regional swear words & slang
  { word: "jancok", test: "jancok kowe" },
  { word: "dancok", test: "dancok kon" },
  { word: "jancuk", test: "jancuk tenan" },
  { word: "asu", test: "dasar asu" },
  { word: "itil", test: "itil kamu" },
  { word: "pantek", test: "pantek kau" },
  { word: "lonte", test: "dasar lonte" },
  { word: "perek", test: "cewek perek" },
  { word: "jablay", test: "dasar jablay" },
  { word: "tetek", test: "tetek perempuan" },
  { word: "colmek", test: "suka colmek" },
  { word: "coli", test: "tukang coli" },
];

for (const { word, test } of expandedVocabulary) {
  const res = validateComment(test);
  assert(
    !res.isValid && res.message === PROFANITY_ERROR_MESSAGE,
    `Reject ${word}: "${test}"`
  );
}

// 3. MUST BE ACCEPTED (False Positive Prevention)
console.log("\n--- 3. Required Accept Sentences & False Positive Checks ---");

const promptMustBeAccepted = [
  "Selamat pagi semuanya.",
  "Terima kasih atas penjelasannya.",
  "Saya kurang setuju dengan pendapat tersebut.",
  "Mari kita diskusikan bersama.",
  "Pembelajaran hari ini sangat menarik.",
  "Saya ingin bertanya tentang materi ini.",
  // False positive safeguard checks for Indonesian words
  "panjang sekali materi hari ini",
  "silakan masukkan tugas ke dalam keranjang",
  "kontrol kualitas kode sudah sesuai",
  "kontrak belajar semester ini",
  "kita bangga sebagai bangsa Indonesia",
  "kebangsaan dan cinta tanah air",
  "tolong bantu jelaskan bagian ini",
  "guru memblokir peserta yang tidak hadir",
  "begitu cara menyelesaikan soalnya",
  "begadang tidak baik untuk siswa",
  "maaf saya merasa masih bodoh dan ingin belajar lebih banyak",
  "masuk ke ruang kelas tepat waktu",
  "asumsi awal penelitian ini",
  "asuransi perlindungan siswa",
  "cukup sekian pemaparan dari kelompok kami",
  "pucuk teh hijau dari pegunungan",
  "pukulan smash dalam bulutangkis",
  "pantai Parangtritis sangat elok",
  "pantas dia menjadi juara kelas",
  "menetapkan peraturan kelas",
  "tentu saja kita bisa menyelesaikan tugas ini bersama",
  "penjelasannya bagus bgt",
  "materi minggu ini sangat aplikatif",
];

for (const phrase of promptMustBeAccepted) {
  const res = validateComment(phrase);
  assert(
    res.isValid === true,
    `Accept innocent text: "${phrase}"`,
    `Falsely flagged with message: ${res.message}`
  );
}

// 4. EDGE CASES: Empty, Whitespace, Mixed Case, Evasions
console.log("\n--- 4. Edge Cases: Empty, Whitespace, Case, Bypass Attempts ---");

// Empty string
const emptyRes = validateComment("");
assert(
  !emptyRes.isValid && emptyRes.message === EMPTY_COMMENT_ERROR_MESSAGE,
  "Reject empty string"
);

// Spaces only
const spacesRes = validateComment("     ");
assert(
  !spacesRes.isValid && spacesRes.message === EMPTY_COMMENT_ERROR_MESSAGE,
  "Reject spaces only"
);

// Null or undefined
assert(!validateComment(null).isValid, "Reject null comment");
assert(!validateComment(undefined).isValid, "Reject undefined comment");

// Uppercase variations
assert(
  !validateComment("KAMU ANJING!").isValid,
  "Reject all-caps: 'KAMU ANJING!'"
);
assert(
  !validateComment("AnJiNg LoE").isValid,
  "Reject mixed-case: 'AnJiNg LoE'"
);
assert(
  !validateComment("bNgSt").isValid,
  "Reject mixed-case abbreviation: 'bNgSt'"
);
assert(
  !validateComment("kNtL").isValid,
  "Reject mixed-case abbreviation: 'kNtL'"
);

// Character separation (spaces and punctuation)
assert(
  !validateComment("a n j i n g").isValid,
  "Reject spaced letters: 'a n j i n g'"
);
assert(
  !validateComment("k o n t o l").isValid,
  "Reject spaced letters: 'k o n t o l'"
);
assert(
  !validateComment("b.n.g.s.t").isValid,
  "Reject dot-separated letters: 'b.n.g.s.t'"
);
assert(
  !validateComment("k-n-t-l").isValid,
  "Reject dash-separated letters: 'k-n-t-l'"
);
assert(
  !validateComment("_anjing_").isValid,
  "Reject underscore-wrapped: '_anjing_'"
);

// Sentence with both normal and prohibited words
assert(
  !validateComment("Selamat pagi semuanya, tapi kamu anjing ya").isValid,
  "Reject mixed normal + prohibited comment"
);
assert(
  !validateComment("Tolong jelaskan tugas ini bngst").isValid,
  "Reject polite prefix with vulgar slang suffix"
);

// 5. DIRECT API VALIDATION SIMULATION
console.log("\n--- 5. Direct API Simulation (MongoDB Persistence Prevention) ---");

// Mock Assignment comment database array
const mockAssignmentComments = [];

function simulateApiAddComment(payload) {
  const { message } = payload;
  const validation = validateComment(message);
  if (!validation.isValid) {
    return {
      status: 400,
      json: { success: false, message: validation.message },
    };
  }
  const newComment = { id: "cmt_1", message: message.trim() };
  mockAssignmentComments.push(newComment);
  return {
    status: 201,
    json: { success: true, data: newComment },
  };
}

function simulateApiEditComment(commentId, updatedMessage) {
  const validation = validateComment(updatedMessage);
  if (!validation.isValid) {
    return {
      status: 400,
      json: { success: false, message: validation.message },
    };
  }
  const comment = mockAssignmentComments.find((c) => c.id === commentId);
  if (comment) {
    comment.message = updatedMessage.trim();
  }
  return {
    status: 200,
    json: { success: true, data: comment },
  };
}

// Direct API attempt with prohibited comment
const directApiRes = simulateApiAddComment({ message: "Dasar b4ngs4t lu" });
assert(
  directApiRes.status === 400,
  "Direct API POST returns HTTP 400 for profanity"
);
assert(
  mockAssignmentComments.length === 0,
  "Rejected comment is NOT persisted in MongoDB"
);

// Direct API valid comment
const validApiRes = simulateApiAddComment({
  message: "Terima kasih atas penjelasan materinya pak.",
});
assert(
  validApiRes.status === 201,
  "Direct API POST succeeds for valid comment"
);
assert(
  mockAssignmentComments.length === 1,
  "Valid comment is persisted in MongoDB"
);

// Direct API edit attempt to insert prohibited language
const editApiRes = simulateApiEditComment("cmt_1", "Ternyata kamu anjing");
assert(
  editApiRes.status === 400,
  "Direct API PUT returns HTTP 400 when editing comment to profanity"
);
assert(
  mockAssignmentComments[0].message ===
    "Terima kasih atas penjelasan materinya pak.",
  "Existing comment in database remains unaltered after rejected edit attempt"
);

console.log("\n=======================================================");
console.log(` SUMMARY: ${passedTests}/${totalTests} tests passed (${failedTests} failed)`);
console.log("=======================================================\n");

if (failedTests > 0) {
  process.exit(1);
}
