import mongoose, { Schema, models, model } from "mongoose";

export interface ISupportMessage {
  _id: mongoose.Types.ObjectId;
  ticketId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

const SupportMessageSchema = new Schema<ISupportMessage>(
  {
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: "SupportTicket",
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

SupportMessageSchema.index({ ticketId: 1, createdAt: 1 });

export const SupportMessage =
  models.SupportMessage ||
  model<ISupportMessage>("SupportMessage", SupportMessageSchema);
