export const ROLES = [
  "admin",
  "guru",
  "kurikulum",
  "kepsek",
  "siswa",
] as const;

export type Role = (typeof ROLES)[number];

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type ApiResponse<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
};
