/**
 * Comprehensive Regression & E2E Test Suite for Learnix LMS
 * Quiz Scoring Normalization (Raw Points to 100-Point Scale)
 *
 * Covers:
 * - Unit & Edge Case Tests on `src/lib/quiz-scoring.ts` & `src/lib/cbt-parser.ts`
 *   (1, 13, 20, 50 questions; variable PT; PF = 0; negative PF; PF > PT;
 *    unanswered questions; invalid answers; 0/invalid max score; clamping [0, 100])
 * - Test A: 13 questions (PT = 2, PF = 0, 10 correct -> Raw 20/26, Final 76.92)
 * - Test B: Different point values (2, 3, 5, 2, 3 -> Max 15, Earned 12 -> Final 80)
 * - Test C: Negative incorrect-answer points (PT = 2, PF = -1, 5 questions, 3 correct & 2 incorrect -> Raw 4/10, Final 40)
 * - Test D: All correct (-> Final 100)
 * - Test E: All incorrect with PF = 0 (-> Final 0)
 * - Test F: Manual essay grading (Objective 16/20 + Essay 8/10 -> Raw 24/30, Final 80) + Re-grading essay
 * - Test G: Pending essay (Provisional score separated from final grade; excluded from final grade averages until graded)
 * - Test H: Existing historical quizzes & submissions (Preserved without double-normalization)
 * - Test I: Grade reports across Student, Teacher, Kurikulum, Kepsek & Excel exports
 *
 * Run with:
 *   node --experimental-strip-types --env-file=.env.local scripts/test-quiz-scoring-normalization.mjs
 */

import mongoose from "mongoose";
import * as XLSX from "xlsx";
import { parseCbtText } from "../src/lib/cbt-parser.ts";
import {
  roundScore,
  getQuestionMaxPoints,
  calculateQuizMaxRawScore,
  normalizeRawScore,
  evaluateQuizSubmission,
  resolveSubmissionScoring,
} from "../src/lib/quiz-scoring.ts";

const BASE_URL = process.env.TEST_URL || "http://localhost:3000";

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  ✖ FAIL: ${message}`);
    process.exit(1);
  }
  passedTests++;
  console.log(`  ✔ ${message}`);
}

async function login(identifier, password, role) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, email: identifier, password, role }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(`Login failed for ${identifier} (${role}): ${JSON.stringify(data)}`);
  }
  const cookiesList =
    typeof res.headers.getSetCookie === "function"
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

async function run() {
  console.log("\n=======================================================");
  console.log(" LEARNIX LMS - QUIZ SCORING NORMALIZATION TEST SUITE");
  console.log(` Target: ${BASE_URL}`);
  console.log("=======================================================\n");

  // =========================================================================
  // 0. CBT PARSER & UNIT EDGE CASE TESTS (TASK 1 & TASK 8)
  // =========================================================================
  console.log("--- 0. CBT Template Parser & Edge Case Unit Tests ---");

  const sampleCbtTemplate = `
Q1>: Budi bertemu guru bahasa Jepang di depan gerbang sekolah pada pukul 06.45 pagi. Salam yang paling tepat diucapkan Budi adalah...
A>: Konnichiwa
A>: Ohayou gozaimasu
A>: Konbanwa
A>: Oyasuminasai
A>: Sayounara
PT>:2
PF>: 0
K>: B

Q2>: Soal dengan pengurangan nilai jika salah
A>: Opsi A
A>: Opsi B
A>: Opsi C
A>: Opsi D
PT>: 3
PF>: -1
K>: C
`;

  const parsedCbt = parseCbtText(sampleCbtTemplate);
  assert(
    parsedCbt.questions.length === 2,
    "CBT template parser parses questions accurately"
  );
  assert(
    parsedCbt.questions[0].points === 2 &&
      parsedCbt.questions[0].pointsFalse === 0 &&
      parsedCbt.questions[0].correctAnswer === "B",
    "CBT template preserves PT=2, PF=0, K=B on Q1 without rewriting to 100"
  );
  assert(
    parsedCbt.questions[1].points === 3 &&
      parsedCbt.questions[1].pointsFalse === -1 &&
      parsedCbt.questions[1].correctAnswer === "C",
    "CBT template preserves PT=3 and negative PF=-1, K=C on Q2"
  );
  assert(
    parsedCbt.totalPoints === 5,
    "CBT template totalPoints equals raw sum (2 + 3 = 5)"
  );

  // Edge cases: 1 question, 20 questions, 50 questions
  for (const count of [1, 13, 20, 50]) {
    const qs = Array.from({ length: count }, (_, i) => ({
      id: `q-${i + 1}`,
      type: "pilihan_ganda",
      question: `Question ${i + 1}`,
      options: ["A", "B", "C", "D"],
      correctAnswer: 0,
      points: 2,
      pointsFalse: 0,
    }));
    const allCorrectAns = qs.map((q) => ({ questionId: q.id, answer: 0 }));
    const res = evaluateQuizSubmission(qs, allCorrectAns);
    assert(
      res.rawScore === count * 2 &&
        res.maxRawScore === count * 2 &&
        res.normalizedScore === 100,
      `Edge Case (${count} questions, PT=2): Raw ${res.rawScore}/${res.maxRawScore} -> Normalized ${res.normalizedScore}`
    );
  }

  // Edge case: Unanswered questions vs invalid answers vs negative PF clamping
  const negQuestions = Array.from({ length: 5 }, (_, i) => ({
    id: `neg-${i + 1}`,
    type: "pilihan_ganda",
    question: `Neg Q ${i + 1}`,
    options: ["Opt 1", "Opt 2", "Opt 3", "Opt 4"],
    correctAnswer: 0,
    points: 2,
    pointsFalse: -1,
  }));

  // All 5 answered wrong -> rawScore = -5, normalizedScore clamped to 0
  const allWrongNeg = evaluateQuizSubmission(
    negQuestions,
    negQuestions.map((q) => ({ questionId: q.id, answer: 1 }))
  );
  assert(
    allWrongNeg.rawScore === -5 &&
      allWrongNeg.maxRawScore === 10 &&
      allWrongNeg.normalizedScore === 0,
    "Edge Case (all wrong with PF=-1): Raw score = -5, Normalized clamped to 0 (never negative)"
  );

  // Student leaves questions unanswered
  const unansweredEval = evaluateQuizSubmission(negQuestions, [
    { questionId: "neg-1", answer: 0 }, // correct (+2)
    // neg-2..neg-5 left unanswered (0 each)
  ]);
  assert(
    unansweredEval.rawScore === 2 &&
      unansweredEval.unansweredCount === 4 &&
      unansweredEval.normalizedScore === 20,
    "Edge Case (unanswered questions): Unanswered questions receive 0 raw points, 1 correct -> 2/10 -> 20"
  );

  // Student submits an invalid answer (e.g., index 99 or "Z")
  const invalidAnsEval = evaluateQuizSubmission(negQuestions, [
    { questionId: "neg-1", answer: 0 }, // correct (+2)
    { questionId: "neg-2", answer: 99 }, // invalid index (-1)
    { questionId: "neg-3", answer: "Z" }, // invalid option letter (-1)
  ]);
  assert(
    invalidAnsEval.rawScore === 0 && invalidAnsEval.normalizedScore === 0,
    "Edge Case (invalid student answers): Handled safely as incorrect without crashing"
  );

  // Unusual configuration where PF > PT
  const unusualQ = [
    {
      id: "unusual-1",
      type: "pilihan_ganda",
      question: "Unusual PF > PT",
      options: ["A", "B"],
      correctAnswer: 0,
      points: 2,
      pointsFalse: 5,
    },
  ];
  const unusualMax = getQuestionMaxPoints(unusualQ[0]);
  const unusualEval = evaluateQuizSubmission(unusualQ, [
    { questionId: "unusual-1", answer: 1 },
  ]);
  assert(
    unusualMax === 5 &&
      unusualEval.normalizedScore !== null &&
      unusualEval.normalizedScore <= 100,
    "Edge Case (PF > PT): Max possible points handled consistently and normalized grade never exceeds 100"
  );

  // Edge case: Quiz with no valid maximum possible points (0 max points)
  const zeroMaxQ = [
    {
      id: "zero-1",
      type: "pilihan_ganda",
      question: "Zero points question",
      options: ["A", "B"],
      correctAnswer: 0,
      points: 0,
      pointsFalse: 0,
    },
  ];
  const zeroMaxEval = evaluateQuizSubmission(zeroMaxQ, [
    { questionId: "zero-1", answer: 0 },
  ]);
  assert(
    zeroMaxEval.maxRawScore === 0 &&
      zeroMaxEval.normalizedScore === null &&
      zeroMaxEval.gradingStatus === "invalid_max_score" &&
      normalizeRawScore(0, 0) === null,
    "Edge Case (0 max points): Never divides by zero, never produces NaN/Infinity, returns null normalizedScore"
  );

  // =========================================================================
  // CONNECT TO MONGODB & AUTHENTICATE ROLES FOR FULL API E2E TESTS
  // =========================================================================
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lms");
  const db = mongoose.connection.db;

  const guru = await login("budi.pratama@sekolah.sch.id", "password123", "guru");
  const ahmad = await login("0098273645", "password123", "siswa");
  const kurikulum = await login("kurikulum@sekolah.sch.id", "password123", "kurikulum");
  const kepsek = await login("kepsek@sekolah.sch.id", "password123", "kepsek");

  const basisDataClassId = "6ac31a89f03da5f488975e4a";
  const createdQuizIds = [];
  const createdAssignmentIds = [];
  const createdSubmissionIds = [];

  try {
    // =======================================================================
    // TEST A: 13 QUESTIONS (PT = 2 each, PF = 0, 10 correct answers)
    // =======================================================================
    console.log("\n--- TEST A: 13 Questions (PT=2, PF=0, 10 Correct -> 20/26 -> 76.92) ---");

    const questionsA = Array.from({ length: 13 }, (_, i) => ({
      id: `qa-${i + 1}`,
      type: "pilihan_ganda",
      question: `Soal CBT 13 Nomor #${i + 1}`,
      options: ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
      correctAnswer: 1, // B
      points: 2,
      pointsFalse: 0,
    }));

    const createResA = await fetch(`${BASE_URL}/api/guru/quizzes`, {
      method: "POST",
      headers: { Cookie: guru.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test A - Kuis 13 Soal PT 2",
        courseClassId: basisDataClassId,
        durationSeconds: 1800,
        questions: questionsA,
      }),
    });
    const createJsonA = await createResA.json();
    assert(createResA.status === 201 && createJsonA.success, "Created Test A quiz (13 questions, PT=2)");
    const quizIdA = createJsonA.data._id;
    createdQuizIds.push(quizIdA);

    assert(
      createJsonA.data.questions.every((q) => q.points === 2 && q.pointsFalse === 0) &&
        createJsonA.data.maxRawPoints === 26,
      "Original question points (PT=2, PF=0) and maxRawPoints=26 preserved in database"
    );

    // Ahmad answers 10 correctly (answer: 1) and 3 incorrectly (answer: 0)
    const answersA = questionsA.map((q, idx) => ({
      questionId: q.id,
      answer: idx < 10 ? 1 : 0,
    }));

    const submitResA = await fetch(`${BASE_URL}/api/siswa/quiz/${quizIdA}/submit`, {
      method: "POST",
      headers: { Cookie: ahmad.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ answers: answersA }),
    });
    const submitJsonA = await submitResA.json();
    assert(submitResA.status === 200 && submitJsonA.success, "Submitted Test A quiz as Ahmad");
    createdSubmissionIds.push(submitJsonA.data.submissionId);

    assert(
      submitJsonA.data.rawScore === 20 &&
        submitJsonA.data.maxRawScore === 26 &&
        submitJsonA.data.normalizedScore === 76.92 &&
        submitJsonA.data.score === 76.92,
      `Test A Result: Raw Score = ${submitJsonA.data.rawScore}/${submitJsonA.data.maxRawScore}, Normalized Grade = ${submitJsonA.data.normalizedScore}`
    );

    // =======================================================================
    // TEST B: DIFFERENT POINT VALUES (Weights: 2, 3, 5, 2, 3 -> Max 15, Earned 12 -> 80)
    // =======================================================================
    console.log("\n--- TEST B: Different Question Weights (2, 3, 5, 2, 3 -> 12/15 -> 80) ---");

    const weightsB = [2, 3, 5, 2, 3];
    const questionsB = weightsB.map((pt, i) => ({
      id: `qb-${i + 1}`,
      type: "pilihan_ganda",
      question: `Soal Bobot Berbeda #${i + 1} (${pt} Poin)`,
      options: ["A", "B", "C", "D"],
      correctAnswer: 0,
      points: pt,
      pointsFalse: 0,
    }));

    const createResB = await fetch(`${BASE_URL}/api/guru/quizzes`, {
      method: "POST",
      headers: { Cookie: guru.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test B - Kuis Bobot Berbeda",
        courseClassId: basisDataClassId,
        durationSeconds: 1800,
        questions: questionsB,
      }),
    });
    const createJsonB = await createResB.json();
    const quizIdB = createJsonB.data._id;
    createdQuizIds.push(quizIdB);

    // To earn 12 out of 15: answer Q1(2), Q2(3), Q3(5), Q4(2) correctly = 12, and Q5(3) wrong = 0
    const answersB = [
      { questionId: "qb-1", answer: 0 }, // +2
      { questionId: "qb-2", answer: 0 }, // +3
      { questionId: "qb-3", answer: 0 }, // +5
      { questionId: "qb-4", answer: 0 }, // +2
      { questionId: "qb-5", answer: 1 }, // +0 (wrong)
    ];

    const submitResB = await fetch(`${BASE_URL}/api/siswa/quiz/${quizIdB}/submit`, {
      method: "POST",
      headers: { Cookie: ahmad.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ answers: answersB }),
    });
    const submitJsonB = await submitResB.json();
    createdSubmissionIds.push(submitJsonB.data.submissionId);

    assert(
      submitJsonB.data.rawScore === 12 &&
        submitJsonB.data.maxRawScore === 15 &&
        submitJsonB.data.normalizedScore === 80 &&
        submitJsonB.data.score === 80,
      `Test B Result: Raw Score = ${submitJsonB.data.rawScore}/${submitJsonB.data.maxRawScore}, Normalized Grade = ${submitJsonB.data.normalizedScore}`
    );

    // =======================================================================
    // TEST C: NEGATIVE INCORRECT-ANSWER POINTS (PT=2, PF=-1, 5 Qs, 3 correct & 2 incorrect -> 4/10 -> 40)
    // =======================================================================
    console.log("\n--- TEST C: Negative Incorrect-Answer Points (PT=2, PF=-1 -> 4/10 -> 40) ---");

    const questionsC = Array.from({ length: 5 }, (_, i) => ({
      id: `qc-${i + 1}`,
      type: "pilihan_ganda",
      question: `Soal Minus #${i + 1}`,
      options: ["A", "B", "C", "D"],
      correctAnswer: 2, // C
      points: 2,
      pointsFalse: -1,
    }));

    const createResC = await fetch(`${BASE_URL}/api/guru/quizzes`, {
      method: "POST",
      headers: { Cookie: guru.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test C - Kuis Poin Minus PF -1",
        courseClassId: basisDataClassId,
        durationSeconds: 1800,
        questions: questionsC,
      }),
    });
    const createJsonC = await createResC.json();
    const quizIdC = createJsonC.data._id;
    createdQuizIds.push(quizIdC);

    // 3 correct (3 * 2 = 6) and 2 incorrect (2 * -1 = -2) -> Earned = 4, Max = 10 -> Final = 40
    const answersC = questionsC.map((q, idx) => ({
      questionId: q.id,
      answer: idx < 3 ? 2 : 0,
    }));

    const submitResC = await fetch(`${BASE_URL}/api/siswa/quiz/${quizIdC}/submit`, {
      method: "POST",
      headers: { Cookie: ahmad.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ answers: answersC }),
    });
    const submitJsonC = await submitResC.json();
    createdSubmissionIds.push(submitJsonC.data.submissionId);

    assert(
      submitJsonC.data.rawScore === 4 &&
        submitJsonC.data.maxRawScore === 10 &&
        submitJsonC.data.normalizedScore === 40 &&
        submitJsonC.data.score === 40,
      `Test C Result: Raw Score = ${submitJsonC.data.rawScore}/${submitJsonC.data.maxRawScore}, Normalized Grade = ${submitJsonC.data.normalizedScore}`
    );

    // =======================================================================
    // TEST D: ALL CORRECT (-> Final 100)
    // =======================================================================
    console.log("\n--- TEST D: All Correct (-> Final 100) ---");

    const questionsD = [
      { id: "qd-1", type: "pilihan_ganda", question: "Q1", options: ["A", "B"], correctAnswer: 0, points: 3, pointsFalse: 0 },
      { id: "qd-2", type: "pilihan_ganda", question: "Q2", options: ["A", "B"], correctAnswer: 1, points: 7, pointsFalse: -1 },
      { id: "qd-3", type: "pilihan_ganda", question: "Q3", options: ["A", "B"], correctAnswer: 0, points: 4, pointsFalse: 0 },
    ];

    const createResD = await fetch(`${BASE_URL}/api/guru/quizzes`, {
      method: "POST",
      headers: { Cookie: guru.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test D - Semua Benar",
        courseClassId: basisDataClassId,
        durationSeconds: 600,
        questions: questionsD,
      }),
    });
    const createJsonD = await createResD.json();
    const quizIdD = createJsonD.data._id;
    createdQuizIds.push(quizIdD);

    const submitResD = await fetch(`${BASE_URL}/api/siswa/quiz/${quizIdD}/submit`, {
      method: "POST",
      headers: { Cookie: ahmad.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: [
          { questionId: "qd-1", answer: 0 },
          { questionId: "qd-2", answer: 1 },
          { questionId: "qd-3", answer: 0 },
        ],
      }),
    });
    const submitJsonD = await submitResD.json();
    createdSubmissionIds.push(submitJsonD.data.submissionId);

    assert(
      submitJsonD.data.rawScore === 14 &&
        submitJsonD.data.maxRawScore === 14 &&
        submitJsonD.data.normalizedScore === 100,
      `Test D Result: Raw Score = ${submitJsonD.data.rawScore}/${submitJsonD.data.maxRawScore}, Normalized Grade = ${submitJsonD.data.normalizedScore}`
    );

    // =======================================================================
    // TEST E: ALL INCORRECT WITH PF = 0 (-> Final 0)
    // =======================================================================
    console.log("\n--- TEST E: All Incorrect with PF = 0 (-> Final 0) ---");

    const questionsE = [
      { id: "qe-1", type: "pilihan_ganda", question: "Q1", options: ["A", "B"], correctAnswer: 0, points: 5, pointsFalse: 0 },
      { id: "qe-2", type: "pilihan_ganda", question: "Q2", options: ["A", "B"], correctAnswer: 0, points: 5, pointsFalse: 0 },
    ];

    const createResE = await fetch(`${BASE_URL}/api/guru/quizzes`, {
      method: "POST",
      headers: { Cookie: guru.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test E - Semua Salah PF 0",
        courseClassId: basisDataClassId,
        durationSeconds: 600,
        questions: questionsE,
      }),
    });
    const createJsonE = await createResE.json();
    const quizIdE = createJsonE.data._id;
    createdQuizIds.push(quizIdE);

    const submitResE = await fetch(`${BASE_URL}/api/siswa/quiz/${quizIdE}/submit`, {
      method: "POST",
      headers: { Cookie: ahmad.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: [
          { questionId: "qe-1", answer: 1 },
          { questionId: "qe-2", answer: 1 },
        ],
      }),
    });
    const submitJsonE = await submitResE.json();
    createdSubmissionIds.push(submitJsonE.data.submissionId);

    assert(
      submitJsonE.data.rawScore === 0 &&
        submitJsonE.data.maxRawScore === 10 &&
        submitJsonE.data.normalizedScore === 0,
      `Test E Result: Raw Score = ${submitJsonE.data.rawScore}/${submitJsonE.data.maxRawScore}, Normalized Grade = ${submitJsonE.data.normalizedScore}`
    );

    // =======================================================================
    // TEST G & TEST F: PENDING ESSAY vs MANUAL ESSAY GRADING
    // Objective Max = 20, Essay Max = 10, Total Max = 30
    // Objective Earned = 16, Essay Earned = 8 -> Raw = 24/30 -> Normalized = 80
    // =======================================================================
    console.log("\n--- TEST G & TEST F: Pending Essay & Manual Essay Grading (16+8 / 30 -> 80) ---");

    const questionsFG = [
      { id: "qfg-1", type: "pilihan_ganda", question: "MCQ 1 (4pt)", options: ["A", "B"], correctAnswer: 0, points: 4, pointsFalse: 0 },
      { id: "qfg-2", type: "pilihan_ganda", question: "MCQ 2 (4pt)", options: ["A", "B"], correctAnswer: 0, points: 4, pointsFalse: 0 },
      { id: "qfg-3", type: "pilihan_ganda", question: "MCQ 3 (4pt)", options: ["A", "B"], correctAnswer: 0, points: 4, pointsFalse: 0 },
      { id: "qfg-4", type: "pilihan_ganda", question: "MCQ 4 (4pt)", options: ["A", "B"], correctAnswer: 0, points: 4, pointsFalse: 0 },
      { id: "qfg-5", type: "pilihan_ganda", question: "MCQ 5 (4pt)", options: ["A", "B"], correctAnswer: 0, points: 4, pointsFalse: 0 },
      { id: "qfg-essay", type: "essay", question: "Jelaskan perbedaan 2NF dan 3NF!", options: [], correctAnswer: "3NF menghilangkan ketergantungan transitif", points: 10, pointsFalse: 0 },
    ];

    const createResFG = await fetch(`${BASE_URL}/api/guru/quizzes`, {
      method: "POST",
      headers: { Cookie: guru.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test FG - Kuis Campuran Pilihan Ganda & Essay",
        courseClassId: basisDataClassId,
        durationSeconds: 1800,
        questions: questionsFG,
      }),
    });
    const createJsonFG = await createResFG.json();
    const quizIdFG = createJsonFG.data._id;
    createdQuizIds.push(quizIdFG);

    // Student answers 4 MCQs correctly (4 * 4 = 16), 1 MCQ wrong (0), and writes an essay answer
    // Also attempts tampering by passing scoreAwarded: 10 on the essay
    const submitResFG = await fetch(`${BASE_URL}/api/siswa/quiz/${quizIdFG}/submit`, {
      method: "POST",
      headers: { Cookie: ahmad.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: [
          { questionId: "qfg-1", answer: 0 },
          { questionId: "qfg-2", answer: 0 },
          { questionId: "qfg-3", answer: 0 },
          { questionId: "qfg-4", answer: 0 },
          { questionId: "qfg-5", answer: 1 }, // wrong
          {
            questionId: "qfg-essay",
            answer: "2NF menghilangkan ketergantungan parsial, sedangkan 3NF menghilangkan ketergantungan transitif.",
            scoreAwarded: 10, // client tampering attempt — must be ignored!
          },
        ],
      }),
    });
    const submitJsonFG = await submitResFG.json();
    const subIdFG = submitJsonFG.data.submissionId;
    createdSubmissionIds.push(subIdFG);

    // TEST G Verification: Pending essay must NOT be treated as a completed final grade
    assert(
      submitJsonFG.data.gradingStatus === "pending_manual" &&
        submitJsonFG.data.isPendingManual === true &&
        submitJsonFG.data.rawScore === 16 &&
        submitJsonFG.data.maxRawScore === 30 &&
        submitJsonFG.data.normalizedScore === null &&
        submitJsonFG.data.score === null &&
        submitJsonFG.data.provisionalScore === 53.33,
      `Test G Result: Pending essay marked 'pending_manual', rawScore=16/30, provisionalScore=53.33, final normalizedScore=null (not treated as final grade)`
    );

    // Verify GET /api/siswa/quiz/[id] also reports pending_manual and score: null
    const getQuizPendingRes = await fetch(`${BASE_URL}/api/siswa/quiz/${quizIdFG}`, {
      headers: { Cookie: ahmad.cookie },
    });
    const getQuizPendingJson = await getQuizPendingRes.json();
    assert(
      getQuizPendingJson.data?.result?.gradingStatus === "pending_manual" &&
        getQuizPendingJson.data?.result?.normalizedScore === null &&
        getQuizPendingJson.data?.result?.provisionalScore === 53.33,
      "Test G Result: Student quiz detail API distinguishes provisional score (53.33) from final grade (null)"
    );

    // Verify Teacher Submissions API (/api/guru/assignments/[quizId]/submissions) shows pending_manual
    const teacherSubsPendingRes = await fetch(
      `${BASE_URL}/api/guru/assignments/${quizIdFG}/submissions`,
      { headers: { Cookie: guru.cookie } }
    );
    const teacherSubsPendingJson = await teacherSubsPendingRes.json();
    const ahmadPendingItem = teacherSubsPendingJson.data.items.find(
      (i) => String(i.student._id) === String(ahmad.user.id)
    );
    assert(
      ahmadPendingItem &&
        ahmadPendingItem.gradingStatus === "pending_manual" &&
        ahmadPendingItem.rawScore === 16 &&
        ahmadPendingItem.maxRawScore === 30 &&
        ahmadPendingItem.normalizedScore === null,
      "Test G Result: Teacher grading view shows pending_manual status with rawScore 16/30 and null final grade"
    );

    // TEST F Verification: Teacher grades the essay with 8 / 10 points
    const gradeEssayRes = await fetch(
      `${BASE_URL}/api/guru/submissions/${subIdFG}/grade`,
      {
        method: "POST",
        headers: { Cookie: guru.cookie, "Content-Type": "application/json" },
        body: JSON.stringify({
          essayScores: { "qfg-essay": 8 },
          feedback: "Penjelasan 2NF dan 3NF sangat tepat.",
        }),
      }
    );
    const gradeEssayJson = await gradeEssayRes.json();
    assert(
      gradeEssayRes.status === 200 && gradeEssayJson.success,
      "Teacher manually graded essay question (8 / 10 points)"
    );
    assert(
      gradeEssayJson.data.gradingStatus === "completed" &&
        gradeEssayJson.data.status === "graded" &&
        gradeEssayJson.data.objectiveRawScore === 16 &&
        gradeEssayJson.data.essayRawScore === 8 &&
        gradeEssayJson.data.rawScore === 24 &&
        gradeEssayJson.data.maxRawScore === 30 &&
        gradeEssayJson.data.normalizedScore === 80 &&
        gradeEssayJson.data.score === 80,
      `Test F Result: Objective (16) + Essay (8) = Raw 24/30 -> Normalized Grade = ${gradeEssayJson.data.normalizedScore}`
    );

    // Teacher updates/changes essay grade after initial grading (e.g. from 8 to 5 -> 16+5 = 21/30 -> 70)
    const regradeEssayRes = await fetch(
      `${BASE_URL}/api/guru/submissions/${subIdFG}/grade`,
      {
        method: "POST",
        headers: { Cookie: guru.cookie, "Content-Type": "application/json" },
        body: JSON.stringify({
          quizAnswers: [{ questionId: "qfg-essay", scoreAwarded: 5 }],
        }),
      }
    );
    const regradeEssayJson = await regradeEssayRes.json();
    assert(
      regradeEssayJson.data.rawScore === 21 &&
        regradeEssayJson.data.maxRawScore === 30 &&
        regradeEssayJson.data.normalizedScore === 70 &&
        regradeEssayJson.data.score === 70,
      "Edge Case (Teacher changes essay grade to 5/10): Recalculated Raw 21/30 -> Normalized 70"
    );

    // Restore essay grade back to 8/10 (-> 24/30 -> 80)
    await fetch(`${BASE_URL}/api/guru/submissions/${subIdFG}/grade`, {
      method: "POST",
      headers: { Cookie: guru.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        essayScores: { "qfg-essay": 8 },
      }),
    });

    // =======================================================================
    // TEST H: EXISTING HISTORICAL QUIZZES & SUBMISSIONS
    // =======================================================================
    console.log("\n--- TEST H: Existing Historical Quizzes & Submissions ---");

    // 1. Existing seeded quiz in Basis Data ('6ac31a89f03da5f488975e4e')
    const histQuizRes = await fetch(
      `${BASE_URL}/api/siswa/quiz/6ac31a89f03da5f488975e4e`,
      { headers: { Cookie: ahmad.cookie } }
    );
    const histQuizJson = await histQuizRes.json();
    assert(
      histQuizRes.status === 200 &&
        histQuizJson.success &&
        histQuizJson.data.totalQuestions === 5 &&
        histQuizJson.data.maxRawScore === 100,
      "Test H: Existing historical quiz 'Kuis Konsep Relasi & Normalisasi Database' loads properly"
    );

    // 2. Test resolveSubmissionScoring on legacy submission shapes:
    // Shape 1: Legacy submission with score=60 on a 100-pt quiz without normalizedScore field
    const legacy100Resolved = resolveSubmissionScoring(
      { status: "graded", score: 60, quizAnswers: [] },
      { totalPoints: 100, questions: [{ id: "q1", points: 50 }, { id: "q2", points: 50 }] },
      null
    );
    assert(
      legacy100Resolved.normalizedScore === 60 && legacy100Resolved.isFinalGraded === true,
      "Test H: Historical 0-100 graded submission (score=60) preserved as 60 without double-normalizing"
    );

    // Shape 2: Legacy submission with quizAnswers summing to 20 on a 26-pt quiz (where old code stored score=20)
    const legacyRawResolved = resolveSubmissionScoring(
      {
        status: "graded",
        score: 20,
        quizAnswers: Array.from({ length: 13 }, (_, i) => ({
          questionId: `q-${i + 1}`,
          isCorrect: i < 10,
          scoreAwarded: i < 10 ? 2 : 0,
        })),
      },
      {
        totalPoints: 26,
        questions: Array.from({ length: 13 }, (_, i) => ({
          id: `q-${i + 1}`,
          type: "pilihan_ganda",
          points: 2,
        })),
      },
      null
    );
    assert(
      legacyRawResolved.rawScore === 20 &&
        legacyRawResolved.maxRawScore === 26 &&
        legacyRawResolved.normalizedScore === 76.92,
      "Test H: Historical raw-point quiz submission with quizAnswers resolves to Raw 20/26 and Normalized 76.92"
    );

    // =======================================================================
    // TEST I: GRADE REPORTS (STUDENT, TEACHER, KURIKULUM, KEPSEK & EXCEL)
    // =======================================================================
    console.log("\n--- TEST I: Grade Reports Consistency Across All Roles ---");

    // In Basis Data class, Ahmad now has:
    // - Ordinary Assignment 'Praktikum DDL & DML MySQL': score = 20
    // - Test A Quiz: normalizedScore = 76.92 (raw 20/26)
    // - Test B Quiz: normalizedScore = 80 (raw 12/15)
    // - Test C Quiz: normalizedScore = 40 (raw 4/10)
    // - Test D Quiz: normalizedScore = 100 (raw 14/14)
    // - Test E Quiz: normalizedScore = 0 (raw 0/10)
    // - Test F Quiz: normalizedScore = 80 (raw 24/30)
    // Quiz scores: [76.92, 80, 40, 100, 0, 80] -> Sum = 376.92, Count = 6 -> Quiz Average = 62.82
    // All 7 items: 20 + 376.92 = 396.92, Count = 7 -> Overall Average = roundScore(396.92 / 7) = 56.7

    // 1. Student Dashboard (/api/siswa/dashboard)
    const studentDashRes = await fetch(`${BASE_URL}/api/siswa/dashboard`, {
      headers: { Cookie: ahmad.cookie },
    });
    const studentDashJson = await studentDashRes.json();
    const quizADash = studentDashJson.data.quizzes.find((q) => q.quizId === quizIdA);
    assert(
      quizADash &&
        quizADash.rawScore === 20 &&
        quizADash.maxRawScore === 26 &&
        quizADash.normalizedScore === 76.92 &&
        quizADash.score === 76.92,
      "Test I (Student Dashboard): Displays normalizedScore=76.92 and rawScore=20/26 for Test A quiz"
    );
    assert(
      studentDashJson.data.averageGrade === 56.7,
      `Test I (Student Dashboard): Overall averageGrade uses normalized scores (${studentDashJson.data.averageGrade})`
    );

    // 2. Student Grades (/api/siswa/grades)
    const studentGradesRes = await fetch(`${BASE_URL}/api/siswa/grades`, {
      headers: { Cookie: ahmad.cookie },
    });
    const studentGradesJson = await studentGradesRes.json();
    const quizAGradeItem = studentGradesJson.data.gradedItems.find(
      (g) => g.title === "Test A - Kuis 13 Soal PT 2"
    );
    assert(
      quizAGradeItem &&
        quizAGradeItem.rawScore === 20 &&
        quizAGradeItem.maxRawScore === 26 &&
        quizAGradeItem.normalizedScore === 76.92 &&
        quizAGradeItem.score === 76.92 &&
        studentGradesJson.data.currentGpa === 56.7,
      `Test I (Student Grades API): Uses normalized 76.92 (no double-normalization) and GPA=${studentGradesJson.data.currentGpa}`
    );

    // 3. Teacher Grades (/api/guru/grades) & Teacher Excel Export (/api/guru/grades/export)
    const guruGradesRes = await fetch(
      `${BASE_URL}/api/guru/grades?courseClassId=${basisDataClassId}`,
      { headers: { Cookie: guru.cookie } }
    );
    const guruGradesJson = await guruGradesRes.json();
    const ahmadMatrixRow = guruGradesJson.data.matrix.find(
      (m) => String(m.student._id) === String(ahmad.user.id)
    );
    assert(
      ahmadMatrixRow &&
        ahmadMatrixRow.scores[quizIdA] === 76.92 &&
        ahmadMatrixRow.scores[quizIdB] === 80 &&
        ahmadMatrixRow.scores[quizIdC] === 40 &&
        ahmadMatrixRow.scores[quizIdFG] === 80 &&
        ahmadMatrixRow.average === 56.7,
      `Test I (Teacher Grades Matrix): Reports normalized scores (76.92, 80, 40, 80) and average=${ahmadMatrixRow?.average}`
    );

    const guruExportRes = await fetch(
      `${BASE_URL}/api/guru/grades/export?courseClassId=${basisDataClassId}`,
      { headers: { Cookie: guru.cookie } }
    );
    assert(guruExportRes.status === 200, "Teacher Excel export returned 200 OK");
    const guruExportBuf = Buffer.from(await guruExportRes.arrayBuffer());
    const guruWb = XLSX.read(guruExportBuf, { type: "buffer" });
    const guruRows = XLSX.utils.sheet_to_json(guruWb.Sheets["Rekap Nilai"]);
    const ahmadExcelRow = guruRows.find((r) => r["Nama Siswa"] === "Ahmad Bagus Pratama");
    assert(
      ahmadExcelRow &&
        ahmadExcelRow["Test A - Kuis 13 Soal PT 2 (Skala 100)"] === 76.92 &&
        ahmadExcelRow["Rata-rata"] === 56.7,
      "Test I (Teacher Excel Export): Contains normalized quiz grade 76.92 and average 56.7"
    );

    // 4. Kurikulum Reports (/api/kurikulum/reports/grades, /recap, /export)
    const kurGradesRes = await fetch(`${BASE_URL}/api/kurikulum/reports/grades`, {
      headers: { Cookie: kurikulum.cookie },
    });
    const kurGradesJson = await kurGradesRes.json();
    const ahmadKurRow = kurGradesJson.data.rows.find(
      (r) => String(r.studentId) === String(ahmad.user.id)
    );
    assert(
      ahmadKurRow &&
        ahmadKurRow.assignmentAverage === 20 &&
        ahmadKurRow.quizAverage === 62.82 &&
        ahmadKurRow.finalAverage === 56.7,
      `Test I (Kurikulum Reports Grades): assignmentAverage=${ahmadKurRow?.assignmentAverage}, quizAverage=${ahmadKurRow?.quizAverage}, finalAverage=${ahmadKurRow?.finalAverage}`
    );

    const kurRecapRes = await fetch(`${BASE_URL}/api/kurikulum/reports/recap`, {
      headers: { Cookie: kurikulum.cookie },
    });
    const kurRecapJson = await kurRecapRes.json();
    const ahmadRecapRow = kurRecapJson.data.rows.find(
      (r) => String(r.studentId) === String(ahmad.user.id)
    );
    const bdRecapSub = ahmadRecapRow?.subjects?.find((s) =>
      s.subjectName.toLowerCase().includes("basis data")
    );
    assert(
      bdRecapSub &&
        bdRecapSub.quizAverage === 62.82 &&
        bdRecapSub.average === 56.7,
      `Test I (Kurikulum Official Print Recap): quizAverage=${bdRecapSub?.quizAverage}, average=${bdRecapSub?.average}`
    );

    const kurExportRes = await fetch(`${BASE_URL}/api/kurikulum/reports/export`, {
      headers: { Cookie: kurikulum.cookie },
    });
    assert(kurExportRes.status === 200, "Kurikulum Excel export returned 200 OK");
    const kurExportBuf = Buffer.from(await kurExportRes.arrayBuffer());
    const kurWb = XLSX.read(kurExportBuf, { type: "buffer" });
    const kurSheetRows = XLSX.utils.sheet_to_json(kurWb.Sheets["Laporan Nilai"]);
    const ahmadKurExcel = kurSheetRows.find(
      (r) => r["Nama Siswa"] === "Ahmad Bagus Pratama"
    );
    assert(
      ahmadKurExcel &&
        ahmadKurExcel["Rata-rata Quiz"] === 62.82 &&
        ahmadKurExcel["Nilai Akhir"] === 56.7,
      "Test I (Kurikulum Excel Export): Matches normalized Rata-rata Quiz (62.82) and Nilai Akhir (56.7)"
    );

    // 5. Kepsek Reports (/api/kepsek/reports/grades & /api/kurikulum/reports/grades as Kepsek)
    const kepsekGradesRes = await fetch(`${BASE_URL}/api/kepsek/reports/grades`, {
      headers: { Cookie: kepsek.cookie },
    });
    const kepsekGradesJson = await kepsekGradesRes.json();
    const ahmadKepsekRow = kepsekGradesJson.data.rows.find(
      (r) => String(r.studentId) === String(ahmad.user.id)
    );
    assert(
      kepsekGradesRes.status === 200 &&
        ahmadKepsekRow &&
        ahmadKepsekRow.quizAverage === 62.82 &&
        ahmadKepsekRow.finalAverage === 56.7,
      `Test I (Kepsek Reports API): Consistently reports normalized quizAverage=${ahmadKepsekRow?.quizAverage} and finalAverage=${ahmadKepsekRow?.finalAverage}`
    );
  } finally {
    // Clean up all test quizzes, assignments, classposts, and submissions
    if (createdSubmissionIds.length > 0) {
      await db.collection("submissions").deleteMany({
        _id: {
          $in: createdSubmissionIds
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
            .map((id) => new mongoose.Types.ObjectId(id)),
        },
      });
    }
    if (createdQuizIds.length > 0) {
      const qObjIds = createdQuizIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
      await db.collection("submissions").deleteMany({ quizId: { $in: qObjIds } });
      await db.collection("quizzes").deleteMany({ _id: { $in: qObjIds } });
      await db.collection("classposts").deleteMany({ refId: { $in: qObjIds } });
    }
    if (createdAssignmentIds.length > 0) {
      const aObjIds = createdAssignmentIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
      await db.collection("assignments").deleteMany({ _id: { $in: aObjIds } });
      await db.collection("classposts").deleteMany({ refId: { $in: aObjIds } });
    }
    await mongoose.disconnect();
  }

  console.log("\n=======================================================");
  console.log(` ALL ${passedTests}/${totalTests} QUIZ SCORING NORMALIZATION TESTS PASSED!`);
  console.log("=======================================================\n");
}

run().catch(async (err) => {
  console.error("Test suite failed:", err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
