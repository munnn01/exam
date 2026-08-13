# ExamGuard

Website thi trực tuyến nhiều giảng viên, có ngân hàng câu hỏi riêng và giám sát phía trình duyệt, triển khai tại [examguard-phi.vercel.app](https://examguard-phi.vercel.app).

## Tài khoản demo

- Giảng viên: `giangvien@demo.vn` / `demo123`
- Sinh viên: mã đề `ATTT-2026`, mã sinh viên `SV001`, mật khẩu `246810`

## Tính năng

- Dashboard giảng viên, cấp/đổi mật khẩu, xuất danh sách CSV và xem nhật ký vi phạm.
- Quản trị viên cấp tài khoản giảng viên trực tiếp trong Supabase Auth; website chỉ cho đăng nhập và không gửi email xác nhận.
- Tạo nhiều ngân hàng câu hỏi, nhập CSV, thêm/xóa câu và sinh đề ngẫu nhiên có snapshot.
- Sinh viên không cần tài khoản: nhập mã sinh viên bất kỳ, xem danh sách đề đang mở/đã khóa và nhập mật khẩu riêng của file đề.
- Giảng viên tự đặt mật khẩu cho từng file đề và gửi mật khẩu đó cho sinh viên.
- File đề có vòng đời nháp → mở → khóa → lưu trữ; chỉ nháp chưa có lượt làm được xóa.
- Hiển thị dung lượng và tự chặn tạo file đề khi database gần đầy.
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

Khi chưa đặt biến Supabase, ứng dụng tự chạy ở chế độ demo bằng `localStorage`. Khi đã kết nối Supabase, tài khoản và ngân hàng câu hỏi dùng PostgreSQL thật.

## Kết nối Supabase

1. Kết nối Supabase vào project Vercel hoặc tạo project tại Supabase.
2. Sao chép `.env.example` thành `.env.local` và điền các biến môi trường.
3. Chạy `pnpm db:migrate` để tạo bảng, trigger và chính sách RLS.
4. Trong Supabase Auth, thêm `https://examguard-phi.vercel.app/**` vào Redirect URLs.

Để cấp tài khoản giảng viên, vào **Supabase → Authentication → Users → Add user → Create new user**, nhập email/mật khẩu và bật **Auto Confirm User**. Website không mở đăng ký công khai.

Tải file `mau-cau-hoi.csv` ngay cạnh nút **Nhập CSV**. File có 6 cột: `content`, `option_a`, `option_b`, `option_c`, `option_d`, `correct_answer`; đáp án đúng nhận `A`, `B`, `C`, `D` hoặc `1`, `2`, `3`, `4`. Khi chọn file hợp lệ, hệ thống tự động tạo toàn bộ câu hỏi và đáp án.

Giới hạn mặc định trong `examguard_settings` là 500 MB, phù hợp Supabase Free. Khi nâng gói, cập nhật `database_limit_bytes` theo dung lượng database mới.
