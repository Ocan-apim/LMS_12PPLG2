import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { SupportTicket, SupportMessage, Notification } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  const { session, error } = await requireRole(["admin"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "ID tiket tidak valid" },
        { status: 400 }
      );
    }

    await connectDB();

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Tiket bantuan tidak ditemukan" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { message } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, message: "Pesan balasan tidak boleh kosong" },
        { status: 400 }
      );
    }

    // Create message with authoritative admin session ID
    const newMsg = await SupportMessage.create({
      ticketId: ticket._id,
      senderId: session.id,
      message: message.trim(),
    });

    // Update ticket activity and automatically advance WAITING -> IN_PROGRESS
    ticket.lastMessageAt = new Date();
    if (ticket.status === "WAITING") {
      ticket.status = "IN_PROGRESS";
    }
    await ticket.save();

    // Notify student about Admin reply
    try {
      await Notification.create({
        recipientId: ticket.userId,
        type: "general",
        title: "Balasan Bantuan Admin",
        message: `Admin membalas permintaan bantuan Anda: ${ticket.subject}`,
        link: `/siswa/support/${ticket._id}`,
        relatedEntityId: ticket._id,
      });
    } catch (notifErr) {
      console.error("Gagal mengirim notifikasi balasan ke siswa:", notifErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Balasan berhasil dikirim",
        data: {
          message: {
            id: String(newMsg._id),
            message: newMsg.message,
            createdAt: newMsg.createdAt,
            sender: {
              id: session.id,
              name: session.name || "Admin Learnix",
              role: "admin",
              isAdmin: true,
            },
          },
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Gagal mengirim balasan";
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
