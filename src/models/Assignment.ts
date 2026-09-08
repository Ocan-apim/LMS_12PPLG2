import mongoose, { Schema, models, model } from "mongoose";

export interface IAssignmentAttachment {
  name: string;
  url: string;
  type: string;
  size: string;
}

export interface IAssignment {
  title: string;
  description?: string;
  instructions?: string;
  bannerUrl?: string;
  type: "tugas" | "kuis";
  subjectId?: mongoose.Types.ObjectId;
  classId?: mongoose.Types.ObjectId; // Class rombel ref
  courseClassId?: mongoose.Types.ObjectId; // CourseClass classroom ref
  teacherId: mongoose.Types.ObjectId;
  quizId?: mongoose.Types.ObjectId;
  attachments: IAssignmentAttachment[];
  dueDate?: Date;
  maxScore: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    instructions: { type: String, trim: true },
    bannerUrl: { type: String, trim: true },
    type: { type: String, enum: ["tugas", "kuis"], default: "tugas" },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject" },
    classId: { type: Schema.Types.ObjectId, ref: "Class" },
    courseClassId: { type: Schema.Types.ObjectId, ref: "CourseClass" },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    quizId: { type: Schema.Types.ObjectId, ref: "Quiz" },
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        type: { type: String, default: "document" },
        size: { type: String, default: "1.2 MB" },
      },
    ],
    dueDate: { type: Date },
    maxScore: { type: Number, default: 100 },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Assignment =
  models.Assignment || model<IAssignment>("Assignment", AssignmentSchema);
