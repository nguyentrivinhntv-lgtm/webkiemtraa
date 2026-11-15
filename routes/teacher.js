const express = require('express');
const router = express.Router();
const teacherService = require('../services/teacherService');
const { verifyToken, requireRole } = require('../middleware/auth');

// Protect all teacher endpoints
router.use(verifyToken);
router.use(requireRole('teacher', 'admin'));

/**
 * GET /api/teacher/overview
 */
router.get('/overview', async (req, res) => {
  try {
    const data = await teacherService.getTeacherOverview();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tải tổng quan giáo viên: ' + err.message });
  }
});

/**
 * GET /api/teacher/analytics/:quizId
 */
router.get('/analytics/:quizId', async (req, res) => {
  try {
    const data = await teacherService.getQuizAnalytics(req.params.quizId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi phân tích bài thi: ' + err.message });
  }
});

/**
 * GET /api/teacher/export/:quizId
 */
router.get('/export/:quizId', async (req, res) => {
  try {
    const { buffer, filename } = await teacherService.generateExcelReport(req.params.quizId);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi xuất file Excel: ' + err.message });
  }
});

module.exports = router;

