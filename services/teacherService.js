const xlsx = require('xlsx');
const quizService = require('./quizService');
const { getIsConnected } = require('../config/db');
const Submission = require('../models/Submission');
const Quiz = require('../models/Quiz');

/**
 * Get teacher overview statistics
 */
async function getTeacherOverview() {
  const quizzes = await quizService.getAllQuizzes();
  let totalSubmissions = 0;
  let allScores = [];

  if (getIsConnected()) {
    totalSubmissions = await Submission.countDocuments();
    const subs = await Submission.find({}, 'score studentName studentId').lean();
    allScores = subs.map(s => s.score);
  } else {
    // Local fallback
    const fs = require('fs');
    const path = require('path');
    const subFile = path.join(__dirname, '..', 'data', 'submissions.json');
    if (fs.existsSync(subFile)) {
      try {
        const subs = JSON.parse(fs.readFileSync(subFile, 'utf-8'));
        totalSubmissions = subs.length;
        allScores = subs.map(s => s.score);
      } catch {
        totalSubmissions = 0;
      }
    }
  }

  const avgScore = allScores.length > 0
    ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
    : 0;

  const passCount = allScores.filter(s => s >= 5.0).length;
  const passRate = allScores.length > 0
    ? Math.round((passCount / allScores.length) * 100)
    : 0;

  return {
    totalQuizzes: quizzes.length,
    totalSubmissions,
    avgScore,
    passRate,
    quizzes
  };
}

/**
 * Get deep analytics for a specific quiz
 */
async function getQuizAnalytics(quizId) {
  const quiz = await quizService.getQuizById(quizId);
  if (!quiz) throw new Error('Không tìm thấy bài thi');

  const submissions = await quizService.getSubmissions(quizId);

  // Score distribution
  const distribution = {
    under5: 0,
    from5to7: 0,
    from7to85: 0,
    from85to10: 0
  };

  submissions.forEach(sub => {
    const s = sub.score;
    if (s < 5.0) distribution.under5++;
    else if (s < 7.0) distribution.from5to7++;
    else if (s < 8.5) distribution.from7to85++;
    else distribution.from85to10++;
  });

  // Analyze difficult questions
  const questionMistakeMap = {}; // { questionIndex: wrongCount }
  submissions.forEach(sub => {
    if (Array.isArray(sub.details)) {
      sub.details.forEach(item => {
        if (!item.isCorrect) {
          questionMistakeMap[item.questionIndex] = (questionMistakeMap[item.questionIndex] || 0) + 1;
        }
      });
    }
  });

  // Build top mistake list
  let allQuestions = [];
  if (quiz.type === 'multiple-choice') {
    allQuestions = quiz.questions || [];
  } else if (quiz.type === 'reading-comprehension') {
    allQuestions = quiz.passages?.flatMap(p => p.questions) || [];
  }

  const hardQuestions = Object.entries(questionMistakeMap)
    .map(([qIdx, wrongCount]) => {
      const idx = parseInt(qIdx);
      const q = allQuestions[idx];
      return {
        questionIndex: idx,
        question: q?.question || `Câu ${idx + 1}`,
        unit: q?.unit || '',
        wrongCount,
        wrongRate: submissions.length > 0 ? Math.round((wrongCount / submissions.length) * 100) : 0
      };
    })
    .sort((a, b) => b.wrongCount - a.wrongCount)
    .slice(0, 10);

  const scores = submissions.map(s => s.score);
  const avgScore = scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : 0;

  return {
    quiz: {
      id: quiz.id,
      title: quiz.title,
      type: quiz.type,
      totalQuestions: quiz.totalQuestions,
      timeLimit: quiz.timeLimit
    },
    totalSubmissions: submissions.length,
    avgScore,
    distribution,
    hardQuestions,
    submissions
  };
}

/**
 * Generate Excel buffer (.xlsx) for quiz submissions
 */
async function generateExcelReport(quizId) {
  const quiz = await quizService.getQuizById(quizId);
  if (!quiz) throw new Error('Không tìm thấy bài thi');

  const submissions = await quizService.getSubmissions(quizId);

  // Prepare table data
  const rows = submissions.map((sub, index) => ({
    'STT': index + 1,
    'Họ và tên thí sinh': sub.studentName,
    'Mã sinh viên': sub.studentId || '',
    'Điểm số (Thang 10)': sub.score,
    'Xếp loại': sub.score >= 8.5 ? 'Giỏi' : sub.score >= 7.0 ? 'Khá' : sub.score >= 5.0 ? 'Trung bình' : 'Yếu',
    'Số câu đúng': sub.correctCount,
    'Số câu sai': sub.wrongCount,
    'Tổng số câu': sub.totalQuestions,
    'Thời gian làm bài (giây)': sub.timeSpent,
    'Ngày nộp bài': sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('vi-VN') : ''
  }));

  const worksheet = xlsx.utils.json_to_sheet(rows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 26 }, // Họ tên
    { wch: 15 }, // MSSV
    { wch: 18 }, // Điểm
    { wch: 12 }, // Xếp loại
    { wch: 12 }, // Đúng
    { wch: 12 }, // Sai
    { wch: 12 }, // Tổng
    { wch: 22 }, // Thời gian
    { wch: 22 }  // Ngày nộp
  ];

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Bảng điểm sinh viên');

  const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return {
    buffer,
    filename: `BangDiem_${quiz.title.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_')}.xlsx`
  };
}

module.exports = {
  getTeacherOverview,
  getQuizAnalytics,
  generateExcelReport
};
