import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongodb";
import { SupportTicket, SupportMessage } from "@/models";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;

    if (!token || typeof token !== "string" || token.length < 16) {
      return NextResponse.json(
        { success: false, message: "Token tiket tidak valid" },
        { status: 400 }
      );
    }

    await connectDB();

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const ticket: any = await SupportTicket.findOne({
      ticketAccessTokenHash: tokenHash,
    })
      .populate({
        path: "userId",
        select: "name email role nis nisn nip grade classId",
        populate: { path: "classId", select: "name grade" },
      })
      .lean();

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Tiket bantuan tidak ditemukan atau token tidak valid" },
        { status: 404 }
      );
    }

    // Check expiration
    if (ticket.ticketAccessExpiresAt && new Date(ticket.ticketAccessExpiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, message: "Token akses tiket telah kedaluwarsa. Silakan ajukan permohonan baru." },
        { status: 410 }
      );
    }

    const messages: any[] = await SupportMessage.find({ ticketId: ticket._id })
      .populate("senderId", "name role")
      .sort({ createdAt: 1 })
      .lean();

    const targetUserIdStr = String(ticket.userId?._id || ticket.userId);

    const formattedMessages = messages.map((m) => {
      const sender = m.senderId || {};
      const senderIdStr = sender._id ? String(sender._id) : String(m.senderId);
      const isSenderAdmin = sender.role === "admin";
      const isSelf = senderIdStr === targetUserIdStr;

      return {
        id: String(m._id),
        message: m.message,
        createdAt: m.createdAt,
        sender: {
          id: senderIdStr,
          name: sender.name || (isSenderAdmin ? "Admin Learnix" : "Pemohon"),
          role: sender.role || (isSenderAdmin ? "admin" : "pemohon"),
          isAdmin: isSenderAdmin,
          isSelf,
        },
      };
    });

    const u = ticket.userId || {};

    return NextResponse.json({
      success: true,
      data: {
        ticket: {
          id: String(ticket._id),
          category: ticket.category,
          subject: ticket.subject,
          status: ticket.status,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
          resolvedAt: ticket.resolvedAt || null,
          lastMessageAt: ticket.lastMessageAt || ticket.updatedAt,
          user: {
            name: u.name || "Pengguna",
            role: u.role || "siswa",
            identifier: u.nis || u.nip || u.email || "-",
            className: u.classId?.name || (u.role && u.role !== "siswa" ? u.role.toUpperCase() : "-"),
          },
        },
        messages: formattedMessages,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat detail tiket";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
