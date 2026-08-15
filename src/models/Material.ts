import mongoose, { Schema, models, model } from "mongoose";

export interface IMaterial {
  title: string;
  description?: string;
  content?: string;
  fileUrl?: string;
  subjectId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MaterialSchema = new Schema<IMaterial>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    content: { type: String },
    fileUrl: { type: String },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Material =
  models.Material || model<IMaterial>("Material", MaterialSchema);
