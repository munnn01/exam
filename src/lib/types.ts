export type AppView = "login" | "teacher" | "preflight" | "exam" | "finished";

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
  | "CAMERA_OFF";

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
  answer: number;
}

export interface MonitorStatus {
  camera: "starting" | "active" | "blocked" | "off";
  ai: "loading" | "active" | "limited";
  faceCount: number;
  phoneDetected: boolean;
  gaze: "center" | "away" | "unknown";
  detail: string;
}
