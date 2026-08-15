"use client";

import { useState } from "react";
import { Button, Radio, WorkspaceHeader } from "@/components/ui";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ChevronLeft, ChevronRight } from "lucide-react";

const questions = [
  {
    id: 1,
    text: "Nilai sin 30 derajat adalah...",
    options: ["0", "1/2", "akar 3/2", "1"],
  },
  {
    id: 2,
    text: "Cos 60 derajat sama dengan...",
    options: ["0", "1/2", "akar 3/2", "1"],
  },
  {
    id: 3,
    text: "Tan 45 derajat bernilai...",
    options: ["0", "1", "akar 2", "akar 3"],
  },
];

export default function SiswaQuizPage() {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const question = questions[current];

  return (
    <div>
      <WorkspaceHeader
        eyebrow="Siswa"
        title="Quiz Trigonometri"
        description="Matematika X-A - 10 menit - 3 soal"
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
        <Card className="rounded-lg">
          <CardHeader title={`Soal ${current + 1} dari ${questions.length}`} />
          <CardBody className="space-y-6">
            <p className="text-lg font-medium text-[var(--foreground)]">
              {question.text}
            </p>
            <div className="space-y-3">
              {question.options.map((option, index) => (
                <div
                  key={option}
                  className={`rounded-lg border px-4 py-3 transition ${
                    answers[question.id] === index
                      ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                      : "border-[var(--border)] bg-white hover:bg-[var(--background)]"
                  }`}
                >
                  <Radio
                    label={option}
                    name={`q-${question.id}`}
                    checked={answers[question.id] === index}
                    onChange={() =>
                      setAnswers((prev) => ({ ...prev, [question.id]: index }))
                    }
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between gap-3 pt-2">
              <Button
                variant="outline"
                disabled={current === 0}
                onClick={() => setCurrent((c) => c - 1)}
                leftIcon={<ChevronLeft className="size-4" />}
              >
                Sebelumnya
              </Button>
              {current < questions.length - 1 ? (
                <Button
                  onClick={() => setCurrent((c) => c + 1)}
                  rightIcon={<ChevronRight className="size-4" />}
                >
                  Selanjutnya
                </Button>
              ) : (
                <Button variant="accent">Kumpulkan Quiz</Button>
              )}
            </div>
          </CardBody>
        </Card>

        <Card className="rounded-lg">
          <CardHeader title="Navigasi Soal" />
          <CardBody>
            <div className="grid grid-cols-3 gap-2">
              {questions.map((q, index) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrent(index)}
                  className={`rounded-lg py-2 text-sm font-medium transition ${
                    current === index
                      ? "bg-[var(--primary)] text-white"
                      : answers[q.id] !== undefined
                        ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "bg-[var(--background)] text-[var(--muted)]"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
