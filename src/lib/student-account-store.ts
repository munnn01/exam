"use client";

import { findStudent, getStudents, saveStudents } from "./store";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "./supabase/client";
import type { StudentCredential, TeacherIdentity } from "./types";

function friendlyStudentError(message: string) {
  if (message.toLowerCase().includes("duplicate") || message.toLowerCase().includes("unique")) {
    return new Error("Mã sinh viên đã tồn tại trong danh sách của bạn.");
  }
  return new Error(message);
}

function mapStudent(row: Record<string, unknown>): StudentCredential {
  return {
    id: String(row.student_id ?? row.studentId ?? row.id),
    name: String(row.full_name ?? row.fullName ?? row.name),
    password: "",
    examCode: "",
    status: (row.status ?? "Chưa thi") as StudentCredential["status"],
  };
}

export async function listTeacherStudentAccounts(teacher: TeacherIdentity): Promise<StudentCredential[]> {
  if (!isSupabaseConfigured() || teacher.isDemo) return getStudents();
  const { data, error } = await getSupabaseBrowserClient().rpc("list_teacher_student_accounts");
  if (error) throw friendlyStudentError(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => mapStudent(row));
}

export async function createStudentAccount(teacher: TeacherIdentity, input: { id: string; name: string; password: string }) {
  const normalized = { id: input.id.trim().toUpperCase(), name: input.name.trim(), password: input.password };
  if (!isSupabaseConfigured() || teacher.isDemo) {
    if (findStudent(normalized.id)) throw new Error("Mã sinh viên đã tồn tại trong danh sách của bạn.");
    const student: StudentCredential = { ...normalized, examCode: "", status: "Chưa thi" };
    saveStudents([student, ...getStudents()]);
    return student;
  }
  const { data, error } = await getSupabaseBrowserClient().rpc("create_student_account", {
    p_student_id: normalized.id,
    p_full_name: normalized.name,
    p_password: normalized.password,
  });
  if (error) throw friendlyStudentError(error.message);
  return { ...mapStudent(data as Record<string, unknown>), password: normalized.password };
}

export async function resetStudentAccountPassword(teacher: TeacherIdentity, studentId: string, password: string) {
  if (!isSupabaseConfigured() || teacher.isDemo) {
    const students = getStudents();
    if (!students.some((student) => student.id === studentId)) throw new Error("Không tìm thấy tài khoản sinh viên.");
    saveStudents(students.map((student) => student.id === studentId ? { ...student, password } : student));
    return;
  }
  const { data: rows, error: findError } = await getSupabaseBrowserClient().rpc("list_teacher_student_accounts");
  if (findError) throw friendlyStudentError(findError.message);
  const account = (rows ?? []).find((row: Record<string, unknown>) => String(row.student_id) === studentId);
  if (!account) throw new Error("Không tìm thấy tài khoản sinh viên.");
  const { error } = await getSupabaseBrowserClient().rpc("reset_student_account_password", { p_account_id: account.id, p_password: password });
  if (error) throw friendlyStudentError(error.message);
}

export async function deleteStudentAccount(teacher: TeacherIdentity, studentId: string) {
  if (!isSupabaseConfigured() || teacher.isDemo) {
    saveStudents(getStudents().filter((student) => student.id !== studentId));
    return;
  }
  const { data: rows, error: findError } = await getSupabaseBrowserClient().rpc("list_teacher_student_accounts");
  if (findError) throw friendlyStudentError(findError.message);
  const account = (rows ?? []).find((row: Record<string, unknown>) => String(row.student_id) === studentId);
  if (!account) throw new Error("Không tìm thấy tài khoản sinh viên.");
  const { error } = await getSupabaseBrowserClient().rpc("delete_student_account", { p_account_id: account.id });
  if (error) throw friendlyStudentError(error.message);
}

export async function signInStudentAccount(studentId: string, password: string): Promise<StudentCredential> {
  const normalizedId = studentId.trim().toUpperCase();
  if (!isSupabaseConfigured()) {
    const student = findStudent(normalizedId);
    if (!student || student.password !== password) throw new Error("Mã sinh viên hoặc mật khẩu chưa đúng.");
    return student;
  }
  const { data, error } = await getSupabaseBrowserClient().rpc("login_student_account", { p_student_id: normalizedId, p_password: password });
  if (error || !data) throw new Error(error?.message || "Mã sinh viên hoặc mật khẩu chưa đúng.");
  return { ...mapStudent(data as Record<string, unknown>), password };
}
