"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Download,
  ExternalLink,
  FileText,
  Folder,
  Grid2X2,
  SlidersHorizontal,
  Loader2,
  RefreshCw,
  FolderOpen,
  BookOpen,
  AlertCircle,
} from "lucide-react";
import { BackButton } from "@/components/student/BackButton";
import { FooterBar } from "@/components/student/StudentDashboardComponents";

interface LastAccessedFile {
  name: string;
  url: string;
  downloadUrl: string;
  date: string;
  type: string;
  className: string;
}

interface SubjectFolder {
  _id: string;
  name: string;
  className: string;
  teacher: string;
  description: string;
  fileCount: number;
  folderUrl: string;
}

interface RecentFile {
  name: string;
  subject: string;
  size: string;
  date: string;
  type: string;
  url: string;
  downloadUrl: string;
}

interface FilesData {
  lastAccessed: LastAccessedFile[];
  subjectFolders: SubjectFolder[];
  recentFiles: RecentFile[];
}

export function StudentFiles() {
  const [data, setData] = useState<FilesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/siswa/files");
      if (!res.ok) {
        throw new Error("Gagal mengambil data repositori file.");
      }
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        throw new Error(json.message || "Data file tidak valid.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat berkas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <div className="animate-fade-up px-2 pb-12">
      <BackButton />
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-[-0.03em] text-slate-900">
            Repositori Berkas & Materi
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Akses materi pembelajaran, modul ajar, dan berkas yang dibagikan oleh guru.
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex min-h-[350px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-8">
          <Loader2 className="size-8 animate-spin text-[#674ce7]" />
          <p className="text-sm font-semibold text-slate-600">Memuat berkas materi...</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center">
          <AlertCircle className="size-8 text-red-500" />
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button
            onClick={fetchFiles}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#674ce7] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#563cd6]"
          >
            <RefreshCw className="size-3.5" />
            Coba Lagi
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-10">
          {/* 1. Last Accessed / Highlighted Files */}
          <div>
            <SectionLabel label="Berkas Baru Ditambahkan" />
            {data.lastAccessed.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400 italic">
                Belum ada berkas yang baru diakses atau diunggah.
              </div>
            ) : (
              <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {data.lastAccessed.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col justify-between rounded-2xl border border-[#d9deeb] bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="grid size-10 place-items-center rounded-xl bg-[#eee9ff] text-[#674ce7]">
                          <FileText className="size-5" />
                        </span>
                        <a
                          href={file.downloadUrl}
                          className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#674ce7]"
                          title="Unduh Berkas"
                        >
                          <Download className="size-4" />
                        </a>
                      </div>
                      <h3 className="mt-5 text-sm font-bold text-slate-900 line-clamp-2">
                        {file.name}
                      </h3>
                      <p className="mt-1 text-[11px] font-semibold text-slate-400">
                        {file.className}
                      </p>
                    </div>
                    <p className="mt-4 text-[10px] font-extrabold uppercase tracking-wide text-[#674ce7]">
                      {file.date}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Subject Folders */}
          <div>
            <SectionLabel label="Folder Mata Pelajaran" />
            {data.subjectFolders.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400 italic">
                Belum ada folder kelas mata pelajaran.
              </div>
            ) : (
              <div className="mt-4 grid gap-6 lg:grid-cols-3">
                {data.subjectFolders.map((folder) => (
                  <article
                    key={folder._id}
                    className="overflow-hidden rounded-2xl border border-[#d9deeb] bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition"
                  >
                    <div>
                      <div className="flex items-start justify-between bg-[#f2f8f6] p-5">
                        <span className="grid size-11 place-items-center rounded-xl bg-white text-[#00796f] shadow-xs">
                          <Folder className="size-6 fill-[#00796f]" />
                        </span>
                        <span className="rounded-full bg-[#50e5c0] px-3 py-1 text-[10px] font-extrabold text-[#00796f] uppercase">
                          {folder.fileCount} Berkas
                        </span>
                      </div>
                      <div className="p-6">
                        <h2 className="text-base font-extrabold text-slate-900">
                          {folder.name}
                        </h2>
                        <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">
                          {folder.description}
                        </p>
                        <p className="mt-4 text-xs font-semibold text-slate-400">
                          Guru: <strong className="text-slate-700">{folder.teacher}</strong>
                        </p>
                      </div>
                    </div>
                    <div className="px-6 pb-6">
                      <Link
                        href={folder.folderUrl}
                        className="inline-flex w-full justify-center rounded-xl bg-[#fbf2ff] px-5 py-2.5 text-xs font-bold text-[#674ce7] transition hover:bg-[#eee9ff]"
                      >
                        Buka Kelas & Berkas
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* 3. Recent Files Table */}
          <div>
            <SectionLabel label="Semua Berkas Terkini" />
            <div className="mt-4 overflow-hidden rounded-2xl border border-[#d9deeb] bg-white shadow-sm">
              <div className="grid grid-cols-[1.5fr_0.8fr_0.5fr_0.7fr_0.4fr] border-b border-[#e5e7ef] bg-[#fbf8ff] px-6 py-4 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                <span>Nama Berkas</span>
                <span>Mata Pelajaran</span>
                <span>Ukuran</span>
                <span>Tanggal Unggah</span>
                <span className="text-right">Aksi</span>
              </div>

              {data.recentFiles.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 italic">
                  Belum ada berkas yang dibagikan di kelas Anda.
                </div>
              ) : (
                data.recentFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-[1.5fr_0.8fr_0.5fr_0.7fr_0.4fr] items-center border-b border-[#e5e7ef] px-6 py-4 last:border-0 hover:bg-slate-50/50 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="size-4 shrink-0 text-[#674ce7]" />
                      <span className="truncate font-semibold text-slate-900">
                        {file.name}
                      </span>
                    </div>

                    <span className="text-slate-600 truncate">{file.subject}</span>
                    <span className="text-slate-500 font-mono">{file.size}</span>
                    <span className="text-slate-500">{file.date}</span>

                    <div className="text-right">
                      <a
                        href={file.downloadUrl}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-[#674ce7] hover:text-[#674ce7] transition"
                      >
                        <Download className="size-3.5" />
                        Unduh
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <FooterBar />
    </div>
  );
}

function SectionLabel({ label, className = "" }: { label: string; className?: string }) {
  return (
    <h2 className={`font-[family-name:var(--font-display)] text-lg font-extrabold text-slate-900 ${className}`}>
      {label}
    </h2>
  );
}

export function SharedFilesPage() {
  return <StudentFiles />;
}
