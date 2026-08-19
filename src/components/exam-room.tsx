"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flag,
  Menu,
  MonitorUp,
  Save,
  ShieldCheck,
  X,
} from "lucide-react";
import { Brand } from "./brand";
import { saveExamAnswers, submitExamAttempt } from "@/lib/attempt-store";
import { recordProctorEvent } from "@/lib/proctor-event-store";
import type { ActiveExam, ExamSubmissionResult, ProctorEvent, StudentCredential } from "@/lib/types";
import { useProctoring } from "@/hooks/use-proctoring";

interface ExamRoomProps {
  student: StudentCredential;
  exam: ActiveExam;
  screenStream: MediaStream;
  onFinish: (result: ExamSubmissionResult) => void;
}

export function ExamRoom({ student, exam, screenStream, onFinish }: ExamRoomProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(screenStream);
  const finishingRef = useRef(false);
  const saveChainRef = useRef<Promise<unknown>>(Promise.resolve());
  const saveVersionRef = useRef(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>(exam.savedAnswers);
  const [flagged, setFlagged] = useState<number[]>([]);
  const [remaining, setRemaining] = useState(exam.remainingSeconds);
  const [sharedStream, setSharedStream] = useState<MediaStream | null>(screenStream);
  const [screenActive, setScreenActive] = useState(screenStream.getVideoTracks().some((track) => track.readyState === "live"));
  const [screenError, setScreenError] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [finishError, setFinishError] = useState("");
  const [navOpen, setNavOpen] = useState(false);

  const handleViolation = useCallback((input: Omit<ProctorEvent, "id" | "occurredAt" | "studentId" | "studentName" | "examCode">) => {
    if (finishingRef.current) return;
    const event: ProctorEvent = {
      ...input,
      id: crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
      studentId: student.id,
      studentName: student.name,
      examCode: student.examCode,
    };
    void recordProctorEvent(student, exam.id, event).catch((cause) => console.error("Không thể lưu sự kiện giám sát", cause));
  }, [exam.id, student]);

  const monitor = useProctoring({ enabled: !finishing, videoRef, onViolation: handleViolation });

  useEffect(() => {
    screenStreamRef.current = sharedStream;
    const track = sharedStream?.getVideoTracks()[0];
    if (!track || track.readyState !== "live") return;

    const onEnded = () => {
      if (finishingRef.current) return;
      setScreenActive(false);
      setScreenError("Chia sẻ màn hình đã dừng. Hãy chia sẻ lại Toàn bộ màn hình.");
      handleViolation({
        type: "SCREEN_SHARE_STOPPED",
        severity: "high",
        detail: "Sinh viên đã dừng chia sẻ toàn bộ màn hình trong lúc làm bài",
      });
    };
    track.addEventListener("ended", onEnded);
    return () => track.removeEventListener("ended", onEnded);
  }, [handleViolation, sharedStream]);

  useEffect(() => () => {
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const requestScreenShare = async () => {
    setScreenError("");
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const track = stream.getVideoTracks()[0];
      const surface = track?.getSettings().displaySurface;
      if (!track || surface !== "monitor") {
        stream.getTracks().forEach((item) => item.stop());
        setScreenActive(false);
        setScreenError("Hãy chọn Toàn bộ màn hình (Entire screen), không chọn tab hoặc cửa sổ riêng.");
        return;
      }
      setSharedStream(stream);
      setScreenActive(true);
    } catch {
      setScreenActive(false);
      setScreenError("Chưa thể chia sẻ màn hình. Hãy chọn Cho phép và chia sẻ Toàn bộ màn hình.");
    }
  };

  const persistAnswers = useCallback((nextAnswers: Record<number, number>) => {
    const operation = saveChainRef.current
      .catch(() => undefined)
      .then(() => saveExamAnswers(student, exam, nextAnswers));
    saveChainRef.current = operation;
    return operation;
  }, [exam, student]);

  const selectAnswer = (questionId: number, answer: number) => {
    const nextAnswers = { ...answers, [questionId]: answer };
    const saveVersion = saveVersionRef.current + 1;
    saveVersionRef.current = saveVersion;
    setAnswers(nextAnswers);
    setSaveStatus("saving");
    void persistAnswers(nextAnswers)
      .then(() => { if (saveVersionRef.current === saveVersion) setSaveStatus("saved"); })
      .catch(() => { if (saveVersionRef.current === saveVersion) setSaveStatus("error"); });
  };

  const finish = useCallback(async () => {
    if (finishing) return;
    finishingRef.current = true;
    setFinishing(true);
    setFinishError("");
    try {
      setSaveStatus("saving");
      await persistAnswers(answers);
      const result = await submitExamAttempt(student, exam);
      setSaveStatus("saved");
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
      onFinish({
        score: result.score,
        total: result.total,
        answers,
        showAnswers: result.showAnswers,
        correctAnswers: result.correctAnswers,
      });
    } catch (cause) {
      finishingRef.current = false;
      setFinishing(false);
      setSaveStatus("error");
      setFinishError(cause instanceof Error ? cause.message : "Không thể lưu và nộp bài. Hãy thử lại.");
    }
  }, [answers, exam, finishing, onFinish, persistAnswers, student]);

  useEffect(() => {
    const timer = setInterval(() => setRemaining((current) => {
      const next = Math.max(0, current - 1);
      if (next === 0 && current !== 0) setTimeout(() => void finish(), 0);
      return next;
    }), 1000);
    return () => clearInterval(timer);
  }, [finish]);

  const question = exam.questions[questionIndex]!;
  const answeredCount = Object.keys(answers).length;
  const minutes = Math.floor(remaining / 60).toString().padStart(2, "0");
  const seconds = (remaining % 60).toString().padStart(2, "0");
  const progress = Math.round((answeredCount / exam.questions.length) * 100);

  const cameraMessage = monitor.camera === "active"
    ? "Camera đang hoạt động"
    : monitor.camera === "starting"
      ? "Đang mở camera"
      : "Camera bị lỗi";

  return (
    <main className="exam-shell min-h-screen bg-[#eef2f3]">
      <header className="exam-header">
        <div className="flex min-w-0 items-center gap-5">
          <Brand compact />
          <div className="hidden h-7 w-px bg-slate-200 md:block" />
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-slate-900 md:text-sm">{exam.title}</div>
            <div className="mt-0.5 hidden text-[10px] text-slate-500 sm:block">{student.name} · {student.id}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <div className={`hidden items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-bold sm:flex ${saveStatus === "error" ? "bg-rose-50 text-rose-700" : saveStatus === "saving" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}><Save className="h-3.5 w-3.5" /> {saveStatus === "saving" ? "Đang lưu..." : saveStatus === "error" ? "Lưu bị lỗi" : "Đã tự động lưu"}</div>
          <div className={`exam-timer ${remaining < 300 ? "urgent" : ""}`}><Clock3 className="h-4 w-4" /><span>{minutes}:{seconds}</span></div>
          <button className="secondary-button hidden sm:flex" onClick={() => void finish()}><Flag className="h-4 w-4" /> Nộp bài</button>
          <button className="icon-button sm:hidden" onClick={() => setNavOpen(true)}><Menu className="h-5 w-5" /></button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 p-3 md:p-5 xl:grid-cols-[230px_minmax(0,1fr)_285px]">
        <aside className={`exam-nav ${navOpen ? "open" : ""}`}>
          <div className="flex items-center justify-between xl:hidden"><div className="text-sm font-bold">Danh sách câu hỏi</div><button className="icon-button" onClick={() => setNavOpen(false)}><X className="h-5 w-5" /></button></div>
          <div className="hidden xl:block"><div className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Tiến độ làm bài</div><div className="mt-2 flex items-end justify-between"><span className="text-2xl font-bold tracking-[-.04em] text-slate-950">{answeredCount}/{exam.questions.length}</span><span className="text-[10px] font-bold text-teal-700">{progress}%</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${progress}%` }} /></div></div>
          <div className="mt-6 grid grid-cols-5 gap-2 xl:grid-cols-4">
            {exam.questions.map((item, index) => <button key={item.id} className={`question-dot ${index === questionIndex ? "current" : ""} ${answers[item.id] !== undefined ? "answered" : ""} ${flagged.includes(item.id) ? "flagged" : ""}`} onClick={() => { setQuestionIndex(index); setNavOpen(false); }}>{item.id}</button>)}
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
                return <button key={option} className={`answer-option ${selected ? "selected" : ""}`} onClick={() => selectAnswer(question.id, index)}><span className="answer-letter">{String.fromCharCode(65 + index)}</span><span className="flex-1 text-left">{option}</span>{selected && <span className="grid h-6 w-6 place-items-center rounded-full bg-teal-700 text-white"><Check className="h-3.5 w-3.5" /></span>}</button>;
              })}
            </div>
          </div>
          <div className="mt-auto flex items-center justify-between border-t border-slate-100 px-5 py-4 md:px-8">
            <button className="secondary-button" disabled={questionIndex === 0} onClick={() => setQuestionIndex((current) => Math.max(0, current - 1))}><ChevronLeft className="h-4 w-4" /> Câu trước</button>
            <div className="hidden text-[11px] text-slate-400 sm:block">Câu {questionIndex + 1} trên {exam.questions.length}</div>
            {questionIndex < exam.questions.length - 1 ? <button className="primary-button !h-10 !px-5" onClick={() => setQuestionIndex((current) => Math.min(exam.questions.length - 1, current + 1))}>Câu tiếp <ChevronRight className="h-4 w-4" /></button> : <button className="primary-button !h-10 !px-5" onClick={() => void finish()}>Nộp bài <Flag className="h-4 w-4" /></button>}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="monitor-card">
            <div className="flex items-center justify-between p-4"><div><div className="text-xs font-bold">Trạng thái camera</div><div className="mt-1 text-[10px] text-slate-500">Không nhận diện danh tính</div></div><span className={`monitor-live ${monitor.camera === "active" ? "active" : ""}`}><span /> {monitor.camera === "active" ? "Hoạt động" : "Kiểm tra"}</span></div>
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-950">
              <video ref={videoRef} muted playsInline className="h-full w-full scale-x-[-1] object-cover" />
              <div className="face-corners"><i /><i /><i /><i /></div>
              <div className="absolute bottom-3 left-3 rounded-full bg-slate-950/65 px-2.5 py-1.5 text-[9px] font-bold text-white backdrop-blur">{cameraMessage}</div>
            </div>
            <div className="grid grid-cols-2 border-t border-slate-100">
              <DeviceStatus icon={Camera} label="Camera" ok={monitor.camera === "active"} />
              <DeviceStatus icon={MonitorUp} label="Chia sẻ màn hình" ok={screenActive} />
            </div>
          </div>

          <div className="panel p-4">
            <div className="flex items-center justify-between"><h3 className="text-xs font-bold">Thiết bị giám sát</h3><ShieldCheck className="h-4 w-4 text-teal-700" /></div>
            <div className="mt-4 space-y-3 text-xs leading-5 text-slate-600">
              <p>Camera: <strong className={monitor.camera === "active" ? "text-emerald-700" : "text-rose-700"}>{cameraMessage}</strong></p>
              <p>Chia sẻ màn hình: <strong className={screenActive ? "text-emerald-700" : "text-rose-700"}>{screenActive ? "Đang hoạt động" : "Bị gián đoạn"}</strong></p>
              {!screenActive && <button className="secondary-button mt-1 w-full justify-center" onClick={requestScreenShare}><MonitorUp className="h-4 w-4" /> Chia sẻ lại màn hình</button>}
              {screenError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-medium leading-5 text-rose-700">{screenError}</div>}
            </div>
          </div>
        </aside>
      </div>
      {finishError && <div className="fixed bottom-5 left-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 shadow-xl"><div className="flex items-center justify-between gap-3"><span>{finishError}</span><button onClick={() => setFinishError("")}><X className="h-4 w-4" /></button></div></div>}
    </main>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <div className="flex items-center gap-2"><span className={`h-3 w-3 rounded ${color}`} /> {label}</div>;
}

function DeviceStatus({ icon: Icon, label, ok }: { icon: typeof Camera; label: string; ok: boolean }) {
  return <div className="border-r border-slate-100 p-3 text-center last:border-0"><Icon className={`mx-auto h-4 w-4 ${ok ? "text-emerald-600" : "text-rose-500"}`} /><div className="mt-1.5 text-[9px] font-semibold text-slate-500">{label}</div></div>;
}
