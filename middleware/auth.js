const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'quizmaster-secret-key-2026-learning-system';

/**
 * Verify JWT token middleware
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Vui lòng đăng nhập để tiếp tục!' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.' });
  }
}

/**
 * Optional token middleware (attaches req.user if present, but doesn't block)
 */
function optionalToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Ignore token errors for optional auth
    }
  }
  next();
}

/**
 * Require specific roles
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Chưa xác thực danh tính.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập chức năng này.' });
    }
    next();
  };
}

/**
 * Sign JWT token for user
 */
function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = {
  verifyToken,
  optionalToken,
  requireRole,
  signToken,
  JWT_SECRET
};

