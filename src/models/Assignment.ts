import mongoose, { Schema, models, model } from "mongoose";

export interface IAssignment {
  title: string;
  description?: string;
  subjectId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  dueDate?: Date;
  maxScore: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    dueDate: { type: Date },
    maxScore: { type: Number, default: 100 },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Assignment =
  models.Assignment || model<IAssignment>("Assignment", AssignmentSchema);
