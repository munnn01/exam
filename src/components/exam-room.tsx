"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock3,
  Flag,
  Maximize2,
  Menu,
  ScanFace,
  ShieldCheck,
  Smartphone,
  Video,
  X,
} from "lucide-react";
import { Brand } from "./brand";
import { EXAM, QUESTIONS, VIOLATION_LABELS } from "@/lib/demo-data";
import { appendEvent } from "@/lib/store";
import type { ProctorEvent, StudentCredential } from "@/lib/types";
import { useProctoring } from "@/hooks/use-proctoring";

interface ExamRoomProps {
  student: StudentCredential;
  onFinish: (result: { score: number; total: number; violations: number; answers: Record<number, number> }) => void;
}

export function ExamRoom({ student, onFinish }: ExamRoomProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flagged, setFlagged] = useState<number[]>([]);
  const [remaining, setRemaining] = useState(EXAM.durationMinutes * 60);
  const [violations, setViolations] = useState<ProctorEvent[]>([]);
  const [toast, setToast] = useState<ProctorEvent | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const handleViolation = useCallback((input: Omit<ProctorEvent, "id" | "occurredAt" | "studentId" | "studentName" | "examCode">) => {
    const event: ProctorEvent = {
      ...input,
      id: crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
      studentId: student.id,
      studentName: student.name,
      examCode: student.examCode,
    };
    appendEvent(event);
    setViolations((current) => [event, ...current]);
    setToast(event);
    setTimeout(() => setToast((current) => current?.id === event.id ? null : current), 4500);
  }, [student]);

  const monitor = useProctoring({ enabled: !finishing, videoRef, onViolation: handleViolation });

  const finish = useCallback(async () => {
    if (finishing) return;
    setFinishing(true);
    const score = QUESTIONS.reduce((sum, question) => sum + (answers[question.id] === question.answer ? 1 : 0), 0);
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
    onFinish({ score, total: QUESTIONS.length, violations: violations.length, answers });
  }, [answers, finishing, onFinish, violations.length]);

  useEffect(() => {
    const timer = setInterval(() => setRemaining((current) => Math.max(0, current - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (remaining === 0) void finish();
  }, [finish, remaining]);

  const question = QUESTIONS[questionIndex];
  const answeredCount = Object.keys(answers).length;
  const minutes = Math.floor(remaining / 60).toString().padStart(2, "0");
  const seconds = (remaining % 60).toString().padStart(2, "0");
  const progress = Math.round((answeredCount / QUESTIONS.length) * 100);

  const statusItems = useMemo(() => [
    { label: "Camera", ok: monitor.camera === "active", icon: Camera },
    { label: "AI giám sát", ok: monitor.ai === "active", icon: ScanFace },
    { label: "Toàn màn hình", ok: Boolean(document.fullscreenElement), icon: Maximize2 },
  ], [monitor.ai, monitor.camera]);

  return (
    <main className="exam-shell min-h-screen bg-[#eef2f3]">
      <header className="exam-header">
        <div className="flex min-w-0 items-center gap-5">
          <Brand compact />
          <div className="hidden h-7 w-px bg-slate-200 md:block" />
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-slate-900 md:text-sm">{EXAM.title}</div>
            <div className="mt-0.5 hidden text-[10px] text-slate-500 sm:block">{student.name} · {student.id}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <div className={`exam-timer ${remaining < 300 ? "urgent" : ""}`}><Clock3 className="h-4 w-4" /><span>{minutes}:{seconds}</span></div>
          <button className="secondary-button hidden sm:flex" onClick={() => void finish()}><Flag className="h-4 w-4" /> Nộp bài</button>
          <button className="icon-button sm:hidden" onClick={() => setNavOpen(true)}><Menu className="h-5 w-5" /></button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 p-3 md:p-5 xl:grid-cols-[230px_minmax(0,1fr)_285px]">
        <aside className={`exam-nav ${navOpen ? "open" : ""}`}>
          <div className="flex items-center justify-between xl:hidden"><div className="text-sm font-bold">Danh sách câu hỏi</div><button className="icon-button" onClick={() => setNavOpen(false)}><X className="h-5 w-5" /></button></div>
          <div className="hidden xl:block"><div className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Tiến độ làm bài</div><div className="mt-2 flex items-end justify-between"><span className="text-2xl font-bold tracking-[-.04em] text-slate-950">{answeredCount}/{QUESTIONS.length}</span><span className="text-[10px] font-bold text-teal-700">{progress}%</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${progress}%` }} /></div></div>
          <div className="mt-6 grid grid-cols-5 gap-2 xl:grid-cols-4">
            {QUESTIONS.map((item, index) => <button key={item.id} className={`question-dot ${index === questionIndex ? "current" : ""} ${answers[item.id] !== undefined ? "answered" : ""} ${flagged.includes(item.id) ? "flagged" : ""}`} onClick={() => { setQuestionIndex(index); setNavOpen(false); }}>{item.id}</button>)}
          </div>
          <div className="mt-6 space-y-2 border-t border-slate-100 pt-5 text-[10px] text-slate-500"><Legend color="bg-teal-700" label="Đã trả lời" /><Legend color="border-2 border-teal-700" label="Câu hiện tại" /><Legend color="bg-amber-400" label="Đánh dấu xem lại" /></div>
          <button className="secondary-button mt-6 w-full justify-center sm:hidden" onClick={() => void finish()}><Flag className="h-4 w-4" /> Nộp bài</button>
        </aside>
        {navOpen && <button className="fixed inset-0 z-30 bg-slate-950/25 xl:hidden" onClick={() => setNavOpen(false)} aria-label="Đóng danh sách câu hỏi" />}

        <section className="question-panel">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 md:px-8">
            <div><div className="text-[10px] font-bold uppercase tracking-[.15em] text-teal-700">Câu hỏi {question.id}</div><div className="mt-1 text-[11px] text-slate-400">Chọn một đáp án đúng nhất</div></div>
            <button className={`flag-button ${flagged.includes(question.id) ? "active" : ""}`} onClick={() => setFlagged((current) => current.includes(question.id) ? current.filter((id) => id !== question.id) : [...current, question.id])}><Flag className="h-4 w-4" /> {flagged.includes(question.id) ? "Đã đánh dấu" : "Xem lại"}</button>
          </div>
          <div className="px-5 py-8 md:px-8 md:py-10">
            <h1 className="max-w-3xl text-xl font-bold leading-8 tracking-[-.025em] text-slate-950 md:text-2xl md:leading-9">{question.text}</h1>
            <div className="mt-8 space-y-3">
              {question.options.map((option, index) => {
                const selected = answers[question.id] === index;
                return <button key={option} className={`answer-option ${selected ? "selected" : ""}`} onClick={() => setAnswers((current) => ({ ...current, [question.id]: index }))}><span className="answer-letter">{String.fromCharCode(65 + index)}</span><span className="flex-1 text-left">{option}</span>{selected && <span className="grid h-6 w-6 place-items-center rounded-full bg-teal-700 text-white"><Check className="h-3.5 w-3.5" /></span>}</button>;
              })}
            </div>
          </div>
          <div className="mt-auto flex items-center justify-between border-t border-slate-100 px-5 py-4 md:px-8">
            <button className="secondary-button" disabled={questionIndex === 0} onClick={() => setQuestionIndex((current) => Math.max(0, current - 1))}><ChevronLeft className="h-4 w-4" /> Câu trước</button>
            <div className="hidden text-[11px] text-slate-400 sm:block">Câu {questionIndex + 1} trên {QUESTIONS.length}</div>
            {questionIndex < QUESTIONS.length - 1 ? <button className="primary-button !h-10 !px-5" onClick={() => setQuestionIndex((current) => Math.min(QUESTIONS.length - 1, current + 1))}>Câu tiếp <ChevronRight className="h-4 w-4" /></button> : <button className="primary-button !h-10 !px-5" onClick={() => void finish()}>Nộp bài <Flag className="h-4 w-4" /></button>}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="monitor-card">
            <div className="flex items-center justify-between p-4"><div><div className="text-xs font-bold">Camera giám sát</div><div className="mt-1 text-[10px] text-slate-500">Không nhận diện danh tính</div></div><span className={`monitor-live ${monitor.camera === "active" ? "active" : ""}`}><span /> {monitor.camera === "active" ? "Trực tiếp" : "Đang mở"}</span></div>
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-950">
              <video ref={videoRef} muted playsInline className="h-full w-full scale-x-[-1] object-cover" />
              <div className="face-corners"><i /><i /><i /><i /></div>
              <div className="absolute bottom-3 left-3 rounded-full bg-slate-950/65 px-2.5 py-1.5 text-[9px] font-bold text-white backdrop-blur">{monitor.detail}</div>
            </div>
            <div className="grid grid-cols-3 border-t border-slate-100">
              {statusItems.map((item) => { const Icon = item.icon; return <div className="border-r border-slate-100 p-3 text-center last:border-0" key={item.label}><Icon className={`mx-auto h-4 w-4 ${item.ok ? "text-emerald-600" : "text-amber-500"}`} /><div className="mt-1.5 text-[9px] font-semibold text-slate-500">{item.label}</div></div>; })}
            </div>
          </div>

          <div className="panel p-4">
            <div className="flex items-center justify-between"><h3 className="text-xs font-bold">Trạng thái phiên thi</h3><ShieldCheck className="h-4 w-4 text-teal-700" /></div>
            <div className="mt-4 space-y-3">
              <MonitorLine label="Khuôn mặt" value={monitor.faceCount === 1 ? "Bình thường" : monitor.faceCount > 1 ? `${monitor.faceCount} khuôn mặt` : "Chưa thấy"} ok={monitor.faceCount === 1} />
              <MonitorLine label="Hướng nhìn" value={monitor.gaze === "center" ? "Tập trung" : monitor.gaze === "away" ? "Đang lệch" : "Đang kiểm tra"} ok={monitor.gaze === "center"} />
              <MonitorLine label="Điện thoại" value={monitor.phoneDetected ? "Có thể phát hiện" : "Không phát hiện"} ok={!monitor.phoneDetected} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3"><div className={`grid h-9 w-9 place-items-center rounded-xl ${violations.length ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{violations.length ? <AlertTriangle className="h-4 w-4" /> : <Check className="h-4 w-4" />}</div><div><div className="text-xs font-bold">{violations.length} sự kiện</div><div className="mt-1 text-[10px] text-slate-500">Được ghi nhận trong phiên này</div></div></div>
          </div>
        </aside>
      </div>

      {toast && <div className={`violation-toast ${toast.severity}`}><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/80"><AlertTriangle className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="text-xs font-bold">{VIOLATION_LABELS[toast.type]}</div><div className="mt-1 text-[11px] leading-4 opacity-80">{toast.detail}</div></div><button onClick={() => setToast(null)}><X className="h-4 w-4" /></button></div>}
    </main>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <div className="flex items-center gap-2"><span className={`h-3 w-3 rounded ${color}`} /> {label}</div>;
}

function MonitorLine({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return <div className="flex items-center justify-between gap-3 text-[11px]"><span className="text-slate-500">{label}</span><span className={`flex items-center gap-1.5 font-bold ${ok ? "text-emerald-700" : "text-amber-700"}`}><CircleDot className="h-3 w-3" /> {value}</span></div>;
}
