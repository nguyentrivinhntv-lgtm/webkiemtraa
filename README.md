# 🎓 QuizMaster - Hệ Thống Kiểm Tra Trắc Nghiệm Trực Tuyến

Hệ thống web thi trắc nghiệm hiện đại được xây dựng bằng **React + Node.js/Express**, hỗ trợ sinh viên và giáo viên upload file Word (.docx) để tự động trích xuất đề thi, tổ chức thi có đếm ngược thời gian và tự động chấm điểm chi tiết.

---

## ✨ Tính Năng Nổi Bật

1. **📄 Upload File Word (.docx) Tự Động Phân Tích Đề**:
   - Tự động nhận diện câu hỏi, các lựa chọn A, B, C, D.
   - Nhận diện đáp án đúng theo **2 cơ chế**: Bảng đáp án cuối tài liệu (`ĐÁP ÁN` / `ANSWER KEY`) hoặc chữ **in đậm (Bold)**.
   - Hỗ trợ **2 dạng đề**:
     - *Dạng 1*: Đề trắc nghiệm chuẩn (ví dụ: Bộ 250 câu trắc nghiệm B1).
     - *Dạng 2*: Đọc hiểu đoạn văn (Passage + Multiple Choice + True/False).
   - Xem trước (Preview) và tùy chỉnh thời gian thi, xáo trộn câu hỏi trước khi lưu.

2. **⏱️ Trải Nghiệm Thi Trực Quan**:
   - Đồng hồ đếm ngược thông minh (đổi màu cảnh báo khi sắp hết giờ, tự động nộp bài khi hết giờ).
   - Bản đồ câu hỏi (Question Navigator) trực quan: biết rõ câu nào đã làm (xanh), câu nào chưa làm, nhảy nhanh đến câu bất kỳ.
   - Giao diện thân thiện trên cả máy tính và điện thoại.

3. **📊 Chấm Điểm & Xem Lại Bài Làm**:
   - Tự động chấm theo thang điểm 10.
   - Báo cáo số câu đúng, số câu sai, tỷ lệ % và thời gian làm bài.
   - Bộ lọc xem lại: **Tất cả**, **Chỉ xem câu sai**, **Chỉ xem câu đúng** kèm đáp án của bạn và đáp án đúng.

4. **🔄 Đã Nạp Sẵn 2 Bộ Đề Mẫu**:
   - `250 CÂU TRẮC NGHIỆM TIẾNG ANH CƠ BẢN (Units 1–5)` (250 câu hỏi, 90 phút).
   - `10 BÀI ĐỌC HIỂU TIẾNG ANH B1+/B2 (Units 1–5)` (100 câu hỏi gồm ABCD & True/False, 60 phút).

5. **🛡️ Skill Ràng Buộc Kỹ Thuật**:
   - Được đóng gói trong `.agents/skills/quiz-web-builder/` giúp duy trì chuẩn kỹ thuật và tránh lặp lại lỗi sai.

---

## 🚀 Hướng Dẫn Khởi Động

### Yêu cầu
- Đã cài đặt [Node.js](https://nodejs.org/) (phiên bản 18+).

### Chạy hệ thống ngay
```powershell
cd d:\webkiemtra
npm start
```
Mở trình duyệt truy cập:
👉 **http://localhost:3001**

### Các trang chính
- Trang chủ (Danh sách đề thi): `http://localhost:3001/`
- Trang quản trị & Upload Word: `http://localhost:3001/admin`
- Trang làm bài: `http://localhost:3001/quiz/:id`
- Trang kết quả: `http://localhost:3001/result`

