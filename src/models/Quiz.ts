import mongoose, { Schema, models, model } from "mongoose";

export interface IQuizQuestion {
  id: string;
  type: "pilihan_ganda" | "essay";
  question: string;
  imageUrl?: string;
  options: string[];
  correctAnswer: number | string; // index (0, 1, 2, ...) or rubric text
  points: number;
}

export interface IQuiz {
  title: string;
  teacherId: mongoose.Types.ObjectId;
  courseClassId: mongoose.Types.ObjectId;
  durationSeconds: number; // e.g. 60 or total time
  questions: IQuizQuestion[];
  totalPoints: number;
  isPublished: boolean;
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
  },
  { _id: false }
);

const QuizSchema = new Schema<IQuiz>(
  {
    title: { type: String, required: true, trim: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    courseClassId: { type: Schema.Types.ObjectId, ref: "CourseClass", required: true },
    durationSeconds: { type: Number, default: 60 },
    questions: [QuizQuestionSchema],
    totalPoints: { type: Number, default: 100 },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Quiz = models.Quiz || model<IQuiz>("Quiz", QuizSchema);
