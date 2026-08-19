export type AppView = "login" | "teacher" | "student-portal" | "preflight" | "exam" | "finished";

export type ViolationType =
  | "TAB_HIDDEN"
  | "WINDOW_BLUR"
  | "EXIT_FULLSCREEN"
  | "COPY_ATTEMPT"
  | "PASTE_ATTEMPT"
  | "CUT_ATTEMPT"
  | "NO_FACE"
  | "MULTIPLE_FACES"
  | "LOOK_AWAY"
  | "PHONE_DETECTED"
  | "CAMERA_OFF"
  | "SCREEN_SHARE_STOPPED";

export type Severity = "low" | "medium" | "high";

export interface ProctorEvent {
  id: string;
  type: ViolationType;
  severity: Severity;
  occurredAt: string;
  durationMs?: number;
  confidence?: number;
  detail: string;
  snapshot?: string;
  studentId: string;
  studentName: string;
  examCode: string;
}

export interface StudentCredential {
  id: string;
  name: string;
  password: string;
  examCode: string;
  status: "Chưa thi" | "Đang thi" | "Đã nộp";
}

export interface Question {
  id: number;
  text: string;
  options: string[];
  answer?: number;
}

export interface TeacherIdentity {
  id: string;
  email: string;
  name: string;
  isDemo?: boolean;
}

export type QuestionDifficulty = "easy" | "medium" | "hard";

export interface QuestionBank {
  id: string;
  teacherId: string;
  name: string;
  subject: string;
  description: string;
  questionCount: number;
  createdAt: string;
}

export interface BankQuestion {
  id: string;
  teacherId: string;
  bankId: string;
  content: string;
  options: string[];
  correctAnswer: number;
  difficulty: QuestionDifficulty;
  topic: string;
  createdAt: string;
}

export interface GeneratedExam {
  id: string;
  teacherId: string;
  bankId: string;
  code: string;
  title: string;
  durationMinutes: number;
  questionCount: number;
  status: "draft" | "open" | "closed" | "archived";
  accessPassword?: string;
  attemptCount: number;
  assignedAt: string;
  maxAttempts: number;
  showAnswers: boolean;
  createdAt: string;
}

export interface StudentExamSummary {
  id: string;
  code: string;
  title: string;
  teacherName: string;
  durationMinutes: number;
  questionCount: number;
  status: "open" | "closed";
  assignedAt: string;
  maxAttempts: number;
  attemptCount: number;
  hasActiveAttempt: boolean;
  showAnswers: boolean;
}

export interface ActiveExam extends StudentExamSummary {
  questions: Question[];
  attemptId: string;
  attemptNumber: number;
  startedAt: string;
  remainingSeconds: number;
  savedAnswers: Record<number, number>;
}

export interface ExamSubmissionResult {
  score: number | null;
  total: number;
  answers: Record<number, number>;
  showAnswers: boolean;
  correctAnswers: Record<number, number> | null;
}

export interface ExamAttemptSummary {
  id: string;
  examId: string;
  examCode: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  attemptNumber: number;
  startedAt: string;
  lastSavedAt?: string;
  submittedAt?: string;
  score?: number;
  questionCount: number;
  answeredCount: number;
}

export interface AttemptQuestionDetail {
  position: number;
  content: string;
  options: string[];
  correctAnswer: number;
  selectedAnswer?: number;
}

export interface AnswerHistoryEntry {
  questionPosition: number;
  selectedAnswer: number;
  changedAt: string;
}

export interface ExamAttemptDetail extends ExamAttemptSummary {
  questions: AttemptQuestionDetail[];
  history: AnswerHistoryEntry[];
}

export interface StorageStatus {
  usedBytes: number;
  limitBytes: number;
  percent: number;
  full: boolean;
}

export interface MonitorStatus {
  camera: "starting" | "active" | "blocked" | "off";
  ai: "loading" | "active" | "limited";
  faceCount: number;
  phoneDetected: boolean;
  gaze: "center" | "away" | "unknown";
  detail: string;
}

export type IeltsSkill = "listening" | "reading" | "writing" | "speaking";

export interface IeltsProgressRecord {
  skill: IeltsSkill;
  moduleId: string;
  payload: Record<string, unknown>;
  score: number | null;
  completed: boolean;
  updatedAt: string;
}

export interface TeacherIeltsProgressSummary {
  studentId: string;
  studentName: string;
  listeningCompleted: number;
  readingCompleted: number;
  writingCompleted: number;
  speakingCompleted: number;
  listeningBestScore: number | null;
  readingBestScore: number | null;
  lastPracticedAt: string | null;
}
