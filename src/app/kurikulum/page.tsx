import { DashboardHero, MetricCard, MiniBarChart } from "@/components/ui";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export default function KurikulumDashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardHero
        title="Halo, Kurikulum."
        subtitle="Atur mata pelajaran, silabus, dan pantau capaian pembelajaran."
        meta="Dashboard Kurikulum"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Mata Pelajaran" value="12" tone="blue" />
        <MetricCard label="Silabus" value="36" tone="purple" />
        <MetricCard label="Cakupan Materi" value="84%" tone="orange" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-lg">
          <CardHeader title="Progress Mapel" description="Capaian silabus per mapel" />
          <CardBody className="space-y-4">
            {[
              { label: "Matematika", value: 78 },
              { label: "Fisika", value: 65 },
              { label: "Bahasa Indonesia", value: 92 },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="text-[var(--muted)]">{item.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[var(--primary)]"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card className="rounded-lg">
          <CardHeader title="Grafik Aktivitas" description="Aktivitas pembelajaran bulan ini" />
          <CardBody>
            <MiniBarChart
              values={[40, 65, 55, 80, 70, 90, 75]}
              labels={["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
