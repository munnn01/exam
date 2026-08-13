"use client";

import { appendEvent, getEvents } from "./store";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "./supabase/client";
import type { ProctorEvent, StudentCredential, TeacherIdentity } from "./types";

function mapEvent(row: Record<string, unknown>): ProctorEvent {
  return {
    id: String(row.id),
    type: String(row.event_type) as ProctorEvent["type"],
    severity: String(row.severity) as ProctorEvent["severity"],
    occurredAt: String(row.occurred_at),
    durationMs: row.duration_ms === null || row.duration_ms === undefined ? undefined : Number(row.duration_ms),
    confidence: row.confidence === null || row.confidence === undefined ? undefined : Number(row.confidence),
    detail: String(row.detail),
    studentId: String(row.student_id),
    studentName: String(row.student_name),
    examCode: String(row.exam_code),
  };
}

export async function recordProctorEvent(student: StudentCredential, examId: string, event: ProctorEvent) {
  appendEvent({ ...event, snapshot: undefined });
  if (!isSupabaseConfigured()) return;

  const { error } = await getSupabaseBrowserClient().rpc("record_proctor_event", {
    p_exam_id: examId,
    p_student_id: student.id,
    p_account_password: student.password,
    p_event_type: event.type,
    p_severity: event.severity,
    p_detail: event.detail,
    p_duration_ms: event.durationMs ?? null,
    p_confidence: event.confidence ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function listTeacherProctorEvents(teacher: TeacherIdentity): Promise<ProctorEvent[]> {
  if (!isSupabaseConfigured() || teacher.isDemo) return getEvents();

  const { data, error } = await getSupabaseBrowserClient().rpc("list_teacher_proctor_events", { p_limit: 300 });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => mapEvent(row));
}
