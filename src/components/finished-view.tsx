"use client";

import { Check, CheckCircle2, Home, ShieldCheck, X } from "lucide-react";
import { Brand } from "./brand";
import type { ActiveExam, ExamSubmissionResult, StudentCredential } from "@/lib/types";

interface FinishedViewProps {
  student: StudentCredential;
  exam: ActiveExam;
  result: ExamSubmissionResult;
  onHome: () => void;
}

export function FinishedView({ student, exam, result, onHome }: FinishedViewProps) {
  const percent = result.score === null ? null : Math.round((result.score / result.total) * 100);
  return (
    <main className="min-h-screen bg-[#f4f7f8]">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-[72px] max-w-[1100px] items-center justify-between px-5"><Brand compact /><div className="text-xs font-semibold text-slate-500">{exam.code}</div></div></header>
      <div className={`mx-auto px-5 py-12 md:py-20 ${result.showAnswers ? "max-w-[980px]" : "max-w-[760px]"}`}>
        <div className="panel overflow-hidden text-center">
          <div className="bg-teal-800 px-6 py-10 text-white">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/12 ring-8 ring-white/5"><CheckCircle2 className="h-8 w-8" /></div>
            <h1 className="mt-5 text-3xl font-bold tracking-[-.045em]">Đã nộp bài thành công</h1>
            <p className="mt-2 text-sm text-teal-100">Cảm ơn {student.name}. Câu trả lời của bạn đã được ghi nhận.</p>
          </div>
          <div className="p-6 md:p-9">
            <div className="grid gap-3 sm:grid-cols-2">
              <ResultCard label={result.showAnswers ? "Kết quả" : "Bài làm"} value={result.score === null ? "Đã ghi nhận" : `${result.score}/${result.total}`} note={percent === null ? "Giảng viên không công bố đáp án" : `${percent}% câu đúng`} />
              <ResultCard label="Trạng thái" value="Hoàn tất" note="Đã khóa bài làm" />
            </div>
            {result.showAnswers && result.correctAnswers && <div className="mt-7 text-left"><h2 className="text-lg font-bold tracking-[-.03em] text-slate-950">Đáp án và bài làm của bạn</h2><div className="mt-4 space-y-3">{exam.questions.map((question) => { const selected = result.answers[question.id]; const correct = result.correctAnswers?.[question.id]; const isCorrect = selected === correct; return <article className={`rounded-2xl border p-4 ${isCorrect ? "border-emerald-200 bg-emerald-50/50" : "border-rose-200 bg-rose-50/40"}`} key={question.id}><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-bold uppercase tracking-[.14em] text-teal-700">Câu {question.id}</div><div className="mt-1 text-sm font-bold leading-6 text-slate-900">{question.text}</div></div><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{isCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><ReviewAnswer label="Bạn chọn" value={selected === undefined ? "Chưa trả lời" : `${letter(selected)}. ${question.options[selected]}`} correct={isCorrect} /><ReviewAnswer label="Đáp án đúng" value={correct === undefined ? "—" : `${letter(correct)}. ${question.options[correct]}`} correct /></div></article>; })}</div></div>}
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
              <p className="text-xs leading-5 text-slate-600">Bài làm đã được ghi nhận. Nhật ký giám sát chỉ được cung cấp cho giảng viên phụ trách để xem xét.</p>
            </div>
            <button className="primary-button mx-auto mt-7" onClick={onHome}><Home className="h-4 w-4" /> Về danh sách đề</button>
          </div>
        </div>
      </div>
    </main>
  );
}

function ResultCard({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-2xl border border-slate-200 p-5"><div className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">{label}</div><div className="mt-2 text-2xl font-bold tracking-[-.04em] text-slate-950">{value}</div><div className="mt-1 text-[10px] text-slate-500">{note}</div></div>;
}

function ReviewAnswer({ label, value, correct }: { label: string; value: string; correct: boolean }) {
  return <div className="rounded-xl bg-white p-3"><div className="text-[10px] text-slate-400">{label}</div><div className={`mt-1 text-xs font-bold leading-5 ${correct ? "text-emerald-700" : "text-rose-700"}`}>{value}</div></div>;
}

function letter(index: number) { return String.fromCharCode(65 + index); }
