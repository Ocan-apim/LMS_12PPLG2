import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(
      process.cwd(),
      "public",
      "templates",
      "Template_Soal_CBT.docx"
    );
    const buffer = await readFile(filePath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="Template_Soal_CBT.docx"',
      },
    });
  } catch (error) {
    console.error("Gagal mengunduh template kuis:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengunduh template kuis" },
      { status: 500 }
    );
  }
}
