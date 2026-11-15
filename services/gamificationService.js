const quizService = require('./quizService');
const { getIsConnected } = require('../config/db');
const Submission = require('../models/Submission');

// Badge definitions
const BADGES = [
  {
    id: 'first_exam',
    name: 'Tân Binh Xuất Sắc',
    icon: '🏅',
    description: 'Hoàn thành bài thi đầu tiên trên hệ thống',
    category: 'Bắt đầu',
    xpReward: 50
  },
  {
    id: 'perfect_10',
    name: 'Siêu Sao Điểm 10',
    icon: '🌟',
    description: 'Đạt điểm 10/10 tuyệt đối trong bài kiểm tra',
    category: 'Thành tích',
    xpReward: 100
  },
  {
    id: 'speed_demon',
    name: 'Tia Chớp Tốc Độ',
    icon: '⚡',
    description: 'Hoàn thành bài thi dưới 5 phút với điểm từ 8.0 trở lên',
    category: 'Tốc độ',
    xpReward: 80
  },
  {
    id: 'honest_student',
    name: 'Thi Cử Trung Thực',
    icon: '🛡️',
    description: 'Làm bài thi nghiêm túc với 0 lần rời màn hình',
    category: 'Kỷ luật',
    xpReward: 50
  },
  {
    id: 'diligent_learner',
    name: 'Ong Vàng Chăm Chỉ',
    icon: '📚',
    description: 'Hoàn thành từ 3 bài kiểm tra trở lên',
    category: 'Chăm chỉ',
    xpReward: 120
  },
  {
    id: 'scholar',
    name: 'Học Giả Uyên Bác',
    icon: '👑',
    description: 'Đạt điểm trung bình từ 8.5 trở lên qua các bài thi',
    category: 'Thành tích',
    xpReward: 200
  },
  {
    id: 'warrior',
    name: 'Chiến Binh Bền Bỉ',
    icon: '🔥',
    description: 'Kiên trì hoàn thành từ 5 bài kiểm tra trở lên',
    category: 'Kiên trì',
    xpReward: 150
  },
  {
    id: 'speed_master',
    name: 'Bậc Thầy Tốc Độ',
    icon: '🎯',
    description: 'Chinh phục thử thách phản xạ và đạt combo cao',
    category: 'Thử thách',
    xpReward: 100
  }
];

function getLevelTitle(level) {
  if (level <= 1) return 'Tập Sự Tri Thức';
  if (level === 2) return 'Học Giả Tích Cực';
  if (level === 3) return 'Chuyên Gia Đề Thi';
  if (level === 4) return 'Chiến Thần Trắc Nghiệm';
  if (level === 5) return 'Bậc Thầy Bách Khoa';
  return 'Đại Tông Sư Học Thuật';
}

/**
 * Get Leaderboard with optional quizId, limit and timeframe filter ('all', 'week', 'today')
 */
async function getLeaderboard(quizId = null, limit = 20, timeframe = 'all') {
  let list = [];

  let dateFilter = null;
  const now = new Date();
  if (timeframe === 'today') {
    dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (timeframe === 'week') {
    dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  if (getIsConnected()) {
    const query = {};
    if (quizId) query.quizId = quizId;
    if (dateFilter) query.submittedAt = { $gte: dateFilter };

    list = await Submission.find(query)
      .sort({ score: -1, timeSpent: 1, submittedAt: -1 })
      .limit(limit * 2)
      .lean();
  } else {
    // Local JSON fallback
    const fs = require('fs');
    const path = require('path');
    const subFile = path.join(__dirname, '..', 'data', 'submissions.json');
    if (fs.existsSync(subFile)) {
      try {
        const subs = JSON.parse(fs.readFileSync(subFile, 'utf-8'));
        list = subs
          .filter(s => {
            if (quizId && s.quizId !== quizId) return false;
            if (dateFilter && new Date(s.submittedAt) < dateFilter) return false;
            return true;
          })
          .sort((a, b) => b.score - a.score || a.timeSpent - b.timeSpent)
          .slice(0, limit * 2);
      } catch {
        list = [];
      }
    }
  }

  // Deduplicate: Keep highest score per student
  const seenStudents = new Set();
  const uniqueLeaderboard = [];

  for (const item of list) {
    const key = (item.studentId || item.studentName || '').toLowerCase().trim();
    if (key && !seenStudents.has(key)) {
      seenStudents.add(key);
      uniqueLeaderboard.push(item);
      if (uniqueLeaderboard.length >= limit) break;
    }
  }

  return uniqueLeaderboard;
}

/**
 * Calculate user badges and XP from submission records
 */
async function getUserBadgesAndXP(userId) {
  let submissions = [];
  if (userId) {
    submissions = await quizService.getUserSubmissions(userId);
  }

  let totalXP = 0;
  const unlockedBadges = [];

  const examCount = submissions.length;
  const hasPerfect = submissions.some(s => parseFloat(s.score) === 10);
  const hasSpeedDemon = submissions.some(s => parseFloat(s.score) >= 8.0 && s.timeSpent <= 300 && s.timeSpent > 0);
  const hasHonest = submissions.some(s => s.tabSwitches === 0);
  const avgScore = examCount > 0 ? submissions.reduce((a, b) => a + parseFloat(b.score), 0) / examCount : 0;

  // Base XP from correct questions & completed exams
  submissions.forEach(s => {
    totalXP += (s.correctCount || 0) * 10;
    totalXP += 30; // 30 XP per finished exam
    if (parseFloat(s.score) === 10) totalXP += 50; // Bonus for 10
  });

  // Evaluate badges
  BADGES.forEach(badge => {
    let isUnlocked = false;
    if (badge.id === 'first_exam' && examCount >= 1) isUnlocked = true;
    if (badge.id === 'perfect_10' && hasPerfect) isUnlocked = true;
    if (badge.id === 'speed_demon' && hasSpeedDemon) isUnlocked = true;
    if (badge.id === 'honest_student' && hasHonest && examCount >= 1) isUnlocked = true;
    if (badge.id === 'diligent_learner' && examCount >= 3) isUnlocked = true;
    if (badge.id === 'scholar' && examCount >= 2 && avgScore >= 8.5) isUnlocked = true;
    if (badge.id === 'warrior' && examCount >= 5) isUnlocked = true;
    if (badge.id === 'speed_master' && examCount >= 2) isUnlocked = true;

    if (isUnlocked) {
      totalXP += badge.xpReward;
      unlockedBadges.push({ ...badge, unlocked: true });
    } else {
      unlockedBadges.push({ ...badge, unlocked: false });
    }
  });

  // Calculate Level (Every 150 XP is 1 level)
  const xpPerLevel = 150;
  const level = Math.floor(totalXP / xpPerLevel) + 1;
  const currentLevelXP = totalXP % xpPerLevel;
  const nextLevelXP = xpPerLevel;
  const levelTitle = getLevelTitle(level);

  return {
    totalXP,
    level,
    levelTitle,
    currentLevelXP,
    nextLevelXP,
    badges: unlockedBadges,
    totalBadgesUnlocked: unlockedBadges.filter(b => b.unlocked).length,
    totalBadgesCount: BADGES.length
  };
}

/**
 * Generate Challenge mode questions
 * mode: 'speed' (10 questions, 15s/q) | 'survival' (all questions, 3 lives) | 'daily' (10 questions, 20s/q, 2x XP)
 */
async function getChallenge(quizId, mode = 'speed') {
  let allQuestions = [];
  let title = 'Thử Thách Trắc Nghiệm';

  if (quizId && quizId !== 'daily') {
    const quiz = await quizService.getQuizById(quizId);
    if (!quiz) throw new Error('Không tìm thấy bài thi');
    title = quiz.title;

    if (quiz.type === 'multiple-choice') {
      allQuestions = quiz.questions || [];
    } else if (quiz.type === 'reading-comprehension') {
      allQuestions = quiz.passages?.flatMap(p => p.questions) || [];
    }
  } else {
    // Daily Challenge: pool questions across all available quizzes
    const quizzes = await quizService.getAllQuizzes();
    title = 'Thử Thách Mỗi Ngày (Daily Challenge)';
    for (const qSummary of quizzes) {
      try {
        const fullQuiz = await quizService.getQuizById(qSummary.id);
        if (fullQuiz?.type === 'multiple-choice' && fullQuiz.questions) {
          allQuestions.push(...fullQuiz.questions);
        } else if (fullQuiz?.type === 'reading-comprehension' && fullQuiz.passages) {
          allQuestions.push(...fullQuiz.passages.flatMap(p => p.questions));
        }
      } catch {
        // Continue
      }
    }
  }

  if (allQuestions.length === 0) {
    throw new Error('Chưa có câu hỏi nào trong hệ thống để tạo thử thách');
  }

  // Shuffle questions
  const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);

  let picked = [];
  let timePerQuestion = 15;
  let lives = 3;

  if (mode === 'survival') {
    // Survival mode: unlimited questions until 3 strikes
    picked = shuffled.slice(0, Math.min(50, shuffled.length));
    timePerQuestion = 20;
    lives = 3;
  } else if (mode === 'daily') {
    picked = shuffled.slice(0, 10);
    timePerQuestion = 20;
    lives = 1;
  } else {
    // Speed mode (default)
    picked = shuffled.slice(0, 10);
    timePerQuestion = 15;
    lives = 1;
  }

  const formattedQuestions = picked.map((q, i) => ({
    id: i + 1,
    question: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer,
    unit: q.unit || ''
  }));

  return {
    quizTitle: title,
    mode,
    timePerQuestion,
    lives,
    totalQuestions: formattedQuestions.length,
    questions: formattedQuestions
  };
}

module.exports = {
  getLeaderboard,
  getUserBadgesAndXP,
  getChallenge,
  getSpeedChallenge: (id) => getChallenge(id, 'speed'),
  BADGES,
  getLevelTitle
};
