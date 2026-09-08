import { Schema, models, model } from "mongoose";

export interface ISchoolSetting {
  schoolName: string;
  npsn: string;
  address: string;
  phone: string;
  email: string;
  headmasterName: string;
  logoUrl?: string;
  currentAcademicYear?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SchoolSettingSchema = new Schema<ISchoolSetting>(
  {
    schoolName: { type: String, required: true, default: "SMK Negeri 1" },
    npsn: { type: String, default: "12345678" },
    address: { type: String, default: "Jl. Pendidikan Kejuruan No. 1" },
    phone: { type: String, default: "(021) 1234567" },
    email: { type: String, default: "info@smknegeri1.sch.id" },
    headmasterName: { type: String, default: "Drs. H. Mulyadi, M.Pd." },
    logoUrl: { type: String },
    currentAcademicYear: { type: String, default: "2024/2025 - Genap" },
  },
  { timestamps: true }
);

export const SchoolSetting =
  models.SchoolSetting || model<ISchoolSetting>("SchoolSetting", SchoolSettingSchema);
