/**
 * Centralized Quiz Scoring & Normalization Engine for Learnix LMS.
 *
 * Separates original question raw points (PT / PF / essay points) from the
 * final normalized academic grade (0–100 scale):
 *
 *   Final Grade = clamp((Total Raw Points Earned / Total Maximum Raw Points) * 100, 0, 100)
 */

export type QuizGradingStatus =
  | "not_started"
  | "pending_manual"
  | "completed"
  | "invalid_max_score";

export interface RawQuizQuestion {
  id: string;
  type?: "pilihan_ganda" | "essay" | string;
  question?: string;
  prompt?: string;
  imageUrl?: string;
  options?: string[];
  correctAnswer?: unknown;
  points?: number;
  pointsFalse?: number;
}

export interface EvaluatedQuizAnswer {
  questionId: string;
  questionType: "pilihan_ganda" | "essay";
  answer: number | string | null;
  isCorrect: boolean;
  isAnswered: boolean;
  isGraded: boolean;
  scoreAwarded: number | null;
  maxPoints: number;
  pointsFalse: number;
}

export interface QuizMaxScoreSummary {
  maxRawScore: number;
  objectiveMaxRawScore: number;
  essayMaxRawScore: number;
  totalQuestions: number;
  objectiveQuestionCount: number;
  essayQuestionCount: number;
  hasEssayQuestions: boolean;
  hasValidMaxScore: boolean;
}

export interface QuizEvaluationResult {
  quizAnswers: EvaluatedQuizAnswer[];
  rawScore: number;
  maxRawScore: number;
  objectiveRawScore: number;
  essayRawScore: number;
  objectiveMaxRawScore: number;
  essayMaxRawScore: number;
  normalizedScore: number | null;
  provisionalScore: number | null;
  gradingStatus: QuizGradingStatus;
  submissionStatus: "graded" | "turned_in";
  isPendingManual: boolean;
  hasEssayQuestions: boolean;
  hasValidMaxScore: boolean;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  pendingEssayCount: number;
  gradedEssayCount: number;
  totalQuestions: number;
}

/**
 * Rounds a numeric value consistently to at most 2 decimal places.
 * Never returns NaN, Infinity, or -0.
 */
export function roundScore(value: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/**
 * Extracts the raw points for a correct answer (PT) or max essay points.
 */
export function getQuestionPointsTrue(q: RawQuizQuestion | null | undefined): number {
  if (!q) return 0;
  if (q.points === undefined || q.points === null) return 10;
  const parsed = Number(q.points);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Extracts the raw points for an incorrect answer (PF). Defaults to 0.
 */
export function getQuestionPointsFalse(q: RawQuizQuestion | null | undefined): number {
  if (!q || q.pointsFalse === undefined || q.pointsFalse === null) return 0;
  const parsed = Number(q.pointsFalse);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Determines the maximum possible raw points for a single question.
 * - For ordinary questions where PT >= PF, returns PT (clamped >= 0).
 * - If PF > PT (unusual configuration), uses Math.max(0, PT, PF) so earned points
 *   cannot exceed maximum possible points.
 * - For essay questions, uses Math.max(0, PT).
 */
export function getQuestionMaxPoints(q: RawQuizQuestion | null | undefined): number {
  if (!q) return 0;
  const pt = getQuestionPointsTrue(q);
  if (q.type === "essay") {
    return roundScore(Math.max(0, pt));
  }
  const pf = getQuestionPointsFalse(q);
  return roundScore(Math.max(0, pt, pf));
}

/**
 * Calculates total maximum raw points across all questions in a quiz.
 */
export function calculateQuizMaxRawScore(
  questions: RawQuizQuestion[] | null | undefined
): QuizMaxScoreSummary {
  const list = Array.isArray(questions) ? questions : [];
  let objectiveMax = 0;
  let essayMax = 0;
  let objectiveCount = 0;
  let essayCount = 0;

  for (const q of list) {
    const qMax = getQuestionMaxPoints(q);
    if (q?.type === "essay") {
      essayCount++;
      essayMax += qMax;
    } else {
      objectiveCount++;
      objectiveMax += qMax;
    }
  }

  const maxRawScore = roundScore(objectiveMax + essayMax);

  return {
    maxRawScore,
    objectiveMaxRawScore: roundScore(objectiveMax),
    essayMaxRawScore: roundScore(essayMax),
    totalQuestions: list.length,
    objectiveQuestionCount: objectiveCount,
    essayQuestionCount: essayCount,
    hasEssayQuestions: essayCount > 0,
    hasValidMaxScore: maxRawScore > 0,
  };
}

/**
 * Normalizes a raw score to a 0–100 scale:
 *   Final Grade = (Total Raw Points Earned / Total Maximum Raw Points) * 100
 *
 * Clamped to [0, 100] and rounded to 2 decimal places.
 * Returns null if maxRawScore <= 0 or inputs are non-finite.
 */
export function normalizeRawScore(
  rawScore: number,
  maxRawScore: number
): number | null {
  if (
    typeof rawScore !== "number" ||
    typeof maxRawScore !== "number" ||
    !Number.isFinite(rawScore) ||
    !Number.isFinite(maxRawScore) ||
    maxRawScore <= 0
  ) {
    return null;
  }

  const rawPercentage = (rawScore / maxRawScore) * 100;
  const clamped = Math.max(0, Math.min(100, rawPercentage));
  return roundScore(clamped);
}

/**
 * Converts a letter ("A"-"Z") or numeric index to a 0-based option index.
 * Returns null if the value cannot be mapped to a valid non-negative integer index.
 */
export function letterOrNumberToIndex(val: unknown): number | null {
  if (typeof val === "number" && Number.isInteger(val) && val >= 0) {
    return val;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return null;
    if (/^[A-Za-z]$/.test(trimmed)) {
      return trimmed.toUpperCase().charCodeAt(0) - 65;
    }
    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed);
      if (Number.isInteger(num) && num >= 0) return num;
    }
  }
  return null;
}

/**
 * Checks whether a student's multiple-choice answer matches the question's correctAnswer.
 */
export function isObjectiveAnswerCorrect(
  q: RawQuizQuestion,
  studentAns: unknown
): boolean {
  if (studentAns === undefined || studentAns === null) return false;
  if (typeof studentAns === "string" && studentAns.trim() === "") return false;

  const options = Array.isArray(q.options) ? q.options : [];
  const correctIdx = letterOrNumberToIndex(q.correctAnswer);
  const studentIdx = letterOrNumberToIndex(studentAns);

  if (correctIdx !== null && studentIdx !== null) {
    if (options.length > 0 && studentIdx >= options.length) {
      return false;
    }
    return correctIdx === studentIdx;
  }

  if (
    options.length > 0 &&
    studentIdx !== null &&
    studentIdx >= 0 &&
    studentIdx < options.length &&
    options[studentIdx] !== undefined
  ) {
    return (
      String(options[studentIdx]).trim().toLowerCase() ===
      String(q.correctAnswer ?? "").trim().toLowerCase()
    );
  }

  if (
    options.length > 0 &&
    correctIdx !== null &&
    correctIdx >= 0 &&
    correctIdx < options.length &&
    options[correctIdx] !== undefined
  ) {
    return (
      String(studentAns).trim().toLowerCase() ===
      String(options[correctIdx]).trim().toLowerCase()
    );
  }

  const studentStr = String(studentAns).trim().toLowerCase();
  const correctStr = String(q.correctAnswer ?? "").trim().toLowerCase();
  if (!studentStr || !correctStr) return false;

  // If options exist, ensure studentStr actually matches one of the options or valid letter
  if (options.length > 0) {
    const matchesAnyOption = options.some(
      (opt) => String(opt).trim().toLowerCase() === studentStr
    );
    if (!matchesAnyOption) return false;
  }

  return studentStr === correctStr;
}

export interface EvaluateQuizOptions {
  /**
   * When false (default, student submission), any client-supplied scoreAwarded on
   * essay questions is ignored and essays are marked pending manual grading.
   * When true (teacher grading), numeric scoreAwarded / essayScores are applied.
   */
  isTeacherGrading?: boolean;
  /**
   * Optional map of manual essay scores by questionId supplied by the teacher.
   */
  essayScores?: Record<string, number | null | undefined>;
}

/**
 * Authoritatively evaluates all questions in a quiz submission.
 */
export function evaluateQuizSubmission(
  questions: RawQuizQuestion[] | null | undefined,
  rawAnswersInput: Array<Record<string, unknown>> | null | undefined,
  options: EvaluateQuizOptions = {}
): QuizEvaluationResult {
  const qList = Array.isArray(questions) ? questions : [];
  const ansList = Array.isArray(rawAnswersInput) ? rawAnswersInput : [];
  const isTeacherGrading = Boolean(options.isTeacherGrading);
  const essayScoreMap = options.essayScores || {};

  const answerMap = new Map<string, Record<string, unknown>>();
  for (const item of ansList) {
    if (item && item.questionId !== undefined && item.questionId !== null) {
      answerMap.set(String(item.questionId), item);
    }
  }

  const maxSummary = calculateQuizMaxRawScore(qList);

  let objectiveRawScore = 0;
  let essayRawScore = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  let pendingEssayCount = 0;
  let gradedEssayCount = 0;

  const evaluatedAnswers: EvaluatedQuizAnswer[] = qList.map((q, idx) => {
    const qId = String(q.id || `q-${idx + 1}`);
    const qType: "pilihan_ganda" | "essay" =
      q.type === "essay" ? "essay" : "pilihan_ganda";
    const pt = getQuestionPointsTrue(q);
    const pf = getQuestionPointsFalse(q);
    const qMax = getQuestionMaxPoints(q);

    const submittedEntry = answerMap.get(qId);
    const rawAns =
      submittedEntry && submittedEntry.answer !== undefined
        ? (submittedEntry.answer as number | string | null)
        : null;

    const isAnswered =
      rawAns !== null &&
      rawAns !== undefined &&
      !(typeof rawAns === "string" && rawAns.trim() === "");

    if (qType === "essay") {
      let manualScore: number | null = null;

      if (isTeacherGrading) {
        const fromMap = essayScoreMap[qId];
        const fromEntry = submittedEntry?.scoreAwarded;
        const candidate =
          fromMap !== undefined && fromMap !== null
            ? fromMap
            : fromEntry !== undefined && fromEntry !== null
              ? fromEntry
              : null;

        if (
          candidate !== null &&
          candidate !== "" &&
          Number.isFinite(Number(candidate))
        ) {
          manualScore = roundScore(
            Math.max(0, Math.min(qMax, Number(candidate)))
          );
        }
      }

      if (manualScore !== null) {
        gradedEssayCount++;
        essayRawScore += manualScore;
        const isEssayCorrect = manualScore > 0;
        if (isEssayCorrect) correctCount++;
        else incorrectCount++;

        return {
          questionId: qId,
          questionType: "essay",
          answer: isAnswered ? String(rawAns) : "",
          isCorrect: isEssayCorrect,
          isAnswered,
          isGraded: true,
          scoreAwarded: manualScore,
          maxPoints: qMax,
          pointsFalse: 0,
        };
      } else {
        pendingEssayCount++;
        if (!isAnswered) unansweredCount++;

        return {
          questionId: qId,
          questionType: "essay",
          answer: isAnswered ? String(rawAns) : "",
          isCorrect: false,
          isAnswered,
          isGraded: false,
          scoreAwarded: null,
          maxPoints: qMax,
          pointsFalse: 0,
        };
      }
    }

    // Objective (pilihan_ganda) question
    let isCorrect = false;
    let scoreAwarded = 0;

    if (!isAnswered) {
      isCorrect = false;
      scoreAwarded = 0;
      unansweredCount++;
      incorrectCount++;
    } else {
      isCorrect = isObjectiveAnswerCorrect(q, rawAns);
      if (isCorrect) {
        scoreAwarded = pt;
        correctCount++;
      } else {
        scoreAwarded = pf;
        incorrectCount++;
      }
    }

    scoreAwarded = roundScore(scoreAwarded);
    objectiveRawScore += scoreAwarded;

    return {
      questionId: qId,
      questionType: "pilihan_ganda",
      answer: rawAns,
      isCorrect,
      isAnswered,
      isGraded: true,
      scoreAwarded,
      maxPoints: qMax,
      pointsFalse: pf,
    };
  });

  objectiveRawScore = roundScore(objectiveRawScore);
  essayRawScore = roundScore(essayRawScore);
  const rawScore = roundScore(objectiveRawScore + essayRawScore);
  const maxRawScore = maxSummary.maxRawScore;

  let gradingStatus: QuizGradingStatus;
  let normalizedScore: number | null = null;
  let provisionalScore: number | null = null;
  let submissionStatus: "graded" | "turned_in" = "graded";

  if (!maxSummary.hasValidMaxScore) {
    gradingStatus = "invalid_max_score";
    normalizedScore = null;
    provisionalScore = null;
    submissionStatus = "turned_in";
  } else if (pendingEssayCount > 0) {
    gradingStatus = "pending_manual";
    normalizedScore = null;
    provisionalScore = normalizeRawScore(rawScore, maxRawScore);
    submissionStatus = "turned_in";
  } else {
    gradingStatus = "completed";
    normalizedScore = normalizeRawScore(rawScore, maxRawScore);
    provisionalScore = normalizedScore;
    submissionStatus = "graded";
  }

  return {
    quizAnswers: evaluatedAnswers,
    rawScore,
    maxRawScore,
    objectiveRawScore,
    essayRawScore,
    objectiveMaxRawScore: maxSummary.objectiveMaxRawScore,
    essayMaxRawScore: maxSummary.essayMaxRawScore,
    normalizedScore,
    provisionalScore,
    gradingStatus,
    submissionStatus,
    isPendingManual: gradingStatus === "pending_manual",
    hasEssayQuestions: maxSummary.hasEssayQuestions,
    hasValidMaxScore: maxSummary.hasValidMaxScore,
    correctCount,
    incorrectCount,
    unansweredCount,
    pendingEssayCount,
    gradedEssayCount,
    totalQuestions: qList.length,
  };
}

export interface ResolvedSubmissionScore {
  rawScore: number | null;
  maxRawScore: number;
  normalizedScore: number | null;
  provisionalScore: number | null;
  objectiveRawScore: number | null;
  essayRawScore: number | null;
  gradingStatus: QuizGradingStatus;
  isPendingManual: boolean;
  isFinalGraded: boolean;
  isQuiz: boolean;
}

/**
 * Safely resolves rawScore, maxRawScore, normalizedScore, and gradingStatus
 * for both new and historical Submission records without double-normalizing.
 */
export function resolveSubmissionScoring(
  subInput: Record<string, unknown> | null | undefined,
  quizInput?: Record<string, unknown> | null,
  assignmentInput?: Record<string, unknown> | null
): ResolvedSubmissionScore {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub = subInput as Record<string, any> | null | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quiz = quizInput as Record<string, any> | null | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assignment = assignmentInput as Record<string, any> | null | undefined;
  const isQuiz = Boolean(
    sub?.quizId ||
      quiz ||
      assignment?.quizId ||
      assignment?.type === "kuis" ||
      (Array.isArray(sub?.quizAnswers) && sub.quizAnswers.length > 0)
  );

  const quizQuestions: RawQuizQuestion[] = Array.isArray(quiz?.questions)
    ? quiz.questions
    : Array.isArray(assignment?.quizId?.questions)
      ? assignment.quizId.questions
      : [];

  const quizMaxSummary =
    quizQuestions.length > 0 ? calculateQuizMaxRawScore(quizQuestions) : null;

  const fallbackMaxRaw =
    typeof sub?.maxRawScore === "number" && sub.maxRawScore > 0
      ? roundScore(sub.maxRawScore)
      : quizMaxSummary && quizMaxSummary.maxRawScore > 0
        ? quizMaxSummary.maxRawScore
        : typeof quiz?.maxRawPoints === "number" && quiz.maxRawPoints > 0
          ? roundScore(quiz.maxRawPoints)
          : typeof quiz?.totalPoints === "number" && quiz.totalPoints > 0
            ? roundScore(quiz.totalPoints)
            : typeof assignment?.maxScore === "number" && assignment.maxScore > 0
              ? roundScore(assignment.maxScore)
              : 100;

  if (!sub) {
    return {
      rawScore: null,
      maxRawScore: fallbackMaxRaw,
      normalizedScore: null,
      provisionalScore: null,
      objectiveRawScore: null,
      essayRawScore: null,
      gradingStatus: "not_started",
      isPendingManual: false,
      isFinalGraded: false,
      isQuiz,
    };
  }

  // 1. If submission explicitly has gradingStatus === "pending_manual"
  if (sub.gradingStatus === "pending_manual") {
    const raw =
      typeof sub.rawScore === "number" && Number.isFinite(sub.rawScore)
        ? roundScore(sub.rawScore)
        : 0;
    const prov =
      typeof sub.provisionalScore === "number" &&
      Number.isFinite(sub.provisionalScore)
        ? roundScore(sub.provisionalScore)
        : normalizeRawScore(raw, fallbackMaxRaw);

    return {
      rawScore: raw,
      maxRawScore: fallbackMaxRaw,
      normalizedScore: null,
      provisionalScore: prov,
      objectiveRawScore:
        typeof sub.objectiveRawScore === "number"
          ? roundScore(sub.objectiveRawScore)
          : raw,
      essayRawScore:
        typeof sub.essayRawScore === "number"
          ? roundScore(sub.essayRawScore)
          : 0,
      gradingStatus: "pending_manual",
      isPendingManual: true,
      isFinalGraded: false,
      isQuiz,
    };
  }

  if (sub.gradingStatus === "invalid_max_score") {
    return {
      rawScore: typeof sub.rawScore === "number" ? roundScore(sub.rawScore) : 0,
      maxRawScore: 0,
      normalizedScore: null,
      provisionalScore: null,
      objectiveRawScore:
        typeof sub.objectiveRawScore === "number"
          ? roundScore(sub.objectiveRawScore)
          : null,
      essayRawScore:
        typeof sub.essayRawScore === "number"
          ? roundScore(sub.essayRawScore)
          : null,
      gradingStatus: "invalid_max_score",
      isPendingManual: false,
      isFinalGraded: false,
      isQuiz,
    };
  }

  // 2. If submission already has normalizedScore stored
  if (
    typeof sub.normalizedScore === "number" &&
    Number.isFinite(sub.normalizedScore)
  ) {
    const norm = roundScore(Math.max(0, Math.min(100, sub.normalizedScore)));
    const raw =
      typeof sub.rawScore === "number" && Number.isFinite(sub.rawScore)
        ? roundScore(sub.rawScore)
        : norm;
    const isGraded = sub.status === "graded";

    return {
      rawScore: raw,
      maxRawScore: fallbackMaxRaw,
      normalizedScore: isGraded ? norm : null,
      provisionalScore: norm,
      objectiveRawScore:
        typeof sub.objectiveRawScore === "number"
          ? roundScore(sub.objectiveRawScore)
          : null,
      essayRawScore:
        typeof sub.essayRawScore === "number"
          ? roundScore(sub.essayRawScore)
          : null,
      gradingStatus: isGraded ? "completed" : "pending_manual",
      isPendingManual: !isGraded,
      isFinalGraded: isGraded,
      isQuiz,
    };
  }

  // 3. Historical submission fallback
  const hasQuizAnswers =
    Array.isArray(sub.quizAnswers) && sub.quizAnswers.length > 0;

  if (isQuiz && hasQuizAnswers && quizQuestions.length > 0) {
    // Check if there are any ungraded essay answers in historical quizAnswers
    const essayQIds = new Set(
      quizQuestions.filter((q) => q.type === "essay").map((q) => String(q.id))
    );
    let hasUngradedEssay = false;
    let earnedSum = 0;

    for (const ans of sub.quizAnswers) {
      const qId = String(ans.questionId);
      if (
        essayQIds.has(qId) &&
        (ans.scoreAwarded === null ||
          ans.scoreAwarded === undefined ||
          ans.isGraded === false)
      ) {
        hasUngradedEssay = true;
      } else if (
        typeof ans.scoreAwarded === "number" &&
        Number.isFinite(ans.scoreAwarded)
      ) {
        earnedSum += ans.scoreAwarded;
      }
    }

    const raw = roundScore(earnedSum);
    const maxRaw = quizMaxSummary?.maxRawScore || fallbackMaxRaw;

    if (hasUngradedEssay && sub.status !== "graded") {
      return {
        rawScore: raw,
        maxRawScore: maxRaw,
        normalizedScore: null,
        provisionalScore: normalizeRawScore(raw, maxRaw),
        objectiveRawScore: raw,
        essayRawScore: 0,
        gradingStatus: "pending_manual",
        isPendingManual: true,
        isFinalGraded: false,
        isQuiz: true,
      };
    }

    const norm = normalizeRawScore(raw, maxRaw);
    return {
      rawScore: raw,
      maxRawScore: maxRaw,
      normalizedScore: norm,
      provisionalScore: norm,
      objectiveRawScore: null,
      essayRawScore: null,
      gradingStatus: norm !== null ? "completed" : "invalid_max_score",
      isPendingManual: false,
      isFinalGraded: sub.status === "graded" && norm !== null,
      isQuiz: true,
    };
  }

  // 4. Historical submission without quizAnswers (or ordinary assignment)
  if (
    sub.status === "graded" &&
    typeof sub.score === "number" &&
    Number.isFinite(sub.score)
  ) {
    const legacyScore = roundScore(sub.score);
    // For historical quiz submissions without quizAnswers where score was already 0-100,
    // or ordinary assignments with maxScore === 100, do NOT double-normalize.
    let norm: number;
    let raw: number;

    if (!isQuiz && fallbackMaxRaw !== 100 && fallbackMaxRaw > 0) {
      raw = legacyScore;
      norm = normalizeRawScore(legacyScore, fallbackMaxRaw) ?? legacyScore;
    } else {
      // Score is already on 0-100 scale
      norm = roundScore(Math.max(0, Math.min(100, legacyScore)));
      raw =
        typeof sub.rawScore === "number" && Number.isFinite(sub.rawScore)
          ? roundScore(sub.rawScore)
          : legacyScore;
    }

    return {
      rawScore: raw,
      maxRawScore: fallbackMaxRaw,
      normalizedScore: norm,
      provisionalScore: norm,
      objectiveRawScore: null,
      essayRawScore: null,
      gradingStatus: "completed",
      isPendingManual: false,
      isFinalGraded: true,
      isQuiz,
    };
  }

  return {
    rawScore: null,
    maxRawScore: fallbackMaxRaw,
    normalizedScore: null,
    provisionalScore: null,
    objectiveRawScore: null,
    essayRawScore: null,
    gradingStatus: "not_started",
    isPendingManual: false,
    isFinalGraded: false,
    isQuiz,
  };
}
