import { MiniBarChart, WorkspaceHeader } from "@/components/ui";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export default function KepsekOverviewPage() {
  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow="Kepsek"
        title="Ringkasan Sekolah"
        description="Gambaran umum aktivitas LMS sekolah."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-lg">
          <CardHeader title="Kehadiran Siswa" description="Minggu ini" />
          <CardBody>
            <MiniBarChart values={[85, 92, 88, 95, 90]} labels={["Sen", "Sel", "Rab", "Kam", "Jum"]} />
          </CardBody>
        </Card>
        <Card className="rounded-lg">
          <CardHeader title="Highlight" />
          <CardBody className="space-y-3 text-sm">
            <p>94% siswa aktif minggu ini</p>
            <p>12 tugas baru dikumpulkan hari ini</p>
            <p>3 kelas dengan progress di atas 80%</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
