require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { connectDB, getIsConnected } = require('./config/db');
const { createRateLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Render / Cloudflare deployments
app.set('trust proxy', 1);

// Middleware - allow all CORS origins
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiters
const generalApiLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 150 });
const authLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 5 phút!'
});
const uploadLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 15,
  message: 'Tải lên quá nhanh. Vui lòng đợi 1 phút trước khi thử lại!'
});

app.use('/api', generalApiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/upload', uploadLimiter);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const uploadRoutes = require('./routes/upload');
const quizRoutes = require('./routes/quiz');
const authRoutes = require('./routes/auth');
const studyRoutes = require('./routes/study');
const teacherRoutes = require('./routes/teacher');
const gamificationRoutes = require('./routes/gamification');
const classroomRoutes = require('./routes/classroom');

app.use('/api/upload', uploadRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/study', studyRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/classroom', classroomRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: getIsConnected() ? 'MongoDB Atlas' : 'Local File Storage (data/quizzes.json)',
    time: new Date().toISOString()
  });
});

// If client/dist exists, serve it (for unified deployment fallback)
const clientDist = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
} else {
  // Standalone backend welcome screen
  app.get('/', (req, res) => {
    res.json({
      status: 'online',
      message: '🚀 QuizMaster Backend API is running successfully!',
      database: getIsConnected() ? 'MongoDB Atlas' : 'Local File Storage',
      endpoints: {
        quizzes: '/api/quiz',
        upload: '/api/upload',
        health: '/api/health'
      }
    });
  });
}

// Start server and initialize database
async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 QuizMaster Backend Server running on port: ${PORT}`);
    console.log(`👉 Database: ${getIsConnected() ? 'MongoDB Atlas (Connected)' : 'Local JSON File'}`);
    console.log(`👉 API URL: http://localhost:${PORT}/api/quiz`);
    console.log(`==================================================\n`);
  });
}

startServer();
