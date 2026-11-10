---
name: quiz-web-builder
description: >-
  Hướng dẫn và tiêu chuẩn bắt buộc để xây dựng, mở rộng và bảo trì hệ thống web trắc nghiệm online
  hỗ trợ import câu hỏi tự động từ file Word (.docx) cho sinh viên và giáo viên. Dùng skill này khi
  cần tạo web thi trắc nghiệm, parse file đề thi Word, nâng cấp frontend React hoặc cấu hình backend.
---

# 🎓 Quiz Web Builder Skill

Skill này quy định toàn bộ tiêu chuẩn kiến trúc, quy tắc phân tích file Word (.docx) và các ràng buộc kỹ thuật nhằm ngăn ngừa mọi lỗi sai thường gặp khi phát triển hệ thống kiểm tra trắc nghiệm trực tuyến.

---

## 🏛️ 1. Kiến Trúc Hệ Thống (Tech Stack)

| Tầng | Công nghệ | Vai trò & Ràng buộc |
|---|---|---|
| **Frontend** | React (Vite) + Bootstrap 5 + React Icons + React-Toastify | SPA hiện đại, responsive mobile & desktop, component-based |
| **Backend** | Node.js + Express 5 + Multer + Mammoth.js | REST API, xử lý upload docx, phân tích cú pháp, chấm điểm |
| **Lưu trữ** | JSON Storage (`data/quizzes.json`) | Nhẹ, dễ backup, không phụ thuộc service ngoài |
| **Cổng kết nối** | Port 3001 (Backend) & Port 3000 (Vite Dev Server) | Production: Express phục vụ cả API và React bundle (`client/dist`) |

---

## ⚠️ 2. Các Ràng Buộc Kỹ Thuật Bắt Buộc (Critical Rules)

### 🚨 Ràng buộc 1: Mammoth API Syntax
- Khi gọi `mammoth.convertToHtml` hoặc `mammoth.extractRawText`, **PHẢI** truyền tham số object `{ path: filePath }`:
  ```javascript
  // ĐÚNG:
  const result = await mammoth.convertToHtml({ path: filePath });
  const rawText = (await mammoth.extractRawText({ path: filePath })).value;

  // SAI (gây lỗi "Could not find file in options"):
  const result = await mammoth.convertToHtml(filePath);
  ```

### 🚨 Ràng buộc 2: Regex Không Dùng `\s` Tràn Dòng
- Trong JavaScript, `\s` khớp cả ký tự xuống dòng `\n`. Không được viết `/(?:READING|PASSAGE)\s*\d+/i` vì có thể khớp chữ "reading" ở cuối câu và số câu "70." ở dòng tiếp theo!
- **Luôn dùng `^[ \t]*` kết hợp flag `m` (multiline)**:
  ```javascript
  // ĐÚNG:
  const isReading = /^[ \t]*(?:READING|PASSAGE|BÀI\s*ĐỌC)\s+\d+/im.test(rawText);

  // SAI (khớp sai chữ reading trong phương án trắc nghiệm):
  const isReading = /READING\s*\d+/i.test(rawText);
  ```

### 🚨 Ràng buộc 3: Tách Bảng Đáp Án (Answer Key) Đúng Cách
- Từ khóa "KEY" hoặc "ĐÁP ÁN" có thể xuất hiện trong câu hỏi (ví dụ: `keys belong to Tom`).
- Tách bảng đáp án phải dùng anchor đầu dòng:
  ```javascript
  // ĐÚNG:
  const ansKeyMatch = rawText.match(/(?:^[ \t]*ĐÁP\s*ÁN\b|^[ \t]*ANSWER\s*KEY\b|^[ \t]*KEY\b)/im);
  ```

### 🚨 Ràng buộc 4: Express 5 Không Dùng `app.get('*')`
- Express 5 dùng `path-to-regexp` v0.1.12+, cú pháp `app.get('*')` sẽ ném ngoại lệ `TypeError: Missing parameter name at index 1: *`.
- **Dùng middleware fallback cho SPA**:
  ```javascript
  // ĐÚNG CHO EXPRESS 5:
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
  ```

### 🚨 Ràng buộc 5: API Base URL Ở Client
- Không hardcode `http://localhost:3001/api`. Luôn dùng relative path `/api` kết hợp Vite proxy để tương thích mọi môi trường (local, mạng LAN, production).

---

## 📄 3. Tiêu Chuẩn Parse File Word (.docx)

Hệ thống hỗ trợ 2 định dạng đề thi phổ biến:

### Định dạng A: Trắc nghiệm thuần túy (Multiple Choice)
- Câu hỏi bắt đầu bằng: `1. `, `Câu 1. `, `Question 1. `
- Các lựa chọn bắt đầu bằng: `A. `, `B. `, `C. `, `D. ` (hoặc `A) `, `[A] `)
- Đáp án đúng được nhận diện theo 2 cơ chế ưu tiên:
  1. **Bảng đáp án cuối tài liệu**: `ĐÁP ÁN` hoặc `ANSWER KEY` (ví dụ: `1. B   2. C   3. A...`)
  2. **In đậm (Bold/Strong)** trực tiếp trong phương án (thông qua `mammoth.convertToHtml`)

### Định dạng B: Bài đọc hiểu (Reading Comprehension)
- Cấu trúc:
  ```
  READING 1 – [Tiêu đề]
  [Đoạn văn đọc hiểu...]
  A. MULTIPLE CHOICE
  1. [Câu hỏi ABCD]
  A. ... B. ... C. ... D. ...
  B. TRUE / FALSE
  1. [Mệnh đề kiểm tra...] TRUE / FALSE
  ```
- Bảng đáp án cuối tài liệu:
  ```
  ANSWER KEY
  Reading 1
  ABCD: A, B, B, B, A
  T/F: 1.T  2.F  3.T  4.T  5.T
  ```

---

## 🚀 4. Hướng Dẫn Vận Hành & Khởi Động

### Khởi động hệ thống (Chạy cả Frontend & Backend)
```powershell
cd d:\webkiemtra
npm start
```
Truy cập trình duyệt: **http://localhost:3001**

### Build lại Frontend React khi chỉnh sửa code
```powershell
cd d:\webkiemtra\client
npm run build
```

### Chạy chế độ phát triển (Dev Mode)
- **Terminal 1 (Backend)**: `node server.js`
- **Terminal 2 (Frontend)**: `cd client && npm run dev` (truy cập `http://localhost:3000`)

---

## 📖 5. Chế Độ Ôn Tập (Review Mode)

Hệ thống có chế độ **Ôn tập** (`/review/:id`) tách biệt hoàn toàn với chế độ thi chính thức:

### Luồng hoạt động
1. Sinh viên bấm nút **"Ôn tập"** trên trang chủ.
2. Hệ thống gọi API `/api/quiz/:id/admin` (trả về **đầy đủ đáp án đúng**).
3. Mỗi câu hỏi hiển thị 1 câu 1 lần; sinh viên chọn đáp án → **kết quả hiện ngay** (đúng/sai + đáp án đúng).
4. Thanh thống kê thời gian thực: Đã làm / Đúng / Sai / Tỷ lệ %.
5. **Mục lục bên cạnh**: nút xanh (đúng), nút đỏ (sai), nút trắng (chưa làm).
6. Các tính năng bổ trợ:
   - **Xáo trộn câu hỏi** (Random shuffle).
   - **Lọc theo Unit / Reading** qua dropdown.
   - **Thu gọn/hiện đoạn văn** đọc hiểu khi muốn.
   - **Reset** để ôn lại từ đầu.
   - Khi làm xong toàn bộ → hiện **bảng tổng kết** + nút "Vào thi chính thức".

### Ràng buộc kỹ thuật
- Trang ôn tập **PHẢI** dùng API `/api/quiz/:id/admin` (có đáp án đúng), KHÔNG được dùng `/api/quiz/:id` (đã ẩn đáp án).
- Component: `client/src/pages/ReviewPage.jsx`.
- Route: `/review/:id` trong `App.jsx`.

