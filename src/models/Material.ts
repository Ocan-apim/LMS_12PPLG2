import mongoose, { Schema, models, model } from "mongoose";

export interface IMaterialAttachment {
  name: string;
  url: string;
  type: string;
  size: string;
  uploadedAt?: Date;
}

export interface IMaterial {
  title: string;
  description?: string;
  content?: string;
  fileUrl?: string;
  subjectId?: mongoose.Types.ObjectId;
  classId?: mongoose.Types.ObjectId;
  courseClassId?: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  attachments?: IMaterialAttachment[];
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MaterialSchema = new Schema<IMaterial>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    content: { type: String },
    fileUrl: { type: String },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject" },
    classId: { type: Schema.Types.ObjectId, ref: "Class" },
    courseClassId: { type: Schema.Types.ObjectId, ref: "CourseClass" },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        type: { type: String, default: "document" },
        size: { type: String, default: "1.0 MB" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Material =
  models.Material || model<IMaterial>("Material", MaterialSchema);
