const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { verifyToken, signToken } = require('../middleware/auth');

/**
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, studentId, classRoom } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Họ và tên không được để trống' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email không được để trống' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    const newUser = await authService.createUser({
      name,
      email,
      password,
      role: role || 'student',
      studentId,
      classRoom
    });

    const token = signToken(newUser);

    res.status(201).json({
      message: 'Đăng ký tài khoản thành công!',
      token,
      user: newUser
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ Email và Mật khẩu' });
    }

    const user = await authService.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'Email hoặc mật khẩu không chính xác' });
    }

    const isMatch = await authService.validatePassword(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Email hoặc mật khẩu không chính xác' });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      studentId: user.studentId || '',
      classRoom: user.classRoom || '',
      avatar: user.avatar || ''
    };

    const token = signToken(safeUser);

    res.json({
      message: 'Đăng nhập thành công!',
      token,
      user: safeUser
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi đăng nhập: ' + err.message });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await authService.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/auth/profile
 */
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, studentId, classRoom, avatar } = req.body;
    const updated = await authService.updateUser(req.user.id, {
      name,
      studentId,
      classRoom,
      avatar
    });
    res.json({
      message: 'Cập nhật thông tin thành công!',
      user: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/auth/change-password
 */
router.put('/change-password', verifyToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Vui lòng nhập mật khẩu cũ và mật khẩu mới' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    await authService.changePassword(req.user.id, oldPassword, newPassword);
    res.json({ message: 'Đổi mật khẩu thành công!' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
