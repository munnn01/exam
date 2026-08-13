"use client";

import { useState } from "react";
import { ArrowRight, Eye, EyeOff, GraduationCap, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { Brand } from "./brand";
import { DEMO_TEACHER } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { signInTeacher } from "@/lib/teacher-auth";
import type { StudentCredential, TeacherIdentity } from "@/lib/types";

interface LoginViewProps {
  onTeacherLogin: (teacher: TeacherIdentity) => void;
  onStudentLogin: (student: StudentCredential) => void;
}

export function LoginView({ onTeacherLogin, onStudentLogin }: LoginViewProps) {
  const cloudReady = isSupabaseConfigured();
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [studentId, setStudentId] = useState(cloudReady ? "" : "SV001");
  const [teacherForm, setTeacherForm] = useState(() => ({
    email: cloudReady ? "" : DEMO_TEACHER.email,
    password: cloudReady ? "" : DEMO_TEACHER.password,
  }));

  const changeRole = (nextRole: "student" | "teacher") => {
    setRole(nextRole);
    setError("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (role === "teacher") {
        onTeacherLogin(await signInTeacher(teacherForm.email, teacherForm.password));
        return;
      }
      const normalizedStudentId = studentId.trim().toUpperCase();
      if (normalizedStudentId.length < 2) throw new Error("Vui lòng nhập mã sinh viên hợp lệ.");
      onStudentLogin({
        id: normalizedStudentId,
        name: normalizedStudentId,
        password: "",
        examCode: "",
        status: "Chưa thi",
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Đã xảy ra lỗi. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-page min-h-screen">
      <div className="login-grid" aria-hidden="true" />
      <header className="relative z-10 mx-auto flex w-full max-w-[1240px] items-center justify-between px-6 py-6 lg:px-10">
        <Brand />
        <div className="hidden items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur md:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,.12)]" />
          {cloudReady ? "Dữ liệu đám mây sẵn sàng" : "Chế độ demo local"}
        </div>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-98px)] w-full max-w-[1240px] items-center gap-12 px-6 pb-14 lg:grid-cols-[1.05fr_.95fr] lg:px-10">
        <section className="max-w-xl py-8">
          <div className="eyebrow"><ShieldCheck className="h-4 w-4" /> Giám sát thi trực tuyến</div>
          <h1 className="mt-6 text-[clamp(2.8rem,5vw,5.1rem)] font-bold leading-[.96] tracking-[-.065em] text-slate-950">
            Tập trung vào bài thi. <span className="text-teal-700">Mọi thứ khác để chúng tôi lo.</span>
          </h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-slate-600 md:text-lg">
            Mỗi giảng viên có ngân hàng câu hỏi riêng, tự tạo đề, đặt mật khẩu gửi sinh viên và nhập CSV hàng loạt — cùng hệ thống phát hiện hành vi bất thường.
          </p>
          <div className="mt-9 grid max-w-lg grid-cols-3 gap-3">
            {[["Tách biệt", "Dữ liệu theo giảng viên"], ["Nhanh", "Nhập câu hỏi từ CSV"], ["Linh hoạt", "Tạo đề ngẫu nhiên"]].map(([title, copy]) => (
              <div key={title} className="rounded-2xl border border-slate-200/80 bg-white/55 p-4 backdrop-blur"><div className="text-sm font-bold text-slate-900">{title}</div><div className="mt-1 text-[11px] leading-4 text-slate-500">{copy}</div></div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[480px]">
          <div className="login-card">
            <div className="mb-7"><div className="text-sm font-semibold text-teal-700">Chào mừng trở lại</div><h2 className="mt-1 text-3xl font-bold tracking-[-.04em] text-slate-950">Đăng nhập hệ thống</h2><p className="mt-2 text-sm text-slate-500">Chọn vai trò và nhập thông tin phù hợp.</p></div>
            <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
              <button type="button" className={`role-tab ${role === "student" ? "active" : ""}`} onClick={() => changeRole("student")}><GraduationCap className="h-4 w-4" /> Sinh viên</button>
              <button type="button" className={`role-tab ${role === "teacher" ? "active" : ""}`} onClick={() => changeRole("teacher")}><UserRound className="h-4 w-4" /> Giảng viên</button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={(event) => void submit(event)}>
              {role === "student" ? <>
                <Field label="Mã sinh viên"><input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Nhập mã sinh viên" /></Field>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">Sinh viên không cần tài khoản riêng. Nhập mã sinh viên, chọn đề đang mở rồi dùng mật khẩu do giảng viên cung cấp.</div>
              </> : <>
                <Field label="Email giảng viên"><input type="email" required value={teacherForm.email} onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })} /></Field>
                <Field label="Mật khẩu"><PasswordInput value={teacherForm.password} show={showPassword} onShow={() => setShowPassword(!showPassword)} onChange={(password) => setTeacherForm({ ...teacherForm, password })} /></Field>
                {cloudReady && <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">Tài khoản giảng viên do quản trị viên cấp trực tiếp trên Supabase. Website không tự đăng ký và không gửi email xác nhận.</div>}
              </>}

              {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}
              <button disabled={busy} className="primary-button w-full" type="submit">{busy ? "Đang xử lý..." : role === "student" ? "Xem danh sách đề" : "Mở bảng điều khiển"}<ArrowRight className="h-4 w-4" /></button>
            </form>

            <div className="mt-6 flex items-start gap-3 rounded-xl border border-teal-100 bg-teal-50/70 p-3.5"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" /><p className="text-[12px] leading-5 text-teal-900">{cloudReady ? <><strong>Tài khoản được bảo vệ bởi Supabase Auth.</strong> Mỗi giảng viên chỉ truy cập ngân hàng câu hỏi và file đề của chính mình.</> : <><strong>Demo đã điền sẵn.</strong> Kết nối Supabase để dùng tài khoản do quản trị viên cấp và đồng bộ nhiều thiết bị.</>}</p></div>
          </div>
          <p className="mt-5 text-center text-[11px] leading-5 text-slate-500">Sinh viên đồng ý bật camera trong thời gian làm bài; hệ thống không xác minh danh tính.</p>
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold text-slate-700">{label}</span><div className="input-shell">{children}</div></label>;
}

function PasswordInput({ value, show, onShow, onChange }: { value: string; show: boolean; onShow: () => void; onChange: (value: string) => void }) {
  return <div className="flex items-center"><input required minLength={6} className="min-w-0 flex-1" type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} /><button type="button" className="p-2 text-slate-400 transition hover:text-slate-700" aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={onShow}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>;
}
