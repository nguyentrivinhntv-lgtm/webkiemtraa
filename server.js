require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { connectDB, getIsConnected } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - allow all CORS origins
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
