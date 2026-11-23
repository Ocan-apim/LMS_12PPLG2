import mongoose, { Schema, models, model } from "mongoose";

export interface IStudentEvent {
  studentId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD calendar date
  endDate: string;   // YYYY-MM-DD calendar date
  createdAt: Date;
  updatedAt: Date;
}

const StudentEventSchema = new Schema<IStudentEvent>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    startDate: {
      type: String,
      required: true,
      trim: true,
    },
    endDate: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

StudentEventSchema.index({ studentId: 1, startDate: 1, endDate: 1 });

export const StudentEvent =
  models.StudentEvent || model<IStudentEvent>("StudentEvent", StudentEventSchema);
