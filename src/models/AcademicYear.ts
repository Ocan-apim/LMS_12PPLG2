import mongoose, { Schema, models, model } from "mongoose";

export interface IAcademicYear {
  name: string;
  semester: "Ganjil" | "Genap";
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AcademicYearSchema = new Schema<IAcademicYear>(
  {
    name: { type: String, required: true, trim: true },
    semester: { type: String, enum: ["Ganjil", "Genap"], default: "Genap" },
    isActive: { type: Boolean, default: false },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { timestamps: true }
);

AcademicYearSchema.index({ name: 1, semester: 1 }, { unique: true });

export const AcademicYear =
  models.AcademicYear || model<IAcademicYear>("AcademicYear", AcademicYearSchema);
