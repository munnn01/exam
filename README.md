# ExamGuard

Website thi trực tuyến có giám sát phía trình duyệt, triển khai tại [examguard-phi.vercel.app](https://examguard-phi.vercel.app).

## Tài khoản demo

- Giảng viên: `giangvien@demo.vn` / `demo123`
- Sinh viên: mã đề `ATTT-2026`, mã sinh viên `SV001`, mật khẩu `246810`

## Tính năng

- Dashboard giảng viên, cấp/đổi mật khẩu, xuất danh sách CSV và xem nhật ký vi phạm.
- Phòng thi 45 phút với 10 câu hỏi, lưu đáp án, đánh dấu câu và nộp bài.
- Ghi nhận rời tab, mất fullscreen, copy/cut/paste và mở menu chuột phải.
- Phát hiện không thấy mặt, nhiều khuôn mặt, nhìn lệch kéo dài và điện thoại bằng MediaPipe chạy ngay trong trình duyệt.
- Không xác minh danh tính và không thu âm.

## Chạy local

```bash
pnpm install
pnpm dev
```

Mở `http://localhost:3000`.

## Triển khai Vercel

```bash
pnpm dlx vercel --prod
```

Đây là prototype dùng `localStorage`, vì vậy dữ liệu và nhật ký chỉ tồn tại trong từng trình duyệt. Để dùng thật trên nhiều thiết bị cần kết nối cơ sở dữ liệu và xác thực phía máy chủ.
