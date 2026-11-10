const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
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

// Always serve built React client if available (SPA Fallback)
const clientDist = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // In Express 5, use middleware instead of app.get('*') for SPA fallback
  app.use((req, res, next) => {
    // Only handle GET requests that don't match API
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
}

app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 QuizMaster Web App đang chạy tại:`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`==================================================\n`);
});
