import mongoose, { Schema, models, model } from "mongoose";
import type { Role } from "@/types";

export interface IUser {
  name: string;
  email: string;
  password: string;
  role: Role;
  // Siswa specific
  nis?: string;
  nisn?: string;
  gender?: "Laki-laki" | "Perempuan";
  birthPlace?: string;
  birthDate?: Date;
  grade?: string;
  departmentId?: mongoose.Types.ObjectId;
  classId?: mongoose.Types.ObjectId;
  academicYear?: string;
  
  // Guru specific
  nip?: string;
  degree?: string;
  lastEducation?: string;
  photoUrl?: string;
  subjects?: mongoose.Types.ObjectId[];
  joinDate?: Date;
  isHomeroomTeacher?: boolean;
  homeroomClassId?: mongoose.Types.ObjectId;

  // Umum / Staff
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "guru", "kurikulum", "kepsek", "siswa"],
      required: true,
    },
    // Siswa fields
    nis: { type: String, trim: true, index: true },
    nisn: { type: String, trim: true, index: true },
    gender: { type: String, enum: ["Laki-laki", "Perempuan"] },
    birthPlace: { type: String, trim: true },
    birthDate: { type: Date },
    grade: { type: String, enum: ["10", "11", "12"] },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    classId: { type: Schema.Types.ObjectId, ref: "Class" },
    academicYear: { type: String, trim: true },

    // Guru fields
    nip: { type: String, trim: true, index: true },
    degree: { type: String, trim: true },
    lastEducation: {
      type: String,
      enum: ["D3", "S1 / Sarjana", "S2 / Magister", "S3 / Doktoral", "Lainnya"],
    },
    photoUrl: { type: String, trim: true },
    subjects: [{ type: Schema.Types.ObjectId, ref: "Subject" }],
    joinDate: { type: Date },
    isHomeroomTeacher: { type: Boolean, default: false },
    homeroomClassId: { type: Schema.Types.ObjectId, ref: "Class" },

    // Umum
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const User = models.User || model<IUser>("User", UserSchema);
