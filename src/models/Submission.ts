import mongoose, { Schema, models, model } from "mongoose";

export interface ISubmissionAttachment {
  name: string;
  url: string;
  type: string;
  size: string;
}

export interface IPrivateComment {
  senderId: mongoose.Types.ObjectId;
  senderName: string;
  senderRole: string;
  message: string;
  createdAt: Date;
}

export interface ISubmission {
  assignmentId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  courseClassId?: mongoose.Types.ObjectId;
  content?: string;
  fileUrl?: string; // backward compat
  attachments: ISubmissionAttachment[];
  score?: number;
  draftScore?: number;
  status: "turned_in" | "late" | "graded" | "assigned";
  feedback?: string;
  privateComments: IPrivateComment[];
  quizAnswers?: Array<{
    questionId: string;
    answer: number | string;
    isCorrect?: boolean;
    scoreAwarded?: number;
  }>;
  submittedAt: Date;
  gradedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    courseClassId: { type: Schema.Types.ObjectId, ref: "CourseClass" },
    content: { type: String },
    fileUrl: { type: String },
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        type: { type: String, default: "document" },
        size: { type: String, default: "1.0 MB" },
      },
    ],
    score: { type: Number },
    draftScore: { type: Number },
    status: {
      type: String,
      enum: ["turned_in", "late", "graded", "assigned"],
      default: "turned_in",
    },
    feedback: { type: String },
    privateComments: [
      {
        senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        senderName: { type: String, required: true },
        senderRole: { type: String, default: "guru" },
        message: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    quizAnswers: [
      {
        questionId: { type: String },
        answer: { type: Schema.Types.Mixed },
        isCorrect: { type: Boolean },
        scoreAwarded: { type: Number },
      },
    ],
    submittedAt: { type: Date, default: Date.now },
    gradedAt: { type: Date },
  },
  { timestamps: true }
);

SubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

export const Submission =
  models.Submission || model<ISubmission>("Submission", SubmissionSchema);
