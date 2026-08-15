import {
  ActivityList,
  CourseProgressCard,
  DashboardHero,
  MetricCard,
} from "@/components/ui";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export default function GuruDashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardHero
        title="Halo, Guru."
        subtitle="Pantau kelas, materi, tugas, dan progress siswa Anda dengan alur yang rapi."
        meta="Dashboard Guru"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Kelas Saya" value="4" tone="blue" />
        <MetricCard label="Materi" value="18" tone="purple" />
        <MetricCard label="Tugas Aktif" value="6" tone="orange" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h3 className="font-semibold text-[var(--foreground)]">Kelas Tugas</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <CourseProgressCard title="X-A Matematika" subtitle="32 siswa - 3 tugas" status="Aktif" progress={72} />
            <CourseProgressCard title="XI-IPA 1" subtitle="28 siswa - 2 tugas" status="Aktif" progress={58} />
          </div>
        </div>
        <Card className="rounded-lg">
          <CardHeader title="Aktivitas Siswa" />
          <CardBody>
            <ActivityList
              items={[
                { title: "Andi mengumpulkan tugas", time: "10 menit lalu", type: "Tugas" },
                { title: "Siti menyelesaikan quiz", time: "1 jam lalu", type: "Quiz" },
              ]}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
