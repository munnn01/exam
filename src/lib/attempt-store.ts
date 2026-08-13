"use client";

import { getSupabaseBrowserClient, isSupabaseConfigured } from "./supabase/client";
import type {
  ActiveExam,
  AnswerHistoryEntry,
  ExamAttemptDetail,
  ExamAttemptSummary,
  StudentCredential,
  TeacherIdentity,
} from "./types";

function localAttemptKey(examId: string, studentId: string) {
  return `examguard-attempts-${examId}-${studentId}`;
}

function readLocalAttempt(examId: string, studentId: string) {
  try {
    const value = window.localStorage.getItem(localAttemptKey(examId, studentId));
    return value ? JSON.parse(value) as { attemptNumber: number; answers: Record<number, number>; startedAt: string; history?: AnswerHistoryEntry[] } : null;
  } catch {
    return null;
  }
}

function mapAttempt(row: Record<string, unknown>): ExamAttemptSummary {
  return {
    id: String(row.id),
    examId: String(row.exam_id),
    examCode: String(row.exam_code),
    examTitle: String(row.exam_title),
    studentId: String(row.student_id),
    studentName: String(row.student_name),
    attemptNumber: Number(row.attempt_number),
    startedAt: String(row.started_at),
    lastSavedAt: row.last_saved_at ? String(row.last_saved_at) : undefined,
    submittedAt: row.submitted_at ? String(row.submitted_at) : undefined,
    score: row.score === null || row.score === undefined ? undefined : Number(row.score),
    questionCount: Number(row.question_count),
    answeredCount: Number(row.answered_count),
  };
}

export async function saveExamAnswers(student: StudentCredential, exam: ActiveExam, answers: Record<number, number>) {
  if (!isSupabaseConfigured()) {
    const current = readLocalAttempt(exam.id, student.id);
    if (!current) throw new Error("Không tìm thấy lượt làm bài.");
    const changedAt = new Date().toISOString();
    const history = [...(current.history ?? [])];
    for (const [question, answer] of Object.entries(answers)) {
      if (current.answers[Number(question)] !== answer) {
        history.push({ questionPosition: Number(question), selectedAnswer: answer, changedAt });
      }
    }
    window.localStorage.setItem(localAttemptKey(exam.id, student.id), JSON.stringify({ ...current, answers, history }));
    return changedAt;
  }

  const { data, error } = await getSupabaseBrowserClient().rpc("save_exam_answers", {
    p_attempt_id: exam.attemptId,
    p_student_id: student.id,
    p_account_password: student.password,
    p_answers: answers,
  });
  if (error) throw new Error(error.message);
  return String(data);
}

export async function submitExamAttempt(student: StudentCredential, exam: ActiveExam) {
  if (!isSupabaseConfigured()) {
    const current = readLocalAttempt(exam.id, student.id);
    const score = exam.questions.every((question) => typeof question.answer === "number")
      ? exam.questions.reduce((sum, question) => sum + (current?.answers[question.id] === question.answer ? 1 : 0), 0)
      : null;
    window.localStorage.removeItem(localAttemptKey(exam.id, student.id));
    return { score, total: exam.questions.length, submittedAt: new Date().toISOString(), attemptNumber: exam.attemptNumber };
  }

  const { data, error } = await getSupabaseBrowserClient().rpc("submit_exam_attempt", {
    p_attempt_id: exam.attemptId,
    p_student_id: student.id,
    p_account_password: student.password,
  });
  if (error) throw new Error(error.message);
  const result = data as Record<string, unknown>;
  return {
    score: result.score === null ? null : Number(result.score),
    total: Number(result.total),
    submittedAt: String(result.submittedAt),
    attemptNumber: Number(result.attemptNumber),
  };
}

export async function listTeacherExamAttempts(teacher: TeacherIdentity): Promise<ExamAttemptSummary[]> {
  if (!isSupabaseConfigured() || teacher.isDemo) return [];
  const { data, error } = await getSupabaseBrowserClient().rpc("list_teacher_exam_attempts", { p_limit: 1000 });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => mapAttempt(row));
}

export async function getTeacherAttemptHistory(teacher: TeacherIdentity, attemptId: string): Promise<ExamAttemptDetail> {
  if (!isSupabaseConfigured() || teacher.isDemo) throw new Error("Lịch sử đáp án chỉ có khi kết nối Supabase.");
  const { data, error } = await getSupabaseBrowserClient().rpc("get_teacher_attempt_history", { p_attempt_id: attemptId });
  if (error) throw new Error(error.message);
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    examId: "",
    examCode: String(row.examCode),
    examTitle: String(row.examTitle),
    studentId: String(row.studentId),
    studentName: String(row.studentName),
    attemptNumber: Number(row.attemptNumber),
    startedAt: String(row.startedAt),
    lastSavedAt: row.lastSavedAt ? String(row.lastSavedAt) : undefined,
    submittedAt: row.submittedAt ? String(row.submittedAt) : undefined,
    score: row.score === null || row.score === undefined ? undefined : Number(row.score),
    questionCount: Number(row.questionCount),
    answeredCount: Array.isArray(row.questions) ? (row.questions as Array<Record<string, unknown>>).filter((question) => question.selectedAnswer !== null).length : 0,
    questions: Array.isArray(row.questions) ? (row.questions as Array<Record<string, unknown>>).map((question) => ({
      position: Number(question.position),
      content: String(question.content),
      options: Array.isArray(question.options) ? question.options.map(String) : [],
      correctAnswer: Number(question.correctAnswer),
      selectedAnswer: question.selectedAnswer === null || question.selectedAnswer === undefined ? undefined : Number(question.selectedAnswer),
    })) : [],
    history: Array.isArray(row.history) ? (row.history as Array<Record<string, unknown>>).map((entry) => ({
      questionPosition: Number(entry.questionPosition),
      selectedAnswer: Number(entry.selectedAnswer),
      changedAt: String(entry.changedAt),
    })) : [],
  };
}
