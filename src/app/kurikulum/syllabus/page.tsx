import { Button, EmptyState, WorkspaceHeader } from "@/components/ui";

export default function KurikulumSyllabusPage() {
  return (
    <div>
      <WorkspaceHeader
        eyebrow="Kurikulum"
        title="Silabus"
        description="Rencana pembelajaran per mapel dan kelas."
        action={<Button>Tambah Silabus</Button>}
      />
      <EmptyState
        title="Silabus kosong"
        description="Halaman siap. Tambahkan modul upload/CRUD silabus sesuai desain Figma."
      />
    </div>
  );
}
