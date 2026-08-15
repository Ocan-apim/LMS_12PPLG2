import mongoose, { Schema, models, model } from "mongoose";

export interface IClass {
  name: string;
  grade: string;
  academicYear: string;
  homeroomTeacherId?: mongoose.Types.ObjectId;
  studentIds: mongoose.Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClassSchema = new Schema<IClass>(
  {
    name: { type: String, required: true, trim: true },
    grade: { type: String, required: true, trim: true },
    academicYear: { type: String, required: true, trim: true },
    homeroomTeacherId: { type: Schema.Types.ObjectId, ref: "User" },
    studentIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ClassModel =
  models.Class || model<IClass>("Class", ClassSchema);
