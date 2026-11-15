const express = require('express');
const router = express.Router();
const classroomService = require('../services/classroomService');
const { verifyToken, requireRole } = require('../middleware/auth');

/**
 * POST /api/classroom
 * Teacher creates a new classroom
 */
router.post('/', verifyToken, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { name } = req.body;
    const classroom = await classroomService.createClassroom({
      name,
      teacherId: req.user.id,
      teacherName: req.user.name
    });
    res.status(201).json({ message: 'Tạo lớp học thành công', classroom });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/classroom/teacher
 * Get all classrooms managed by current teacher
 */
router.get('/teacher', verifyToken, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const classrooms = await classroomService.getClassroomsByTeacher(req.user.id);
    res.json(classrooms);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tải danh sách lớp học: ' + err.message });
  }
});

/**
 * GET /api/classroom/student
 * Get all classrooms joined by current student
 */
router.get('/student', verifyToken, async (req, res) => {
  try {
    const classrooms = await classroomService.getClassroomsByStudent(req.user.id);
    res.json(classrooms);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tải danh sách lớp học: ' + err.message });
  }
});

/**
 * POST /api/classroom/join
 * Student joins classroom with 6-char code
 */
router.post('/join', verifyToken, async (req, res) => {
  try {
    const { code } = req.body;
    const classroom = await classroomService.joinClassroom(code, req.user);
    res.json({ message: `Đã tham gia lớp học "${classroom.name}" thành công!`, classroom });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/classroom/:id
 * Get single classroom details
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const classroom = await classroomService.getClassroomById(req.params.id);
    if (!classroom) {
      return res.status(404).json({ error: 'Không tìm thấy lớp học' });
    }
    res.json(classroom);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tải thông tin lớp học: ' + err.message });
  }
});

/**
 * POST /api/classroom/:id/assign
 * Teacher assigns a quiz to the classroom
 */
router.post('/:id/assign', verifyToken, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { quizId, dueDate } = req.body;
    const classroom = await classroomService.assignQuizToClass(req.params.id, req.user.id, {
      quizId,
      dueDate
    });
    res.json({ message: 'Giao đề thi cho lớp thành công!', classroom });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/classroom/:id/progress
 * Teacher views submission progress of all students in the classroom
 */
router.get('/:id/progress', verifyToken, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const progress = await classroomService.getClassroomProgress(req.params.id, req.user.id);
    res.json(progress);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/classroom/:id
 * Teacher deletes a classroom
 */
router.delete('/:id', verifyToken, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    await classroomService.deleteClassroom(req.params.id, req.user.id);
    res.json({ message: 'Đã xóa lớp học thành công' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

