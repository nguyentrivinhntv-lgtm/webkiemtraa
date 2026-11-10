const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - allow all CORS origins so separate frontend can connect seamlessly
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const uploadRoutes = require('./routes/upload');
const quizRoutes = require('./routes/quiz');

app.use('/api/upload', uploadRoutes);
app.use('/api/quiz', quizRoutes);

// If client/dist exists, serve it (for unified deployment)
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
  // If running as standalone backend
  app.get('/', (req, res) => {
    res.json({
      status: 'online',
      message: '🚀 QuizMaster Backend API is running successfully!',
      endpoints: {
        quizzes: '/api/quiz',
        upload: '/api/upload'
      }
    });
  });
}

app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 QuizMaster Backend Server running on port: ${PORT}`);
  console.log(`👉 API URL: http://localhost:${PORT}/api/quiz`);
  console.log(`==================================================\n`);
});
