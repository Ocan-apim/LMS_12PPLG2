import type { Role } from "@/types";

export type NavIcon =
  | "dashboard"
  | "users"
  | "classes"
  | "materials"
  | "assignments"
  | "subjects"
  | "syllabus"
  | "reports"
  | "overview"
  | "teachers"
  | "courses"
  | "grades"
  | "quiz"
  | "import"
  | "settings"
  | "schedule";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
};

export const ROLE_NAV: Record<Role, NavItem[]> = {
  admin: [
    { href: "/admin", label: "Dashboard", icon: "dashboard" },
    { href: "/admin/users", label: "Manajemen Pengguna", icon: "users" },
    { href: "/admin/classes", label: "Kelas", icon: "classes" },
    { href: "/admin/import", label: "Impor Data", icon: "import" },
    { href: "/admin/settings", label: "Pengaturan", icon: "settings" },
  ],
  guru: [
    { href: "/guru", label: "Dashboard", icon: "dashboard" },
    { href: "/guru/classes", label: "Kelas Tugas", icon: "classes" },
    { href: "/guru/students", label: "Manajemen Siswa", icon: "users" },
    { href: "/guru/materials", label: "File Kelas", icon: "materials" },
    { href: "/guru/assignments", label: "Tugas & Quiz", icon: "assignments" },
  ],
  kurikulum: [
    { href: "/kurikulum", label: "Dashboard", icon: "dashboard" },
    { href: "/kurikulum/subjects", label: "Mata Pelajaran", icon: "subjects" },
    { href: "/kurikulum/syllabus", label: "Silabus", icon: "syllabus" },
    { href: "/kurikulum/reports", label: "Laporan", icon: "reports" },
  ],
  kepsek: [
    { href: "/kepsek", label: "Dashboard", icon: "dashboard" },
    { href: "/kepsek/overview", label: "Ringkasan", icon: "overview" },
    { href: "/kepsek/teachers", label: "Guru", icon: "teachers" },
    { href: "/kepsek/reports", label: "Laporan", icon: "reports" },
  ],
  siswa: [
    { href: "/siswa", label: "Dashboard", icon: "dashboard" },
    { href: "/siswa/courses", label: "Mata Pelajaran", icon: "courses" },
    { href: "/siswa/schedule", label: "Calendar", icon: "schedule" },
    { href: "/siswa/assignments", label: "Tugas", icon: "assignments" },
    { href: "/siswa/grades", label: "Penilaian", icon: "grades" },
    { href: "/siswa/files", label: "File", icon: "materials" },
  ],
};

export const LOGIN_ROLES: {
  role: Role;
  title: string;
  description: string;
  accent: "blue" | "purple" | "orange";
}[] = [
  {
    role: "admin",
    title: "Admin",
    description: "Kelola pengguna, kelas, dan sistem",
    accent: "blue",
  },
  {
    role: "guru",
    title: "Guru",
    description: "Kelola materi, tugas, dan siswa",
    accent: "purple",
  },
  {
    role: "kurikulum",
    title: "Kurikulum",
    description: "Atur mapel, silabus, dan laporan",
    accent: "orange",
  },
  {
    role: "kepsek",
    title: "Kepala Sekolah",
    description: "Pantau kinerja dan laporan sekolah",
    accent: "blue",
  },
  {
    role: "siswa",
    title: "Siswa",
    description: "Akses kelas, tugas, dan quiz",
    accent: "purple",
  },
];
