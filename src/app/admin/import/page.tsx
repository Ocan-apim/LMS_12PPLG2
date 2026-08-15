import { Upload } from "lucide-react";
import { Button, EmptyState, WorkspaceHeader } from "@/components/ui";

export default function AdminImportPage() {
  return (
    <div>
      <WorkspaceHeader
        eyebrow="Admin"
        title="Impor Data"
        description="Unggah data siswa, guru, atau kelas via CSV/Excel."
      />
      <div className="rounded-lg border-2 border-dashed border-[var(--border)] bg-white p-12 text-center shadow-[var(--shadow)]">
        <div className="mx-auto flex size-16 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
          <Upload className="size-7" />
        </div>
        <h3 className="mt-4 font-semibold text-[var(--foreground)]">
          Tarik file ke sini atau klik untuk unggah
        </h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Format didukung: .csv, .xlsx (maks. 5MB)
        </p>
        <Button className="mt-6">Pilih File</Button>
      </div>
      <div className="mt-6">
        <EmptyState
          title="Riwayat impor kosong"
          description="Setelah impor berhasil, riwayat akan muncul di sini."
        />
      </div>
    </div>
  );
}
