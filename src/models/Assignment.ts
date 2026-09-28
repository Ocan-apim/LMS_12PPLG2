import mongoose, { Schema, models, model } from "mongoose";

export interface IAssignmentAttachment {
  name: string;
  url: string;
  type: string;
  size: string;
  uploadedAt?: Date;
}

export interface IAssignmentComment {
  _id?: string;
  userId: mongoose.Types.ObjectId;
  userName: string;
  userRole: string;
  message: string;
  createdAt: Date;
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
  comments?: IAssignmentComment[];
  dueDate?: Date;
  maxScore: number;
  isPublished: boolean;
  isArchived?: boolean;
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
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    comments: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        userName: { type: String, required: true },
        userRole: { type: String, default: "guru" },
        message: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    dueDate: { type: Date },
    maxScore: { type: Number, default: 100 },
    isPublished: { type: Boolean, default: true },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AssignmentSchema.index({ teacherId: 1, isArchived: 1 });
AssignmentSchema.index({ courseClassId: 1, isArchived: 1 });
AssignmentSchema.index({ quizId: 1 });

export const Assignment =
  models.Assignment || model<IAssignment>("Assignment", AssignmentSchema);
