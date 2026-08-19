"use client";

import { getStudents } from "./store";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "./supabase/client";
import type { IeltsProgressRecord, IeltsSkill, StudentCredential, TeacherIdentity, TeacherIeltsProgressSummary } from "./types";

const LOCAL_KEY = "examguard-ielts-progress-v1";

function localKey(studentId: string) {
  return `${LOCAL_KEY}-${studentId.toUpperCase()}`;
}

function readLocal(studentId: string): IeltsProgressRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(localKey(studentId)) ?? "[]") as IeltsProgressRecord[];
  } catch {
    return [];
  }
}

function mapProgress(row: Record<string, unknown>): IeltsProgressRecord {
  return {
    skill: String(row.skill) as IeltsSkill,
    moduleId: String(row.module_id ?? row.moduleId),
    payload: row.payload && typeof row.payload === "object" ? row.payload as Record<string, unknown> : {},
    score: row.score === null || row.score === undefined ? null : Number(row.score),
    completed: Boolean(row.completed),
    updatedAt: String(row.updated_at ?? row.updatedAt),
  };
}

export async function listIeltsProgress(student: StudentCredential): Promise<IeltsProgressRecord[]> {
  if (!isSupabaseConfigured()) return readLocal(student.id);
  const { data, error } = await getSupabaseBrowserClient().rpc("get_student_ielts_progress", {
    p_student_id: student.id,
    p_account_password: student.password,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => mapProgress(row));
}

export async function saveIeltsProgress(
  student: StudentCredential,
  input: Omit<IeltsProgressRecord, "updatedAt">,
): Promise<IeltsProgressRecord> {
  if (!isSupabaseConfigured()) {
    const record = { ...input, updatedAt: new Date().toISOString() };
    const current = readLocal(student.id).filter((item) => !(item.skill === input.skill && item.moduleId === input.moduleId));
    window.localStorage.setItem(localKey(student.id), JSON.stringify([record, ...current]));
    return record;
  }
  const { data, error } = await getSupabaseBrowserClient().rpc("save_student_ielts_progress", {
    p_student_id: student.id,
    p_account_password: student.password,
    p_skill: input.skill,
    p_module_id: input.moduleId,
    p_payload: input.payload,
    p_score: input.score,
    p_completed: input.completed,
  });
  if (error) throw new Error(error.message);
  return mapProgress(data as Record<string, unknown>);
}

export async function listTeacherIeltsProgress(teacher: TeacherIdentity): Promise<TeacherIeltsProgressSummary[]> {
  if (!isSupabaseConfigured() || teacher.isDemo) {
    return getStudents().map((student) => ({
      studentId: student.id,
      studentName: student.name,
      listeningCompleted: 0,
      readingCompleted: 0,
      writingCompleted: 0,
      speakingCompleted: 0,
      listeningBestScore: null,
      readingBestScore: null,
      lastPracticedAt: null,
    }));
  }
  const { data, error } = await getSupabaseBrowserClient().rpc("list_teacher_ielts_progress");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    studentId: String(row.student_id),
    studentName: String(row.student_name),
    listeningCompleted: Number(row.listening_completed),
    readingCompleted: Number(row.reading_completed),
    writingCompleted: Number(row.writing_completed),
    speakingCompleted: Number(row.speaking_completed),
    listeningBestScore: row.listening_best_score === null ? null : Number(row.listening_best_score),
    readingBestScore: row.reading_best_score === null ? null : Number(row.reading_best_score),
    lastPracticedAt: row.last_practiced_at ? String(row.last_practiced_at) : null,
  }));
}
