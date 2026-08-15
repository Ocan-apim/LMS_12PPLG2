import { Button, Select, TextField, Textarea, WorkspaceHeader } from "@/components/ui";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export default function AdminSettingsPage() {
  return (
    <div>
      <WorkspaceHeader
        eyebrow="Admin"
        title="Pengaturan"
        description="Konfigurasi sekolah, tahun ajaran, dan branding."
        action={<Button>Simpan Pengaturan</Button>}
      />
      <Card className="rounded-lg">
        <CardHeader title="Profil Sekolah" description="Informasi dasar yang tampil di LMS." />
        <CardBody className="grid gap-4 md:grid-cols-2">
          <TextField label="Nama Sekolah" defaultValue="SMA Negeri Demo" />
          <Select
            label="Tahun Ajaran"
            defaultValue="2025/2026"
            options={[
              { value: "2025/2026", label: "2025/2026" },
              { value: "2026/2027", label: "2026/2027" },
            ]}
          />
          <Textarea
            label="Alamat"
            className="md:col-span-2"
            defaultValue="Jl. Pendidikan No. 1"
          />
        </CardBody>
      </Card>
    </div>
  );
}
