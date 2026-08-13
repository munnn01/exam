"use client";

import { CheckCircle2, Home, ShieldCheck } from "lucide-react";
import { Brand } from "./brand";
import type { ActiveExam, StudentCredential } from "@/lib/types";

interface FinishedViewProps {
  student: StudentCredential;
  exam: ActiveExam;
  result: { score: number | null; total: number; violations: number };
  onHome: () => void;
}

export function FinishedView({ student, exam, result, onHome }: FinishedViewProps) {
  const percent = result.score === null ? null : Math.round((result.score / result.total) * 100);
  return (
    <main className="min-h-screen bg-[#f4f7f8]">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-[72px] max-w-[1100px] items-center justify-between px-5"><Brand compact /><div className="text-xs font-semibold text-slate-500">{exam.code}</div></div></header>
      <div className="mx-auto max-w-[760px] px-5 py-12 md:py-20">
        <div className="panel overflow-hidden text-center">
          <div className="bg-teal-800 px-6 py-10 text-white">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/12 ring-8 ring-white/5"><CheckCircle2 className="h-8 w-8" /></div>
            <h1 className="mt-5 text-3xl font-bold tracking-[-.045em]">Đã nộp bài thành công</h1>
            <p className="mt-2 text-sm text-teal-100">Cảm ơn {student.name}. Câu trả lời của bạn đã được ghi nhận.</p>
          </div>
          <div className="p-6 md:p-9">
            <div className="grid gap-3 sm:grid-cols-3">
              <ResultCard label={result.score === null ? "Kết quả" : "Điểm demo"} value={result.score === null ? "Đã ghi nhận" : `${result.score}/${result.total}`} note={percent === null ? "Chờ hệ thống chấm bài" : `${percent}% câu đúng`} />
              <ResultCard label="Sự kiện giám sát" value={String(result.violations)} note="Chờ giảng viên xem" />
              <ResultCard label="Trạng thái" value="Hoàn tất" note="Đã khóa bài làm" />
            </div>
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
              <p className="text-xs leading-5 text-slate-600">Sự kiện camera và trình duyệt chỉ là tín hiệu hỗ trợ. Giảng viên sẽ xem lại ngữ cảnh trước khi đưa ra bất kỳ kết luận nào.</p>
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
