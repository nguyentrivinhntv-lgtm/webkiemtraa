const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const dataFile = path.join(__dirname, '..', 'data', 'quizzes.json');

function loadQuizzes() {
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, '[]', 'utf-8');
    return [];
  }
  return JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
}

function saveQuizzes(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf-8');
}

// GET /api/quiz - Get all quizzes (list)
router.get('/', (req, res) => {
  const quizzes = loadQuizzes();
  // Return list without full question data
  const list = quizzes.map(q => ({
    id: q.id,
    title: q.title,
    type: q.type,
    timeLimit: q.timeLimit,
    totalQuestions: q.totalQuestions,
    createdAt: q.createdAt
  }));
  res.json(list);
});

// GET /api/quiz/:id - Get quiz by ID (for taking the quiz)
router.get('/:id', (req, res) => {
  const quizzes = loadQuizzes();
  const quiz = quizzes.find(q => q.id === req.params.id);

  if (!quiz) {
    return res.status(404).json({ error: 'Không tìm thấy bài thi' });
  }

  // Remove correct answers for student view
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
});

// GET /api/quiz/:id/admin - Get quiz with answers (for admin)
router.get('/:id/admin', (req, res) => {
  const quizzes = loadQuizzes();
  const quiz = quizzes.find(q => q.id === req.params.id);

  if (!quiz) {
    return res.status(404).json({ error: 'Không tìm thấy bài thi' });
  }

  res.json(quiz);
});

// POST /api/quiz/:id/submit - Submit quiz answers
router.post('/:id/submit', (req, res) => {
  const quizzes = loadQuizzes();
  const quiz = quizzes.find(q => q.id === req.params.id);

  if (!quiz) {
    return res.status(404).json({ error: 'Không tìm thấy bài thi' });
  }

  const { answers, studentName, timeSpent } = req.body;

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

  res.json({
    studentName: studentName || 'Sinh viên',
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
});

// DELETE /api/quiz/:id - Delete quiz
router.delete('/:id', (req, res) => {
  let quizzes = loadQuizzes();
  const index = quizzes.findIndex(q => q.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy bài thi' });
  }

  quizzes.splice(index, 1);
  saveQuizzes(quizzes);

  res.json({ success: true });
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

