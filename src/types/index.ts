export const ROLES = [
  "admin",
  "guru",
  "kurikulum",
  "kepsek",
  "siswa",
] as const;

export type Role = (typeof ROLES)[number];

export const SMK_JURUSAN = [
  "PPLG",
  "TJKT",
  "DKV",
  "MPLB",
  "Perhotelan",
  "BDR",
] as const;

export type SmkJurusanCode = (typeof SMK_JURUSAN)[number];

export const GRADES = ["10", "11", "12"] as const;
export type Grade = (typeof GRADES)[number];

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

export interface IDepartmentData {
  _id: string;
  name: string;
  code: string;
  headOfDepartmentId?: { _id: string; name: string; email: string };
  maxClasses: number;
  capacity: number;
  description?: string;
  classCount?: number;
  studentCount?: number;
  isActive: boolean;
}

export interface IClassData {
  _id: string;
  name: string;
  grade: string;
  departmentId: { _id: string; name: string; code: string } | string;
  parallelNumber: number;
  academicYear: string;
  homeroomTeacherId?: { _id: string; name: string; nip?: string; email?: string };
  studentCount?: number;
  studentIds?: string[];
  maxCapacity: number;
  isActive: boolean;
}

export interface IStudentData {
  _id: string;
  name: string;
  email: string;
  nisn: string;
  gender: "Laki-laki" | "Perempuan";
  birthPlace: string;
  birthDate: string;
  grade: string;
  departmentId?: { _id: string; name: string; code: string };
  classId?: { _id: string; name: string; grade: string };
  academicYear: string;
  isActive: boolean;
}

export interface ITeacherData {
  _id: string;
  name: string;
  email: string;
  nip?: string;
  degree?: string;
  lastEducation?: string;
  photoUrl?: string;
  subjects?: { _id: string; name: string; code: string }[];
  joinDate?: string;
  isHomeroomTeacher?: boolean;
  homeroomClassId?: { _id: string; name: string };
  isActive: boolean;
}

export interface ISubjectData {
  _id: string;
  name: string;
  code: string;
  category: "Umum" | "Kejuruan";
  departmentId?: { _id: string; name: string; code: string };
  grade?: string;
  teacherIds?: { _id: string; name: string }[];
  description?: string;
  isActive: boolean;
}

export interface IAcademicYearData {
  _id: string;
  name: string;
  semester: "Ganjil" | "Genap";
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

export interface ISchoolSettingData {
  schoolName: string;
  npsn: string;
  address: string;
  phone: string;
  email: string;
  headmasterName: string;
  logoUrl?: string;
}
