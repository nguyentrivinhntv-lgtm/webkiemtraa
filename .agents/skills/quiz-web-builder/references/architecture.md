# 📐 Quiz Web Platform Architecture & Data Schema

## 1. REST API Specification

### Quizzes
- `GET /api/quiz`: Lấy danh sách tóm tắt các đề thi (không kèm đáp án)
- `GET /api/quiz/:id`: Lấy đề thi cho thí sinh làm bài (đáp án đúng đã được ẩn)
- `GET /api/quiz/:id/admin`: Lấy đầy đủ đề thi kèm đáp án đúng cho giáo viên
- `POST /api/quiz/:id/submit`: Nộp bài thi, tự động tính điểm, trả về kết quả chi tiết
  - Body: `{ studentName, answers: { "0": 1, "1": 2 }, timeSpent: 120 }`
  - Response: `{ score: 9.5, correctCount: 95, wrongCount: 5, details: [...] }`
- `DELETE /api/quiz/:id`: Xóa đề thi khỏi hệ thống

### Word Upload
- `POST /api/upload`: Upload file `.docx` qua `multipart/form-data`, trả về bản xem trước (preview)
- `POST /api/upload/confirm`: Lưu đề thi sau khi giáo viên/sinh viên xác nhận preview và cài đặt thời gian

---

## 2. JSON Data Schema (`data/quizzes.json`)

```json
[
  {
    "id": "uuid-v4",
    "title": "250 CÂU TRẮC NGHIỆM TIẾNG ANH CƠ BẢN",
    "type": "multiple-choice | reading-comprehension",
    "timeLimit": 90,
    "shuffleQuestions": false,
    "shuffleOptions": false,
    "showResult": true,
    "createdAt": "2026-11-10T06:00:00.000Z",
    "totalQuestions": 250,
    "questions": [
      {
        "id": 1,
        "unit": "UNIT 1 – FAMILY AND FRIENDS",
        "question": "Trinh ___ 20 years old.",
        "options": [
          { "label": "A", "text": "am" },
          { "label": "B", "text": "is" },
          { "label": "C", "text": "are" },
          { "label": "D", "text": "be" }
        ],
        "correctAnswer": 1,
        "type": "multiple-choice"
      }
    ],
    "passages": [
      {
        "id": 1,
        "title": "Reading 1 – AN INTERNATIONAL FAMILY",
        "text": "Minh comes from Ho Chi Minh City...",
        "questions": [...]
      }
    ]
  }
]
```

