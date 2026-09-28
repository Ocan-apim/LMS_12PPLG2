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
  | "schedule"
  | "curriculum"
  | "support";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  children?: NavItem[];
};

export const ROLE_NAV: Record<Role, NavItem[]> = {
  admin: [
    { href: "/admin", label: "Dashboard", icon: "dashboard" },
    {
      href: "/admin/accounts",
      label: "Manajemen Akun",
      icon: "users",
      children: [
        { href: "/admin/users", label: "Manajemen Pengguna", icon: "users" },
        { href: "/admin/students", label: "Manajemen Siswa", icon: "students" },
        { href: "/admin/teachers", label: "Manajemen Guru", icon: "teachers" },
        { href: "/admin/curriculum", label: "Manajemen Kurikulum", icon: "syllabus" },
      ],
    },
    { href: "/admin/classes", label: "Manajemen Kelas", icon: "classes" },
    { href: "/admin/departments", label: "Manajemen Jurusan", icon: "departments" },
    { href: "/admin/subjects", label: "Mata Pelajaran", icon: "subjects" },
    { href: "/admin/academic-years", label: "Tahun Ajaran", icon: "academic" },
    { href: "/admin/support", label: "Bantuan Siswa", icon: "support" },
  ],
  guru: [
    { href: "/guru", label: "Dashboard", icon: "dashboard" },
    { href: "/guru/classes", label: "Kelas Saya", icon: "classes" },
    { href: "/guru/assignments", label: "Tugas", icon: "assignments" },
    { href: "/guru/grades", label: "Penilaian", icon: "grades" },
    { href: "/guru/profile", label: "Profil", icon: "users" },
  ],
  kurikulum: [
    { href: "/kurikulum", label: "Dashboard", icon: "dashboard" },
    { href: "/kurikulum/teachers", label: "Data Guru", icon: "teachers" },
    { href: "/kurikulum/grades/classes", label: "Nilai Kelas", icon: "grades" },
    { href: "/kurikulum/grades/subjects", label: "Nilai Mapel", icon: "academic" },
    { href: "/kurikulum/reports", label: "Laporan", icon: "reports" },
    { href: "/kurikulum/files", label: "Berkas Akademik", icon: "materials" },
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
    { href: "/siswa/support", label: "Bantuan", icon: "support" },
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
