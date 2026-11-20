/**
 * Learnix LMS - Centralized Indonesian Profanity, Vulgarity, and Insult Filter
 *
 * Provides strict detection of Indonesian profanity, insults, sexual/vulgar expressions,
 * regional slangs, leetspeak evasions, character elongations, and spacing/punctuation bypasses.
 * Designed with boundary-aware matching to eliminate false positives on innocent Indonesian text.
 */

export const DEFAULT_PROFANITY_ERROR_MESSAGE =
  "Konten mengandung kata atau ungkapan yang tidak diperbolehkan. Silakan periksa kembali tulisan Anda.";

export const COMMENT_PROFANITY_ERROR_MESSAGE =
  "Komentar tidak dapat dikirim karena mengandung kata atau ungkapan yang tidak pantas. Silakan gunakan bahasa yang lebih sopan.";

export const PROFANITY_ERROR_MESSAGE = COMMENT_PROFANITY_ERROR_MESSAGE;

export const EMPTY_COMMENT_ERROR_MESSAGE =
  "Pesan komentar tidak boleh kosong";

export interface DictionaryTerm {
  canonical: string;
  variations?: string[];
}

export interface ContextualTerm {
  canonical: string;
  pattern: RegExp;
}

export interface ProfanityCategory {
  id: string;
  name: string;
  description: string;
  terms: DictionaryTerm[];
  contextual?: ContextualTerm[];
}

export const PROFANITY_DICTIONARY: ProfanityCategory[] = [
  {
    id: "insults",
    name: "Insults and Personal Attacks",
    description: "Kata-kata hinaan, makian, dan umpatan kasar umum bahasa Indonesia",
    terms: [
      { canonical: "anjing", variations: ["ajg", "anjg", "anjng"] },
      { canonical: "bangsat", variations: ["bngst", "bgts", "bgst", "bngt"] },
      { canonical: "goblok", variations: ["gblk", "gblg", "goblog", "gwbwlk"] },
      { canonical: "tolol", variations: ["tlol", "tll"] },
      { canonical: "bego", variations: ["beg0", "bg0"] },
      { canonical: "bodoh", variations: ["b0d0h", "b0doh", "bdoh"] },
      { canonical: "dungu", variations: ["dngu"] },
      { canonical: "idiot", variations: ["1d10t", "idyot"] },
      { canonical: "bajingan", variations: ["bjngn"] },
      { canonical: "brengsek", variations: ["brngsk"] },
      { canonical: "keparat", variations: ["kpryt", "kprt"] },
      { canonical: "kampret", variations: ["kmprt"] },
      { canonical: "sialan", variations: ["s1alan"] },
    ],
    contextual: [
      {
        canonical: "monyet",
        pattern: /(?<![a-z0-9])(?:dasar|kamu|kau|lu|lo|loe|elu|si|anak|bocah|muka|otak)[\W_]+monyet(?![a-z0-9])/i,
      },
      {
        canonical: "monyet",
        pattern: /(?<![a-z0-9])monyet[\W_]+(?:lu|lo|loe|kau|kamu|banget|sia)(?![a-z0-9])/i,
      },
      {
        canonical: "babi",
        pattern: /(?<![a-z0-9])(?:dasar|kamu|kau|lu|lo|loe|elu|si|anak|bocah|muka|otak)[\W_]+babi(?![a-z0-9])/i,
      },
      {
        canonical: "babi",
        pattern: /(?<![a-z0-9])babi[\W_]+(?:lu|lo|loe|kau|kamu|banget|sia)(?![a-z0-9])/i,
      },
    ],
  },
  {
    id: "vulgar_and_sexual",
    name: "Vulgar and Sexual Language",
    description: "Kata-kata tidak senonoh, slang seksual, dan anatomi vulgar",
    terms: [
      { canonical: "kontol", variations: ["kntl", "kntol", "k0nt0l"] },
      { canonical: "memek", variations: ["mmk", "m3m3k", "mem3k"] },
      { canonical: "jembut", variations: ["jmbt", "jembvt"] },
      { canonical: "peler", variations: ["plr"] },
      { canonical: "pepek", variations: ["p3p3k", "ppk"] },
      { canonical: "ngentot", variations: ["ngntt", "entot", "ngewe", "ngentod", "ngtot"] },
      { canonical: "ngaceng", variations: ["ng4c3ng"] },
      { canonical: "colmek", variations: ["c0lm3k"] },
      { canonical: "coli", variations: ["c0l1"] },
      { canonical: "tetek", variations: ["t3t3k", "ttek"] },
      { canonical: "toket", variations: ["t0k3t", "tok3t"] },
      { canonical: "kimak", variations: ["pukimak", "pkmk", "puki[\\W_]*mak"] },
      { canonical: "seks", variations: ["sex", "s3ks", "s3x"] },
    ],
    contextual: [],
  },
  {
    id: "regional_and_slang",
    name: "Regional Indonesian Profanity and Slang",
    description: "Umpatan kedaerahan dan istilah slang tidak pantas",
    terms: [
      { canonical: "jancok", variations: ["jancuk", "dancok", "dancuk", "jnck", "jncuk"] },
      { canonical: "asu", variations: ["4su"] },
      { canonical: "itil", variations: ["1t1l"] },
      { canonical: "pantek", variations: ["pantak", "pntk"] },
      { canonical: "lonte", variations: ["l0nt3", "lont3"] },
      { canonical: "perek", variations: ["p3r3k"] },
      { canonical: "jablay", variations: ["jabl4y", "jbly"] },
      { canonical: "pecun", variations: ["p3cun", "pcun"] },
      { canonical: "bispak", variations: ["b1sp4k"] },
    ],
    contextual: [],
  },
];

const UNICODE_HOMOGLYPHS: Record<string, string> = {
  "а": "a", "à": "a", "á": "a", "â": "a", "ã": "a", "ä": "a", "å": "a",
  "е": "e", "è": "e", "é": "e", "ê": "e", "ë": "e",
  "і": "i", "ì": "i", "í": "i", "î": "i", "ï": "i",
  "о": "o", "ò": "o", "ó": "o", "ô": "o", "õ": "o", "ö": "o",
  "с": "c", "р": "p", "у": "y", "х": "x",
};

/**
 * Normalizes Unicode characters, removes zero-width characters, and converts homoglyphs.
 */
export function normalizeUnicode(text: string): string {
  if (!text || typeof text !== "string") return "";
  let s = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .toLowerCase();
  for (const [k, v] of Object.entries(UNICODE_HOMOGLYPHS)) {
    s = s.replaceAll(k, v);
  }
  return s;
}

/**
 * Normalizes common leetspeak substitutions to standard characters.
 */
export function normalizeLeetspeak(text: string): string {
  let s = normalizeUnicode(text);
  s = s.replace(/[@4^]/g, "a")
       .replace(/3/g, "e")
       .replace(/1/g, "i")
       .replace(/0/g, "o")
       .replace(/5/g, "s")
       .replace(/[$]/g, "s")
       .replace(/7/g, "t");
  return s;
}

/**
 * Standard multi-step text normalization:
 * 1. Unicode & lowercase normalization
 * 2. Leetspeak substitution
 * 3. Character elongation reduction (3+ repeated letters collapsed to 1)
 * 4. Whitespace cleanup
 */
export function normalizeText(text: string): string {
  if (!text || typeof text !== "string") return "";
  let s = normalizeLeetspeak(text);
  // Collapse 3 or more repeated characters to 1
  s = s.replace(/(.)\1{2,}/g, "$1");
  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function charToPattern(ch: string): string {
  switch (ch.toLowerCase()) {
    case "a":
      return "[a4@\\u00E0-\\u00E5]";
    case "b":
      return "[b8]";
    case "c":
      return "[c\\u00E7]";
    case "d":
      return "d";
    case "e":
      return "[e3\\u00E8-\\u00EB]";
    case "g":
      return "[g9]";
    case "i":
      return "[i1!|\\u00EC-\\u00EF]";
    case "j":
      return "j";
    case "k":
      return "k";
    case "l":
      return "[l1|]";
    case "m":
      return "m";
    case "n":
      return "n";
    case "o":
      return "[o0\\u00F2-\\u00F6]";
    case "p":
      return "p";
    case "r":
      return "r";
    case "s":
      return "[s5$]";
    case "t":
      return "[t7]";
    case "u":
      return "[u\\u00F9-\\u00FCv]";
    case "w":
      return "w";
    case "x":
      return "x";
    case "y":
      return "y";
    default:
      return ch.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  }
}

function buildWordRegexPattern(word: string): string {
  const parts = word.split("").map((ch) => charToPattern(ch) + "+");
  // Allows optional non-alphanumeric punctuation, spaces, or underscores between letters
  // Enforces strict word boundaries with negative lookbehind and lookahead to avoid false positives (e.g., keranjang, kontrol, seksama)
  return "(?<![a-z0-9])" + parts.join("[\\W_]*") + "(?![a-z0-9])";
}

interface CompiledPattern {
  canonical: string;
  regex: RegExp;
}

// Pre-compiled regex cache
const COMPILED_PATTERNS: CompiledPattern[] = [];

for (const category of PROFANITY_DICTIONARY) {
  for (const term of category.terms) {
    COMPILED_PATTERNS.push({
      canonical: term.canonical,
      regex: new RegExp(buildWordRegexPattern(term.canonical), "i"),
    });
    if (term.variations) {
      for (const v of term.variations) {
        COMPILED_PATTERNS.push({
          canonical: term.canonical,
          regex: new RegExp(buildWordRegexPattern(v), "i"),
        });
      }
    }
  }
  if (category.contextual) {
    for (const ctx of category.contextual) {
      COMPILED_PATTERNS.push({
        canonical: ctx.canonical,
        regex: ctx.pattern,
      });
    }
  }
}

/**
 * Checks whether text contains any prohibited profanity or vulgar terms.
 * Evaluates both raw text and normalized versions with boundary-aware matching.
 */
export function containsProfanity(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const trimmed = text.trim();
  if (!trimmed) return false;

  // 1. Direct pattern test on raw trimmed text
  for (const { regex } of COMPILED_PATTERNS) {
    if (regex.test(trimmed)) {
      return true;
    }
  }

  // 2. Test on normalized text (homoglyphs, leetspeak, collapsed repetitions)
  const normalized = normalizeText(trimmed);
  for (const { regex } of COMPILED_PATTERNS) {
    if (regex.test(normalized)) {
      return true;
    }
  }

  // 3. Test collapsed spaced characters (e.g., "a n j i n g" -> "anjing", "b o d o h" -> "bodoh")
  const collapsed = normalized.replace(/\b([a-z0-9])[\s._\-]+(?=[a-z0-9]\b)/g, "$1");
  if (collapsed !== normalized) {
    for (const { regex } of COMPILED_PATTERNS) {
      if (regex.test(collapsed)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Returns the canonical prohibited term if found, or null if clean.
 * For internal auditing/logging. Never expose offensive terms to end users.
 */
export function findProfanity(text: string): string | null {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  for (const { canonical, regex } of COMPILED_PATTERNS) {
    if (regex.test(trimmed)) return canonical;
  }

  const normalized = normalizeText(trimmed);
  for (const { canonical, regex } of COMPILED_PATTERNS) {
    if (regex.test(normalized)) return canonical;
  }

  const collapsed = normalized.replace(/\b([a-z0-9])[\s._\-]+(?=[a-z0-9]\b)/g, "$1");
  if (collapsed !== normalized) {
    for (const { canonical, regex } of COMPILED_PATTERNS) {
      if (regex.test(collapsed)) return canonical;
    }
  }

  return null;
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  field?: string;
}

/**
 * General content validation (for assignments, quizzes, materials, grading feedback, tickets, etc.)
 */
export function validateContent(
  text: unknown,
  customErrorMessage?: string,
  fieldName?: string
): ValidationResult {
  if (typeof text !== "string" || !text.trim()) {
    return { isValid: true };
  }

  if (containsProfanity(text)) {
    return {
      isValid: false,
      field: fieldName,
      message:
        customErrorMessage ||
        "Konten mengandung kata atau ungkapan yang tidak diperbolehkan. Silakan periksa kembali tulisan Anda.",
    };
  }

  return { isValid: true };
}

/**
 * Comment validation (preserves polite comment-specific error message)
 */
export function validateComment(text: unknown): ValidationResult {
  if (typeof text !== "string" || !text.trim()) {
    return {
      isValid: false,
      message: EMPTY_COMMENT_ERROR_MESSAGE,
    };
  }

  if (containsProfanity(text)) {
    return {
      isValid: false,
      message: COMMENT_PROFANITY_ERROR_MESSAGE,
    };
  }

  return { isValid: true };
}

/**
 * Validates multiple fields at once (e.g., in a form or request body).
 * Returns the first failing field, or { isValid: true }.
 */
export function validateFields(
  fields: Record<string, unknown>,
  customErrorMessage?: string
): ValidationResult {
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string") {
      const res = validateContent(value, customErrorMessage, key);
      if (!res.isValid) return res;
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const item = value[i];
        if (typeof item === "string") {
          const res = validateContent(item, customErrorMessage, `${key}[${i}]`);
          if (!res.isValid) return res;
        } else if (item && typeof item === "object") {
          const res = validateFields(item as Record<string, unknown>, customErrorMessage);
          if (!res.isValid) {
            return {
              ...res,
              field: `${key}[${i}].${res.field || ""}`,
            };
          }
        }
      }
    }
  }
  return { isValid: true };
}
