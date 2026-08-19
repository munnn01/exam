"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Headphones, Languages, LoaderCircle, Mic2, PenLine, RefreshCw, TrendingUp, Users } from "lucide-react";
import { listTeacherIeltsProgress } from "@/lib/ielts-progress-store";
import type { TeacherIdentity, TeacherIeltsProgressSummary } from "@/lib/types";

export function IeltsProgressManager({ teacher }: { teacher: TeacherIdentity }) {
  const [rows, setRows] = useState<TeacherIeltsProgressSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { setRows(await listTeacherIeltsProgress(teacher)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không tải được tiến độ IELTS."); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => {
    const active = rows.filter((row) => row.lastPracticedAt).length;
    const completed = rows.reduce((total, row) => total + row.listeningCompleted + row.readingCompleted + row.writingCompleted + row.speakingCompleted, 0);
    const scores = rows.flatMap((row) => [row.listeningBestScore, row.readingBestScore]).filter((score): score is number => score !== null);
    return { active, completed, average: scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null };
  }, [rows]);

  return <section>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-bold uppercase tracking-[.2em] text-teal-700">IELTS Academic Practice</div><h1 className="mt-2 text-3xl font-bold tracking-[-.045em] text-slate-950 md:text-4xl">Tiến độ luyện 4 kỹ năng</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Theo dõi bài đã hoàn thành và điểm Listening, Reading tốt nhất của từng sinh viên.</p></div><button className="secondary-button" disabled={loading} onClick={() => void load()}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Làm mới</button></div>
    {error && <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</div>}
    <div className="mt-7 grid gap-4 sm:grid-cols-3"><Stat icon={Users} label="Đã bắt đầu luyện" value={`${stats.active}/${rows.length}`} note="sinh viên có hoạt động" /><Stat icon={CheckCircle2} label="Bài đã hoàn thành" value={String(stats.completed)} note="trên cả 4 kỹ năng" /><Stat icon={TrendingUp} label="Điểm trắc nghiệm TB" value={stats.average === null ? "—" : `${stats.average}%`} note="Listening và Reading" /></div>
    <div className="panel mt-6 overflow-hidden">{loading && !rows.length ? <div className="grid min-h-64 place-items-center"><div className="text-center"><LoaderCircle className="mx-auto h-8 w-8 animate-spin text-teal-600" /><div className="mt-3 text-xs text-slate-500">Đang tải tiến độ...</div></div></div> : rows.length ? <div className="overflow-x-auto"><table className="data-table min-w-[980px]"><thead><tr><th>Sinh viên</th><th>Listening</th><th>Reading</th><th>Writing</th><th>Speaking</th><th>Hoạt động gần nhất</th></tr></thead><tbody>{rows.map((row) => <tr key={row.studentId}><td><div className="font-bold text-slate-900">{row.studentName}</div><div className="mt-1 text-[11px] text-slate-500">{row.studentId}</div></td><SkillCell icon={Headphones} completed={row.listeningCompleted} total={1} score={row.listeningBestScore} /><SkillCell icon={BookOpen} completed={row.readingCompleted} total={1} score={row.readingBestScore} /><SkillCell icon={PenLine} completed={row.writingCompleted} total={2} /><SkillCell icon={Mic2} completed={row.speakingCompleted} total={3} /><td><div className="text-xs font-semibold text-slate-700">{row.lastPracticedAt ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(row.lastPracticedAt)) : "Chưa bắt đầu"}</div></td></tr>)}</tbody></table></div> : <div className="grid min-h-64 place-items-center p-8 text-center"><div><Languages className="mx-auto h-9 w-9 text-slate-300" /><h2 className="mt-3 text-sm font-bold">Chưa có sinh viên</h2><p className="mt-1 text-xs text-slate-500">Hãy cấp tài khoản sinh viên để bắt đầu theo dõi.</p></div></div>}</div>
  </section>;
}

function Stat({ icon: Icon, label, value, note }: { icon: typeof Users; label: string; value: string; note: string }) {
  return <div className="stat-card"><div className="stat-icon teal"><Icon className="h-5 w-5" /></div><div className="mt-5 text-[10px] font-bold uppercase tracking-[.13em] text-slate-400">{label}</div><div className="mt-1 text-3xl font-bold tracking-[-.05em] text-slate-950">{value}</div><div className="mt-1 text-xs text-slate-500">{note}</div></div>;
}

function SkillCell({ icon: Icon, completed, total, score }: { icon: typeof Headphones; completed: number; total: number; score?: number | null }) {
  const percent = Math.min(100, Math.round(completed / total * 100));
  return <td><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-teal-700" /><span className="text-xs font-bold text-slate-800">{completed}/{total}</span>{score !== undefined && score !== null && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">{Math.round(score)}%</span>}</div><div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600" style={{ width: `${percent}%` }} /></div></td>;
}
