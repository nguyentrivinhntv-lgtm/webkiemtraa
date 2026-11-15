const express = require('express');
const router = express.Router();
const studyService = require('../services/studyService');
const { verifyToken } = require('../middleware/auth');

// All study routes require login
router.use(verifyToken);

/* Bookmarks */
router.get('/bookmarks', async (req, res) => {
  try {
    const list = await studyService.getUserBookmarks(req.user.id);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tải danh sách bookmark: ' + err.message });
  }
});

router.post('/bookmarks/toggle', async (req, res) => {
  try {
    const { quizId, quizTitle, questionIndex, questionData, note } = req.body;
    const result = await studyService.toggleBookmark(req.user.id, {
      quizId,
      quizTitle,
      questionIndex,
      questionData,
      note
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi bookmark: ' + err.message });
  }
});

router.put('/bookmarks/:id/note', async (req, res) => {
  try {
    const { note } = req.body;
    const updated = await studyService.updateBookmarkNote(req.user.id, req.params.id, note);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật ghi chú: ' + err.message });
  }
});

/* Study Progress */
router.get('/progress/:quizId', async (req, res) => {
  try {
    const progress = await studyService.getQuizProgress(req.user.id, req.params.quizId);
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tải tiến trình học: ' + err.message });
  }
});

router.post('/progress/:quizId', async (req, res) => {
  try {
    const { currentQIndex, answeredMap, stats } = req.body;
    const updated = await studyService.saveQuizProgress(req.user.id, req.params.quizId, {
      currentQIndex,
      answeredMap,
      stats
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lưu tiến trình: ' + err.message });
  }
});

/* Spaced Repetition (SM-2) */
router.get('/spaced-rep/due', async (req, res) => {
  try {
    const { quizId, limit } = req.query;
    const dueCards = await studyService.getDueCards(req.user.id, quizId, parseInt(limit) || 30);
    res.json(dueCards);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tải thẻ cần ôn: ' + err.message });
  }
});

router.post('/spaced-rep/review', async (req, res) => {
  try {
    const { cardData, quality } = req.body;
    const updated = await studyService.recordCardReview(req.user.id, cardData, quality);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lưu đánh giá thẻ: ' + err.message });
  }
});

module.exports = router;
