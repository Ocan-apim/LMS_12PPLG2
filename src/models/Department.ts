import mongoose, { Schema, models, model } from "mongoose";

export interface IDepartment {
  name: string;
  code: string;
  headOfDepartmentId?: mongoose.Types.ObjectId;
  maxClasses: number;
  capacity: number;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    headOfDepartmentId: { type: Schema.Types.ObjectId, ref: "User" },
    maxClasses: { type: Number, default: 2, min: 1 },
    capacity: { type: Number, default: 72 },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Department =
  models.Department || model<IDepartment>("Department", DepartmentSchema);
