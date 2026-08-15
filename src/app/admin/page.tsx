import {
  ActivityList,
  CourseProgressCard,
  DashboardHero,
  MetricCard,
} from "@/components/ui";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardHero
        title="Halo, Admin."
        subtitle="Kelola pengguna, kelas, dan konfigurasi sistem LMS sekolah dari satu workspace."
        meta="Dashboard Admin"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pengguna" value="248" hint="+12 bulan ini" tone="blue" />
        <MetricCard label="Kelas Aktif" value="18" tone="purple" />
        <MetricCard label="Guru" value="32" tone="orange" />
        <MetricCard label="Siswa" value="216" tone="green" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-lg">
          <CardHeader title="Aktivitas Terbaru" description="Update sistem hari ini" />
          <CardBody>
            <ActivityList
              items={[
                { title: "12 siswa baru diimpor", time: "2 jam lalu", type: "Impor" },
                { title: "Kelas X-A dibuat", time: "5 jam lalu", type: "Kelas" },
                { title: "Akun guru diperbarui", time: "Kemarin", type: "Pengguna" },
              ]}
            />
          </CardBody>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <CourseProgressCard title="X-A" subtitle="Matematika - 32 siswa" status="Aktif" progress={78} />
          <CourseProgressCard title="XI-IPA 1" subtitle="Fisika - 28 siswa" status="Aktif" progress={65} />
        </div>
      </div>
    </div>
  );
}
