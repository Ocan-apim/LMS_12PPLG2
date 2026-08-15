import mongoose, { Schema, models, model } from "mongoose";
import type { Role } from "@/types";

export interface IUser {
  name: string;
  email: string;
  password: string;
  role: Role;
  nip?: string;
  nis?: string;
  classId?: mongoose.Types.ObjectId;
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
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "guru", "kurikulum", "kepsek", "siswa"],
      required: true,
    },
    nip: { type: String, trim: true },
    nis: { type: String, trim: true },
    classId: { type: Schema.Types.ObjectId, ref: "Class" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const User = models.User || model<IUser>("User", UserSchema);
