const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { parseWordFile, parseText } = require('../utils/wordParser');
const { parseExcelFile, generateExcelTemplate } = require('../utils/excelParser');
const quizService = require('../services/quizService');

// Configure multer for file uploads (.docx, .xlsx, .xls)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.docx', '.xlsx', '.xls'].includes(ext)) {
      return cb(new Error('Chỉ chấp nhận file Word (.docx) hoặc file Excel (.xlsx, .xls)'));
    }
    cb(null, true);
  },
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

// GET /api/upload/template/excel - Download sample Excel template
router.get('/template/excel', (req, res) => {
  try {
    const buffer = generateExcelTemplate();
    res.setHeader('Content-Disposition', 'attachment; filename="Mau_De_Thi_Trac_Nghiem.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tải file mẫu: ' + err.message });
  }
});

// POST /api/upload - Upload and parse Word (.docx) or Excel (.xlsx/.xls)
router.post('/', upload.single('wordFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Vui lòng chọn file Word (.docx) hoặc Excel (.xlsx, .xls)' });
    }

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();

    let parsed = null;
    if (ext === '.xlsx' || ext === '.xls') {
      parsed = parseExcelFile(filePath);
    } else {
      parsed = await parseWordFile(filePath);
    }

    // Return parsed data for preview (don't save yet)
    res.json({
      success: true,
      preview: parsed,
      fileType: ext === '.docx' ? 'word' : 'excel',
      tempFile: req.file.filename
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Lỗi xử lý file: ' + err.message });
  }
});

// POST /api/upload/text - Parse raw text pasted by user
router.post('/text', (req, res) => {
  try {
    const { text, title } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Vui lòng dán nội dung câu hỏi!' });
    }

    const parsed = parseText(text);
    if (title && title.trim()) {
      parsed.title = title.trim();
    }

    if (!parsed || parsed.totalQuestions === 0) {
      return res.status(400).json({
        error: 'Không tìm thấy câu hỏi hợp lệ. Định dạng mẫu: 1. Câu hỏi? A. ... B. ... C. ... D. ...'
      });
    }

    res.json({
      success: true,
      preview: parsed
    });
  } catch (err) {
    console.error('Parse text error:', err);
    res.status(500).json({ error: 'Lỗi phân tích văn bản: ' + err.message });
  }
});

// POST /api/upload/confirm - Confirm and save quiz to database (MongoDB / JSON)
router.post('/confirm', async (req, res) => {
  try {
    const { quizData, settings } = req.body;

    if (!quizData) {
      return res.status(400).json({ error: 'Không có dữ liệu bài thi' });
    }

    const quiz = {
      id: uuidv4(),
      title: settings?.title || quizData.title || 'Bài kiểm tra',
      type: quizData.type,
      timeLimit: settings?.timeLimit || 60, // minutes
      shuffleQuestions: settings?.shuffleQuestions || false,
      shuffleOptions: settings?.shuffleOptions || false,
      showResult: settings?.showResult !== false,
      createdAt: new Date().toISOString(),
      totalQuestions: quizData.totalQuestions,
      questions: quizData.questions || [],
      passages: quizData.passages || []
    };

    await quizService.createQuiz(quiz);

    res.json({ success: true, quizId: quiz.id });
  } catch (err) {
    console.error('Confirm error:', err);
    res.status(500).json({ error: 'Lỗi lưu bài thi: ' + err.message });
  }
});

module.exports = router;
