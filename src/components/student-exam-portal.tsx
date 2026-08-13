"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, BookOpenCheck, Clock3, FileLock2, FileText, KeyRound, LockKeyhole, RefreshCw, ShieldCheck, UnlockKeyhole, X } from "lucide-react";
import { Brand } from "./brand";
import { listStudentExamFiles, unlockStudentExam } from "@/lib/question-store";
import type { ActiveExam, StudentCredential, StudentExamSummary } from "@/lib/types";

interface StudentExamPortalProps {
  student: StudentCredential;
  onBack: () => void;
  onSelect: (exam: ActiveExam) => void;
}

export function StudentExamPortal({ student, onBack, onSelect }: StudentExamPortalProps) {
  const [exams, setExams] = useState<StudentExamSummary[]>([]);
  const [selected, setSelected] = useState<StudentExamSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setExams(await listStudentExamFiles());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được danh sách đề.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    void listStudentExamFiles()
      .then((nextExams) => { if (!cancelled) setExams(nextExams); })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Không tải được danh sách đề."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="min-h-screen bg-[#f4f7f8]">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-5 lg:px-8"><Brand compact /><button className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Đăng xuất</button></div></header>
      <div className="mx-auto max-w-[1180px] px-5 py-9 lg:px-8 lg:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><div className="eyebrow"><ShieldCheck className="h-4 w-4" /> Cổng dự thi sinh viên</div><h1 className="mt-5 text-4xl font-bold tracking-[-.055em] text-slate-950">Danh sách file đề</h1><p className="mt-3 text-sm leading-6 text-slate-500">Xin chào <strong className="text-slate-800">{student.name}</strong> · {student.id}. Chọn đề đang mở và nhập mật khẩu do giảng viên cấp.</p></div>
          <button className="secondary-button" disabled={loading} onClick={() => void load()}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Làm mới</button>
        </div>

        {error && <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {exams.map((exam) => {
            const open = exam.status === "open";
            return <article key={exam.id} className={`panel overflow-hidden transition ${open ? "hover:-translate-y-0.5 hover:shadow-lg" : "opacity-75"}`}>
              <div className={`h-1.5 ${open ? "bg-emerald-500" : "bg-slate-300"}`} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-4"><div className={`grid h-11 w-11 place-items-center rounded-xl ${open ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{open ? <FileText className="h-5 w-5" /> : <FileLock2 className="h-5 w-5" />}</div><span className={`exam-file-status ${open ? "open" : "closed"}`}>{open ? <><UnlockKeyhole className="h-3 w-3" /> Đang mở</> : <><LockKeyhole className="h-3 w-3" /> Đã khóa</>}</span></div>
                <div className="mt-5 text-[10px] font-bold uppercase tracking-[.14em] text-teal-700">{exam.code}</div><h2 className="mt-2 min-h-12 text-lg font-bold leading-6 tracking-[-.025em] text-slate-950">{exam.title}</h2><p className="mt-2 text-xs text-slate-500">Giảng viên: {exam.teacherName}</p>
                <div className="mt-5 grid grid-cols-2 gap-2"><div className="rounded-xl bg-slate-50 p-3"><Clock3 className="h-4 w-4 text-slate-400" /><div className="mt-2 text-xs font-bold">{exam.durationMinutes} phút</div></div><div className="rounded-xl bg-slate-50 p-3"><BookOpenCheck className="h-4 w-4 text-slate-400" /><div className="mt-2 text-xs font-bold">{exam.questionCount} câu</div></div></div>
                <button disabled={!open} className={`mt-5 w-full ${open ? "primary-button" : "secondary-button"}`} onClick={() => open && setSelected(exam)}>{open ? <><KeyRound className="h-4 w-4" /> Nhập mật khẩu để mở</> : <><LockKeyhole className="h-4 w-4" /> Chưa thể truy cập</>}</button>
              </div>
            </article>;
          })}
        </div>

        {!loading && !exams.length && <div className="panel mt-8 grid min-h-72 place-items-center p-8 text-center"><div><FileLock2 className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-4 text-lg font-bold">Chưa có file đề nào được công bố</h2><p className="mt-2 text-sm text-slate-500">Hãy chờ giảng viên mở đề rồi nhấn Làm mới.</p></div></div>}
      </div>

      {selected && <PasswordModal exam={selected} student={student} onClose={() => setSelected(null)} onUnlock={onSelect} />}
    </main>
  );
}

function PasswordModal({ exam, student, onClose, onUnlock }: { exam: StudentExamSummary; student: StudentCredential; onClose: () => void; onUnlock: (exam: ActiveExam) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <div className="modal-backdrop"><form className="modal-card" onSubmit={async (event) => { event.preventDefault(); setBusy(true); setError(""); try { onUnlock(await unlockStudentExam(student, exam.id, password)); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể mở file đề."); setBusy(false); } }}><div className="flex items-start justify-between gap-4"><div><div className="text-xs font-bold text-teal-700">{exam.code}</div><h2 className="mt-1 text-2xl font-bold tracking-[-.04em]">Mở file đề</h2><p className="mt-2 text-xs leading-5 text-slate-500">{exam.title}</p></div><button type="button" className="icon-button" onClick={onClose}><X className="h-5 w-5" /></button></div><label className="mt-6 block"><span className="form-label">Mật khẩu do giảng viên cấp</span><div className="relative"><KeyRound className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input autoFocus className="form-input !pl-10 font-mono tracking-[.12em]" type="password" required minLength={4} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu file đề" /></div></label>{error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</div>}<div className="mt-7 flex justify-end gap-2"><button type="button" className="secondary-button" onClick={onClose}>Hủy</button><button disabled={busy} className="primary-button" type="submit"><KeyRound className="h-4 w-4" /> {busy ? "Đang kiểm tra..." : "Mở đề"}</button></div></form></div>;
}
