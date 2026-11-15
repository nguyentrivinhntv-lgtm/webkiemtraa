const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const quizService = require('../services/quizService');
const { optionalToken, verifyToken } = require('../middleware/auth');

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

    if (sanitized.questions) {
      sanitized.questions.forEach(q => {
        delete q.correctAnswer;
      });
    }
    if (sanitized.passages) {
      sanitized.passages.forEach(p => {
        p.questions.forEach(q => {
          delete q.correctAnswer;
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
      const studentAnswer = answers[index] !== undefined ? answers[index] : -1;
      const isCorrect = studentAnswer === q.correctAnswer;
      if (isCorrect) correct++;

      details.push({
        questionIndex: index,
        question: q.question,
        options: q.options,
        studentAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect
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

// DELETE /api/quiz/:id - Delete quiz
router.delete('/:id', async (req, res) => {
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
