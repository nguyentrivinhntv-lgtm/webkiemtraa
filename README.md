# 🎓 QuizMaster - Hệ Thống Kiểm Tra Trắc Nghiệm Trực Tuyến

Hệ thống web thi trắc nghiệm và ôn tập hiện đại được xây dựng theo kiến trúc **Decoupled Fullstack**:
- **Frontend (Client)**: React.js (Vite) + Bootstrap 5 + React Icons + React-Toastify (Deploy trên **Vercel**).
- **Backend (API Service)**: Node.js + Express + Multer + Mammoth.js (Deploy trên **Render**: `https://webkiemtraa.onrender.com`).

---

## 🌐 Hệ Thống Trực Tuyến

| Thành phần | Nền tảng | Địa chỉ URL |
|---|---|---|
| **Backend API** | Render | `https://webkiemtraa.onrender.com` |
| **API Kiểm tra đề** | Render | `https://webkiemtraa.onrender.com/api/quiz` |
| **Frontend Web** | Vercel | *Deploy qua Vercel từ thư mục `client/`* |

---

## ✨ Tính Năng Nổi Bật

1. **📄 Tự Động Phân Tích & Sinh Đề Từ File Word (.docx)**:
   - Nhận diện câu hỏi, đáp án A/B/C/D.
   - Nhận diện đáp án đúng theo **2 cơ chế**: Bảng đáp án cuối tài liệu (`ĐÁP ÁN` / `ANSWER KEY`) hoặc chữ **in đậm (Bold)**.
   - Hỗ trợ cả **Trắc nghiệm đơn thuần** (Multiple Choice) và **Bài đọc hiểu** (Passage + Section A ABCD + Section B True/False).
   - Xem trước (Preview) và tùy chỉnh thời gian thi, tiêu đề trước khi lưu.

2. **📖 Chế Độ Ôn Tập Trước Khi Thi (Review Mode)**:
   - Làm bài không áp lực thời gian, **xem kết quả đúng/sai ngay lập tức** sau khi chọn đáp án.
   - Thống kê tỷ lệ đúng theo thời gian thực.
   - Hỗ trợ **xáo trộn câu hỏi ngẫu nhiên** và **bộ lọc theo từng Unit / Đoạn văn**.
   - Mục lục câu hỏi trực quan: xanh (đúng), đỏ (sai), trắng (chưa làm).

3. **⏱️ Chế Độ Thi Chính Thức (Exam Mode)**:
   - Nhập thông tin sinh viên trước khi vào thi.
   - Đồng hồ đếm ngược thông minh, tự động nộp bài khi hết giờ.
   - Bản đồ câu hỏi điều hướng nhanh, thanh tiến độ % hoàn thành.

4. **📊 Chấm Điểm & Xem Lại Chi Tiết (Result Mode)**:
   - Thang điểm 10, phân loại kết quả (Xuất sắc / Đạt / Cần cố gắng).
   - Bộ lọc xem lại: **Tất cả**, **Chỉ xem câu sai**, **Chỉ xem câu đúng**.

5. **📚 Đã Nạp Sẵn 2 Bộ Đề Mẫu Chuẩn**:
   - `250 CÂU TRẮC NGHIỆM TIẾNG ANH CƠ BẢN (Units 1–5)` (250 câu hỏi, 90 phút).
   - `10 BÀI ĐỌC HIỂU TIẾNG ANH B1+/B2 (Units 1–5)` (100 câu hỏi, 60 phút).

---

## 🚀 Hướng Dẫn Deploy Lên Vercel (Frontend)

1. Đăng nhập [Vercel](https://vercel.com) bằng tài khoản GitHub.
2. Bấm **Add New...** ➔ **Project** ➔ Import repository `webkiemtraa`.
3. Cấu hình:
   - **Root Directory**: Chọn thư mục `client`.
   - **Environment Variables**:
     - Key: `VITE_API_URL`
     - Value: `https://webkiemtraa.onrender.com`
4. Bấm **Deploy** ➔ Hoàn tất trong 30 giây!

---

## 💻 Chạy Local (Máy Tính Cá Nhân)

```powershell
# Chạy nhanh trên Windows bằng 1 click:
Nhấp đúp chuột vào file start.bat

# Hoặc bằng lệnh terminal:
cd d:\webkiemtra
npm start
```
Mở trình duyệt truy cập: `http://localhost:3001`
