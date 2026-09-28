import mongoose, { Schema, models, model } from "mongoose";

export type NotificationType = "assignment" | "quiz" | "grade" | "material" | "general";

export interface INotification {
  _id: mongoose.Types.ObjectId;
  recipientId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  relatedEntityId?: mongoose.Types.ObjectId;
  relatedEntityType?: "Assignment" | "Quiz" | "Submission" | "Material" | "CourseClass";
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["assignment", "quiz", "grade", "material", "general"],
      default: "general",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    link: { type: String, trim: true },
    relatedEntityId: { type: Schema.Types.ObjectId },
    relatedEntityType: {
      type: String,
      enum: ["Assignment", "Quiz", "Submission", "Material", "CourseClass"],
    },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 });
NotificationSchema.index(
  { recipientId: 1, type: 1, relatedEntityId: 1 },
  { sparse: true }
);

export const Notification =
  models.Notification || model<INotification>("Notification", NotificationSchema);
