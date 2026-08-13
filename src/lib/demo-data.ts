import type { ProctorEvent, Question, StudentCredential } from "./types";

export const DEMO_TEACHER = {
  email: "giangvien@demo.vn",
  password: "demo123",
  name: "Nguyễn Minh Anh",
};

export const DEFAULT_STUDENTS: StudentCredential[] = [
  { id: "SV001", name: "Trần Gia Bảo", password: "246810", examCode: "ATTT-2026", status: "Chưa thi" },
  { id: "SV002", name: "Lê Hoàng Nam", password: "834921", examCode: "ATTT-2026", status: "Đang thi" },
  { id: "SV003", name: "Phạm Ngọc Linh", password: "519472", examCode: "ATTT-2026", status: "Đã nộp" },
  { id: "SV004", name: "Vũ Minh Khang", password: "730185", examCode: "ATTT-2026", status: "Chưa thi" },
];

export const DEMO_EVENTS: ProctorEvent[] = [
  {
    id: "seed-1",
    type: "LOOK_AWAY",
    severity: "medium",
    occurredAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    durationMs: 3400,
    detail: "Nhìn lệch khỏi màn hình trong 3,4 giây",
    studentId: "SV002",
    studentName: "Lê Hoàng Nam",
    examCode: "ATTT-2026",
  },
  {
    id: "seed-2",
    type: "TAB_HIDDEN",
    severity: "high",
    occurredAt: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
    detail: "Rời khỏi trang thi",
    studentId: "SV002",
    studentName: "Lê Hoàng Nam",
    examCode: "ATTT-2026",
  },
];

export const QUESTIONS: Question[] = [
  {
    id: 1,
    text: "Mục tiêu chính của nguyên tắc đặc quyền tối thiểu (Least Privilege) là gì?",
    options: [
      "Cấp mọi quyền để tránh gián đoạn công việc",
      "Chỉ cấp đúng quyền cần thiết trong thời gian cần thiết",
      "Dùng chung một tài khoản quản trị",
      "Tắt toàn bộ nhật ký truy cập",
    ],
    answer: 1,
  },
  {
    id: 2,
    text: "Thuộc tính nào bảo đảm dữ liệu không bị sửa đổi trái phép?",
    options: ["Tính bí mật", "Tính sẵn sàng", "Tính toàn vẹn", "Tính tiện dụng"],
    answer: 2,
  },
  {
    id: 3,
    text: "Cách lưu mật khẩu nào phù hợp nhất cho một hệ thống mới?",
    options: ["Plain text", "Base64", "Argon2id kèm salt riêng", "MD5 một lần"],
    answer: 2,
  },
  {
    id: 4,
    text: "Xác thực đa yếu tố yêu cầu điều gì?",
    options: [
      "Hai mật khẩu khác nhau",
      "Ít nhất hai yếu tố thuộc các nhóm độc lập",
      "Đổi mật khẩu mỗi ngày",
      "Chỉ dùng sinh trắc học",
    ],
    answer: 1,
  },
  {
    id: 5,
    text: "HTTPS chủ yếu bảo vệ dữ liệu ở trạng thái nào?",
    options: ["Đang truyền", "Đang lưu trên đĩa", "Đã xóa", "Đang in"],
    answer: 0,
  },
  {
    id: 6,
    text: "Một email thúc giục nhập mật khẩu qua liên kết lạ có khả năng là dạng tấn công nào?",
    options: ["Phishing", "DDoS", "SQL backup", "Load balancing"],
    answer: 0,
  },
  {
    id: 7,
    text: "Biện pháp nào giảm rủi ro từ SQL Injection hiệu quả nhất?",
    options: ["Đổi màu giao diện", "Prepared statements", "Nén ảnh", "Tăng timeout"],
    answer: 1,
  },
  {
    id: 8,
    text: "Nhật ký bảo mật nên ưu tiên ghi nhận thông tin nào?",
    options: ["Mật khẩu người dùng", "Sự kiện xác thực và hành động quan trọng", "Toàn bộ clipboard", "Nội dung khóa bí mật"],
    answer: 1,
  },
  {
    id: 9,
    text: "Khi phát hiện một sự kiện bất thường, hệ thống giám sát nên làm gì trước tiên?",
    options: ["Tự động kết tội", "Ghi bằng chứng có ngữ cảnh để xem xét", "Xóa tài khoản", "Công khai ảnh webcam"],
    answer: 1,
  },
  {
    id: 10,
    text: "Sao lưu ngoại tuyến giúp giảm tác động của loại mã độc nào rõ nhất?",
    options: ["Ransomware", "Adware trình duyệt", "Cookie", "CSS injection"],
    answer: 0,
  },
];

export const EXAM = {
  code: "ATTT-2026",
  title: "Kiểm tra giữa kỳ — An toàn thông tin",
  subject: "An toàn thông tin cơ bản",
  durationMinutes: 45,
  teacher: DEMO_TEACHER.name,
};

export const VIOLATION_LABELS: Record<string, string> = {
  TAB_HIDDEN: "Rời trang thi",
  WINDOW_BLUR: "Mất tiêu điểm cửa sổ",
  EXIT_FULLSCREEN: "Thoát toàn màn hình",
  COPY_ATTEMPT: "Sao chép nội dung",
  PASTE_ATTEMPT: "Dán nội dung",
  CUT_ATTEMPT: "Cắt nội dung",
  NO_FACE: "Không thấy khuôn mặt",
  MULTIPLE_FACES: "Có người thứ hai",
  LOOK_AWAY: "Nhìn lệch",
  PHONE_DETECTED: "Phát hiện điện thoại",
  CAMERA_OFF: "Camera bị tắt",
  SCREEN_SHARE_STOPPED: "Dừng chia sẻ màn hình",
};
