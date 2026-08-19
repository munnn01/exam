"use client";

import { useEffect, useState } from "react";
import { Archive, CalendarDays, Database, Eye, EyeOff, FileClock, FileLock2, FileText, HardDrive, LockKeyhole, RefreshCw, Settings2, Trash2, UnlockKeyhole, X } from "lucide-react";
import { deleteDraftExam, getStorageStatus, listTeacherExams, setExamStatus, updateExamDeliverySettings } from "@/lib/question-store";
import type { GeneratedExam, StorageStatus, TeacherIdentity } from "@/lib/types";

interface ExamFileManagerProps { teacher: TeacherIdentity }

const statusLabels: Record<GeneratedExam["status"], string> = { draft: "Bản nháp", open: "Đang mở", closed: "Đã khóa", archived: "Lưu trữ" };

export function ExamFileManager({ teacher }: ExamFileManagerProps) {
  const [exams, setExams] = useState<GeneratedExam[]>([]);
  const [storage, setStorage] = useState<StorageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [editingExam, setEditingExam] = useState<GeneratedExam | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [nextExams, nextStorage] = await Promise.all([listTeacherExams(teacher), getStorageStatus(teacher)]);
      setExams(nextExams);
      setStorage(nextStorage);
    } catch (cause) {
      setMessage({ error: true, text: cause instanceof Error ? cause.message : "Không tải được file đề." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    void Promise.all([listTeacherExams(teacher), getStorageStatus(teacher)])
      .then(([nextExams, nextStorage]) => {
        if (cancelled) return;
        setExams(nextExams);
        setStorage(nextStorage);
      })
      .catch((cause) => {
        if (!cancelled) setMessage({ error: true, text: cause instanceof Error ? cause.message : "Không tải được file đề." });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [teacher]);

  const changeStatus = async (exam: GeneratedExam, status: "open" | "closed" | "archived") => {
    try {
      await setExamStatus(teacher, exam.id, status);
      setMessage({ error: false, text: status === "open" ? "Đã mở đề cho sinh viên." : status === "closed" ? "Đã khóa đề." : "Đã đưa đề vào lưu trữ." });
      await load();
    } catch (cause) {
      setMessage({ error: true, text: cause instanceof Error ? cause.message : "Không thể đổi trạng thái." });
    }
  };

  return <section>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-bold uppercase tracking-[.2em] text-teal-700">Vòng đời an toàn</div><h1 className="mt-2 text-3xl font-bold tracking-[-.045em] text-slate-950 md:text-4xl">File đề thi</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Mở, khóa và lưu trữ đề. Chỉ bản nháp chưa có lượt làm mới được phép xóa vĩnh viễn.</p></div><button className="secondary-button" disabled={loading} onClick={() => void load()}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Làm mới</button></div>

    {storage && <div className={`mt-6 rounded-2xl border p-5 ${storage.full ? "border-rose-200 bg-rose-50" : storage.percent >= 85 ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}><div className="flex flex-wrap items-center gap-4"><div className={`grid h-11 w-11 place-items-center rounded-xl ${storage.full ? "bg-rose-100 text-rose-700" : "bg-teal-50 text-teal-700"}`}><HardDrive className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-4"><div className="text-sm font-bold">Dung lượng dữ liệu</div><div className="text-xs font-bold">{formatBytes(storage.usedBytes)} / {formatBytes(storage.limitBytes)}</div></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/70"><div className={`h-full rounded-full ${storage.full ? "bg-rose-500" : storage.percent >= 85 ? "bg-amber-500" : "bg-teal-600"}`} style={{ width: `${Math.min(100, storage.percent)}%` }} /></div><div className="mt-2 text-[11px] text-slate-600">{storage.full ? "Dữ liệu đã đầy: không thể thêm file đề mới. Hãy xóa bản nháp không dùng hoặc nâng dung lượng." : `Đang sử dụng ${storage.percent}%. Hệ thống sẽ tự chặn tạo đề trước khi vượt giới hạn.`}</div></div></div></div>}

    {message && <div className={`mt-5 rounded-xl border px-4 py-3 text-sm font-semibold ${message.error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{message.text}</div>}

    <div className="panel mt-6 overflow-hidden">{exams.length ? <div className="overflow-x-auto"><table className="data-table min-w-[1080px]"><thead><tr><th>File đề</th><th>Trạng thái</th><th>Cấu hình</th><th>Ngày giao</th><th>Lượt làm</th><th>Thao tác</th></tr></thead><tbody>{exams.map((exam) => <tr key={exam.id}><td><div className="flex items-start gap-3"><ExamIcon status={exam.status} /><div><div className="font-bold text-slate-900">{exam.title}</div><div className="mt-1 text-[11px] text-slate-500">{exam.code} · Tạo {new Intl.DateTimeFormat("vi-VN").format(new Date(exam.createdAt))}</div>{exam.accessPassword && <div className="mt-1 text-[10px] text-slate-400">Mật khẩu demo: <code className="font-bold">{exam.accessPassword}</code></div>}</div></div></td><td><span className={`exam-file-status ${exam.status}`}>{statusLabels[exam.status]}</span></td><td><div className="text-xs font-semibold text-slate-700">{exam.questionCount} câu · {exam.durationMinutes} phút</div><div className="mt-1 text-[10px] text-slate-500">Tối đa {exam.maxAttempts} lượt / sinh viên</div><div className={`mt-1 flex items-center gap-1 text-[10px] font-semibold ${exam.showAnswers ? "text-emerald-700" : "text-slate-500"}`}>{exam.showAnswers ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />} {exam.showAnswers ? "Thấy đáp án sau nộp" : "Không thấy đáp án"}</div></td><td><div className="flex items-center gap-2 text-xs font-semibold text-slate-700"><CalendarDays className="h-4 w-4 text-teal-700" /> {formatDateTime(exam.assignedAt)}</div></td><td><div className="text-xs font-bold text-slate-800">{exam.attemptCount}</div><div className="mt-1 text-[10px] text-slate-400">lượt đã bắt đầu</div></td><td><div className="flex flex-wrap gap-2"><button className="mini-action" onClick={() => setEditingExam(exam)}><Settings2 className="h-3.5 w-3.5" /> Cấu hình đề</button>{exam.status === "draft" && <><button className="mini-action open" onClick={() => void changeStatus(exam, "open")}><UnlockKeyhole className="h-3.5 w-3.5" /> Mở đề</button><button className="mini-action danger" onClick={async () => { if (!window.confirm("Xóa vĩnh viễn bản nháp này?")) return; try { await deleteDraftExam(teacher, exam.id); setMessage({ error: false, text: "Đã xóa bản nháp." }); await load(); } catch (cause) { setMessage({ error: true, text: cause instanceof Error ? cause.message : "Không thể xóa đề." }); } }}><Trash2 className="h-3.5 w-3.5" /> Xóa</button></>}{exam.status === "open" && <button className="mini-action" onClick={() => void changeStatus(exam, "closed")}><LockKeyhole className="h-3.5 w-3.5" /> Khóa đề</button>}{exam.status === "closed" && <><button className="mini-action open" onClick={() => void changeStatus(exam, "open")}><UnlockKeyhole className="h-3.5 w-3.5" /> Mở lại</button><button className="mini-action" onClick={() => void changeStatus(exam, "archived")}><Archive className="h-3.5 w-3.5" /> Lưu trữ</button></>}{exam.status === "archived" && <span className="text-[11px] font-semibold text-slate-400">Chỉ đọc · giữ lịch sử</span>}</div></td></tr>)}</tbody></table></div> : <div className="grid min-h-72 place-items-center p-8 text-center"><div><Database className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-4 text-lg font-bold">Chưa có file đề</h2><p className="mt-2 text-sm text-slate-500">Vào Ngân hàng câu hỏi và chọn “Tạo đề tự động”.</p></div></div>}</div>
    {editingExam && <DeliverySettingsModal exam={editingExam} onClose={() => setEditingExam(null)} onSave={async (assignedAt, maxAttempts, showAnswers) => { try { await updateExamDeliverySettings(teacher, editingExam.id, assignedAt, maxAttempts, showAnswers); setEditingExam(null); setMessage({ error: false, text: "Đã cập nhật cấu hình đề." }); await load(); } catch (cause) { throw cause instanceof Error ? cause : new Error("Không thể cập nhật cấu hình đề."); } }} />}
  </section>;
}

function ExamIcon({ status }: { status: GeneratedExam["status"] }) {
  const Icon = status === "draft" ? FileClock : status === "open" ? FileText : status === "closed" ? FileLock2 : Archive;
  return <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${status === "open" ? "bg-emerald-50 text-emerald-700" : status === "draft" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}><Icon className="h-4 w-4" /></div>;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(0.1, bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function toDateTimeInput(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function DeliverySettingsModal({ exam, onClose, onSave }: { exam: GeneratedExam; onClose: () => void; onSave: (assignedAt: string, maxAttempts: number, showAnswers: boolean) => Promise<void> }) {
  const [assignedAt, setAssignedAt] = useState(() => toDateTimeInput(exam.assignedAt));
  const [maxAttempts, setMaxAttempts] = useState(exam.maxAttempts);
  const [showAnswers, setShowAnswers] = useState(exam.showAnswers);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <div className="modal-backdrop"><form className="modal-card" onSubmit={async (event) => { event.preventDefault(); setBusy(true); setError(""); try { await onSave(new Date(assignedAt).toISOString(), maxAttempts, showAnswers); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể cập nhật cấu hình."); setBusy(false); } }}><div className="flex items-start justify-between gap-4"><div><div className="text-xs font-bold text-teal-700">{exam.code}</div><h2 className="mt-1 text-2xl font-bold tracking-[-.04em]">Cấu hình đề thi</h2><p className="mt-2 text-xs text-slate-500">{exam.title}</p></div><button type="button" className="icon-button" onClick={onClose}><X className="h-5 w-5" /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label><span className="form-label">Ngày và giờ giao</span><input className="form-input" type="datetime-local" required value={assignedAt} onChange={(event) => setAssignedAt(event.target.value)} /></label><label><span className="form-label">Lượt tối đa / sinh viên</span><input className="form-input" type="number" min={1} max={20} required value={maxAttempts} onChange={(event) => setMaxAttempts(Number(event.target.value))} /></label></div><div className="mt-5"><div className="form-label">Chế độ sau khi nộp bài</div><div className="grid gap-3 sm:grid-cols-2"><ModeButton active={!showAnswers} icon={EyeOff} title="Không thấy đáp án" copy="Không hiện điểm và đáp án đúng." onClick={() => setShowAnswers(false)} /><ModeButton active={showAnswers} icon={Eye} title="Thấy đáp án" copy="Hiện điểm và đáp án đúng." onClick={() => setShowAnswers(true)} /></div></div><div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">Thứ tự A–D luôn được tráo và lưu riêng cho từng lượt làm. Sinh viên tải lại vẫn thấy đúng thứ tự cũ.</div>{error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</div>}<div className="mt-7 flex justify-end gap-2"><button type="button" className="secondary-button" onClick={onClose}>Hủy</button><button className="primary-button" disabled={busy} type="submit">{busy ? "Đang lưu..." : "Lưu cấu hình"}</button></div></form></div>;
}

function ModeButton({ active, icon: Icon, title, copy, onClick }: { active: boolean; icon: typeof Eye; title: string; copy: string; onClick: () => void }) {
  return <button type="button" className={`rounded-xl border p-4 text-left ${active ? "border-teal-400 bg-teal-50 ring-2 ring-teal-100" : "border-slate-200"}`} onClick={onClick}><Icon className={`h-4 w-4 ${active ? "text-teal-700" : "text-slate-400"}`} /><div className="mt-2 text-xs font-bold text-slate-800">{title}</div><div className="mt-1 text-[10px] text-slate-500">{copy}</div></button>;
}
