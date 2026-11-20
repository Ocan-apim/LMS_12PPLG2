/**
 * Automated Verification & Regression Suite for Learnix LMS Indonesian Profanity Filter
 * Run with: npm run test:profanity
 */

import {
  normalizeUnicode,
  normalizeLeetspeak,
  normalizeText,
  containsProfanity,
  validateComment,
  validateContent,
  validateFields,
  PROFANITY_DICTIONARY,
  EMPTY_COMMENT_ERROR_MESSAGE,
  COMMENT_PROFANITY_ERROR_MESSAGE,
  DEFAULT_PROFANITY_ERROR_MESSAGE,
} from "../src/lib/profanity-filter.ts";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, failureDetail = "") {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✔ ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✖ ${testName} ${failureDetail ? "(" + failureDetail + ")" : ""}`);
  }
}

console.log("\n=======================================================");
console.log(" LEARNIX LMS - PROFANITY FILTER REGRESSION SUITE");
console.log("=======================================================\n");

// 0. CORE FUNCTION TESTS
console.log("--- 0. Core Function Unit Tests ---");

assert(
  normalizeUnicode("АNJİNG") === "anjing",
  "normalizeUnicode converts homoglyphs and lowercases"
);

assert(
  normalizeLeetspeak("b4ngs@t 1d10t") === "bangsat idiot",
  "normalizeLeetspeak converts numbers/symbols to letters"
);

assert(
  normalizeText("  ANJIIIIING   b0d000h  ") === "anjing bodoh",
  "normalizeText collapses repeated chars and trims whitespace"
);

assert(
  containsProfanity("ajg") === true,
  "containsProfanity detects abbreviated profanity"
);

assert(
  containsProfanity("Selamat pagi semuanya.") === false,
  "containsProfanity returns false for innocent text"
);

assert(
  Array.isArray(PROFANITY_DICTIONARY) && PROFANITY_DICTIONARY.length >= 3,
  "PROFANITY_DICTIONARY exposes organized categories"
);

// 1. MANDATORY WORDS & PREVIOUSLY MISSED TERMS: "bodoh" & "seks"
console.log("\n--- 1. Mandatory Explicit Blocked Terms: 'bodoh' & 'seks' ---");

const bodohTests = [
  "bodoh",
  "Kamu bodoh!",
  "Dasar bodoh",
  "bodo",
  "kamu bodo banget",
  "b o d o",
  "b.o.d.o",
  "BODO",
  "bodooo",
  "b0d0h",
  "b0doh",
  "b.o.d.o.h",
  "b o d o h",
  "BODOH",
  "bodoooh",
  "bdoh",
];

for (const term of bodohTests) {
  assert(
    containsProfanity(term) === true,
    `Reject 'bodoh' variation: "${term}"`
  );
}

const seksTests = [
  "seks",
  "konten seks",
  "sex",
  "s3ks",
  "s3x",
  "s.e.k.s",
  "s e k s",
  "SEKS",
  "sekss",
];

for (const term of seksTests) {
  assert(
    containsProfanity(term) === true,
    `Reject 'seks' variation: "${term}"`
  );
}

// 2. REQUIRED PROHIBITED TERMS & VARIATIONS
console.log("\n--- 2. Required Prohibited Terms & Variations ---");

const promptMustBeRejected = [
  // Insults and personal attacks
  "Kamu anjing!",
  "Dasar bangsat",
  "anjg",
  "ajg",
  "bngst",
  "bgts",
  "goblok",
  "tolol",
  "gblk",
  "tlol",
  "bego",
  "beg0",
  "bgo",
  "dasar bgo lu",
  "BGO",
  "b.g.o",
  "b g o",
  "dungu",
  "idiot",
  "1d10t",
  "bajingan",
  "brengsek",
  "keparat",
  "kampret",
  "kmprt",
  // Vulgar and sexual language
  "memek",
  "mmk",
  "kontol",
  "kntl",
  "jembut",
  "jmbt",
  "jembuut",
  "peler",
  "plr",
  "pepek",
  "p3p3k",
  "ngentot",
  "ngntt",
  "ngent0t",
  "entot",
  "ngaceng",
  "colmek",
  "coli",
  "tetek",
  "toket",
  "kimak",
  "pukimak kau",
  "titit",
  "t1t1t",
  "t.i.t.i.t",
  "t i t i t",
  "TITIT",
  "titiiit",
  "t!t!t",
  // Evasion techniques
  "A-N-J-I-N-G",
  "a.n.j.i.n.g",
  "anjiiing",
  "b4ngs4t",
  "b@ngs@t",
  "k0nt0l",
  "mem3k",
  // Regional swear words
  "jancok",
  "jancuk",
  "dancok",
  "dancuk",
  "asu",
  "pantek",
  "itil",
  "lonte",
  "perek",
  "jablay",
  "pecun",
  // Contextual insults
  "dasar monyet kamu",
  "muka monyet lu",
  "kamu babi",
  "dasar babi kau",
];

for (const phrase of promptMustBeRejected) {
  const res = validateComment(phrase);
  assert(
    res.isValid === false,
    `Reject prohibited: "${phrase}"`,
    `Expected rejection, but was accepted`
  );
}

// 3. REQUIRED ACCEPT SENTENCES & FALSE POSITIVE SAFEGUARDS
console.log("\n--- 3. Required Accept Sentences & False Positive Safeguards ---");

const promptMustBeAccepted = [
  "Selamat pagi semuanya.",
  "Terima kasih atas penjelasannya.",
  "Saya kurang setuju dengan pendapat tersebut.",
  "Mari kita diskusikan bersama.",
  "Pembelajaran hari ini sangat menarik.",
  "Saya ingin bertanya tentang materi ini.",
  // Seksama / Saksama should NEVER be blocked by 'seks'
  "Membaca buku ini dengan seksama.",
  "Tolong teliti soal ini secara saksama.",
  // Innocent Indonesian words that could trigger naive substrings
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
  "titik koordinat pada grafik fungsi kuadrat",
  "institusi pendidikan vokasi negeri",
  "amigo adalah kosa kata bahasa asing",
  // Zoological / non-insult usage of animal names
  "Monyet ekor panjang adalah satwa asli Asia Tenggara.",
  "Peternakan babi hutan di daerah pedesaan.",
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

// Whitespace only
const spacesRes = validateComment("    ");
assert(
  !spacesRes.isValid && spacesRes.message === EMPTY_COMMENT_ERROR_MESSAGE,
  "Reject spaces only"
);

// Null or undefined
assert(!validateComment(null).isValid, "Reject null comment");
assert(!validateComment(undefined).isValid, "Reject undefined comment");

// Uppercase variations
assert(!validateComment("KAMU ANJING!").isValid, "Reject all-caps: 'KAMU ANJING!'");
assert(!validateComment("AnJiNg LoE").isValid, "Reject mixed-case: 'AnJiNg LoE'");
assert(!validateComment("bNgSt").isValid, "Reject mixed-case abbreviation: 'bNgSt'");
assert(!validateComment("kNtL").isValid, "Reject mixed-case abbreviation: 'kNtL'");

// Character separation (spaces and punctuation)
assert(!validateComment("a n j i n g").isValid, "Reject spaced letters: 'a n j i n g'");
assert(!validateComment("k o n t o l").isValid, "Reject spaced letters: 'k o n t o l'");
assert(!validateComment("b.n.g.s.t").isValid, "Reject dot-separated letters: 'b.n.g.s.t'");
assert(!validateComment("k-n-t-l").isValid, "Reject dash-separated letters: 'k-n-t-l'");
assert(!validateComment("_anjing_").isValid, "Reject underscore-wrapped: '_anjing_'");

// Sentence with both normal and prohibited words
assert(
  !validateComment("Selamat pagi semuanya, tapi kamu anjing ya").isValid,
  "Reject mixed normal + prohibited comment"
);
assert(
  !validateComment("Tolong jelaskan tugas ini bngst").isValid,
  "Reject polite prefix with vulgar slang suffix"
);

// 5. GLOBAL USER WRITING VALIDATION (validateFields & validateContent)
console.log("\n--- 5. Global User Writing Validation (Assignments, Quizzes, Feedback) ---");

// Assignment validation
const validAssignment = {
  title: "Tugas Fisika: Kinematika Gerak Lurus",
  instructions: "Kerjakan soal 1 sampai 5 secara mandiri.",
};
assert(
  validateFields(validAssignment).isValid,
  "Valid assignment passes validateFields"
);

const profaneAssignmentTitle = {
  title: "Tugas bodoh untuk kalian",
  instructions: "Silakan kerjakan.",
};
const resProfaneTitle = validateFields(profaneAssignmentTitle);
assert(
  !resProfaneTitle.isValid && resProfaneTitle.field === "title",
  "Assignment with 'bodoh' in title is rejected"
);

const profaneAssignmentInstructions = {
  title: "Tugas Matematika Bab 2",
  instructions: "Kerjakan jangan kayak anjing.",
};
const resProfaneInst = validateFields(profaneAssignmentInstructions);
assert(
  !resProfaneInst.isValid && resProfaneInst.field === "instructions",
  "Assignment with profanity in instructions is rejected"
);

// Quiz questions & options validation
const validQuiz = {
  title: "Ulangan Harian Biologi",
  questions: [
    {
      question: "Apakah fungsi mitokondria?",
      options: ["Penghasil energi", "Sintesis protein", "Fotosintesis"],
    },
  ],
};
assert(
  validateFields(validQuiz).isValid,
  "Valid quiz passes validateFields"
);

const profaneQuizQuestion = {
  title: "Kuis Kimia",
  questions: [
    {
      question: "Soal ini bikin goblok sekali",
      options: ["A", "B"],
    },
  ],
};
const resProfaneQ = validateFields(profaneQuizQuestion);
assert(
  !resProfaneQ.isValid && resProfaneQ.field?.includes("questions"),
  "Quiz with profanity in question is rejected"
);

const profaneQuizOption = {
  title: "Kuis Sejarah",
  questions: [
    {
      question: "Siapakah tokoh berikut?",
      options: ["Pilihan A", "Dasar bangsat kau"],
    },
  ],
};
const resProfaneOpt = validateFields(profaneQuizOption);
assert(
  !resProfaneOpt.isValid,
  "Quiz with profanity in options is rejected"
);

// Grading feedback validation
assert(
  validateContent("Pekerjaan sangat baik, pertahankan prestasimu!").isValid,
  "Valid grading feedback is accepted"
);
assert(
  !validateContent("Jawaban kamu bodoh sekali").isValid,
  "Grading feedback containing 'bodoh' is rejected"
);

// Student submission notes
assert(
  validateContent("Berikut lampiran laporan praktikum saya.").isValid,
  "Valid submission notes are accepted"
);
assert(
  !validateContent("Susah banget kntl").isValid,
  "Submission notes with 'kntl' are rejected"
);

// 6. DIRECT API VALIDATION SIMULATION (MongoDB Persistence Prevention)
console.log("\n--- 6. Direct API Simulation (MongoDB Persistence Prevention) ---");

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
