import mongoose, { Schema, models, model } from "mongoose";

export interface ICourseClass {
  name: string; // e.g. "Basis Data", "Pemrograman Web"
  code: string; // e.g. "QRV26", "87GH2"
  password: string; // e.g. "basisdata123"
  teacherId: mongoose.Types.ObjectId;
  classRombelId?: mongoose.Types.ObjectId; // e.g. 10 PPLG 1
  subjectId?: mongoose.Types.ObjectId;
  academicYear: string;
  bannerColor: string;
  studentIds: mongoose.Types.ObjectId[];
  sharedFiles: Array<{
    name: string;
    url: string;
    type: string;
    size: string;
    uploadedAt: Date;
  }>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CourseClassSchema = new Schema<ICourseClass>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    password: { type: String, required: true, trim: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    classRombelId: { type: Schema.Types.ObjectId, ref: "Class" },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject" },
    academicYear: { type: String, default: "2024/2025 - Genap" },
    bannerColor: { type: String, default: "blue" },
    studentIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    sharedFiles: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        type: { type: String, default: "document" },
        size: { type: String, default: "1.2 MB" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const CourseClass =
  models.CourseClass || model<ICourseClass>("CourseClass", CourseClassSchema);
