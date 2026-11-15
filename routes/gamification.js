const express = require('express');
const router = express.Router();
const gamificationService = require('../services/gamificationService');
const { verifyToken } = require('../middleware/auth');

/**
 * GET /api/gamification/leaderboard
 * Query: quizId, limit, timeframe ('all', 'week', 'today')
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { quizId, limit, timeframe } = req.query;
    const leaderboard = await gamificationService.getLeaderboard(
      quizId === 'all' ? null : quizId,
      parseInt(limit) || 20,
      timeframe || 'all'
    );
    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tải bảng xếp hạng: ' + err.message });
  }
});

/**
 * GET /api/gamification/badges
 * Returns level, levelTitle, totalXP, currentLevelXP, nextLevelXP, badges list
 */
router.get('/badges', verifyToken, async (req, res) => {
  try {
    const data = await gamificationService.getUserBadgesAndXP(req.user.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tải huy hiệu: ' + err.message });
  }
});

/**
 * GET /api/gamification/challenge/:quizId
 * Query: mode ('speed' | 'survival' | 'daily')
 */
router.get('/challenge/:quizId', async (req, res) => {
  try {
    const { mode } = req.query;
    const data = await gamificationService.getChallenge(req.params.quizId, mode || 'speed');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tạo thử thách: ' + err.message });
  }
});

module.exports = router;
