import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { parseCbtDocxBuffer, parseCbtText } from "@/lib/cbt-parser";

const BADGE_COLORS = [
  "bg-red-500",
  "bg-blue-600",
  "bg-amber-500",
  "bg-green-600",
  "bg-purple-600",
  "bg-pink-600",
];
const OPTION_KEYS = ["A", "B", "C", "D", "E", "F"];

export async function POST(req: Request) {
  const { session, error } = await requireRole(["guru", "admin"]);
  if (error || !session) return error;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Pilih file Word (.docx) terlebih dahulu" },
        { status: 400 }
      );
    }

    const fileName = file.name || "";
    const isDocx =
      fileName.endsWith(".docx") ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const isTxt = fileName.endsWith(".txt") || file.type === "text/plain";

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let parsedResult;
    if (isDocx) {
      parsedResult = await parseCbtDocxBuffer(buffer);
    } else if (isTxt) {
      parsedResult = parseCbtText(buffer.toString("utf-8"));
    } else {
      // Attempt docx parsing by default
      try {
        parsedResult = await parseCbtDocxBuffer(buffer);
      } catch {
        parsedResult = parseCbtText(buffer.toString("utf-8"));
      }
    }

    if (!parsedResult || parsedResult.questions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tidak ditemukan soal yang valid dalam file. Pastikan format sesuai template CBT (Q1>:, A>:, PT>:, PF>:, K>:).",
        },
        { status: 400 }
      );
    }

    // Transform into frontend QuestionItem structure
    const formattedQuestions = parsedResult.questions.map((q, idx) => {
      const options = (q.options.length > 0 ? q.options : ["", ""]).map(
        (optText, oIdx) => ({
          key: OPTION_KEYS[oIdx] || `Opt${oIdx + 1}`,
          badgeColor: BADGE_COLORS[oIdx % BADGE_COLORS.length],
          text: optText,
        })
      );

      return {
        id: `q-cbt-${idx + 1}-${Date.now()}`,
        type: "pilihan_ganda",
        prompt: q.prompt,
        options,
        correctAnswer: q.correctAnswer || "A",
        points: q.points || 2,
        pointsFalse: q.pointsFalse || 0,
        durationSeconds: 60,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil mengimpor ${formattedQuestions.length} soal dari dokumen Word.`,
      data: {
        totalQuestions: formattedQuestions.length,
        totalPoints: parsedResult.totalPoints,
        questions: formattedQuestions,
      },
    });
  } catch (err: unknown) {
    console.error("Gagal memproses file Word:", err);
    const message =
      err instanceof Error ? err.message : "Gagal membaca file dokumen Word";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
