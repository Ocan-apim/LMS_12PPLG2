import mongoose, { Schema, models, model } from "mongoose";

export interface IQuizQuestion {
  id: string;
  type: "pilihan_ganda" | "essay";
  question: string;
  imageUrl?: string;
  options: string[];
  correctAnswer: number | string; // index (0, 1, 2, ...) or rubric text
  points: number;
  pointsFalse?: number;
}

export interface IQuizComment {
  _id?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  userRole?: string;
  message: string;
  parentId?: mongoose.Types.ObjectId | null;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  deletedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
}

export interface IQuiz {
  title: string;
  description?: string;
  teacherId: mongoose.Types.ObjectId;
  courseClassId: mongoose.Types.ObjectId;
  durationSeconds: number; // e.g. 60 or total time
  questions: IQuizQuestion[];
  totalPoints: number;
  maxRawPoints?: number;
  dueDate?: Date;
  isPublished: boolean;
  comments: IQuizComment[];
  createdAt: Date;
  updatedAt: Date;
}

const QuizQuestionSchema = new Schema<IQuizQuestion>(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ["pilihan_ganda", "essay"], default: "pilihan_ganda" },
    question: { type: String, required: true },
    imageUrl: { type: String },
    options: [{ type: String }],
    correctAnswer: { type: Schema.Types.Mixed, default: 0 },
    points: { type: Number, default: 10 },
    pointsFalse: { type: Number, default: 0 },
  },
  { _id: false }
);

const QuizCommentSchema = new Schema<IQuizComment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    userRole: { type: String, default: "siswa" },
    message: { type: String, required: true },
    parentId: { type: Schema.Types.ObjectId, ref: "Quiz.comments", default: null },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const QuizSchema = new Schema<IQuiz>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    courseClassId: { type: Schema.Types.ObjectId, ref: "CourseClass", required: true },
    durationSeconds: { type: Number, default: 60 },
    questions: [QuizQuestionSchema],
    totalPoints: { type: Number, default: 100 },
    maxRawPoints: { type: Number },
    dueDate: { type: Date },
    isPublished: { type: Boolean, default: true },
    comments: [QuizCommentSchema],
  },
  { timestamps: true }
);

export const Quiz = models.Quiz || model<IQuiz>("Quiz", QuizSchema);
