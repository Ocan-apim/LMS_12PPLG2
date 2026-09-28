import mongoose, { Schema, models, model } from "mongoose";

export type SupportCategory =
  | "Lupa Password"
  | "Kendala Login"
  | "Kendala Akun"
  | "Kendala Kelas"
  | "Kendala Tugas/Kuis"
  | "Kendala Teknis"
  | "Lainnya";

export type SupportStatus = "WAITING" | "IN_PROGRESS" | "RESOLVED";

export interface ISupportTicket {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  category: SupportCategory;
  subject: string;
  status: SupportStatus;
  lastMessageAt?: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        "Lupa Password",
        "Kendala Login",
        "Kendala Akun",
        "Kendala Kelas",
        "Kendala Tugas/Kuis",
        "Kendala Teknis",
        "Lainnya",
      ],
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["WAITING", "IN_PROGRESS", "RESOLVED"],
      default: "WAITING",
      index: true,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    resolvedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

SupportTicketSchema.index({ userId: 1, createdAt: -1 });
SupportTicketSchema.index({ status: 1, lastMessageAt: -1 });

export const SupportTicket =
  models.SupportTicket ||
  model<ISupportTicket>("SupportTicket", SupportTicketSchema);
