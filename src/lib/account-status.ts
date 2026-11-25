export type AccountStatusLabel = "Aktif" | "Belum Diaktivasi" | "Non-Aktif";
export type AccountStatusCode = "active" | "unactivated" | "inactive";

export function isActivationRole(role?: string | null): boolean {
  return role === "guru" || role === "kurikulum";
}

export function requiresAccountActivation(
  user?: {
    role?: string | null;
    isActivated?: boolean | null;
    mustChangePassword?: boolean | null;
  } | null
): boolean {
  if (!user || !isActivationRole(user.role)) {
    return false;
  }
  return user.isActivated === false || user.mustChangePassword === true;
}

/**
 * Single mutually-exclusive account status calculation (Task 4):
 * Priority:
 * 1. Explicitly disabled (isActive === false) -> "Non-Aktif"
 * 2. Guru or Kurikulum not yet activated -> "Belum Diaktivasi"
 * 3. Otherwise (Siswa, Admin, Kepsek, or activated Guru/Kurikulum) -> "Aktif"
 */
export function resolveAccountStatus(
  user?: {
    role?: string | null;
    isActive?: boolean | null;
    isActivated?: boolean | null;
    mustChangePassword?: boolean | null;
  } | null
): {
  accountStatus: AccountStatusLabel;
  accountStatusCode: AccountStatusCode;
} {
  if (!user || user.isActive === false) {
    return {
      accountStatus: "Non-Aktif",
      accountStatusCode: "inactive",
    };
  }

  if (requiresAccountActivation(user)) {
    return {
      accountStatus: "Belum Diaktivasi",
      accountStatusCode: "unactivated",
    };
  }

  return {
    accountStatus: "Aktif",
    accountStatusCode: "active",
  };
}
