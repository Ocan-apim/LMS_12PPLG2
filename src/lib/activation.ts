import { containsProfanity } from "@/lib/profanity-filter";
import {
  isActivationRole,
  requiresAccountActivation,
  resolveAccountStatus,
  type AccountStatusLabel,
  type AccountStatusCode,
} from "@/lib/auth";
import { User } from "@/models/User";

export {
  isActivationRole,
  requiresAccountActivation,
  resolveAccountStatus,
  type AccountStatusLabel,
  type AccountStatusCode,
};

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type UsernameValidationResult =
  | { valid: true; username: string }
  | { valid: false; message: string };

/**
 * Validates and normalizes a login username for Guru and Kurikulum accounts.
 * Rules:
 * - Trimmed of leading/trailing whitespace
 * - Non-empty
 * - 3 to 30 characters
 * - Only letters, numbers, dot (.), underscore (_), and hyphen (-)
 * - Must start and end with an alphanumeric character
 * - Cannot contain consecutive punctuation (.., __, --, etc.)
 * - Cannot contain spaces or '@'
 * - Must pass application profanity/security rules
 * - Normalized to lowercase for case-insensitive uniqueness and comparison
 */
export function validateUsername(raw: unknown): UsernameValidationResult {
  if (typeof raw !== "string") {
    return { valid: false, message: "Username wajib diisi" };
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, message: "Username tidak boleh kosong" };
  }

  if (trimmed.includes("@") || /\s/.test(trimmed)) {
    return {
      valid: false,
      message: "Username tidak boleh mengandung spasi atau simbol @",
    };
  }

  if (trimmed.length < 3 || trimmed.length > 30) {
    return {
      valid: false,
      message: "Username harus terdiri dari 3 hingga 30 karakter",
    };
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
    return {
      valid: false,
      message:
        "Username hanya boleh terdiri dari huruf, angka, titik (.), garis bawah (_), atau tanda hubung (-)",
    };
  }

  if (!/^[a-zA-Z0-9]/.test(trimmed) || !/[a-zA-Z0-9]$/.test(trimmed)) {
    return {
      valid: false,
      message: "Username harus diawali dan diakhiri dengan huruf atau angka",
    };
  }

  if (/[._-]{2}/.test(trimmed)) {
    return {
      valid: false,
      message:
        "Username tidak boleh mengandung tanda baca berurutan (seperti .. atau __)",
    };
  }

  if (containsProfanity(trimmed)) {
    return {
      valid: false,
      message:
        "Username mengandung kata yang tidak diperbolehkan. Silakan gunakan username lain.",
    };
  }

  return {
    valid: true,
    username: trimmed.toLowerCase(),
  };
}

/**
 * Checks whether a username is available within a specific role (case-insensitive).
 * Uniqueness is scoped per role so a Guru and a Kurikulum can share the same username,
 * but two Guru accounts or two Kurikulum accounts cannot.
 */
export async function isUsernameAvailableForRole(
  username: string,
  role: string,
  excludeUserId?: string
): Promise<boolean> {
  const normalized = username.trim().toLowerCase();
  if (!normalized) return false;

  const query: Record<string, unknown> = {
    role,
    loginUsername: {
      $regex: `^${escapeRegex(normalized)}$`,
      $options: "i",
    },
  };

  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }

  const existing = await User.findOne(query).select("_id").lean();
  return !existing;
}

/**
 * Derives a clean, valid base username from email or official name.
 */
export function deriveBaseUsername(params: {
  email?: string;
  name?: string;
  nip?: string;
  role: string;
}): string {
  const emailLocal = params.email ? params.email.split("@")[0] : "";
  const rawSource = emailLocal || params.name || params.role;

  let base = rawSource
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, ".")
    .replace(/[._-]{2,}/g, ".")
    .replace(/^[._-]+|[._-]+$/g, "");

  if (base.length > 24) {
    base = base.slice(0, 24).replace(/[._-]+$/g, "");
  }

  if (base.length < 3 || containsProfanity(base)) {
    const cleanNip = (params.nip || "").replace(/[^0-9]/g, "").slice(-4);
    base = `${params.role}${cleanNip || "01"}`;
  }

  return base;
}

/**
 * Generates an available, role-unique initial loginUsername for a newly created
 * Guru or Kurikulum account when Admin does not explicitly specify one.
 */
export async function generateInitialUsername(params: {
  email?: string;
  name?: string;
  nip?: string;
  role: string;
  excludeUserId?: string;
}): Promise<string> {
  const base = deriveBaseUsername(params);

  if (
    await isUsernameAvailableForRole(base, params.role, params.excludeUserId)
  ) {
    return base;
  }

  for (let suffix = 1; suffix <= 999; suffix++) {
    const candidate = `${base}${suffix}`;
    if (
      await isUsernameAvailableForRole(
        candidate,
        params.role,
        params.excludeUserId
      )
    ) {
      return candidate;
    }
  }

  return `${params.role}.${Date.now().toString().slice(-6)}`;
}
