import { DashboardHero, MetricCard } from "@/components/ui";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export default function KepsekDashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardHero
        title="Halo, Kepala Sekolah."
        subtitle="Pantau kinerja akademik dan aktivitas sekolah secara menyeluruh."
        meta="Dashboard Kepsek"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Guru Aktif" value="32" tone="blue" />
        <MetricCard label="Siswa Aktif" value="216" tone="purple" />
        <MetricCard label="Kelas" value="18" tone="orange" />
        <MetricCard label="Rata-rata Nilai" value="82" tone="green" />
      </div>
      <Card className="rounded-lg">
        <CardHeader title="Performa Akademik" description="Ringkasan nilai per tingkat" />
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { grade: "Kelas X", score: 80 },
              { grade: "Kelas XI", score: 84 },
              { grade: "Kelas XII", score: 86 },
            ].map((item) => (
              <div
                key={item.grade}
                className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 text-center"
              >
                <p className="text-sm text-[var(--muted)]">{item.grade}</p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--primary)]">
                  {item.score}
                </p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
