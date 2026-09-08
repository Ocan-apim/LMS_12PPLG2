import mongoose, { Schema, models, model } from "mongoose";

export interface IAcademicAssignment {
  teacherId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  academicYear: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AcademicAssignmentSchema = new Schema<IAcademicAssignment>(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    academicYear: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AcademicAssignmentSchema.index(
  { teacherId: 1, subjectId: 1, classId: 1, academicYear: 1 },
  { unique: true }
);

export const AcademicAssignment =
  models.AcademicAssignment ||
  model<IAcademicAssignment>("AcademicAssignment", AcademicAssignmentSchema);
