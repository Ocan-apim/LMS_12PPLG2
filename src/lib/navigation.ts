import type { Role } from "@/types";

export type NavIcon =
  | "dashboard"
  | "users"
  | "classes"
  | "students"
  | "departments"
  | "materials"
  | "assignments"
  | "subjects"
  | "academic"
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
    { href: "/admin/classes", label: "Manajemen Kelas", icon: "classes" },
    { href: "/admin/students", label: "Manajemen Siswa", icon: "students" },
    { href: "/admin/teachers", label: "Manajemen Guru", icon: "teachers" },
    { href: "/admin/departments", label: "Manajemen Jurusan", icon: "departments" },
    { href: "/admin/subjects", label: "Mata Pelajaran", icon: "subjects" },
    { href: "/admin/academic-years", label: "Tahun Ajaran", icon: "academic" },
    { href: "/admin/users", label: "Manajemen Pengguna", icon: "users" },
    { href: "/admin/settings", label: "Pengaturan", icon: "settings" },
  ],
  guru: [
    { href: "/guru", label: "Dashboard", icon: "dashboard" },
    { href: "/guru/classes", label: "Kelas Saya", icon: "classes" },
    { href: "/guru/assignments", label: "Tugas", icon: "assignments" },
    { href: "/guru/grades", label: "Penilaian", icon: "grades" },
    { href: "/guru/students", label: "Profil", icon: "users" },
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
    description: "Kelola pengguna, kelas, jurusan, dan sistem",
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
