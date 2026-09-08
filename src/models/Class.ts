import mongoose, { Schema, models, model } from "mongoose";

export interface IClass {
  name: string;
  grade: string;
  departmentId?: mongoose.Types.ObjectId;
  parallelNumber?: number;
  academicYear: string;
  homeroomTeacherId?: mongoose.Types.ObjectId;
  studentIds: mongoose.Types.ObjectId[];
  maxCapacity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClassSchema = new Schema<IClass>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    grade: { type: String, required: true, enum: ["10", "11", "12"], trim: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    parallelNumber: { type: Number, default: 1 },
    academicYear: { type: String, required: true, trim: true },
    homeroomTeacherId: { type: Schema.Types.ObjectId, ref: "User" },
    studentIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    maxCapacity: { type: Number, default: 36 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ClassModel =
  models.Class || model<IClass>("Class", ClassSchema);
