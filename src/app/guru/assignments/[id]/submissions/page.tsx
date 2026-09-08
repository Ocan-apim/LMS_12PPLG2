"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ExternalLink,
  Send,
  MessageSquare,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Download,
  Lock,
  GraduationCap,
  Paperclip,
  Check,
} from "lucide-react";
import { Button, Badge } from "@/components/ui";

interface StudentItem {
  _id: string;
  name: string;
  email: string;
  nisn?: string;
}

interface PrivateComment {
  _id?: string;
  senderName: string;
  senderRole: string;
  message: string;
  createdAt: string;
}

interface SubmissionAttachment {
  name: string;
  url: string;
  type: string;
  size?: string;
}

interface SubmissionData {
  submissionId: string | null;
  student: StudentItem;
  hasSubmitted: boolean;
  status: "turned_in" | "late" | "graded" | "assigned";
  score: number | null;
  draftScore: number | null;
  feedback: string;
  privateComments: PrivateComment[];
  attachments: SubmissionAttachment[];
  content?: string;
  submittedAt: string | null;
  gradedAt: string | null;
}

interface AssignmentInfo {
  _id: string;
  title: string;
  instructions?: string;
  maxScore: number;
  dueDate?: string;
  className: string;
}

export default function GoogleClassroomSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [assignment, setAssignment] = useState<AssignmentInfo | null>(null);
  const [items, setItems] = useState<SubmissionData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Selected student
  const [filterTab, setFilterTab] = useState<"all" | "turned_in" | "graded" | "assigned">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Right Panel Grading State
  const [currentScore, setCurrentScore] = useState<string>("");
  const [currentFeedback, setCurrentFeedback] = useState<string>("");
  const [privateCommentInput, setPrivateCommentInput] = useState<string>("");
  const [savingGrade, setSavingGrade] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/guru/assignments/${id}/submissions`);
        const json = await res.json();
        if (json.success) {
          setAssignment(json.data.assignment);
          setItems(json.data.items);
          if (json.data.items.length > 0) {
            setSelectedStudentId(json.data.items[0].student._id);
          }
        }
      } catch (err) {
        console.error("Gagal memuat data submisi:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  // When selected student changes, populate right-panel grading form
  const selectedItem = items.find((i) => i.student._id === selectedStudentId);

  useEffect(() => {
    if (selectedItem) {
      if (selectedItem.score !== null && selectedItem.score !== undefined) {
        setCurrentScore(String(selectedItem.score));
      } else if (selectedItem.draftScore !== null && selectedItem.draftScore !== undefined) {
        setCurrentScore(String(selectedItem.draftScore));
      } else {
        setCurrentScore("");
      }
      setCurrentFeedback(selectedItem.feedback || "");
      setPrivateCommentInput("");
    }
  }, [selectedStudentId, selectedItem]);

  // Counts
  const totalCount = items.length;
  const turnedInCount = items.filter(
    (i) => i.status === "turned_in" || i.status === "late"
  ).length;
  const gradedCount = items.filter((i) => i.status === "graded").length;
  const assignedCount = items.filter((i) => i.status === "assigned").length;

  // Filtered student roster
  const filteredItems = items.filter((item) => {
    const matchSearch =
      item.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.student.nisn && item.student.nisn.includes(searchQuery));

    if (!matchSearch) return false;

    if (filterTab === "turned_in") {
      return item.status === "turned_in" || item.status === "late";
    }
    if (filterTab === "graded") {
      return item.status === "graded";
    }
    if (filterTab === "assigned") {
      return item.status === "assigned";
    }
    return true;
  });

  // Navigate students
  const currentIndex = filteredItems.findIndex(
    (i) => i.student._id === selectedStudentId
  );
  function handlePrevStudent() {
    if (currentIndex > 0) {
      setSelectedStudentId(filteredItems[currentIndex - 1].student._id);
    }
  }
  function handleNextStudent() {
    if (currentIndex < filteredItems.length - 1) {
      setSelectedStudentId(filteredItems[currentIndex + 1].student._id);
    }
  }

  // Submit Grade (Kembalikan Nilai)
  async function handleSaveGrade(asDraft = false) {
    if (!selectedItem || !assignment) return;
    setSavingGrade(true);
    setSaveNotification(null);

    const subId = selectedItem.submissionId || "new";
    const numericScore = currentScore === "" ? undefined : Number(currentScore);

    try {
      const payload: Record<string, unknown> = {
        assignmentId: assignment._id,
        studentId: selectedItem.student._id,
        feedback: currentFeedback,
      };

      if (asDraft) {
        payload.draftScore = numericScore;
      } else {
        payload.score = numericScore;
        payload.status = "graded";
      }

      const res = await fetch(`/api/guru/submissions/${subId}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setSaveNotification(
          asDraft ? "Draft nilai berhasil disimpan" : "Nilai berhasil dikembalikan ke siswa!"
        );
        // Update local state
        setItems((prev) =>
          prev.map((i) => {
            if (i.student._id === selectedItem.student._id) {
              return {
                ...i,
                submissionId: json.data._id,
                status: asDraft ? i.status : "graded",
                score: asDraft ? i.score : (numericScore ?? null),
                draftScore: asDraft ? (numericScore ?? null) : null,
                feedback: currentFeedback,
              };
            }
            return i;
          })
        );
        setTimeout(() => setSaveNotification(null), 3000);
      } else {
        alert(json.message || "Gagal menyimpan nilai");
      }
    } catch {
      alert("Terjadi kesalahan sistem saat menyimpan nilai");
    } finally {
      setSavingGrade(false);
    }
  }

  // Send Private Comment
  async function handleSendPrivateComment(e: React.FormEvent) {
    e.preventDefault();
    if (!privateCommentInput.trim() || !selectedItem || !assignment) return;

    setSendingComment(true);
    const subId = selectedItem.submissionId || "new";

    try {
      const res = await fetch(`/api/guru/submissions/${subId}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: assignment._id,
          studentId: selectedItem.student._id,
          privateComment: privateCommentInput.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        const newComments = json.data.privateComments || [];
        setItems((prev) =>
          prev.map((i) => {
            if (i.student._id === selectedItem.student._id) {
              return {
                ...i,
                submissionId: json.data._id,
                privateComments: newComments,
              };
            }
            return i;
          })
        );
        setPrivateCommentInput("");
      }
    } catch {
      alert("Gagal mengirim komentar pribadi");
    } finally {
      setSendingComment(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-16 rounded-2xl bg-card/60" />
        <div className="grid grid-cols-12 gap-4 h-[750px]">
          <div className="col-span-3 rounded-2xl bg-card/60" />
          <div className="col-span-6 rounded-2xl bg-card/60" />
          <div className="col-span-3 rounded-2xl bg-card/60" />
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <h2 className="text-xl font-bold">Data tidak ditemukan</h2>
        <Link href="/guru/assignments" className="mt-4 inline-block">
          <Button variant="outline">Kembali ke Daftar Tugas</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] space-y-3">
      {/* Google Classroom Top Bar matching Image 4 */}
      <div className="flex shrink-0 items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href={`/guru/assignments/${id}`}
            className="flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Kembali ke Detail Tugas"
          >
            <ArrowLeft className="size-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm text-foreground sm:text-base line-clamp-1">
                {assignment.title}
              </h1>
              <span className="hidden sm:inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                {assignment.className}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Maksimal {assignment.maxScore} Poin • Batas:{" "}
              {assignment.dueDate
                ? new Date(assignment.dueDate).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Tanpa batas"}
            </p>
          </div>
        </div>

        {/* Status Counters & Prev/Next Student Navigation */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs">
            <span className="rounded-lg bg-muted px-2.5 py-1 font-semibold text-foreground">
              {turnedInCount} Diserahkan
            </span>
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {gradedCount} Dinilai
            </span>
            <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              {assignedCount} Belum
            </span>
          </div>

          <div className="flex items-center gap-1 border-l border-border pl-3">
            <button
              onClick={handlePrevStudent}
              disabled={currentIndex <= 0}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
              title="Siswa Sebelumnya"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-xs font-mono text-muted-foreground">
              {currentIndex + 1}/{filteredItems.length}
            </span>
            <button
              onClick={handleNextStudent}
              disabled={currentIndex >= filteredItems.length - 1}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
              title="Siswa Berikutnya"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3-Panel Google Classroom Layout */}
      <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
        {/* PANEL 1: Left Roster List (3 Cols) */}
        <div className="col-span-12 lg:col-span-3 flex flex-col rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
          {/* Filter Tabs matching Google Classroom */}
          <div className="p-3 border-b border-border space-y-2 shrink-0">
            <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-semibold pb-1">
              <button
                onClick={() => setFilterTab("all")}
                className={`rounded-lg px-2.5 py-1 transition-colors ${
                  filterTab === "all"
                    ? "bg-blue-600 text-white"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Semua ({totalCount})
              </button>
              <button
                onClick={() => setFilterTab("turned_in")}
                className={`rounded-lg px-2.5 py-1 transition-colors ${
                  filterTab === "turned_in"
                    ? "bg-blue-600 text-white"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Diserahkan ({turnedInCount})
              </button>
              <button
                onClick={() => setFilterTab("graded")}
                className={`rounded-lg px-2.5 py-1 transition-colors ${
                  filterTab === "graded"
                    ? "bg-blue-600 text-white"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Dinilai ({gradedCount})
              </button>
              <button
                onClick={() => setFilterTab("assigned")}
                className={`rounded-lg px-2.5 py-1 transition-colors ${
                  filterTab === "assigned"
                    ? "bg-blue-600 text-white"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Belum ({assignedCount})
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari siswa atau NISN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Student Roster List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {filteredItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Tidak ada siswa dalam kategori ini.
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = item.student._id === selectedStudentId;
                const isGraded = item.status === "graded";
                const isLate = item.status === "late";
                const isTurnedIn = item.status === "turned_in";

                return (
                  <div
                    key={item.student._id}
                    onClick={() => setSelectedStudentId(item.student._id)}
                    className={`flex items-center justify-between p-3 text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-blue-600"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div
                        className={`flex size-8 shrink-0 items-center justify-center rounded-full font-bold text-xs ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        }`}
                      >
                        {item.student.name.charAt(0)}
                      </div>
                      <div className="truncate">
                        <p
                          className={`font-semibold truncate ${
                            isSelected ? "text-blue-700 dark:text-blue-300" : "text-foreground"
                          }`}
                        >
                          {item.student.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          NISN: {item.student.nisn || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      {isGraded ? (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {item.score}/{assignment.maxScore}
                        </span>
                      ) : isLate ? (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Terlambat
                        </span>
                      ) : isTurnedIn ? (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          Diserahkan
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">
                          Belum
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL 2: Center Submission Viewer (6 Cols) */}
        <div className="col-span-12 lg:col-span-6 flex flex-col rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
          {selectedItem ? (
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Student Header Info */}
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-base">
                    {selectedItem.student.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">
                      {selectedItem.student.name}
                    </h2>
                    <p className="text-xs text-muted-foreground font-mono">
                      NISN: {selectedItem.student.nisn || "-"} • {selectedItem.student.email}
                    </p>
                  </div>
                </div>

                <div>
                  {selectedItem.status === "graded" ? (
                    <Badge variant="green" className="font-bold">
                      Sudah Dinilai
                    </Badge>
                  ) : selectedItem.status === "late" ? (
                    <Badge variant="orange" className="font-bold">
                      Diserahkan Terlambat
                    </Badge>
                  ) : selectedItem.status === "turned_in" ? (
                    <Badge variant="blue" className="font-bold">
                      Diserahkan
                    </Badge>
                  ) : (
                    <Badge variant="gray" className="font-bold">
                      Belum Mengumpulkan
                    </Badge>
                  )}
                </div>
              </div>

              {/* Submission Timestamp */}
              {selectedItem.submittedAt && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="size-3.5" />
                  <span>
                    Dikirim pada{" "}
                    {new Date(selectedItem.submittedAt).toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}

              {/* Student Work: Not Submitted State */}
              {!selectedItem.hasSubmitted && (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 p-12 text-center space-y-2">
                  <Clock className="size-10 text-muted-foreground/60" />
                  <h3 className="font-semibold text-sm text-foreground">
                    Siswa Belum Menyerahkan Tugas
                  </h3>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    Siswa ini belum mengunggah dokumen atau menyelesaikan penugasan ini. Anda tetap dapat memberikan nilai atau komentar pribadi di panel kanan.
                  </p>
                </div>
              )}

              {/* Student Work: Attachments list */}
              {selectedItem.hasSubmitted && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Dokumen & Lampiran Tugas Siswa
                  </h3>

                  {selectedItem.attachments && selectedItem.attachments.length > 0 ? (
                    <div className="space-y-2">
                      {selectedItem.attachments.map((att, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3 text-xs transition-colors hover:bg-muted/40"
                        >
                          <div className="flex items-center gap-3 truncate">
                            <FileText className="size-5 text-blue-600 shrink-0" />
                            <div className="truncate">
                              <p className="font-semibold text-foreground truncate">
                                {att.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {att.size || "Berkas Siswa"}
                              </p>
                            </div>
                          </div>

                          <a
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60 transition-colors"
                          >
                            <span>Buka Lampiran</span>
                            <ExternalLink className="size-3" />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Tidak ada berkas file yang dilampirkan siswa.
                    </p>
                  )}

                  {/* Student Text Answer / Notes */}
                  {selectedItem.content && (
                    <div className="space-y-2 pt-3 border-t border-border">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Catatan / Jawaban Teks Siswa
                      </h4>
                      <div className="rounded-xl border border-border bg-background p-4 text-xs text-foreground whitespace-pre-line leading-relaxed">
                        {selectedItem.content}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground text-xs">
              Pilih siswa dari daftar sebelah kiri untuk melihat hasil pengerjaan tugasnya.
            </div>
          )}
        </div>

        {/* PANEL 3: Right Grading Panel (3 Cols) */}
        <div className="col-span-12 lg:col-span-3 flex flex-col rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
          {selectedItem ? (
            <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-5">
              {/* Grading Box */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Penilaian Nilai
                  </h3>
                  {selectedItem.status === "graded" && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      Telah Dinilai
                    </span>
                  )}
                </div>

                {/* Score Input Card matching Google Classroom */}
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3">
                  <span className="text-xs font-semibold text-foreground">Nilai:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max={assignment.maxScore}
                      value={currentScore}
                      onChange={(e) => setCurrentScore(e.target.value)}
                      placeholder="0"
                      className="w-16 rounded-lg border border-border bg-background p-1.5 text-center font-bold text-sm text-foreground focus:border-blue-500 focus:outline-none"
                    />
                    <span className="text-xs font-bold text-muted-foreground">
                      / {assignment.maxScore}
                    </span>
                  </div>
                </div>

                {/* Feedback textarea */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-muted-foreground">
                    Catatan Koreksi / Feedback Guru
                  </label>
                  <textarea
                    rows={3}
                    value={currentFeedback}
                    onChange={(e) => setCurrentFeedback(e.target.value)}
                    placeholder="Tuliskan apresiasi atau saran perbaikan untuk siswa ini..."
                    className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Save Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={savingGrade}
                    onClick={() => handleSaveGrade(true)}
                    className="flex-1 text-xs"
                  >
                    Draft
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={savingGrade}
                    onClick={() => handleSaveGrade(false)}
                    className="flex-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
                  >
                    {savingGrade ? "Menyimpan..." : "Kembalikan Nilai"}
                  </Button>
                </div>

                {saveNotification && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 animate-in fade-in">
                    <Check className="size-3.5 shrink-0" />
                    <span>{saveNotification}</span>
                  </div>
                )}
              </div>

              {/* Private Comments Section matching Google Classroom */}
              <div className="flex-1 flex flex-col pt-3 border-t border-border space-y-3">
                <div className="flex items-center gap-1.5">
                  <Lock className="size-3 text-muted-foreground" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Komentar Pribadi
                  </h3>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Hanya Anda dan {selectedItem.student.name} yang dapat melihat komentar ini.
                </p>

                {/* Comments Stream */}
                <div className="flex-1 overflow-y-auto space-y-2 max-h-48 pr-1">
                  {selectedItem.privateComments && selectedItem.privateComments.length > 0 ? (
                    selectedItem.privateComments.map((pc, idx) => (
                      <div
                        key={idx}
                        className={`rounded-xl p-2.5 text-xs space-y-1 ${
                          pc.senderRole === "guru"
                            ? "bg-blue-50 text-blue-950 dark:bg-blue-950/40 dark:text-blue-200"
                            : "bg-muted/60 text-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-semibold">
                          <span>{pc.senderName}</span>
                          <span className="text-muted-foreground">
                            {new Date(pc.createdAt).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed">{pc.message}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic py-2 text-center">
                      Belum ada pesan pribadi.
                    </p>
                  )}
                </div>

                {/* Send Private Comment Form */}
                <form onSubmit={handleSendPrivateComment} className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={privateCommentInput}
                    onChange={(e) => setPrivateCommentInput(e.target.value)}
                    placeholder="Tambahkan komentar pribadi..."
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={sendingComment || !privateCommentInput.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2"
                  >
                    <Send className="size-3.5" />
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-4 text-center text-xs text-muted-foreground">
              Pilih siswa untuk menilai
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
