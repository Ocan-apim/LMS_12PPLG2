import { Button, EmptyState, WorkspaceHeader } from "@/components/ui";

export default function KepsekReportsPage() {
  return (
    <div>
      <WorkspaceHeader
        eyebrow="Kepsek"
        title="Laporan"
        description="Laporan akademik untuk pengambilan keputusan."
        action={<Button>Ekspor Laporan</Button>}
      />
      <EmptyState
        title="Belum ada laporan"
        description="Nantinya ekspor PDF/Excel dan filter per tahun ajaran."
      />
    </div>
  );
}
