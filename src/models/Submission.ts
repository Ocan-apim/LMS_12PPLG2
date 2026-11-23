import mongoose, { Schema, models, model } from "mongoose";

export interface ISubmissionAttachment {
  name: string;
  url: string;
  type: string;
  size: string;
  uploadedAt?: Date;
}

export interface IPrivateComment {
  senderId: mongoose.Types.ObjectId;
  senderName: string;
  senderRole: string;
  message: string;
  createdAt: Date;
}

export interface ISubmission {
  assignmentId?: mongoose.Types.ObjectId;
  quizId?: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  courseClassId?: mongoose.Types.ObjectId;
  content?: string;
  fileUrl?: string; // backward compat
  attachments: ISubmissionAttachment[];
  score?: number | null;
  draftScore?: number | null;
  rawScore?: number | null;
  maxRawScore?: number | null;
  normalizedScore?: number | null;
  provisionalScore?: number | null;
  objectiveRawScore?: number | null;
  essayRawScore?: number | null;
  gradingStatus?: "not_started" | "pending_manual" | "completed" | "invalid_max_score";
  status: "turned_in" | "late" | "graded" | "assigned";
  feedback?: string;
  privateComments: IPrivateComment[];
  quizAnswers?: Array<{
    questionId: string;
    questionType?: "pilihan_ganda" | "essay";
    answer: number | string | null;
    isCorrect?: boolean;
    isAnswered?: boolean;
    isGraded?: boolean;
    scoreAwarded?: number | null;
    maxPoints?: number;
    pointsFalse?: number;
  }>;
  startedAt?: Date;
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
      required: false,
    },
    quizId: {
      type: Schema.Types.ObjectId,
      ref: "Quiz",
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
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    score: { type: Number },
    draftScore: { type: Number },
    rawScore: { type: Number },
    maxRawScore: { type: Number },
    normalizedScore: { type: Number },
    provisionalScore: { type: Number },
    objectiveRawScore: { type: Number },
    essayRawScore: { type: Number },
    gradingStatus: {
      type: String,
      enum: ["not_started", "pending_manual", "completed", "invalid_max_score"],
    },
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
        questionType: { type: String, enum: ["pilihan_ganda", "essay"] },
        answer: { type: Schema.Types.Mixed },
        isCorrect: { type: Boolean },
        isAnswered: { type: Boolean },
        isGraded: { type: Boolean },
        scoreAwarded: { type: Number },
        maxPoints: { type: Number },
        pointsFalse: { type: Number },
      },
    ],
    startedAt: { type: Date },
    submittedAt: { type: Date, default: Date.now },
    gradedAt: { type: Date },
  },
  { timestamps: true }
);

SubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true, sparse: true });
SubmissionSchema.index({ quizId: 1, studentId: 1 }, { sparse: true });
SubmissionSchema.index({ studentId: 1, status: 1 });
SubmissionSchema.index({ courseClassId: 1 });

export const Submission =
  models.Submission || model<ISubmission>("Submission", SubmissionSchema);
