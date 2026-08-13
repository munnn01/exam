import { ShieldCheck } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`${compact ? "h-9 w-9" : "h-11 w-11"} brand-mark`}>
        <ShieldCheck className={compact ? "h-5 w-5" : "h-6 w-6"} strokeWidth={2.2} />
      </div>
      <div>
        <div className={`${compact ? "text-[17px]" : "text-xl"} font-bold tracking-[-0.04em] text-slate-950`}>ExamGuard</div>
        {!compact && <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-700">Thi cử minh bạch</div>}
      </div>
    </div>
  );
}
