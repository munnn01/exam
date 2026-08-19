"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  Download,
  Files,
  FileCheck2,
  LayoutDashboard,
  KeyRound,
  Languages,
  LogOut,
  Menu,
  MonitorUp,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  Smartphone,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Brand } from "./brand";
import { AttemptHistoryManager } from "./attempt-history-manager";
import { ExamFileManager } from "./exam-file-manager";
import { IeltsProgressManager } from "./ielts-progress-manager";
import { QuestionBankManager } from "./question-bank-manager";
import { VIOLATION_LABELS } from "@/lib/demo-data";
import { formatTime, makePassword } from "@/lib/store";
import { listTeacherProctorEvents } from "@/lib/proctor-event-store";
import { createStudentAccount, deleteStudentAccount, listTeacherStudentAccounts, resetStudentAccountPassword } from "@/lib/student-account-store";
import type { ProctorEvent, StudentCredential, TeacherIdentity, ViolationType } from "@/lib/types";

interface TeacherDashboardProps {
  teacher: TeacherIdentity;
  onLogout: () => void;
}

const navItems = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "questions", label: "Ngân hàng câu hỏi", icon: BookOpenCheck },
  { id: "exam-files", label: "File đề thi", icon: Files },
  { id: "students", label: "Danh sách sinh viên", icon: Users },
  { id: "ielts-progress", label: "Tiến độ IELTS", icon: Languages },
  { id: "attempts", label: "Bài làm & đáp án", icon: FileCheck2 },
  { id: "events", label: "Nhật ký giám sát", icon: ShieldAlert },
  { id: "settings", label: "Cấu hình kỳ thi", icon: Settings },
] as const;

export function TeacherDashboard({ teacher, onLogout }: TeacherDashboardProps) {
  const [section, setSection] = useState<(typeof navItems)[number]["id"]>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [students, setStudents] = useState<StudentCredential[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentMessage, setStudentMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [events, setEvents] = useState<ProctorEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState("");
  const [query, setQuery] = useState("");

  const highRisk = events.filter((event) => event.severity === "high").length;
  const filteredEvents = events.filter((event) =>
    `${event.studentName} ${event.studentId} ${VIOLATION_LABELS[event.type]}`.toLowerCase().includes(query.toLowerCase()),
  );

  const loadStudents = async () => {
    setStudentsLoading(true);
    try {
      setStudents(await listTeacherStudentAccounts(teacher));
    } catch (cause) {
      setStudentMessage({ error: true, text: cause instanceof Error ? cause.message : "Không tải được tài khoản sinh viên." });
    } finally {
      setStudentsLoading(false);
    }
  };

  const loadEvents = useCallback(async (silent = false) => {
    if (!silent) setEventsLoading(true);
    try {
      setEvents(await listTeacherProctorEvents(teacher));
      setEventsError("");
    } catch (cause) {
      setEventsError(cause instanceof Error ? cause.message : "Không tải được nhật ký giám sát.");
    } finally {
      if (!silent) setEventsLoading(false);
    }
  }, [teacher]);

  useEffect(() => {
    let cancelled = false;
    void listTeacherStudentAccounts(teacher)
      .then((nextStudents) => { if (!cancelled) setStudents(nextStudents); })
      .catch((cause) => { if (!cancelled) setStudentMessage({ error: true, text: cause instanceof Error ? cause.message : "Không tải được tài khoản sinh viên." }); })
      .finally(() => { if (!cancelled) setStudentsLoading(false); });
    return () => { cancelled = true; };
  }, [teacher]);

  useEffect(() => {
    const firstLoad = window.setTimeout(() => void loadEvents(), 0);
    const timer = window.setInterval(() => void loadEvents(true), 10_000);
    return () => {
      window.clearTimeout(firstLoad);
      window.clearInterval(timer);
    };
  }, [loadEvents]);

  const exportCsv = () => {
    const header = "Ma sinh vien,Ho ten,Trang thai";
    const rows = students.map((s) => [s.id, s.name, s.status].join(","));
    const blob = new Blob(["\uFEFF" + [header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "examguard-danh-sach-sinh-vien.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#f4f7f8] text-slate-900">
      <aside className={`dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="flex items-center justify-between px-5 py-5">
          <Brand compact />
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu"><X className="h-5 w-5" /></button>
        </div>
        <nav className="mt-4 flex-1 space-y-1 px-3">
          <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Quản lý kỳ thi</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={`sidebar-link ${section === item.id ? "active" : ""}`} onClick={() => { setSection(item.id); setSidebarOpen(false); }}>
                <Icon className="h-[18px] w-[18px]" /> {item.label}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-teal-100 text-sm font-bold text-teal-800">MA</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-slate-900">{teacher.name}</div>
              <div className="truncate text-[10px] text-slate-500">Giảng viên</div>
            </div>
          </div>
          <button className="sidebar-link w-full" onClick={onLogout}><LogOut className="h-[18px] w-[18px]" /> Đăng xuất</button>
        </div>
      </aside>

      {sidebarOpen && <button className="fixed inset-0 z-30 bg-slate-950/25 lg:hidden" aria-label="Đóng lớp phủ" onClick={() => setSidebarOpen(false)} />}

      <div className="lg:pl-[250px]">
        <header className="sticky top-0 z-20 flex h-[70px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur md:px-7">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Mở menu"><Menu className="h-5 w-5" /></button>
            <div>
              <div className="text-sm font-bold text-slate-950">Trung tâm quản lý ExamGuard</div>
              <div className="mt-0.5 text-[11px] text-slate-500">{teacher.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700 sm:flex"><Radio className="h-3.5 w-3.5" /> Đang mở kỳ thi</div>
            <button className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 hover:bg-slate-50" aria-label="Thông báo"><Bell className="h-4 w-4" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" /></button>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] p-4 md:p-7 lg:p-8">
          {section === "overview" && (
            <Overview teacher={teacher} events={events} students={students} highRisk={highRisk} setSection={setSection} />
          )}

          {section === "questions" && <QuestionBankManager teacher={teacher} />}

          {section === "exam-files" && <ExamFileManager teacher={teacher} />}

          {section === "students" && (
            <section>
              <PageHeading eyebrow="Quản lý truy cập" title="Tài khoản sinh viên" copy="Giảng viên tự cấp mã sinh viên và mật khẩu đăng nhập. Sau khi đăng nhập, sinh viên chỉ thấy đề của giảng viên đã cấp tài khoản." />
              {studentMessage && <div className={`mt-5 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${studentMessage.error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}><span>{studentMessage.text}</span><button onClick={() => setStudentMessage(null)}><X className="h-4 w-4" /></button></div>}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-slate-500">{studentsLoading ? "Đang tải tài khoản..." : `${students.length} tài khoản sinh viên`}</div>
                <div className="flex gap-2">
                  <button className="secondary-button" onClick={exportCsv}><Download className="h-4 w-4" /> Xuất CSV</button>
                  <button className="primary-button !h-10 !px-4" onClick={() => setShowAddStudent(true)}><Plus className="h-4 w-4" /> Thêm sinh viên</button>
                </div>
              </div>
              <div className="panel mt-4 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="data-table min-w-[780px]">
                    <thead><tr><th>Sinh viên</th><th>Trạng thái gần nhất</th><th>Quản lý tài khoản</th></tr></thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student.id}>
                          <td><div className="font-bold text-slate-900">{student.name}</div><div className="mt-1 text-[11px] text-slate-500">{student.id}</div></td>
                          <td><StatusBadge status={student.status} /></td>
                          <td><div className="flex flex-wrap gap-2"><button className="mini-action" onClick={async () => { const password = window.prompt(`Nhập mật khẩu mới cho ${student.id}`, makePassword()); if (!password) return; try { await resetStudentAccountPassword(teacher, student.id, password); setStudentMessage({ error: false, text: `Đã đổi mật khẩu ${student.id}: ${password}` }); } catch (cause) { setStudentMessage({ error: true, text: cause instanceof Error ? cause.message : "Không thể đổi mật khẩu." }); } }}><KeyRound className="h-3.5 w-3.5" /> Đổi mật khẩu</button><button className="mini-action danger" onClick={async () => { if (!window.confirm(`Xóa tài khoản ${student.id}? Lịch sử bài thi vẫn được giữ lại.`)) return; try { await deleteStudentAccount(teacher, student.id); await loadStudents(); setStudentMessage({ error: false, text: `Đã xóa tài khoản ${student.id}.` }); } catch (cause) { setStudentMessage({ error: true, text: cause instanceof Error ? cause.message : "Không thể xóa tài khoản." }); } }}><Trash2 className="h-3.5 w-3.5" /> Xóa</button></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!studentsLoading && !students.length && <div className="grid min-h-56 place-items-center p-8 text-center"><div><Users className="mx-auto h-9 w-9 text-slate-300" /><h3 className="mt-3 text-sm font-bold">Chưa có tài khoản sinh viên</h3><p className="mt-1 text-xs text-slate-500">Nhấn “Thêm sinh viên” để cấp mã và mật khẩu đăng nhập.</p></div></div>}
              </div>
            </section>
          )}

          {section === "ielts-progress" && <IeltsProgressManager teacher={teacher} />}

          {section === "attempts" && <AttemptHistoryManager teacher={teacher} />}

          {section === "events" && (
            <section>
              <PageHeading eyebrow="Riêng tư theo giảng viên" title="Nhật ký giám sát" copy="Chỉ tài khoản giảng viên sở hữu kỳ thi xem được các phát hiện camera, trình duyệt và trạng thái chia sẻ màn hình." />
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="relative min-w-64 max-w-md flex-1">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input className="search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo tên, mã hoặc loại sự kiện..." />
                </div>
                <button className="secondary-button" disabled={eventsLoading} onClick={() => void loadEvents()}><RefreshCw className={`h-4 w-4 ${eventsLoading ? "animate-spin" : ""}`} /> Làm mới</button>
              </div>
              {eventsError && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{eventsError}</div>}
              <EventTable events={filteredEvents} />
            </section>
          )}

          {section === "settings" && <ExamSettings />}
        </main>
      </div>

      {showAddStudent && <AddStudentModal onClose={() => setShowAddStudent(false)} onAdd={async (input) => { const student = await createStudentAccount(teacher, input); setShowAddStudent(false); await loadStudents(); setStudentMessage({ error: false, text: `Đã cấp tài khoản ${student.id}. Mật khẩu gửi sinh viên: ${input.password}` }); }} />}
    </div>
  );
}

function Overview({ teacher, events, students, highRisk, setSection }: { teacher: TeacherIdentity; events: ProctorEvent[]; students: StudentCredential[]; highRisk: number; setSection: (section: "students" | "events") => void }) {
  const inProgress = students.filter((student) => student.status === "Đang thi").length;
  const cards = [
    { label: "Sinh viên", value: students.length, note: `${inProgress} đang làm bài`, icon: Users, color: "teal" },
    { label: "Sự kiện gần đây", value: events.length, note: "Tự động cập nhật", icon: Activity, color: "blue" },
    { label: "Cảnh báo cao", value: highRisk, note: "Cần xem xét", icon: AlertTriangle, color: "rose" },
    { label: "Hệ thống", value: "Ổn định", note: "AI phía thiết bị", icon: MonitorUp, color: "emerald" },
  ];
  return (
    <section>
      <PageHeading eyebrow="Tổng quan trực tiếp" title={`Xin chào, ${teacher.name}`} copy="Theo dõi tình trạng kỳ thi và quản lý kho câu hỏi riêng của bạn." />
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return <div className="stat-card" key={card.label}><div className={`stat-icon ${card.color}`}><Icon className="h-5 w-5" /></div><div className="mt-5 text-[11px] font-bold uppercase tracking-[.12em] text-slate-400">{card.label}</div><div className="mt-1 text-3xl font-bold tracking-[-.05em] text-slate-950">{card.value}</div><div className="mt-2 text-xs font-medium text-slate-500">{card.note}</div></div>;
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.75fr]">
        <div>
          <div className="mb-3 flex items-center justify-between"><h3 className="section-title">Sự kiện gần đây</h3><button className="text-xs font-bold text-teal-700" onClick={() => setSection("events")}>Xem tất cả</button></div>
          <EventTable events={events.slice(0, 6)} compact />
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between"><h3 className="section-title">Phiên đang hoạt động</h3><button className="text-xs font-bold text-teal-700" onClick={() => setSection("students")}>Quản lý</button></div>
          <div className="panel p-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Radio className="h-5 w-5" /></div>
              <div><div className="text-sm font-bold">{inProgress || 1} sinh viên đang thi</div><div className="mt-1 text-[11px] text-slate-500">Cập nhật vài giây trước</div></div>
            </div>
            <div className="space-y-4 py-5">
              {students.filter((s) => s.status === "Đang thi").slice(0, 2).map((student, index) => (
                <div className="flex items-center gap-3" key={`${student.id}-${index}`}><div className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{student.name.split(" ").slice(-2).map((p) => p[0]).join("")}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-bold">{student.name}</div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[64%] rounded-full bg-teal-600" /></div></div><div className="text-[10px] font-bold text-slate-500">28:34</div></div>
              ))}
              {!students.some((student) => student.status === "Đang thi") && <div className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">Chưa có sinh viên đang làm bài.</div>}
            </div>
            <div className="rounded-xl bg-amber-50 p-3 text-[11px] leading-5 text-amber-800"><strong>Lưu ý:</strong> sự kiện AI được giữ để giảng viên xem lại, không tự động đánh trượt.</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function EventTable({ events, compact = false }: { events: ProctorEvent[]; compact?: boolean }) {
  return (
    <div className="panel mt-4 overflow-hidden">
      {events.length === 0 ? <div className="grid min-h-64 place-items-center p-8 text-center"><div><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" /><div className="mt-3 text-sm font-bold">Không có sự kiện phù hợp</div><div className="mt-1 text-xs text-slate-500">Các cảnh báo mới sẽ xuất hiện tại đây.</div></div></div> : (
        <div className="overflow-x-auto"><table className={`data-table ${compact ? "min-w-[660px]" : "min-w-[820px]"}`}><thead><tr><th>Sinh viên</th><th>Sự kiện</th><th>Mức độ</th><th>Thời gian</th>{!compact && <th>Chi tiết</th>}</tr></thead><tbody>{events.map((event) => <tr key={event.id}><td><div className="font-bold text-slate-900">{event.studentName}</div><div className="mt-1 text-[11px] text-slate-500">{event.studentId} · {event.examCode}</div></td><td><div className="flex items-center gap-2"><EventIcon type={event.type} /><span className="text-xs font-semibold">{VIOLATION_LABELS[event.type]}</span></div></td><td><SeverityBadge severity={event.severity} /></td><td><div className="text-xs font-semibold text-slate-700">{formatTime(event.occurredAt)}</div><div className="mt-1 text-[10px] text-slate-400">{new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(event.occurredAt))}</div></td>{!compact && <td className="max-w-[280px] text-xs leading-5 text-slate-500">{event.detail}</td>}</tr>)}</tbody></table></div>
      )}
    </div>
  );
}

function EventIcon({ type }: { type: ViolationType }) {
  const Icon = type === "PHONE_DETECTED" ? Smartphone : type === "TAB_HIDDEN" || type === "EXIT_FULLSCREEN" || type === "SCREEN_SHARE_STOPPED" ? MonitorUp : type.includes("COPY") || type.includes("PASTE") ? ClipboardList : ShieldAlert;
  return <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600"><Icon className="h-4 w-4" /></span>;
}

function SeverityBadge({ severity }: { severity: ProctorEvent["severity"] }) {
  return <span className={`severity ${severity}`}>{severity === "high" ? "Cao" : severity === "medium" ? "Trung bình" : "Thấp"}</span>;
}

function StatusBadge({ status }: { status: StudentCredential["status"] }) {
  return <span className={`student-status ${status === "Đang thi" ? "live" : status === "Đã nộp" ? "done" : "waiting"}`}>{status}</span>;
}

function PageHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <div><div className="text-[10px] font-bold uppercase tracking-[.2em] text-teal-700">{eyebrow}</div><h1 className="mt-2 text-3xl font-bold tracking-[-.045em] text-slate-950 md:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{copy}</p></div>;
}

function AddStudentModal({ onClose, onAdd }: { onClose: () => void; onAdd: (input: { id: string; name: string; password: string }) => Promise<void> }) {
  const [form, setForm] = useState(() => ({ id: "", name: "", password: makePassword() }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <div className="modal-backdrop"><form className="modal-card" onSubmit={async (event) => { event.preventDefault(); setBusy(true); setError(""); try { if (form.id.trim().length < 2 || form.name.trim().length < 2) throw new Error("Cần nhập đầy đủ mã sinh viên và họ tên."); if (form.password.length < 6) throw new Error("Mật khẩu cần ít nhất 6 ký tự."); await onAdd({ ...form, id: form.id.trim().toUpperCase(), name: form.name.trim() }); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tạo tài khoản."); setBusy(false); } }}><div className="flex items-center justify-between"><div><div className="text-xs font-bold text-teal-700">Cấp tài khoản đăng nhập</div><h2 className="mt-1 text-2xl font-bold tracking-[-.04em]">Thêm sinh viên</h2></div><button type="button" className="icon-button" onClick={onClose}><X className="h-5 w-5" /></button></div><div className="mt-6 space-y-4"><label className="block"><span className="form-label">Mã sinh viên</span><input className="form-input uppercase" required value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="SV005" /></label><label className="block"><span className="form-label">Họ và tên</span><input className="form-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nguyễn Văn A" /></label><label className="block"><span className="form-label">Mật khẩu đăng nhập</span><div className="flex gap-2"><input className="form-input font-mono tracking-[.1em]" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><button type="button" className="secondary-button shrink-0" onClick={() => setForm({ ...form, password: makePassword() })}>Tạo mới</button></div></label><div className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">Gửi mã sinh viên và mật khẩu này cho sinh viên. Mật khẩu được mã hóa và không thể xem lại; giảng viên có thể đặt mật khẩu mới khi cần.</div></div>{error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</div>}<div className="mt-7 flex justify-end gap-2"><button type="button" className="secondary-button" onClick={onClose}>Hủy</button><button disabled={busy} className="primary-button !h-10 !px-5" type="submit"><Plus className="h-4 w-4" /> {busy ? "Đang tạo..." : "Cấp tài khoản"}</button></div></form></div>;
}

function ExamSettings() {
  const settings = useMemo(() => [
    ["Rời tab / cửa sổ", "Ghi nhận ngay", true],
    ["Sao chép, cắt và dán", "Chặn và ghi nhận", true],
    ["Không thấy khuôn mặt", "Sau 2,2 giây", true],
    ["Người thứ hai", "Sau 1,1 giây", true],
    ["Nhìn lệch", "Sau 2,6 giây", true],
    ["Điện thoại", "Độ tin cậy từ 48%", true],
    ["Chia sẻ toàn màn hình", "Bắt buộc trong suốt bài thi", true],
  ], []);
  return <section><PageHeading eyebrow="Chính sách giám sát" title="Cấu hình kỳ thi" copy="Ngưỡng hiện tại ưu tiên giảm cảnh báo nhầm. Có thể hiệu chỉnh sau khi thử với camera thực tế." /><div className="mt-7 grid gap-6 xl:grid-cols-[1.15fr_.85fr]"><div className="panel divide-y divide-slate-100 px-5">{settings.map(([title, copy]) => <div key={String(title)} className="flex items-center gap-4 py-5"><div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-700"><CheckCircle2 className="h-5 w-5" /></div><div className="flex-1"><div className="text-sm font-bold">{title}</div><div className="mt-1 text-xs text-slate-500">{copy}</div></div><div className="toggle active"><span /></div></div>)}</div><div className="panel p-6"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-700"><AlertTriangle className="h-6 w-6" /></div><h3 className="mt-5 text-lg font-bold">Nguyên tắc ra quyết định</h3><p className="mt-3 text-sm leading-6 text-slate-500">Một tín hiệu AI không đồng nghĩa với gian lận. Hệ thống lưu thời gian, độ tin cậy và mô tả sự kiện để giảng viên xem xét trong đúng ngữ cảnh.</p><div className="mt-5 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">Không thu âm, không xác minh danh tính, không đọc nội dung clipboard và không lưu video màn hình.</div></div></div></section>;
}
