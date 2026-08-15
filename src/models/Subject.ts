import mongoose, { Schema, models, model } from "mongoose";

export interface ISubject {
  name: string;
  code: string;
  description?: string;
  teacherIds: mongoose.Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema = new Schema<ISubject>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    teacherIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Subject =
  models.Subject || model<ISubject>("Subject", SubjectSchema);
