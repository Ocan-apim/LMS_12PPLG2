import mongoose, { Schema, models, model } from "mongoose";

export interface ISubmission {
  assignmentId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  content?: string;
  fileUrl?: string;
  score?: number;
  feedback?: string;
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
    content: { type: String },
    fileUrl: { type: String },
    score: { type: Number },
    feedback: { type: String },
    submittedAt: { type: Date, default: Date.now },
    gradedAt: { type: Date },
  },
  { timestamps: true }
);

SubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

export const Submission =
  models.Submission || model<ISubmission>("Submission", SubmissionSchema);
