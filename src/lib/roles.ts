import type { Role } from "@/types";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  guru: "Guru",
  kurikulum: "Kurikulum",
  kepsek: "Kepsek",
  siswa: "Siswa",
};

export const ROLE_DASHBOARD: Record<Role, string> = {
  admin: "/admin",
  guru: "/guru",
  kurikulum: "/kurikulum",
  kepsek: "/kepsek",
  siswa: "/siswa",
};

export function isRole(value: string): value is Role {
  return ["admin", "guru", "kurikulum", "kepsek", "siswa"].includes(value);
}

export { ROLE_NAV, LOGIN_ROLES } from "./navigation";
export type { NavIcon, NavItem } from "./navigation";
