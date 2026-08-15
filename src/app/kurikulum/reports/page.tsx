import { Button, EmptyState, WorkspaceHeader } from "@/components/ui";

export default function KurikulumReportsPage() {
  return (
    <div>
      <WorkspaceHeader
        eyebrow="Kurikulum"
        title="Laporan Kurikulum"
        description="Rekap ketercapaian materi dan aktivitas pembelajaran."
        action={<Button>Ekspor</Button>}
      />
      <EmptyState
        title="Belum ada laporan"
        description="Nantinya tampilkan chart dan tabel progress dari data MongoDB."
      />
    </div>
  );
}
