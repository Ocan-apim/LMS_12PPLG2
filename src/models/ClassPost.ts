import mongoose, { Schema, models, model } from "mongoose";

export interface IClassComment {
  userId: mongoose.Types.ObjectId;
  userName: string;
  userRole: string;
  message: string;
  createdAt: Date;
}

export interface IClassPost {
  courseClassId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  type: "announcement" | "assignment" | "quiz";
  title: string;
  content?: string;
  refId?: mongoose.Types.ObjectId; // ref to Assignment or Quiz
  comments: IClassComment[];
  createdAt: Date;
  updatedAt: Date;
}

const ClassCommentSchema = new Schema<IClassComment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    userRole: { type: String, default: "siswa" },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const ClassPostSchema = new Schema<IClassPost>(
  {
    courseClassId: { type: Schema.Types.ObjectId, ref: "CourseClass", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["announcement", "assignment", "quiz"], default: "announcement" },
    title: { type: String, required: true },
    content: { type: String },
    refId: { type: Schema.Types.ObjectId },
    comments: [ClassCommentSchema],
  },
  { timestamps: true }
);

export const ClassPost =
  models.ClassPost || model<IClassPost>("ClassPost", ClassPostSchema);
