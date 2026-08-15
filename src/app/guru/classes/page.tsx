import { CourseProgressCard, Tabs, WorkspaceHeader } from "@/components/ui";

export default function GuruClassesPage() {
  return (
    <div className="space-y-4">
      <WorkspaceHeader
        eyebrow="Guru"
        title="Kelas Tugas"
        description="Daftar kelas yang Anda ampu."
      />
      <Tabs
        value="aktif"
        items={[
          { value: "aktif", label: "Aktif", count: 3 },
          { value: "arsip", label: "Arsip", count: 0 },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CourseProgressCard title="X-A Matematika" subtitle="32 siswa" status="Aktif" progress={72} />
        <CourseProgressCard title="X-B Matematika" subtitle="30 siswa" status="Aktif" progress={65} />
        <CourseProgressCard title="XI-IPA 1" subtitle="28 siswa" status="Aktif" progress={58} />
      </div>
    </div>
  );
}
