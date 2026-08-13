"use client";

import { DEMO_TEACHER, QUESTIONS } from "./demo-data";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "./supabase/client";
import type {
  ActiveExam,
  BankQuestion,
  GeneratedExam,
  Question,
  QuestionBank,
  QuestionDifficulty,
  StorageStatus,
  StudentCredential,
  StudentExamSummary,
  TeacherIdentity,
} from "./types";

export interface QuestionInput {
  content: string;
  options: string[];
  correctAnswer: number;
}

export interface ExamInput {
  bankId: string;
  code: string;
  title: string;
  durationMinutes: number;
  questionCount: number;
  password: string;
  assignedAt: string;
  maxAttempts: number;
}

const BANKS_KEY = "examguard-question-banks-v2";
const QUESTIONS_KEY = "examguard-bank-questions-v2";
const EXAMS_KEY = "examguard-generated-exams-v2";
const SNAPSHOTS_KEY = "examguard-exam-snapshots-v2";
const LOCAL_LIMIT_BYTES = 5 * 1024 * 1024;

function readLocal<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (cause) {
    if (cause instanceof DOMException && (cause.name === "QuotaExceededError" || cause.name === "NS_ERROR_DOM_QUOTA_REACHED")) {
      throw new Error("Dữ liệu đã đầy, không thể thêm file đề hoặc câu hỏi mới.");
    }
    throw cause;
  }
}

function friendlyError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("storage_full") || normalized.includes("read-only") || normalized.includes("disk") || normalized.includes("quota")) {
    return new Error("Dữ liệu đã đầy, không thể thêm file đề mới. Hãy xóa bản nháp không dùng hoặc nâng dung lượng Supabase.");
  }
  return new Error(message);
}

function seedLocal(teacher: TeacherIdentity) {
  const currentBanks = readLocal<QuestionBank[]>(BANKS_KEY, []);
  if (currentBanks.some((bank) => bank.teacherId === teacher.id)) return;
  const bankId = `bank-${teacher.id}-default`;
  const createdAt = new Date().toISOString();
  const bank: QuestionBank = {
    id: bankId,
    teacherId: teacher.id,
    name: "Ngân hàng An toàn thông tin",
    subject: "An toàn thông tin",
    description: "Bộ câu hỏi mẫu để thử tính năng tạo đề tự động.",
    questionCount: QUESTIONS.length,
    createdAt,
  };
  const seededQuestions: BankQuestion[] = QUESTIONS.map((question) => ({
    id: `demo-question-${question.id}`,
    teacherId: teacher.id,
    bankId,
    content: question.text,
    options: question.options,
    correctAnswer: question.answer ?? 0,
    difficulty: question.id <= 3 ? "easy" : question.id <= 7 ? "medium" : "hard",
    topic: "Kiến thức nền",
    createdAt,
  }));
  writeLocal(BANKS_KEY, [...currentBanks, bank]);
  writeLocal(QUESTIONS_KEY, [...readLocal<BankQuestion[]>(QUESTIONS_KEY, []), ...seededQuestions]);
}

function normalizeLocalExam(exam: GeneratedExam): GeneratedExam {
  return {
    ...exam,
    attemptCount: exam.attemptCount ?? 0,
    assignedAt: exam.assignedAt ?? exam.createdAt ?? new Date().toISOString(),
    maxAttempts: exam.maxAttempts ?? 1,
    status: exam.status ?? "draft",
  };
}

function seedDemoExamFiles() {
  const existing = readLocal<GeneratedExam[]>(EXAMS_KEY, []).map(normalizeLocalExam);
  if (existing.some((exam) => exam.status === "open" || exam.status === "closed")) {
    writeLocal(EXAMS_KEY, existing);
    return;
  }
  const createdAt = new Date().toISOString();
  const exams: GeneratedExam[] = [
    {
      id: "demo-open-exam",
      teacherId: "demo-teacher",
      bankId: "bank-demo-teacher-default",
      code: "ATTT-2026",
      title: "Kiểm tra giữa kỳ — An toàn thông tin",
      durationMinutes: 45,
      questionCount: QUESTIONS.length,
      status: "open",
      accessPassword: "246810",
      attemptCount: 0,
      assignedAt: createdAt,
      maxAttempts: 2,
      createdAt,
    },
    {
      id: "demo-closed-exam",
      teacherId: "demo-teacher",
      bankId: "bank-demo-teacher-default",
      code: "ATTT-2025",
      title: "Đề ôn tập học kỳ trước",
      durationMinutes: 30,
      questionCount: 6,
      status: "closed",
      accessPassword: "135790",
      attemptCount: 2,
      assignedAt: createdAt,
      maxAttempts: 1,
      createdAt,
    },
  ];
  const snapshots: Record<string, Question[]> = {
    "demo-open-exam": QUESTIONS,
    "demo-closed-exam": QUESTIONS.slice(0, 6),
  };
  writeLocal(EXAMS_KEY, [...exams, ...existing]);
  writeLocal(SNAPSHOTS_KEY, { ...readLocal<Record<string, Question[]>>(SNAPSHOTS_KEY, {}), ...snapshots });
}

function mapBank(row: Record<string, unknown>, questionCount = 0): QuestionBank {
  return {
    id: String(row.id), teacherId: String(row.teacher_id), name: String(row.name),
    subject: String(row.subject ?? ""), description: String(row.description ?? ""),
    questionCount, createdAt: String(row.created_at),
  };
}

function mapQuestion(row: Record<string, unknown>): BankQuestion {
  return {
    id: String(row.id), teacherId: String(row.teacher_id), bankId: String(row.bank_id),
    content: String(row.content), options: Array.isArray(row.options) ? row.options.map(String) : [],
    correctAnswer: Number(row.correct_answer), difficulty: row.difficulty as QuestionDifficulty,
    topic: String(row.topic ?? ""), createdAt: String(row.created_at),
  };
}

function mapExam(row: Record<string, unknown>, attemptCount = 0): GeneratedExam {
  return {
    id: String(row.id), teacherId: String(row.teacher_id), bankId: String(row.bank_id),
    code: String(row.code), title: String(row.title), durationMinutes: Number(row.duration_minutes),
    questionCount: Number(row.question_count), status: row.status as GeneratedExam["status"],
    attemptCount, assignedAt: String(row.assigned_at ?? row.created_at),
    maxAttempts: Number(row.max_attempts ?? 1), createdAt: String(row.created_at),
  };
}

export async function listQuestionBanks(teacher: TeacherIdentity): Promise<QuestionBank[]> {
  if (!isSupabaseConfigured() || teacher.isDemo) {
    seedLocal(teacher);
    const questions = readLocal<BankQuestion[]>(QUESTIONS_KEY, []);
    return readLocal<QuestionBank[]>(BANKS_KEY, []).filter((bank) => bank.teacherId === teacher.id)
      .map((bank) => ({ ...bank, questionCount: questions.filter((question) => question.bankId === bank.id).length }));
  }
  const supabase = getSupabaseBrowserClient();
  const [{ data: banks, error: bankError }, { data: questions, error: questionError }] = await Promise.all([
    supabase.from("question_banks").select("*").order("created_at", { ascending: true }),
    supabase.from("questions").select("bank_id"),
  ]);
  if (bankError) throw friendlyError(bankError.message);
  if (questionError) throw friendlyError(questionError.message);
  const counts = new Map<string, number>();
  for (const item of questions ?? []) counts.set(item.bank_id, (counts.get(item.bank_id) ?? 0) + 1);
  return (banks ?? []).map((row: Record<string, unknown>) => mapBank(row, counts.get(String(row.id)) ?? 0));
}

export async function createQuestionBank(teacher: TeacherIdentity, input: Pick<QuestionBank, "name" | "subject" | "description">) {
  if (!isSupabaseConfigured() || teacher.isDemo) {
    const bank: QuestionBank = { id: crypto.randomUUID(), teacherId: teacher.id, ...input, questionCount: 0, createdAt: new Date().toISOString() };
    writeLocal(BANKS_KEY, [...readLocal<QuestionBank[]>(BANKS_KEY, []), bank]);
    return bank;
  }
  const { data, error } = await getSupabaseBrowserClient().from("question_banks").insert({ teacher_id: teacher.id, ...input }).select().single();
  if (error) throw friendlyError(error.message);
  return mapBank(data);
}

export async function listBankQuestions(teacher: TeacherIdentity, bankId: string): Promise<BankQuestion[]> {
  if (!isSupabaseConfigured() || teacher.isDemo) {
    seedLocal(teacher);
    return readLocal<BankQuestion[]>(QUESTIONS_KEY, []).filter((question) => question.teacherId === teacher.id && question.bankId === bankId);
  }
  const { data, error } = await getSupabaseBrowserClient().from("questions").select("*").eq("bank_id", bankId).order("created_at", { ascending: false });
  if (error) throw friendlyError(error.message);
  return (data ?? []).map(mapQuestion);
}

export async function addQuestions(teacher: TeacherIdentity, bankId: string, inputs: QuestionInput[]): Promise<number> {
  if (!inputs.length) return 0;
  if (!isSupabaseConfigured() || teacher.isDemo) {
    const createdAt = new Date().toISOString();
    const rows: BankQuestion[] = inputs.map((input) => ({ id: crypto.randomUUID(), teacherId: teacher.id, bankId, ...input, difficulty: "medium", topic: "", createdAt }));
    writeLocal(QUESTIONS_KEY, [...rows, ...readLocal<BankQuestion[]>(QUESTIONS_KEY, [])]);
    return rows.length;
  }
  const rows = inputs.map((input) => ({ teacher_id: teacher.id, bank_id: bankId, content: input.content, options: input.options, correct_answer: input.correctAnswer }));
  const { error } = await getSupabaseBrowserClient().from("questions").insert(rows);
  if (error) throw friendlyError(error.message);
  return rows.length;
}

export async function deleteQuestion(teacher: TeacherIdentity, questionId: string) {
  if (!isSupabaseConfigured() || teacher.isDemo) {
    writeLocal(QUESTIONS_KEY, readLocal<BankQuestion[]>(QUESTIONS_KEY, []).filter((question) => !(question.teacherId === teacher.id && question.id === questionId)));
    return;
  }
  const { error } = await getSupabaseBrowserClient().from("questions").delete().eq("id", questionId);
  if (error) throw friendlyError(error.message);
}

function shuffle<T>(values: T[]) {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
}

export async function getStorageStatus(teacher: TeacherIdentity): Promise<StorageStatus> {
  if (!isSupabaseConfigured() || teacher.isDemo) {
    const usedBytes = [BANKS_KEY, QUESTIONS_KEY, EXAMS_KEY, SNAPSHOTS_KEY]
      .reduce((sum, key) => sum + new Blob([window.localStorage.getItem(key) ?? ""]).size, 0);
    const percent = Math.min(100, Math.round((usedBytes / LOCAL_LIMIT_BYTES) * 1000) / 10);
    return { usedBytes, limitBytes: LOCAL_LIMIT_BYTES, percent, full: usedBytes >= LOCAL_LIMIT_BYTES * 0.98 };
  }
  const { data, error } = await getSupabaseBrowserClient().rpc("examguard_storage_status");
  if (error) throw friendlyError(error.message);
  const row = data?.[0];
  return { usedBytes: Number(row?.used_bytes ?? 0), limitBytes: Number(row?.limit_bytes ?? 0), percent: Number(row?.percent ?? 0), full: Boolean(row?.full) };
}

export async function createGeneratedExam(teacher: TeacherIdentity, input: ExamInput): Promise<GeneratedExam> {
  const storage = await getStorageStatus(teacher);
  if (storage.full) throw new Error("Dữ liệu đã đầy, không thể thêm file đề mới.");
  if (!isSupabaseConfigured() || teacher.isDemo) {
    const available = await listBankQuestions(teacher, input.bankId);
    if (available.length < input.questionCount) throw new Error("Ngân hàng chưa đủ số câu để tạo đề.");
    const selected = shuffle(available).slice(0, input.questionCount);
    const exam: GeneratedExam = {
      id: crypto.randomUUID(), teacherId: teacher.id, bankId: input.bankId,
      code: input.code.trim().toUpperCase(), title: input.title.trim(), durationMinutes: input.durationMinutes,
      questionCount: input.questionCount, status: "draft", accessPassword: input.password,
      attemptCount: 0, assignedAt: input.assignedAt, maxAttempts: input.maxAttempts,
      createdAt: new Date().toISOString(),
    };
    const snapshots = readLocal<Record<string, Question[]>>(SNAPSHOTS_KEY, {});
    snapshots[exam.id] = selected.map((question, index) => ({ id: index + 1, text: question.content, options: question.options, answer: question.correctAnswer }));
    writeLocal(EXAMS_KEY, [exam, ...readLocal<GeneratedExam[]>(EXAMS_KEY, []).map(normalizeLocalExam)]);
    writeLocal(SNAPSHOTS_KEY, snapshots);
    return exam;
  }
  const { data, error } = await getSupabaseBrowserClient().rpc("create_exam_file", {
    p_bank_id: input.bankId, p_code: input.code.trim().toUpperCase(), p_title: input.title.trim(),
    p_duration_minutes: input.durationMinutes, p_question_count: input.questionCount, p_password: input.password,
    p_assigned_at: input.assignedAt, p_max_attempts: input.maxAttempts,
  });
  if (error) throw friendlyError(error.message);
  return mapExam(data as Record<string, unknown>);
}

export async function listTeacherExams(teacher: TeacherIdentity): Promise<GeneratedExam[]> {
  if (!isSupabaseConfigured() || teacher.isDemo) {
    seedDemoExamFiles();
    return readLocal<GeneratedExam[]>(EXAMS_KEY, []).map(normalizeLocalExam).filter((exam) => exam.teacherId === teacher.id || teacher.id === "demo-teacher");
  }
  const supabase = getSupabaseBrowserClient();
  const [{ data: exams, error: examError }, { data: attempts, error: attemptError }] = await Promise.all([
    supabase.from("exams").select("*").order("created_at", { ascending: false }),
    supabase.from("exam_attempts").select("exam_id"),
  ]);
  if (examError) throw friendlyError(examError.message);
  if (attemptError) throw friendlyError(attemptError.message);
  const counts = new Map<string, number>();
  for (const attempt of attempts ?? []) counts.set(attempt.exam_id, (counts.get(attempt.exam_id) ?? 0) + 1);
  return (exams ?? []).map((row: Record<string, unknown>) => mapExam(row, counts.get(String(row.id)) ?? 0));
}

export async function setExamStatus(teacher: TeacherIdentity, examId: string, status: "open" | "closed" | "archived") {
  if (!isSupabaseConfigured() || teacher.isDemo) {
    const exams = readLocal<GeneratedExam[]>(EXAMS_KEY, []).map(normalizeLocalExam);
    const exam = exams.find((item) => item.id === examId && (item.teacherId === teacher.id || teacher.id === "demo-teacher"));
    if (!exam) throw new Error("Không tìm thấy file đề.");
    if (exam.status === "archived") throw new Error("File đã lưu trữ không thể mở lại.");
    if (status === "archived" && exam.status !== "closed") throw new Error("Cần khóa đề trước khi lưu trữ.");
    writeLocal(EXAMS_KEY, exams.map((item) => item.id === examId ? { ...item, status } : item));
    return;
  }
  const { error } = await getSupabaseBrowserClient().rpc("set_exam_file_status", { p_exam_id: examId, p_status: status });
  if (error) throw friendlyError(error.message);
}

export async function updateExamDeliverySettings(teacher: TeacherIdentity, examId: string, assignedAt: string, maxAttempts: number) {
  if (!isSupabaseConfigured() || teacher.isDemo) {
    const exams = readLocal<GeneratedExam[]>(EXAMS_KEY, []).map(normalizeLocalExam);
    const exam = exams.find((item) => item.id === examId && (item.teacherId === teacher.id || teacher.id === "demo-teacher"));
    if (!exam) throw new Error("Không tìm thấy file đề.");
    writeLocal(EXAMS_KEY, exams.map((item) => item.id === examId ? { ...item, assignedAt, maxAttempts } : item));
    return;
  }
  const { error } = await getSupabaseBrowserClient().rpc("update_exam_delivery_settings", {
    p_exam_id: examId,
    p_assigned_at: assignedAt,
    p_max_attempts: maxAttempts,
  });
  if (error) throw friendlyError(error.message);
}

export async function deleteDraftExam(teacher: TeacherIdentity, examId: string) {
  if (!isSupabaseConfigured() || teacher.isDemo) {
    const exams = readLocal<GeneratedExam[]>(EXAMS_KEY, []).map(normalizeLocalExam);
    const exam = exams.find((item) => item.id === examId);
    if (!exam || exam.status !== "draft" || exam.attemptCount > 0) throw new Error("Chỉ được xóa file đề nháp chưa có bài làm.");
    writeLocal(EXAMS_KEY, exams.filter((item) => item.id !== examId));
    const snapshots = readLocal<Record<string, Question[]>>(SNAPSHOTS_KEY, {});
    delete snapshots[examId];
    writeLocal(SNAPSHOTS_KEY, snapshots);
    return;
  }
  const { error } = await getSupabaseBrowserClient().rpc("delete_draft_exam_file", { p_exam_id: examId });
  if (error) throw friendlyError(error.message);
}

export async function listStudentExamFiles(student: StudentCredential): Promise<StudentExamSummary[]> {
  if (!isSupabaseConfigured()) {
    seedDemoExamFiles();
    return readLocal<GeneratedExam[]>(EXAMS_KEY, []).map(normalizeLocalExam)
      .filter((exam) => exam.status === "open" || exam.status === "closed")
      .map((exam) => ({
        id: exam.id, code: exam.code, title: exam.title, teacherName: DEMO_TEACHER.name,
        durationMinutes: exam.durationMinutes, questionCount: exam.questionCount,
        status: exam.status as "open" | "closed", assignedAt: exam.assignedAt,
        maxAttempts: exam.maxAttempts, attemptCount: 0, hasActiveAttempt: false,
      }));
  }
  const { data, error } = await getSupabaseBrowserClient().rpc("list_student_exam_files", {
    p_student_id: student.id,
    p_account_password: student.password,
  });
  if (error) throw friendlyError(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id), code: String(row.code), title: String(row.title), teacherName: String(row.teacher_name),
    durationMinutes: Number(row.duration_minutes), questionCount: Number(row.question_count), status: row.status as "open" | "closed",
    assignedAt: String(row.assigned_at), maxAttempts: Number(row.max_attempts),
    attemptCount: Number(row.attempt_count), hasActiveAttempt: Boolean(row.has_active_attempt),
  }));
}

export async function unlockStudentExam(student: StudentCredential, examId: string, password: string): Promise<ActiveExam> {
  if (!isSupabaseConfigured()) {
    seedDemoExamFiles();
    const exams = readLocal<GeneratedExam[]>(EXAMS_KEY, []).map(normalizeLocalExam);
    const exam = exams.find((item) => item.id === examId);
    if (!exam) throw new Error("Không tìm thấy file đề.");
    if (exam.status !== "open") throw new Error("File đề đang bị khóa.");
    if (exam.accessPassword !== password) throw new Error("Mật khẩu file đề chưa đúng.");
    writeLocal(EXAMS_KEY, exams.map((item) => item.id === examId ? { ...item, attemptCount: item.attemptCount + 1 } : item));
    const questions = readLocal<Record<string, Question[]>>(SNAPSHOTS_KEY, {})[examId] ?? QUESTIONS;
    const localAttemptId = `attempt-${exam.id}-${student.id}`;
    const localAttemptsKey = `examguard-attempts-${exam.id}-${student.id}`;
    const localAttempt = readLocal<{ attemptNumber: number; answers: Record<number, number>; startedAt: string } | null>(localAttemptsKey, null);
    const attemptsUsed = localAttempt?.attemptNumber ?? 0;
    if (new Date(exam.assignedAt).getTime() > Date.now()) throw new Error("Đề chưa đến ngày giao.");
    if (!localAttempt && attemptsUsed >= exam.maxAttempts) throw new Error(`Bạn đã sử dụng hết ${exam.maxAttempts} lượt làm bài.`);
    const startedAt = localAttempt?.startedAt ?? new Date().toISOString();
    const attemptNumber = localAttempt?.attemptNumber ?? 1;
    if (!localAttempt) writeLocal(localAttemptsKey, { attemptNumber, answers: {}, startedAt });
    return {
      id: exam.id, code: exam.code, title: exam.title, teacherName: DEMO_TEACHER.name,
      durationMinutes: exam.durationMinutes, questionCount: exam.questionCount, status: "open",
      assignedAt: exam.assignedAt, maxAttempts: exam.maxAttempts, attemptCount: attemptNumber,
      hasActiveAttempt: true, questions, attemptId: localAttemptId, attemptNumber, startedAt,
      remainingSeconds: Math.max(0, exam.durationMinutes * 60 - Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)),
      savedAnswers: localAttempt?.answers ?? {},
    };
  }
  const { data, error } = await getSupabaseBrowserClient().rpc("unlock_exam_file", {
    p_exam_id: examId,
    p_student_id: student.id,
    p_account_password: student.password,
    p_exam_password: password,
  });
  if (error) throw friendlyError(error.message);
  return data as ActiveExam;
}
