"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Eye, FileCheck2, RefreshCw, Search, X } from "lucide-react";
import { getTeacherAttemptHistory, listTeacherExamAttempts } from "@/lib/attempt-store";
import type { ExamAttemptDetail, ExamAttemptSummary, TeacherIdentity } from "@/lib/types";

export function AttemptHistoryManager({ teacher }: { teacher: TeacherIdentity }) {
  const [attempts, setAttempts] = useState<ExamAttemptSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setAttempts(await listTeacherExamAttempts(teacher));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được lịch sử bài làm.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    void listTeacherExamAttempts(teacher)
      .then((next) => { if (!cancelled) setAttempts(next); })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Không tải được lịch sử bài làm."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [teacher]);

  const filtered = useMemo(() => attempts.filter((attempt) =>
    `${attempt.studentName} ${attempt.studentId} ${attempt.examCode} ${attempt.examTitle}`.toLowerCase().includes(query.toLowerCase()),
  ), [attempts, query]);

  return <section>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-bold uppercase tracking-[.2em] text-teal-700">Lưu theo từng lượt làm</div><h1 className="mt-2 text-3xl font-bold tracking-[-.045em] text-slate-950 md:text-4xl">Bài làm & lịch sử đáp án</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Xem đáp án hiện tại, thời điểm đổi từng câu và kết quả của mỗi lượt làm bài.</p></div><button className="secondary-button" disabled={loading} onClick={() => void load()}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Làm mới</button></div>
    <div className="relative mt-6 max-w-md"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm sinh viên hoặc mã đề..." /></div>
    {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</div>}
    <div className="panel mt-4 overflow-hidden">{filtered.length ? <div className="overflow-x-auto"><table className="data-table min-w-[920px]"><thead><tr><th>Sinh viên</th><th>Đề thi</th><th>Lượt</th><th>Tiến độ</th><th>Trạng thái</th><th>Kết quả</th><th></th></tr></thead><tbody>{filtered.map((attempt) => <tr key={attempt.id}><td><div className="font-bold text-slate-900">{attempt.studentName}</div><div className="mt-1 text-[11px] text-slate-500">{attempt.studentId}</div></td><td><div className="font-semibold text-slate-800">{attempt.examTitle}</div><div className="mt-1 text-[11px] text-slate-500">{attempt.examCode}</div></td><td><span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-teal-700">Lần {attempt.attemptNumber}</span></td><td><div className="text-xs font-bold">{attempt.answeredCount}/{attempt.questionCount} câu</div><div className="mt-1 text-[10px] text-slate-400">Bắt đầu {formatDateTime(attempt.startedAt)}</div></td><td>{attempt.submittedAt ? <span className="student-status done">Đã nộp</span> : <span className="student-status live">Đang làm</span>}</td><td><div className="text-xs font-bold text-slate-800">{attempt.score === undefined ? "—" : `${attempt.score}/${attempt.questionCount}`}</div></td><td><button className="mini-action" onClick={() => setSelectedId(attempt.id)}><Eye className="h-3.5 w-3.5" /> Xem lịch sử</button></td></tr>)}</tbody></table></div> : <div className="grid min-h-64 place-items-center p-8 text-center"><div><FileCheck2 className="mx-auto h-9 w-9 text-slate-300" /><h2 className="mt-3 text-sm font-bold">Chưa có bài làm phù hợp</h2><p className="mt-1 text-xs text-slate-500">Khi sinh viên bắt đầu làm, từng lượt sẽ xuất hiện tại đây.</p></div></div>}</div>
    {selectedId && <AttemptDetailModal teacher={teacher} attemptId={selectedId} onClose={() => setSelectedId(null)} />}
  </section>;
}

function AttemptDetailModal({ teacher, attemptId, onClose }: { teacher: TeacherIdentity; attemptId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<ExamAttemptDetail | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    void getTeacherAttemptHistory(teacher, attemptId)
      .then((next) => { if (!cancelled) setDetail(next); })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Không tải được chi tiết bài làm."); });
    return () => { cancelled = true; };
  }, [attemptId, teacher]);

  return <div className="modal-backdrop"><div className="modal-card max-h-[88vh] !max-w-4xl overflow-y-auto"><div className="flex items-start justify-between gap-4"><div><div className="text-xs font-bold text-teal-700">Lịch sử đáp án</div><h2 className="mt-1 text-2xl font-bold tracking-[-.04em]">{detail ? `${detail.studentName} · lần ${detail.attemptNumber}` : "Đang tải bài làm..."}</h2>{detail && <p className="mt-2 text-xs text-slate-500">{detail.examCode} · {detail.examTitle}</p>}</div><button className="icon-button" onClick={onClose}><X className="h-5 w-5" /></button></div>
    {error && <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</div>}
    {detail && <><div className="mt-6 grid gap-3 sm:grid-cols-4"><Summary label="Mã sinh viên" value={detail.studentId} /><Summary label="Trạng thái" value={detail.submittedAt ? "Đã nộp" : "Đang làm"} /><Summary label="Đã trả lời" value={`${detail.answeredCount}/${detail.questionCount}`} /><Summary label="Điểm" value={detail.score === undefined ? "—" : `${detail.score}/${detail.questionCount}`} /></div><div className="mt-6 space-y-4">{detail.questions.map((question) => { const changes = detail.history.filter((entry) => entry.questionPosition === question.position); return <article className="rounded-2xl border border-slate-200 p-4" key={question.position}><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-bold uppercase tracking-[.14em] text-teal-700">Câu {question.position}</div><h3 className="mt-1 text-sm font-bold leading-6 text-slate-900">{question.content}</h3></div>{question.selectedAnswer === question.correctAnswer ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <Clock3 className="h-5 w-5 shrink-0 text-amber-500" />}</div><div className="mt-3 grid gap-2 sm:grid-cols-2"><AnswerLine label="Đáp án cuối" value={question.selectedAnswer === undefined ? "Chưa trả lời" : `${letter(question.selectedAnswer)}. ${question.options[question.selectedAnswer]}`} /><AnswerLine label="Đáp án đúng" value={`${letter(question.correctAnswer)}. ${question.options[question.correctAnswer]}`} /></div><div className="mt-3 rounded-xl bg-slate-50 p-3"><div className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">Các lần thay đổi</div>{changes.length ? <div className="mt-2 flex flex-wrap gap-2">{changes.map((entry, index) => <span className="rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 shadow-sm" key={`${entry.changedAt}-${index}`}>{formatTime(entry.changedAt)} → {letter(entry.selectedAnswer)}</span>)}</div> : <div className="mt-2 text-[11px] text-slate-500">Chưa có thay đổi được lưu.</div>}</div></article>; })}</div></>}
    <div className="mt-7 flex justify-end"><button className="secondary-button" onClick={onClose}>Đóng</button></div></div></div>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] text-slate-400">{label}</div><div className="mt-1 text-xs font-bold text-slate-800">{value}</div></div>;
}

function AnswerLine({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-100 p-3"><div className="text-[10px] text-slate-400">{label}</div><div className="mt-1 text-xs font-semibold leading-5 text-slate-700">{value}</div></div>;
}

function letter(answer: number) { return String.fromCharCode(65 + answer); }
function formatTime(value: string) { return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value)); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
