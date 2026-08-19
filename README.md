# ExamGuard

Website thi trực tuyến nhiều giảng viên, có ngân hàng câu hỏi riêng và giám sát phía trình duyệt, triển khai tại [examguard-phi.vercel.app](https://examguard-phi.vercel.app).

## Tài khoản demo khi chạy local

- Giảng viên: `giangvien@demo.vn` / `demo123`
- Sinh viên: mã `SV001`, mật khẩu tài khoản `246810`; mật khẩu file đề `246810`

## Tính năng

- Dashboard giảng viên, cấp/đổi mật khẩu, xuất danh sách CSV và xem nhật ký giám sát riêng theo từng giảng viên.
- Quản trị viên cấp tài khoản giảng viên trực tiếp trong Supabase Auth; website chỉ cho đăng nhập và không gửi email xác nhận.
- Tạo nhiều ngân hàng câu hỏi, nhập CSV, thêm/xóa câu và sinh đề ngẫu nhiên có snapshot.
- Mỗi giảng viên tự cấp, đổi hoặc xóa tài khoản sinh viên gồm mã sinh viên, họ tên và mật khẩu đăng nhập.
- Sinh viên đăng nhập bằng tài khoản được cấp, chỉ thấy đề của giảng viên đó và nhập thêm mật khẩu riêng khi mở file đề.
- Giảng viên tự đặt mật khẩu cho từng file đề và gửi mật khẩu đó cho sinh viên.
- Giảng viên đặt ngày/giờ giao và số lượt làm tối đa riêng cho từng file đề.
- Mỗi đề chọn chế độ sinh viên được xem hoặc không được xem điểm và đáp án đúng sau khi nộp.
- Phương án A–D được tráo và lưu riêng cho từng lượt làm; tải lại không làm đổi thứ tự.
- File đề có vòng đời nháp → mở → khóa → lưu trữ; chỉ nháp chưa có lượt làm được xóa.
- Hiển thị dung lượng và tự chặn tạo file đề khi database gần đầy.
- Phòng thi 45 phút với 10 câu hỏi, lưu đáp án, đánh dấu câu và nộp bài.
- Đáp án được lưu ngay sau mỗi lần chọn; tải lại hoặc đăng nhập lại sẽ khôi phục đúng lượt, đáp án và thời gian còn lại.
- Dashboard giảng viên có lịch sử từng lượt làm, đáp án cuối và các mốc thay đổi đáp án theo từng câu.
- Ghi nhận rời tab, mất fullscreen, copy/cut/paste và mở menu chuột phải.
- Phát hiện không thấy mặt, nhiều khuôn mặt, nhìn lệch kéo dài và điện thoại bằng MediaPipe chạy ngay trong trình duyệt.
- Bắt buộc chia sẻ Toàn bộ màn hình; ghi nhận cảnh báo mức cao nếu dừng chia sẻ trong lúc thi.
- Sinh viên chỉ thấy camera/chia sẻ màn hình đang hoạt động hay bị lỗi; chi tiết phát hiện chỉ hiện trong dashboard của giảng viên sở hữu đề.
- Không xác minh danh tính, không thu âm và không lưu video màn hình.

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

Tải file `mau-cau-hoi.csv` ngay cạnh nút **Nhập CSV**. File dùng dấu chấm phẩy để Excel tách đúng 6 cột: `cau_hoi`, `phuong_an_a`, `phuong_an_b`, `phuong_an_c`, `phuong_an_d`, `dap_an_dung`; đáp án đúng nhận `A`, `B`, `C`, `D` hoặc `1`, `2`, `3`, `4`. Hệ thống vẫn đọc được tên cột tiếng Anh của file mẫu cũ.

Giới hạn mặc định trong `examguard_settings` là 500 MB, phù hợp Supabase Free. Khi nâng gói, cập nhật `database_limit_bytes` theo dung lượng database mới.
