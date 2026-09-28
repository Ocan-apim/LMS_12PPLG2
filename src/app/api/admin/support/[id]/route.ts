import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { SupportTicket, SupportMessage } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
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

    const ticket: any = await SupportTicket.findById(id)
      .populate({
        path: "userId",
        select: "name email role nip nis nisn grade classId phone createdAt",
        populate: { path: "classId", select: "name grade" },
      })
      .lean();

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Tiket bantuan tidak ditemukan" },
        { status: 404 }
      );
    }

    const messages: any[] = await SupportMessage.find({ ticketId: ticket._id })
      .populate("senderId", "name role")
      .sort({ createdAt: 1 })
      .lean();

    const formattedMessages = messages.map((m) => {
      const sender = m.senderId || {};
      const senderIdStr = sender._id ? sender._id.toString() : m.senderId?.toString();
      const isSenderAdmin = sender.role === "admin";
      return {
        id: String(m._id),
        message: m.message,
        createdAt: m.createdAt,
        sender: {
          id: senderIdStr,
          name: sender.name || (isSenderAdmin ? "Admin Learnix" : "Pengguna"),
          role: sender.role || (isSenderAdmin ? "admin" : "siswa"),
          isAdmin: isSenderAdmin,
        },
      };
    });

    const u = ticket.userId || {};
    const userRole = u.role || "siswa";
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
          student: {
            id: u._id ? String(u._id) : null,
            name: u.name || "Pengguna",
            email: u.email || "-",
            role: userRole,
            nis: u.nis || u.nisn || u.nip || "-",
            phone: u.phone || "-",
            grade: u.grade || "-",
            className: u.classId?.name || (userRole !== "siswa" ? userRole.toUpperCase() : "-"),
            joinedAt: u.createdAt || null,
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

export async function PATCH(req: NextRequest, context: RouteContext) {
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

    const body = await req.json().catch(() => ({}));
    const { status } = body;

    const VALID_STATUSES = ["WAITING", "IN_PROGRESS", "RESOLVED"];
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: `Status tidak valid. Pilih dari: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Tiket bantuan tidak ditemukan" },
        { status: 404 }
      );
    }

    ticket.status = status;
    if (status === "RESOLVED") {
      ticket.resolvedAt = new Date();
    } else {
      ticket.resolvedAt = undefined;
    }
    await ticket.save();

    return NextResponse.json({
      success: true,
      message: `Status tiket berhasil diubah menjadi ${status}`,
      data: {
        ticket: {
          id: String(ticket._id),
          status: ticket.status,
          resolvedAt: ticket.resolvedAt || null,
          updatedAt: ticket.updatedAt,
        },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui status tiket";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
