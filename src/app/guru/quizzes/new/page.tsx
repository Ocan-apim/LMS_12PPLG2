"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Clock,
  Award,
  BookOpen,
  Plus,
  Trash2,
  Check,
  MoreVertical,
  Image as ImageIcon,
  Bold,
  Italic,
  Underline,
  Sigma,
  ChevronDown,
  Download,
  Upload,
  FileText,
  CheckCircle2,
  X,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { validateFields } from "@/lib/profanity-filter";

interface QuizOption {
  key: string; // "A", "B", "C", "D"
  badgeColor: string;
  text: string;
}

interface QuestionItem {
  id: string;
  type: "pilihan_ganda" | "essay";
  prompt: string;
  options: QuizOption[];
  correctAnswer: string;
  points: number;
  durationSeconds: number;
  imageUrl?: string;
}

interface TeacherClass {
  _id: string;
  name: string;
}

function QuizBuilderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialClassId = searchParams.get("classId") || "";

  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState(initialClassId);
  const [quizTitle, setQuizTitle] = useState("");
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Dropdown states for top bar
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);
  const [pointsDropdownOpen, setPointsDropdownOpen] = useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);

  // Questions initial list matching Screenshot 4 & 5
  const [questions, setQuestions] = useState<QuestionItem[]>([
    {
      id: "q-1",
      type: "pilihan_ganda",
      prompt: "Berapakah hasil dari 5 + 7 = ?",
      options: [
        { key: "A", badgeColor: "bg-red-500", text: "" },
        { key: "B", badgeColor: "bg-blue-600", text: "" },
        { key: "C", badgeColor: "bg-amber-500", text: "19" },
        { key: "D", badgeColor: "bg-green-600", text: "" },
      ],
      correctAnswer: "C",
      points: 10,
      durationSeconds: 60,
    },
    {
      id: "q-2",
      type: "pilihan_ganda",
      prompt: "Siapakah penemu bola lampu?",
      options: [
        { key: "A", badgeColor: "bg-red-500", text: "Thomas Alva Edison" },
        { key: "B", badgeColor: "bg-blue-600", text: "Nikola Tesla" },
        { key: "C", badgeColor: "bg-amber-500", text: "Alexander Graham Bell" },
        { key: "D", badgeColor: "bg-green-600", text: "Albert Einstein" },
      ],
      correctAnswer: "A",
      points: 10,
      durationSeconds: 60,
    },
    {
      id: "q-3",
      type: "essay",
      prompt: "Soal kosong...",
      options: [],
      correctAnswer: "",
      points: 10,
      durationSeconds: 60,
    },
  ]);

  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [showFormatGuide, setShowFormatGuide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setError("");
    setImportSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/guru/quizzes/import-word", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Gagal mengimpor file Word");
        return;
      }

      if (Array.isArray(json.data?.questions) && json.data.questions.length > 0) {
        setQuestions(json.data.questions);
        setActiveQuestionIndex(0);

        if (!quizTitle.trim()) {
          const rawName = file.name.replace(/\.[^/.]+$/, "");
          setQuizTitle(`Kuis CBT: ${rawName}`);
        }

        setImportSuccessMessage(
          `Berhasil mengimpor ${json.data.totalQuestions} soal (${json.data.totalPoints} total poin).`
        );
      }
    } catch (err: unknown) {
      console.error("Gagal import:", err);
      setError("Terjadi kesalahan saat memproses file");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  useEffect(() => {
    async function loadClasses() {
      try {
        const res = await fetch("/api/guru/classes");
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setClasses(json.data);
          if (!selectedClassId && json.data.length > 0) {
            setSelectedClassId(json.data[0]._id);
          }
        }
      } catch (err) {
        console.error("Gagal memuat kelas:", err);
      }
    }
    loadClasses();
  }, [selectedClassId]);

  const activeQuestion = questions[activeQuestionIndex] || questions[0];

  function handleAddQuestion() {
    const nextNum = questions.length + 1;
    const newQ: QuestionItem = {
      id: `q-${Date.now()}`,
      type: "pilihan_ganda",
      prompt: `Soal ${nextNum}...`,
      options: [
        { key: "A", badgeColor: "bg-red-500", text: "" },
        { key: "B", badgeColor: "bg-blue-600", text: "" },
        { key: "C", badgeColor: "bg-amber-500", text: "" },
        { key: "D", badgeColor: "bg-green-600", text: "" },
      ],
      correctAnswer: "A",
      points: 10,
      durationSeconds: 60,
    };
    setQuestions([...questions, newQ]);
    setActiveQuestionIndex(questions.length);
  }

  function handleDeleteQuestion(idx: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (questions.length <= 1) {
      alert("Kuis minimal harus memiliki 1 soal!");
      return;
    }
    const updated = questions.filter((_, i) => i !== idx);
    setQuestions(updated);
    if (activeQuestionIndex >= updated.length) {
      setActiveQuestionIndex(updated.length - 1);
    }
  }

  function updateActiveQuestion(fields: Partial<QuestionItem>) {
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === activeQuestionIndex ? { ...q, ...fields } : q
      )
    );
  }

  function handleOptionTextChange(optKey: string, newText: string) {
    const updatedOptions = activeQuestion.options.map((opt) =>
      opt.key === optKey ? { ...opt, text: newText } : opt
    );
    updateActiveQuestion({ options: updatedOptions });
  }

  function handleSetCorrectAnswer(optKey: string) {
    updateActiveQuestion({ correctAnswer: optKey });
  }

  function handleAddOption() {
    const badgeColors = [
      "bg-red-500",
      "bg-blue-600",
      "bg-amber-500",
      "bg-green-600",
      "bg-purple-600",
      "bg-pink-600",
    ];
    const keys = ["A", "B", "C", "D", "E", "F"];
    const currentCount = activeQuestion.options.length;
    if (currentCount >= 6) return;
    const nextKey = keys[currentCount];
    const nextColor = badgeColors[currentCount % badgeColors.length];

    const newOptions: QuizOption[] = [
      ...activeQuestion.options,
      { key: nextKey, badgeColor: nextColor, text: "" },
    ];
    updateActiveQuestion({ options: newOptions });
  }

  function handleDeleteOption(optKey: string) {
    if (activeQuestion.options.length <= 2) {
      alert("Pilihan ganda minimal harus memiliki 2 opsi.");
      return;
    }
    const badgeColors = [
      "bg-red-500",
      "bg-blue-600",
      "bg-amber-500",
      "bg-green-600",
      "bg-purple-600",
      "bg-pink-600",
    ];
    const keys = ["A", "B", "C", "D", "E", "F"];
    const filtered = activeQuestion.options.filter((o) => o.key !== optKey);
    const rekeyed: QuizOption[] = filtered.map((o, i) => ({
      key: keys[i],
      badgeColor: badgeColors[i],
      text: o.text,
    }));
    const newCorrect = rekeyed.some((o) => o.key === activeQuestion.correctAnswer)
      ? activeQuestion.correctAnswer
      : rekeyed[0].key;
    updateActiveQuestion({ options: rekeyed, correctAnswer: newCorrect });
  }

  async function handlePublishQuiz() {
    setError("");
    const title = quizTitle.trim() || "Ulangan Harian / Kuis";

    if (!selectedClassId) {
      setError("Pilih kelas tujuan terlebih dahulu");
      return;
    }

    if (questions.length === 0) {
      setError("Kuis harus memiliki minimal 1 soal");
      return;
    }

    setPublishing(true);
    try {
      const totalPoints = questions.reduce((acc, q) => acc + (q.points || 10), 0);
      const letterMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 };

      const formattedQuestions = questions.map((q, idx) => {
        const correctIdx = letterMap[q.correctAnswer] ?? (typeof q.correctAnswer === "number" ? q.correctAnswer : 0);
        return {
          id: q.id || `q-${idx + 1}-${Date.now()}`,
          question: (q.prompt || `Pertanyaan ${idx + 1}`).trim(),
          type: q.type || "pilihan_ganda",
          options:
            q.type === "pilihan_ganda"
              ? q.options.map((o) => (o.text || "").trim())
              : [],
          correctAnswer:
            q.type === "pilihan_ganda" ? correctIdx : "",
          points: Number(q.points) || 10,
        };
      });

      const clientValidation = validateFields({
        judul: title,
        soal: formattedQuestions.map((q, i) => ({
          nomor: i + 1,
          pertanyaan: q.question,
          pilihan: q.options,
        })),
      });
      if (!clientValidation.isValid) {
        setError(
          clientValidation.message ||
            "Konten kuis mengandung kata atau ungkapan yang tidak diperbolehkan. Silakan periksa kembali tulisan Anda."
        );
        return;
      }

      const res = await fetch("/api/guru/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          courseClassId: selectedClassId,
          durationSeconds: activeQuestion.durationSeconds || 60,
          totalPoints,
          questions: formattedQuestions,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.message || "Gagal mempublikasikan kuis");
      } else {
        router.push(`/guru/classes/${selectedClassId}`);
      }
    } catch {
      setError("Terjadi kesalahan sistem");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Format Soal CBT Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/60 border border-blue-200/70 rounded-2xl shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5 sm:mt-0">
            <FileText className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-800">
                Format Soal CBT (Microsoft Word)
              </h3>
              <button
                type="button"
                onClick={() => setShowFormatGuide(true)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 underline transition"
              >
                <HelpCircle className="size-3" />
                <span>Petunjuk Format</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
              Unduh template Word, ubah soal &amp; kunci jawaban, lalu upload kembali untuk membuat kuis secara otomatis tanpa input satu per satu.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <a
            href="/api/guru/quizzes/template"
            download="Template_Soal_CBT.docx"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <Download className="size-3.5 text-blue-600" />
            <span>Download Format (.docx)</span>
          </a>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-xs transition disabled:opacity-60 cursor-pointer"
          >
            {isImporting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Mengimpor...</span>
              </>
            ) : (
              <>
                <Upload className="size-3.5" />
                <span>Upload Word (.docx)</span>
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.doc,.txt"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {importSuccessMessage && (
        <div className="flex items-center justify-between gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            <span>{importSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setImportSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 p-1"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Top Header Row matching Screenshots 4 & 5 */}
      <div className="space-y-3">
        {/* Judul Kuis Input matching Screenshot 4 & 5 */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Judul Kuis
          </label>
          <input
            type="text"
            placeholder="Masukkan judul kuis di sini..."
            value={quizTitle}
            onChange={(e) => setQuizTitle(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition shadow-xs"
          />
        </div>

        {/* Toolbar row with Timer, Points, Type Dropdown, and Publikasi Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Timer Dropdown matching Screenshot 4 & 5 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setTimeDropdownOpen(!timeDropdownOpen);
                  setPointsDropdownOpen(false);
                  setTypeDropdownOpen(false);
                }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
              >
                <Clock className="size-3.5 text-slate-400" />
                <span>{activeQuestion.durationSeconds || 60} Detik</span>
                <ChevronDown className="size-3 text-slate-400" />
              </button>

              {timeDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 w-32 rounded-xl border border-slate-200 bg-white p-1 shadow-lg z-30 text-xs">
                  {[30, 60, 90, 120, 180].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => {
                        updateActiveQuestion({ durationSeconds: sec });
                        setTimeDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-50 ${
                        activeQuestion.durationSeconds === sec
                          ? "font-bold text-blue-600 bg-blue-50/50"
                          : "text-slate-700"
                      }`}
                    >
                      {sec} Detik
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Points Dropdown matching Screenshot 4 & 5 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setPointsDropdownOpen(!pointsDropdownOpen);
                  setTimeDropdownOpen(false);
                  setTypeDropdownOpen(false);
                }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
              >
                <Award className="size-3.5 text-slate-400" />
                <span>{activeQuestion.points || 10} Poin</span>
                <ChevronDown className="size-3 text-slate-400" />
              </button>

              {pointsDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 w-28 rounded-xl border border-slate-200 bg-white p-1 shadow-lg z-30 text-xs">
                  {[5, 10, 15, 20, 25, 50, 100].map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => {
                        updateActiveQuestion({ points: pt });
                        setPointsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-50 ${
                        activeQuestion.points === pt
                          ? "font-bold text-blue-600 bg-blue-50/50"
                          : "text-slate-700"
                      }`}
                    >
                      {pt} Poin
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Question Type Dropdown matching Screenshot 4 & 5 ("Pilihan Ganda" vs "Essay") */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setTypeDropdownOpen(!typeDropdownOpen);
                  setTimeDropdownOpen(false);
                  setPointsDropdownOpen(false);
                }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
              >
                <BookOpen className="size-3.5 text-slate-400" />
                <span>
                  {activeQuestion.type === "pilihan_ganda"
                    ? "Pilihan Ganda"
                    : "Essay"}
                </span>
                <ChevronDown className="size-3 text-slate-400" />
              </button>

              {typeDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg z-30 text-xs space-y-0.5 animate-in fade-in slide-in-from-top-1">
                  <button
                    type="button"
                    onClick={() => {
                      updateActiveQuestion({
                        type: "pilihan_ganda",
                        options:
                          activeQuestion.options.length > 0
                            ? activeQuestion.options
                            : [
                                { key: "A", badgeColor: "bg-red-500", text: "" },
                                { key: "B", badgeColor: "bg-blue-600", text: "" },
                                { key: "C", badgeColor: "bg-amber-500", text: "" },
                                { key: "D", badgeColor: "bg-green-600", text: "" },
                              ],
                      });
                      setTypeDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 ${
                      activeQuestion.type === "pilihan_ganda"
                        ? "font-bold text-blue-600 bg-blue-50/50"
                        : "text-slate-700"
                    }`}
                  >
                    <span>Jawaban Ganda</span>
                    <ChevronDown className="size-3 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updateActiveQuestion({ type: "essay" });
                      setTypeDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 ${
                      activeQuestion.type === "essay"
                        ? "font-bold text-blue-600 bg-blue-50/50"
                        : "text-slate-700"
                    }`}
                  >
                    <span>Essay</span>
                    <ChevronDown className="size-3 text-slate-400" />
                  </button>
                </div>
              )}
            </div>

            {/* Target Class Selector */}
            {classes.length > 1 && (
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none"
              >
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    Kelas: {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Publikasi Button matching Screenshot 4 & 5 */}
          <button
            type="button"
            onClick={handlePublishQuiz}
            disabled={publishing}
            className="rounded-xl bg-blue-600 px-6 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
          >
            {publishing ? "Mempublikasikan..." : "Publikasi"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Main Grid: Left Column (Daftar Soal), Right Column (Editor Soal) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Daftar Soal matching Screenshot 4 & 5 */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-800">Daftar Soal</span>
            <span className="text-[11px] text-slate-400">
              {questions.length} Soal
            </span>
          </div>

          {/* Questions List */}
          <div className="space-y-2.5 max-h-[680px] overflow-y-auto pr-1">
            {questions.map((q, idx) => {
              const isActive = idx === activeQuestionIndex;
              return (
                <div
                  key={q.id}
                  onClick={() => setActiveQuestionIndex(idx)}
                  className={`relative cursor-pointer rounded-2xl p-3.5 transition-all border ${
                    isActive
                      ? "border-blue-500 bg-blue-100/90 text-blue-950 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300 text-slate-800 shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold">Soal {idx + 1}</span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteQuestion(idx, e)}
                      className="text-slate-400 hover:text-red-500 p-0.5 transition"
                      title="Hapus Soal"
                    >
                      <MoreVertical className="size-3.5" />
                    </button>
                  </div>

                  <p className="text-xs line-clamp-2 leading-relaxed opacity-90">
                    {q.prompt || "Soal kosong..."}
                  </p>

                  {/* Status indicator icon on bottom-left */}
                  <div className="mt-2 flex items-center">
                    <div className="size-2 rounded-full bg-green-500" />
                  </div>
                </div>
              );
            })}

            {/* + Tambah Soal Button matching Screenshot 4 & 5 */}
            <button
              type="button"
              onClick={handleAddQuestion}
              className="w-full flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-blue-600 shadow-xs hover:bg-slate-50 transition"
            >
              <Plus className="size-3.5" />
              <span>Tambah Soal</span>
            </button>
          </div>
        </div>

        {/* Right Column: Question Content Editor matching Screenshot 4 & 5 */}
        <div className="lg:col-span-9 space-y-4">
          {/* Question Textarea Card with Formatting Toolbar */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            {/* Toolbar: B, I, U, Sigma, and Tambah Gambar */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-2 text-slate-600">
              <div className="flex items-center gap-2">
                <button type="button" className="p-1 rounded hover:bg-slate-200/70 transition" title="Bold">
                  <Bold className="size-3.5" />
                </button>
                <button type="button" className="p-1 rounded hover:bg-slate-200/70 transition" title="Italic">
                  <Italic className="size-3.5" />
                </button>
                <button type="button" className="p-1 rounded hover:bg-slate-200/70 transition" title="Underline">
                  <Underline className="size-3.5" />
                </button>
                <div className="h-4 w-px bg-slate-300 mx-1" />
                <button type="button" className="p-1 rounded hover:bg-slate-200/70 transition" title="Sigma / Rumus">
                  <Sigma className="size-3.5" />
                </button>
              </div>

              <button
                type="button"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 transition"
              >
                <ImageIcon className="size-3.5" />
                <span>Tambah Gambar</span>
              </button>
            </div>

            {/* Textarea */}
            <textarea
              rows={5}
              placeholder="Ketik pertanyaan Anda di sini..."
              value={activeQuestion.prompt}
              onChange={(e) => updateActiveQuestion({ prompt: e.target.value })}
              className="w-full resize-y p-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>

          {/* Conditional Options: Only shown if "Pilihan Ganda" matching Screenshot 4 */}
          {activeQuestion.type === "pilihan_ganda" && (
            <div className="space-y-3">
              {activeQuestion.options.map((opt) => {
                const isCorrect = activeQuestion.correctAnswer === opt.key;
                return (
                  <div
                    key={opt.key}
                    className={`flex items-center gap-3 rounded-2xl bg-white p-3 shadow-xs transition-all border ${
                      isCorrect
                        ? "border-green-600 ring-1 ring-green-600/30"
                        : "border-slate-200"
                    }`}
                  >
                    {/* Letter Badge (A: Red, B: Blue, C: Orange, D: Green) */}
                    <div
                      className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-white font-bold text-xs ${opt.badgeColor}`}
                    >
                      {opt.key}
                    </div>

                    {/* Option text input */}
                    <input
                      type="text"
                      placeholder="Tambahkan opsi jawaban..."
                      value={opt.text}
                      onChange={(e) =>
                        handleOptionTextChange(opt.key, e.target.value)
                      }
                      className="flex-1 bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                    />

                    {/* Trash icon */}
                    {activeQuestion.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteOption(opt.key)}
                        className="p-1 text-slate-300 hover:text-red-500 transition"
                        title="Hapus Opsi"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}

                    {/* Checkmark button to mark correct answer */}
                    <button
                      type="button"
                      onClick={() => handleSetCorrectAnswer(opt.key)}
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full border transition ${
                        isCorrect
                          ? "border-green-600 bg-green-600 text-white"
                          : "border-slate-300 text-transparent hover:border-green-500"
                      }`}
                      title={isCorrect ? "Jawaban Benar" : "Tandai Jawaban Benar"}
                    >
                      <Check className="size-3.5 stroke-[3]" />
                    </button>
                  </div>
                );
              })}

              {/* + Tambah Opsi Jawaban Button */}
              {activeQuestion.options.length < 6 && (
                <div className="pt-1 flex justify-center">
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="flex items-center gap-2 rounded-full border border-blue-200 bg-white px-5 py-2 text-xs font-semibold text-blue-600 shadow-xs hover:bg-blue-50 transition"
                  >
                    <Plus className="size-3.5" />
                    <span>Tambah Opsi Jawaban</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* NOTE: When type is "essay", there are NO options and NO rubric guru!
              As the user requested:
              "kalau jenisnya essay gausah ada unci Jawaban / Panduan Penilaian Rubrik Guru. tetaplah pertanyaan, biar guru cek sendiri benar/salah jawaban essaynya."
              And as shown in Screenshot 5 Right! */}
        </div>
      </div>

      {/* Format Guide Modal */}
      {showFormatGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="size-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  Panduan Format Dokumen Word CBT
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFormatGuide(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <p>
                Setiap butir soal ditulis berurutan dengan format tag sebagai berikut:
              </p>

              <div className="rounded-xl bg-slate-900 text-slate-100 p-3.5 font-mono text-[11px] space-y-1">
                <div className="text-emerald-400">Q1&gt;: Teks pertanyaan soal di sini...</div>
                <div className="text-sky-300">A&gt;: Opsi jawaban pertama (diterjemahkan sebagai A)</div>
                <div className="text-sky-300">A&gt;: Opsi jawaban kedua (diterjemahkan sebagai B)</div>
                <div className="text-sky-300">A&gt;: Opsi jawaban ketiga (diterjemahkan sebagai C)</div>
                <div className="text-sky-300">A&gt;: Opsi jawaban keempat (diterjemahkan sebagai D)</div>
                <div className="text-sky-300">A&gt;: Opsi jawaban kelima (diterjemahkan sebagai E)</div>
                <div className="text-amber-300">PT&gt;: 2</div>
                <div className="text-slate-400">PF&gt;: 0</div>
                <div className="text-pink-400 font-bold">K&gt;: B</div>
              </div>

              <div className="space-y-1.5 pt-1 text-[11px]">
                <div>
                  <strong className="text-slate-800">Q / Q1:</strong> Pertanyaan soal.
                </div>
                <div>
                  <strong className="text-slate-800">A:</strong> Opsi jawaban (semua baris opsi menggunakan prefix <code className="bg-slate-100 px-1 rounded">A&gt;:</code>, urutan baris ke-1 sampai ke-5 secara otomatis menjadi pilihan A, B, C, D, E).
                </div>
                <div>
                  <strong className="text-slate-800">PT:</strong> Point if True (skor jika siswa menjawab benar, default: 2).
                </div>
                <div>
                  <strong className="text-slate-800">PF:</strong> Point if False (skor jika salah, default: 0).
                </div>
                <div>
                  <strong className="text-slate-800">K:</strong> Kunci Jawaban. Mengacu ke huruf opsi (misal <code className="bg-slate-100 px-1 rounded">K&gt;: B</code> berarti baris <code className="bg-slate-100 px-1 rounded">A&gt;:</code> kedua adalah kunci yang benar).
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <a
                href="/api/guru/quizzes/template"
                download="Template_Soal_CBT.docx"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <Download className="size-3.5 text-blue-600" />
                <span>Unduh Contoh (.docx)</span>
              </a>
              <button
                type="button"
                onClick={() => setShowFormatGuide(false)}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuizBuilderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat pembuat kuis...</div>}>
      <QuizBuilderForm />
    </Suspense>
  );
}
