import Link from "next/link";
import {
  Download,
  ExternalLink,
  FileText,
  Folder,
  Grid2X2,
  Link2,
  MoreHorizontal,
  Play,
  SlidersHorizontal,
} from "lucide-react";
import { BackButton } from "@/components/student/BackButton";
import { FooterBar } from "@/components/student/StudentDashboardComponents";

const lastAccessed = [
  ["Data Structures - Lecture 04.pdf", "Accessed 2h ago", "pdf"],
  ["Advanced React Patterns.mp4", "Accessed yesterday", "video"],
  ["GitHub Repository: Labs 2024", "Accessed 3d ago", "link"],
  ["Semester Syllabus - Fall.docx", "Accessed Oct 12", "doc"],
];

const recentFiles = [
  ["LOREMIPSUM", "KIK", "2.4 MB", "Oct 14, 2023", "pdf"],
  ["LOREMIPSUM", "BASIS DATA", "45.8 MB", "Oct 12, 2023", "video"],
  ["LOREMIPSUM", "PWPB", "--", "Oct 10, 2023", "link"],
  ["LOREMIPSUM", "MATEMATIKA", "124.2 MB", "Oct 08, 2023", "doc"],
];

export function StudentFiles() {
  return (
    <div className="animate-fade-up px-2">
      <BackButton />
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-[-0.03em]">
            Resources Repository
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Access your learning materials and subject folders.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 rounded-md border border-[#d9deeb] bg-white px-5 py-3 text-sm font-semibold">
            <SlidersHorizontal className="size-4" />
            Filter
          </button>
          <button className="inline-flex items-center gap-2 rounded-md border border-[#d9deeb] bg-white px-5 py-3 text-sm font-semibold">
            <Grid2X2 className="size-4" />
            Layout
          </button>
        </div>
      </div>

      <SectionLabel label="Last Accessed" />
      <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {lastAccessed.map(([name, date, type]) => (
          <Link
            key={name}
            href="#"
            className="rounded-xl border border-[#d9deeb] bg-white p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow)]"
          >
            <FileIcon type={type} />
            <h2 className="mt-7 text-sm font-medium leading-5">{name}</h2>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{date}</p>
          </Link>
        ))}
      </div>

      <SectionLabel label="Subject Folders" className="mt-10" />
      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        {["Advanced Mathematics", "Advanced Mathematics", "Advanced Mathematics"].map((folder, index) => (
          <article key={index} className="overflow-hidden rounded-xl border border-[#d9deeb] bg-white shadow-sm">
            <div className="flex items-start justify-between bg-[#f2f8f6] p-5">
              <span className="grid size-11 place-items-center rounded-md bg-white text-[#00796f]">
                <Folder className="size-6 fill-[#00796f]" />
              </span>
              <span className="rounded bg-[#50e5c0] px-3 py-1 text-[9px] font-extrabold text-[#00796f]">15 FILES</span>
            </div>
            <div className="p-6">
              <h2 className="font-bold">{folder}</h2>
              <p className="mt-2 text-sm leading-5 text-slate-600">Calculus, Linear Algebra, and Statistics.</p>
              <p className="mt-5 text-xs text-slate-500">Bu Refita</p>
              <Link
                href="/siswa/files/shared?subject=advanced-mathematics"
                className="mt-5 inline-flex w-full justify-center rounded-md bg-[#fbf2ff] px-5 py-3 text-sm font-semibold text-[#00796f] transition hover:bg-[#eee9ff]"
              >
                Open Folder
              </Link>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <SectionLabel label="Recent Files" />
        <Link href="/siswa/files/shared" className="text-xs font-extrabold text-[#674ce7]">
          View All Files
        </Link>
      </div>
      <RecentFilesTable />
      <FooterBar />
    </div>
  );
}

export function SharedFilesPage() {
  return (
    <div className="animate-fade-up px-2">
      <BackButton />
      <h1 className="mb-8 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-[-0.03em]">
        File yang dibagi
      </h1>
      <SectionLabel label="Recent Files" />
      <RecentFilesTable extended />
      <FooterBar />
    </div>
  );
}

function SectionLabel({ label, className = "" }: { label: string; className?: string }) {
  return (
    <p className={`flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-[#674ce7] ${className}`}>
      <FileText className="size-4" />
      {label}
    </p>
  );
}

function FileIcon({ type }: { type: string }) {
  const classes = "grid size-9 place-items-center rounded-md";
  if (type === "pdf") return <span className={`${classes} bg-red-50 text-red-600`}><FileText className="size-5" /></span>;
  if (type === "video") return <span className={`${classes} bg-[#d4f8ec] text-[#00796f]`}><Play className="size-5" /></span>;
  if (type === "link") return <span className={`${classes} bg-orange-50 text-orange-600`}><Link2 className="size-5" /></span>;
  return <span className={`${classes} bg-[#eee9ff] text-[#674ce7]`}><FileText className="size-5" /></span>;
}

function RecentFilesTable({ extended = false }: { extended?: boolean }) {
  const rows = extended
    ? [
        ...recentFiles,
        ["LOREMIPSUM", "Lorem Ipsum", "--", "Oct 10, 2023", "link"],
        ["LOREMIPSUM", "Lorem Ipsum", "--", "Oct 10, 2023", "link"],
        ["LOREMIPSUM", "Lorem Ipsum", "--", "Oct 10, 2023", "link"],
        ["LOREMIPSUM", "Lorem Ipsum", "124.2 MB", "Oct 08, 2023", "doc"],
      ]
    : recentFiles;

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-[#d9deeb] bg-white shadow-sm">
      <div className="grid grid-cols-[1.4fr_0.7fr_0.45fr_0.6fr_0.4fr] bg-[#eee8f6] px-6 py-5 text-xs font-extrabold uppercase tracking-wide text-slate-600">
        <span>Name</span>
        <span>{extended ? "File Type" : "Mapel"}</span>
        <span>Size</span>
        <span>Uploaded</span>
        <span className="text-right">Action</span>
      </div>
      {rows.map(([name, subject, size, uploaded, type], index) => (
        <div key={`${name}-${index}`} className="grid min-h-[70px] grid-cols-[1.4fr_0.7fr_0.45fr_0.6fr_0.4fr] items-center border-t border-[#d9deeb] px-6">
          <span className="flex items-center gap-3 text-sm font-medium">
            <FileIcon type={type} />
            {name}
          </span>
          <span className="text-sm text-slate-600">{subject}</span>
          <span className="text-sm text-slate-600">{size}</span>
          <span className="text-sm text-slate-600">{uploaded}</span>
          <span className="flex justify-end gap-4 text-[#674ce7]">
            {type === "video" ? <Play className="size-4" /> : type === "link" ? <ExternalLink className="size-4" /> : <Download className="size-4" />}
            <MoreHorizontal className="size-4 text-slate-700" />
          </span>
        </div>
      ))}
    </section>
  );
}
