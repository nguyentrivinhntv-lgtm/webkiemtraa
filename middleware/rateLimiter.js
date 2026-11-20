/**
 * Lightweight in-memory sliding window rate limiter (No external dependencies required)
 */
function createRateLimiter({
  windowMs = 60 * 1000,
  max = 60,
  message = 'Bạn đang gửi quá nhiều yêu cầu. Vui lòng thử lại sau giây lát!'
} = {}) {
  const store = new Map();

  // Periodic cleanup of expired records every 60s
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, data] of store.entries()) {
      if (now - data.startTime > windowMs) {
        store.delete(key);
      }
    }
  }, Math.max(windowMs, 30000));
  
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.socket?.remoteAddress || 'unknown-ip';
    const now = Date.now();

    let record = store.get(ip);
    if (!record || now - record.startTime > windowMs) {
      store.set(ip, { count: 1, startTime: now });
      return next();
    }

    record.count += 1;
    if (record.count > max) {
      const retryAfter = Math.ceil((windowMs - (now - record.startTime)) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        error: message,
        retryAfterSeconds: retryAfter
      });
    }

    next();
  };
}

module.exports = { createRateLimiter };
