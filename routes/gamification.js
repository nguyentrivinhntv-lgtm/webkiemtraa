const express = require('express');
const router = express.Router();
const gamificationService = require('../services/gamificationService');
const { verifyToken, optionalToken } = require('../middleware/auth');

/**
 * GET /api/gamification/leaderboard
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { quizId, limit } = req.query;
    const leaderboard = await gamificationService.getLeaderboard(quizId, parseInt(limit) || 20);
    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tải bảng xếp hạng: ' + err.message });
  }
});

/**
 * GET /api/gamification/badges
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
 */
router.get('/challenge/:quizId', async (req, res) => {
  try {
    const data = await gamificationService.getSpeedChallenge(req.params.quizId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tạo thử thách: ' + err.message });
  }
});

module.exports = router;

