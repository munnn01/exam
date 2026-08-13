"use client";

import { DEMO_TEACHER } from "./demo-data";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "./supabase/client";
import type { TeacherIdentity } from "./types";

export interface SignUpResult {
  teacher: TeacherIdentity | null;
  confirmationRequired: boolean;
}

function toTeacher(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }): TeacherIdentity {
  const metadataName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  return {
    id: user.id,
    email: user.email ?? "",
    name: metadataName || user.email?.split("@")[0] || "Giảng viên",
  };
}

export async function getCurrentTeacher(): Promise<TeacherIdentity | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await getSupabaseBrowserClient().auth.getUser();
  if (error || !data.user) return null;
  return toTeacher(data.user);
}

export async function signInTeacher(email: string, password: string): Promise<TeacherIdentity> {
  if (!isSupabaseConfigured()) {
    if (email.trim().toLowerCase() !== DEMO_TEACHER.email || password !== DEMO_TEACHER.password) {
      throw new Error("Email hoặc mật khẩu giảng viên chưa đúng.");
    }
    return { id: "demo-teacher", email: DEMO_TEACHER.email, name: DEMO_TEACHER.name, isDemo: true };
  }

  const { data, error } = await getSupabaseBrowserClient().auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error || !data.user) throw new Error(error?.message || "Không thể đăng nhập.");
  return toTeacher(data.user);
}

export async function signUpTeacher(name: string, email: string, password: string): Promise<SignUpResult> {
  if (!isSupabaseConfigured()) {
    throw new Error("Cần kết nối Supabase trước khi tạo tài khoản thật.");
  }

  const { data, error } = await getSupabaseBrowserClient().auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { full_name: name.trim(), role: "teacher" },
      emailRedirectTo: `${window.location.origin}/`,
    },
  });
  if (error) throw new Error(error.message);

  return {
    teacher: data.session && data.user ? toTeacher(data.user) : null,
    confirmationRequired: !data.session,
  };
}

export async function signOutTeacher() {
  if (isSupabaseConfigured()) await getSupabaseBrowserClient().auth.signOut();
}
