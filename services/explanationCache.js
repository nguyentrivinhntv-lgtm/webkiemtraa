const crypto = require('crypto');
const path = require('path');
const { safeReadJson, safeWriteJson } = require('../utils/jsonStorage');
const { getIsConnected } = require('../config/db');

let AiExplanation = null;
try {
  AiExplanation = require('../models/AiExplanation');
} catch (e) {
  // Model will be loaded if available
}

let Quiz = null;
try {
  Quiz = require('../models/Quiz');
} catch (e) {}

const cacheFile = path.join(__dirname, '..', 'data', 'ai_explanations.json');
const quizzesFile = path.join(__dirname, '..', 'data', 'quizzes.json');

/**
 * Tạo mã hash chuẩn hóa từ nội dung câu hỏi và đáp án đúng
 */
function computeHash(questionText, correctAnswer) {
  const norm = (questionText || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?;:'"()]/g, '');
  return crypto.createHash('sha256').update(`${norm}_ans_${correctAnswer}`).digest('hex');
}

/**
 * Tìm lời giải thích đã lưu trong Cache hoặc CSDL
 */
async function getCachedExplanation({ question, correctAnswer, quizId, questionIndex }) {
  if (!question) return null;
  const hash = computeHash(question, correctAnswer);

  // 1. Kiểm tra trong bộ nhớ file JSON cục bộ
  try {
    const localCache = safeReadJson(cacheFile, {});
    if (localCache[hash] && localCache[hash].explanation && localCache[hash].explanation.trim()) {
      return {
        explanation: localCache[hash].explanation,
        fromCache: true,
        source: 'local_cache'
      };
    }
  } catch (err) {
    console.warn('Lỗi đọc ai_explanations.json:', err.message);
  }

  // 2. Kiểm tra trong MongoDB (nếu kết nối)
  if (getIsConnected() && AiExplanation) {
    try {
      const record = await AiExplanation.findOne({ questionHash: hash }).lean();
      if (record && record.explanation && record.explanation.trim()) {
        // Đồng bộ ngược lại file JSON cục bộ
        try {
          const localCache = safeReadJson(cacheFile, {});
          localCache[hash] = {
            questionHash: hash,
            quizId: record.quizId || quizId || '',
            questionIndex: record.questionIndex !== undefined ? record.questionIndex : questionIndex,
            explanation: record.explanation,
            updatedAt: record.updatedAt || new Date().toISOString()
          };
          safeWriteJson(cacheFile, localCache);
        } catch (e) {}

        return {
          explanation: record.explanation,
          fromCache: true,
          source: 'mongodb'
        };
      }
    } catch (err) {
      console.warn('Lỗi tra cứu AiExplanation MongoDB:', err.message);
    }
  }

  // 3. Kiểm tra xem trong bài thi (Quiz) đã có sẵn lời giải thích cho câu hỏi này chưa
  if (quizId) {
    try {
      let quiz = null;
      if (getIsConnected() && Quiz) {
        quiz = await Quiz.findOne({ id: quizId }).lean();
      }
      if (!quiz) {
        const localQuizzes = safeReadJson(quizzesFile, []);
        quiz = localQuizzes.find(q => q.id === quizId);
      }

      if (quiz && Array.isArray(quiz.questions)) {
        let q = null;
        if (questionIndex !== undefined && quiz.questions[questionIndex]) {
          q = quiz.questions[questionIndex];
        } else {
          q = quiz.questions.find(item => item.question && item.question.trim().toLowerCase() === (question || '').trim().toLowerCase());
        }

        if (q && q.explanation && q.explanation.trim()) {
          // Lưu vào cache để lần sau tra cứu siêu tốc
          try {
            const localCache = safeReadJson(cacheFile, {});
            localCache[hash] = {
              questionHash: hash,
              quizId,
              questionIndex,
              explanation: q.explanation,
              updatedAt: new Date().toISOString()
            };
            safeWriteJson(cacheFile, localCache);
          } catch (e) {}

          return {
            explanation: q.explanation,
            fromCache: true,
            source: 'quiz_metadata'
          };
        }
      }
    } catch (e) {}
  }

  return null;
}

/**
 * Tự động lưu lời giải thích AI vào CSDL (JSON + MongoDB + Quiz metadata)
 */
async function saveCachedExplanation({ question, correctAnswer, quizId, questionIndex, explanation }) {
  if (!question || !explanation || !explanation.trim()) return;
  const hash = computeHash(question, correctAnswer);
  const now = new Date();

  // 1. Lưu vào file JSON cục bộ data/ai_explanations.json
  try {
    const localCache = safeReadJson(cacheFile, {});
    localCache[hash] = {
      questionHash: hash,
      quizId: quizId || '',
      questionIndex: questionIndex !== undefined ? questionIndex : -1,
      questionText: (question || '').substring(0, 300),
      explanation: explanation.trim(),
      updatedAt: now.toISOString()
    };
    safeWriteJson(cacheFile, localCache);
  } catch (err) {
    console.error('Lỗi lưu ai_explanations.json:', err.message);
  }

  // 2. Lưu vào MongoDB AiExplanation (nếu kết nối)
  if (getIsConnected() && AiExplanation) {
    try {
      await AiExplanation.findOneAndUpdate(
        { questionHash: hash },
        {
          questionHash: hash,
          quizId: quizId || '',
          questionIndex: questionIndex !== undefined ? questionIndex : -1,
          questionText: (question || '').substring(0, 300),
          explanation: explanation.trim(),
          updatedAt: now
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.warn('Lỗi lưu AiExplanation vào MongoDB:', err.message);
    }
  }

  // 3. Tự động lưu trực tiếp vào chính bài thi Quiz để lần sau tải đề là có sẵn lời giải
  if (quizId) {
    try {
      // 3a. Cập nhật trong file quizzes.json cục bộ
      const localQuizzes = safeReadJson(quizzesFile, []);
      const localQuiz = localQuizzes.find(q => q.id === quizId);
      if (localQuiz && Array.isArray(localQuiz.questions)) {
        let targetQ = null;
        if (questionIndex !== undefined && localQuiz.questions[questionIndex]) {
          targetQ = localQuiz.questions[questionIndex];
        } else {
          targetQ = localQuiz.questions.find(item => item.question && item.question.trim().toLowerCase() === (question || '').trim().toLowerCase());
        }
        if (targetQ) {
          targetQ.explanation = explanation.trim();
          safeWriteJson(quizzesFile, localQuizzes);
        }
      }

      // 3b. Cập nhật trong MongoDB Quiz (nếu kết nối)
      if (getIsConnected() && Quiz) {
        const mongoQuiz = await Quiz.findOne({ id: quizId });
        if (mongoQuiz && Array.isArray(mongoQuiz.questions)) {
          let targetQ = null;
          if (questionIndex !== undefined && mongoQuiz.questions[questionIndex]) {
            targetQ = mongoQuiz.questions[questionIndex];
          } else {
            targetQ = mongoQuiz.questions.find(item => item.question && item.question.trim().toLowerCase() === (question || '').trim().toLowerCase());
          }
          if (targetQ) {
            targetQ.explanation = explanation.trim();
            await mongoQuiz.save();
          }
        }
      }
    } catch (err) {
      console.warn('Lỗi tự động gán lời giải thích vào Quiz:', err.message);
    }
  }
}

module.exports = {
  getCachedExplanation,
  saveCachedExplanation,
  computeHash
};
