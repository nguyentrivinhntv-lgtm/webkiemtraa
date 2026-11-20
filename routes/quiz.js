const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const quizService = require('../services/quizService');
const { generateExplanation, testGeminiApiKey } = require('../services/aiService');
const { getCachedExplanation, saveCachedExplanation } = require('../services/explanationCache');
const { optionalToken, verifyToken, requireRole } = require('../middleware/auth');

// POST /api/quiz/ai-explain - Intelligent AI question explanation with Auto Caching in Database
router.post('/ai-explain', async (req, res) => {
  try {
    const {
      question,
      options,
      correctAnswer,
      studentAnswer,
      unit,
      quizTitle,
      quizId,
      questionIndex,
      apiKey
    } = req.body;
    const clientKey = apiKey || req.headers['x-gemini-key'] || '';

    if (!question) {
      return res.status(400).json({ error: 'Thiếu thông tin câu hỏi' });
    }

    const cAnswer = correctAnswer !== undefined ? parseInt(correctAnswer) : 0;
    const sAnswer = studentAnswer !== undefined ? parseInt(studentAnswer) : -1;

    // 1. Kiểm tra trong Cơ Sở Dữ Liệu xem câu hỏi này đã từng được AI giải thích chưa
    const cached = await getCachedExplanation({
      question,
      correctAnswer: cAnswer,
      quizId,
      questionIndex
    });

    if (cached && cached.explanation && cached.explanation.trim()) {
      return res.json({
        explanation: cached.explanation,
        fromCache: true,
        source: cached.source || 'database'
      });
    }

    // 2. Nếu chưa có, gọi AI để sinh lời giải thích chuyên sâu (100% Tiếng Việt)
    const result = await generateExplanation({
      question,
      options,
      correctAnswer: cAnswer,
      studentAnswer: sAnswer,
      unit: unit || '',
      quizTitle: quizTitle || '',
      apiKey: clientKey,
      provider: req.body.provider || 'auto'
    });

    const explanationText = typeof result === 'object' ? result.explanation : result;
    const isRealAi = typeof result === 'object' ? result.isAi : true;
    const providerUsed = typeof result === 'object' ? result.provider : 'ai';
    const reasonMsg = typeof result === 'object' ? result.reason : '';

    // 3. CHỈ TỰ ĐỘNG LƯU VÀO CSDL KHI THỰC SỰ LÀ AI TRẢ LỜI (Không lưu nháp offline)
    if (explanationText && isRealAi) {
      await saveCachedExplanation({
        question,
        correctAnswer: cAnswer,
        quizId,
        questionIndex,
        explanation: explanationText
      });
    }

    res.json({
      explanation: explanationText,
      isAi: isRealAi,
      provider: providerUsed,
      reason: reasonMsg,
      fromCache: false
    });
  } catch (err) {
    console.error('Lỗi sinh lời giải thích AI:', err);
    res.status(500).json({ error: 'Lỗi khi tạo lời giải thích: ' + err.message });
  }
});

// POST /api/quiz/test-ai-key - Test Groq or Google Gemini API Key
router.post('/test-ai-key', async (req, res) => {
  try {
    const { apiKey, provider } = req.body;
    const clientKey = apiKey || req.headers['x-gemini-key'] || process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || '';
    const result = await testGeminiApiKey(clientKey, provider || 'auto');
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/quiz/user/submissions - Get submission history of logged in student
router.get('/user/submissions', verifyToken, async (req, res) => {
  try {
    const list = await quizService.getUserSubmissions(req.user.id);
    res.json(list);
  } catch (err) {
    console.error('Error fetching user submissions:', err);
    res.status(500).json({ error: 'Lỗi tải lịch sử bài làm' });
  }
});

// GET /api/quiz - Get all quizzes (list)
router.get('/', async (req, res) => {
  try {
    const list = await quizService.getAllQuizzes();
    res.json(list);
  } catch (err) {
    console.error('Error fetching quizzes:', err);
    res.status(500).json({ error: 'Lỗi tải danh sách đề thi' });
  }
});

// GET /api/quiz/:id - Get quiz by ID (for taking the quiz - correct answers hidden)
router.get('/:id', async (req, res) => {
  try {
    const quiz = await quizService.getQuizById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ error: 'Không tìm thấy bài thi' });
    }

    // Clone and sanitize correct answers for student view
    const sanitized = JSON.parse(JSON.stringify(quiz));

    // Tag original indices before any shuffle to ensure 100% accurate grading
    let globalIndex = 0;
    if (sanitized.questions) {
      sanitized.questions.forEach((q, idx) => {
        q.originalIndex = idx;
        delete q.correctAnswer;
        if (q.options) {
          q.options.forEach((opt, optIdx) => {
            opt.originalOptionIndex = optIdx;
          });
        }
      });
    }
    if (sanitized.passages) {
      sanitized.passages.forEach(p => {
        p.questions.forEach((q) => {
          q.originalIndex = globalIndex++;
          delete q.correctAnswer;
          if (q.options) {
            q.options.forEach((opt, optIdx) => {
              opt.originalOptionIndex = optIdx;
            });
          }
        });
      });
    }

    // Shuffle if configured
    if (quiz.shuffleQuestions) {
      if (sanitized.questions) {
        sanitized.questions = shuffleArray(sanitized.questions);
      }
      if (sanitized.passages) {
        sanitized.passages.forEach(p => {
          p.questions = shuffleArray(p.questions);
        });
      }
    }

    if (quiz.shuffleOptions) {
      const allQs = sanitized.questions || sanitized.passages?.flatMap(p => p.questions) || [];
      allQs.forEach(q => {
        q.options = shuffleArray(q.options);
      });
    }

    res.json(sanitized);
  } catch (err) {
    console.error('Error fetching quiz:', err);
    res.status(500).json({ error: 'Lỗi tải bài thi' });
  }
});

// GET /api/quiz/:id/admin - Get quiz with answers (for admin & review mode)
router.get('/:id/admin', async (req, res) => {
  try {
    const quiz = await quizService.getQuizById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ error: 'Không tìm thấy bài thi' });
    }

    res.json(quiz);
  } catch (err) {
    console.error('Error fetching quiz admin:', err);
    res.status(500).json({ error: 'Lỗi tải chi tiết bài thi' });
  }
});

// POST /api/quiz/:id/submit - Submit quiz answers & grade
router.post('/:id/submit', optionalToken, async (req, res) => {
  try {
    const quiz = await quizService.getQuizById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ error: 'Không tìm thấy bài thi' });
    }

    const { answers = {}, studentName, studentId, timeSpent = 0 } = req.body;

    // Get all questions
    let allQuestions = [];
    if (quiz.type === 'multiple-choice') {
      allQuestions = quiz.questions;
    } else if (quiz.type === 'reading-comprehension') {
      allQuestions = quiz.passages.flatMap(p => p.questions);
    }

    // Grade
    let correct = 0;
    const details = [];

    allQuestions.forEach((q, index) => {
      // Check both answers[`orig_${index}`] (for shuffled questions) and answers[index] (fallback)
      let studentAnswer = -1;
      if (answers[`orig_${index}`] !== undefined) {
        studentAnswer = answers[`orig_${index}`];
      } else if (answers[index] !== undefined) {
        studentAnswer = answers[index];
      }
      
      const isCorrect = studentAnswer === q.correctAnswer;
      if (isCorrect) correct++;

      details.push({
        questionIndex: index,
        question: q.question,
        options: q.options,
        studentAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation || ''
      });
    });

    const score = allQuestions.length > 0
      ? Math.round((correct / allQuestions.length) * 100) / 10
      : 0;

    // Save submission to database (MongoDB / JSON)
    const submissionData = {
      id: uuidv4(),
      userId: req.user ? req.user.id : '',
      quizId: quiz.id,
      quizTitle: quiz.title,
      studentName: studentName || (req.user ? req.user.name : 'Sinh viên'),
      studentId: studentId || (req.user ? req.user.studentId : '') || '',
      score,
      correctCount: correct,
      wrongCount: allQuestions.length - correct,
      totalQuestions: allQuestions.length,
      timeSpent,
      tabSwitches: parseInt(req.body.tabSwitches) || 0,
      details: quiz.showResult !== false ? details : [],
      submittedAt: new Date().toISOString()
    };

    await quizService.createSubmission(submissionData);

    res.json({
      studentName: submissionData.studentName,
      quizTitle: quiz.title,
      totalQuestions: allQuestions.length,
      correctCount: correct,
      wrongCount: allQuestions.length - correct,
      score: score,
      maxScore: 10,
      timeSpent,
      details: quiz.showResult !== false ? details : [],
      showResult: quiz.showResult !== false
    });
  } catch (err) {
    console.error('Error submitting quiz:', err);
    res.status(500).json({ error: 'Lỗi chấm bài thi' });
  }
});

// GET /api/quiz/:id/submissions - Get all submissions for teacher review
router.get('/:id/submissions', async (req, res) => {
  try {
    const submissions = await quizService.getSubmissions(req.params.id);
    res.json(submissions);
  } catch (err) {
    console.error('Error fetching submissions:', err);
    res.status(500).json({ error: 'Lỗi tải danh sách bài nộp' });
  }
});

// DELETE /api/quiz/:id - Delete quiz (Protected: Teacher or Admin only)
router.delete('/:id', verifyToken, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const success = await quizService.deleteQuiz(req.params.id);

    if (!success) {
      return res.status(404).json({ error: 'Không tìm thấy bài thi để xóa' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting quiz:', err);
    res.status(500).json({ error: 'Lỗi xóa bài thi' });
  }
});

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

module.exports = router;
