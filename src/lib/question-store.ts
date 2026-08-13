"use client";

import { QUESTIONS } from "./demo-data";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "./supabase/client";
import type { BankQuestion, GeneratedExam, QuestionBank, QuestionDifficulty, TeacherIdentity } from "./types";

export interface QuestionInput {
  content: string;
  options: string[];
  correctAnswer: number;
  difficulty: QuestionDifficulty;
  topic: string;
}

export interface ExamInput {
  bankId: string;
  code: string;
  title: string;
  durationMinutes: number;
  questionCount: number;
}

const BANKS_KEY = "examguard-question-banks-v2";
const QUESTIONS_KEY = "examguard-bank-questions-v2";
const EXAMS_KEY = "examguard-generated-exams-v2";

function readLocal<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
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
    correctAnswer: question.answer,
    difficulty: question.id <= 3 ? "easy" : question.id <= 7 ? "medium" : "hard",
    topic: "Kiến thức nền",
    createdAt,
  }));

  writeLocal(BANKS_KEY, [...currentBanks, bank]);
  writeLocal(QUESTIONS_KEY, [...readLocal<BankQuestion[]>(QUESTIONS_KEY, []), ...seededQuestions]);
}

function mapBank(row: Record<string, unknown>, questionCount = 0): QuestionBank {
  return {
    id: String(row.id),
    teacherId: String(row.teacher_id),
    name: String(row.name),
    subject: String(row.subject ?? ""),
    description: String(row.description ?? ""),
    questionCount,
    createdAt: String(row.created_at),
  };
}

function mapQuestion(row: Record<string, unknown>): BankQuestion {
  return {
    id: String(row.id),
    teacherId: String(row.teacher_id),
    bankId: String(row.bank_id),
    content: String(row.content),
    options: Array.isArray(row.options) ? row.options.map(String) : [],
    correctAnswer: Number(row.correct_answer),
    difficulty: row.difficulty as QuestionDifficulty,
    topic: String(row.topic ?? ""),
    createdAt: String(row.created_at),
  };
}

export async function listQuestionBanks(teacher: TeacherIdentity): Promise<QuestionBank[]> {
  if (!isSupabaseConfigured() || teacher.isDemo) {
    seedLocal(teacher);
    const questions = readLocal<BankQuestion[]>(QUESTIONS_KEY, []);
    return readLocal<QuestionBank[]>(BANKS_KEY, [])
      .filter((bank) => bank.teacherId === teacher.id)
      .map((bank) => ({ ...bank, questionCount: questions.filter((question) => question.bankId === bank.id).length }));
  }

  const supabase = getSupabaseBrowserClient();
  const [{ data: banks, error: bankError }, { data: questions, error: questionError }] = await Promise.all([
    supabase.from("question_banks").select("*").order("created_at", { ascending: true }),
    supabase.from("questions").select("bank_id"),
  ]);
  if (bankError) throw new Error(bankError.message);
  if (questionError) throw new Error(questionError.message);
  const counts = new Map<string, number>();
  for (const item of questions ?? []) counts.set(item.bank_id, (counts.get(item.bank_id) ?? 0) + 1);
  return (banks ?? []).map((row: Record<string, unknown>) => mapBank(row, counts.get(String(row.id)) ?? 0));
}

export async function createQuestionBank(teacher: TeacherIdentity, input: Pick<QuestionBank, "name" | "subject" | "description">) {
  if (!isSupabaseConfigured() || teacher.isDemo) {
    const bank: QuestionBank = {
      id: crypto.randomUUID(),
      teacherId: teacher.id,
      ...input,
      questionCount: 0,
      createdAt: new Date().toISOString(),
    };
    writeLocal(BANKS_KEY, [...readLocal<QuestionBank[]>(BANKS_KEY, []), bank]);
    return bank;
  }

  const { data, error } = await getSupabaseBrowserClient().from("question_banks").insert({
    teacher_id: teacher.id,
    name: input.name,
    subject: input.subject,
    description: input.description,
  }).select().single();
  if (error) throw new Error(error.message);
  return mapBank(data);
}

export async function listBankQuestions(teacher: TeacherIdentity, bankId: string): Promise<BankQuestion[]> {
  if (!isSupabaseConfigured() || teacher.isDemo) {
    seedLocal(teacher);
    return readLocal<BankQuestion[]>(QUESTIONS_KEY, []).filter(
      (question) => question.teacherId === teacher.id && question.bankId === bankId,
    );
  }

  const { data, error } = await getSupabaseBrowserClient().from("questions").select("*")
    .eq("bank_id", bankId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapQuestion);
}

export async function addQuestions(teacher: TeacherIdentity, bankId: string, inputs: QuestionInput[]): Promise<number> {
  if (!inputs.length) return 0;
  if (!isSupabaseConfigured() || teacher.isDemo) {
    const createdAt = new Date().toISOString();
    const rows: BankQuestion[] = inputs.map((input) => ({
      id: crypto.randomUUID(),
      teacherId: teacher.id,
      bankId,
      ...input,
      createdAt,
    }));
    writeLocal(QUESTIONS_KEY, [...rows, ...readLocal<BankQuestion[]>(QUESTIONS_KEY, [])]);
    return rows.length;
  }

  const rows = inputs.map((input) => ({
    teacher_id: teacher.id,
    bank_id: bankId,
    content: input.content,
    options: input.options,
    correct_answer: input.correctAnswer,
    difficulty: input.difficulty,
    topic: input.topic,
  }));
  const { error } = await getSupabaseBrowserClient().from("questions").insert(rows);
  if (error) throw new Error(error.message);
  return rows.length;
}

export async function deleteQuestion(teacher: TeacherIdentity, questionId: string) {
  if (!isSupabaseConfigured() || teacher.isDemo) {
    writeLocal(QUESTIONS_KEY, readLocal<BankQuestion[]>(QUESTIONS_KEY, []).filter(
      (question) => !(question.teacherId === teacher.id && question.id === questionId),
    ));
    return;
  }
  const { error } = await getSupabaseBrowserClient().from("questions").delete().eq("id", questionId);
  if (error) throw new Error(error.message);
}

function shuffle<T>(values: T[]) {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
}

export async function createGeneratedExam(teacher: TeacherIdentity, input: ExamInput): Promise<GeneratedExam> {
  const available = await listBankQuestions(teacher, input.bankId);
  if (available.length < input.questionCount) throw new Error("Ngân hàng chưa đủ số câu để tạo đề.");
  const selected = shuffle(available).slice(0, input.questionCount);
  const createdAt = new Date().toISOString();

  if (!isSupabaseConfigured() || teacher.isDemo) {
    const exam: GeneratedExam = {
      id: crypto.randomUUID(), teacherId: teacher.id, bankId: input.bankId,
      code: input.code, title: input.title, durationMinutes: input.durationMinutes,
      questionCount: input.questionCount, status: "draft", createdAt,
    };
    writeLocal(EXAMS_KEY, [exam, ...readLocal<GeneratedExam[]>(EXAMS_KEY, [])]);
    return exam;
  }

  const supabase = getSupabaseBrowserClient();
  const { data: examRow, error: examError } = await supabase.from("exams").insert({
    teacher_id: teacher.id,
    bank_id: input.bankId,
    code: input.code.trim().toUpperCase(),
    title: input.title.trim(),
    duration_minutes: input.durationMinutes,
    question_count: input.questionCount,
    status: "draft",
  }).select().single();
  if (examError) throw new Error(examError.message);

  const examQuestions = selected.map((question, index) => ({
    exam_id: examRow.id,
    teacher_id: teacher.id,
    question_id: question.id,
    position: index + 1,
    content_snapshot: question.content,
    options_snapshot: question.options,
    correct_answer_snapshot: question.correctAnswer,
  }));
  const { error: itemsError } = await supabase.from("exam_questions").insert(examQuestions);
  if (itemsError) {
    await supabase.from("exams").delete().eq("id", examRow.id);
    throw new Error(itemsError.message);
  }

  return {
    id: examRow.id,
    teacherId: examRow.teacher_id,
    bankId: examRow.bank_id,
    code: examRow.code,
    title: examRow.title,
    durationMinutes: examRow.duration_minutes,
    questionCount: examRow.question_count,
    status: examRow.status,
    createdAt: examRow.created_at,
  };
}
