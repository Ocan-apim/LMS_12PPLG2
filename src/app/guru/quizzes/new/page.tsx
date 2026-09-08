"use client";

import { useEffect, useState, Suspense } from "react";
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
} from "lucide-react";

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
    const title = quizTitle.trim() || "Kuis Pembelajaran";

    if (!selectedClassId) {
      setError("Pilih kelas tujuan terlebih dahulu");
      return;
    }

    setPublishing(true);
    try {
      const totalPoints = questions.reduce((acc, q) => acc + (q.points || 10), 0);

      const res = await fetch("/api/guru/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          courseClassId: selectedClassId,
          durationSeconds: activeQuestion.durationSeconds || 60,
          totalPoints,
          publishAsAssignment: true,
          questions: questions.map((q) => ({
            prompt: q.prompt,
            type: q.type,
            options:
              q.type === "pilihan_ganda"
                ? q.options.map((o) => o.text)
                : [],
            correctAnswer:
              q.type === "pilihan_ganda" ? q.correctAnswer : "",
            points: q.points || 10,
          })),
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
          <div className="space-y-2.5">
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
