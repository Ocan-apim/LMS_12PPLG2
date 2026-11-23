import mammoth from "mammoth";

export interface ParsedCbtQuestion {
  prompt: string;
  options: string[];
  points: number;
  pointsFalse: number;
  correctAnswer: string; // "A", "B", "C", "D", "E"
}

export interface ParseCbtResult {
  questions: ParsedCbtQuestion[];
  totalPoints: number;
}

/**
 * Parses raw text extracted from a CBT document.
 * Format specification:
 * - Q1>: or Q>: Question text
 * - A>: Answer option (options are listed sequentially and represent A, B, C, D, E)
 * - PT>: Points if True (e.g. 2)
 * - PF>: Points if False (e.g. 0)
 * - K>: Correct answer key (e.g. B means the second A>: is correct)
 */
export function parseCbtText(rawText: string): ParseCbtResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const parsedQuestions: ParsedCbtQuestion[] = [];
  let currentQuestion: ParsedCbtQuestion | null = null;

  for (const line of lines) {
    // Check for Question start: Q1>:, Q>:, Q1:, Q:, Q 1>: etc.
    const qMatch = line.match(/^Q\s*\d*\s*(?:>:|:)\s*(.*)/i);
    if (qMatch) {
      if (currentQuestion) {
        parsedQuestions.push(currentQuestion);
      }
      currentQuestion = {
        prompt: qMatch[1].trim(),
        options: [],
        points: 2,
        pointsFalse: 0,
        correctAnswer: "A",
      };
      continue;
    }

    if (!currentQuestion) continue;

    // Check for Answer option: A>: or A:
    const aMatch = line.match(/^A\s*(?:>:|:)\s*(.*)/i);
    if (aMatch) {
      currentQuestion.options.push(aMatch[1].trim());
      continue;
    }

    // Check for Points True: PT>: or PT:
    const ptMatch = line.match(/^PT\s*(?:>:|:)\s*(-?\d+(?:\.\d+)?)/i);
    if (ptMatch) {
      currentQuestion.points = parseFloat(ptMatch[1]);
      continue;
    }

    // Check for Points False: PF>: or PF:
    const pfMatch = line.match(/^PF\s*(?:>:|:)\s*(-?\d+(?:\.\d+)?)/i);
    if (pfMatch) {
      currentQuestion.pointsFalse = parseFloat(pfMatch[1]);
      continue;
    }

    // Check for Answer Key: K>: or K:
    const kMatch = line.match(/^K\s*(?:>:|:)\s*([A-Za-z0-9]+)/i);
    if (kMatch) {
      const rawKey = kMatch[1].trim().toUpperCase();
      const numMap: Record<string, string> = {
        "1": "A",
        "2": "B",
        "3": "C",
        "4": "D",
        "5": "E",
        "6": "F",
      };
      currentQuestion.correctAnswer = numMap[rawKey] || rawKey;
      continue;
    }

    // Continuation line for multiline question prompt or options
    if (currentQuestion.options.length === 0) {
      currentQuestion.prompt += " " + line;
    } else {
      currentQuestion.options[currentQuestion.options.length - 1] += " " + line;
    }
  }

  if (currentQuestion) {
    parsedQuestions.push(currentQuestion);
  }

  const totalPoints = parsedQuestions.reduce((sum, q) => sum + (q.points || 0), 0);

  return {
    questions: parsedQuestions,
    totalPoints,
  };
}

/**
 * Extracts raw text from a docx buffer using mammoth, then parses CBT questions.
 */
export async function parseCbtDocxBuffer(buffer: Buffer): Promise<ParseCbtResult> {
  const result = await mammoth.extractRawText({ buffer });
  return parseCbtText(result.value);
}
