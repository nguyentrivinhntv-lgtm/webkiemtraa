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
    xpReward: 50
  },
  {
    id: 'perfect_10',
    name: 'Siêu Sao Điểm 10',
    icon: '🌟',
    description: 'Đạt điểm 10/10 tuyệt đối trong bài kiểm tra',
    xpReward: 100
  },
  {
    id: 'speed_demon',
    name: 'Tia Chớp Tốc Độ',
    icon: '⚡',
    description: 'Hoàn thành bài thi dưới 5 phút với điểm từ 8.0 trở lên',
    xpReward: 80
  },
  {
    id: 'honest_student',
    name: 'Thi Cử Trung Thực',
    icon: '🛡️',
    description: 'Làm bài thi nghiêm túc với 0 lần rời màn hình',
    xpReward: 50
  },
  {
    id: 'diligent_learner',
    name: 'Ong Vàng Chăm Chỉ',
    icon: '📚',
    description: 'Hoàn thành từ 3 bài kiểm tra trở lên',
    xpReward: 120
  },
  {
    id: 'scholar',
    name: 'Học Giả Uyên Bác',
    icon: '👑',
    description: 'Đạt điểm trung bình từ 8.5 trở lên qua các bài thi',
    xpReward: 200
  }
];

/**
 * Get Leaderboard (sorted by score DESC, then timeSpent ASC)
 */
async function getLeaderboard(quizId = null, limit = 20) {
  let list = [];

  if (getIsConnected()) {
    const query = quizId ? { quizId } : {};
    list = await Submission.find(query)
      .sort({ score: -1, timeSpent: 1, submittedAt: -1 })
      .limit(limit)
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
          .filter(s => (quizId ? s.quizId === quizId : true))
          .sort((a, b) => b.score - a.score || a.timeSpent - b.timeSpent)
          .slice(0, limit);
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
    if (!seenStudents.has(key)) {
      seenStudents.add(key);
      uniqueLeaderboard.push(item);
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
  const hasPerfect = submissions.some(s => s.score === 10);
  const hasSpeedDemon = submissions.some(s => s.score >= 8.0 && s.timeSpent <= 300 && s.timeSpent > 0);
  const hasHonest = submissions.some(s => s.tabSwitches === 0);
  const avgScore = examCount > 0 ? submissions.reduce((a, b) => a + b.score, 0) / examCount : 0;

  // Base XP from correct questions & completed exams
  submissions.forEach(s => {
    totalXP += (s.correctCount || 0) * 10;
    totalXP += 30; // 30 XP per finished exam
    if (s.score === 10) totalXP += 50; // Bonus for 10
  });

  // Evaluate badges
  BADGES.forEach(badge => {
    let isUnlocked = false;
    if (badge.id === 'first_exam' && examCount >= 1) isUnlocked = true;
    if (badge.id === 'perfect_10' && hasPerfect) isUnlocked = true;
    if (badge.id === 'speed_demon' && hasSpeedDemon) isUnlocked = true;
    if (badge.id === 'honest_student' && hasHonest) isUnlocked = true;
    if (badge.id === 'diligent_learner' && examCount >= 3) isUnlocked = true;
    if (badge.id === 'scholar' && examCount >= 2 && avgScore >= 8.5) isUnlocked = true;

    if (isUnlocked) {
      totalXP += badge.xpReward;
      unlockedBadges.push({ ...badge, unlocked: true });
    } else {
      unlockedBadges.push({ ...badge, unlocked: false });
    }
  });

  // Calculate Level (Every 150 XP is 1 level)
  const level = Math.floor(totalXP / 150) + 1;
  const currentLevelXP = totalXP % 150;
  const nextLevelXP = 150;

  return {
    totalXP,
    level,
    currentLevelXP,
    nextLevelXP,
    badges: unlockedBadges,
    totalBadgesUnlocked: unlockedBadges.filter(b => b.unlocked).length
  };
}

/**
 * Generate 10-question rapid speed quiz challenge
 */
async function getSpeedChallenge(quizId) {
  const quiz = await quizService.getQuizById(quizId);
  if (!quiz) throw new Error('Không tìm thấy bài thi');

  let allQuestions = [];
  if (quiz.type === 'multiple-choice') {
    allQuestions = quiz.questions || [];
  } else if (quiz.type === 'reading-comprehension') {
    allQuestions = quiz.passages?.flatMap(p => p.questions) || [];
  }

  // Shuffle and pick 10 questions
  const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, 10).map((q, i) => ({
    id: i + 1,
    question: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer,
    unit: q.unit || ''
  }));

  return {
    quizTitle: quiz.title,
    timePerQuestion: 15, // 15 seconds per question
    questions: picked
  };
}

module.exports = {
  getLeaderboard,
  getUserBadgesAndXP,
  getSpeedChallenge,
  BADGES
};

