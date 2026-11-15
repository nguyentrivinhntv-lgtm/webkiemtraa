const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

let isConnected = false;

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri || !uri.trim()) {
    console.log('ℹ️  MONGODB_URI chưa được cấu hình. Hệ thống đang dùng cơ sở dữ liệu tệp cục bộ (data/quizzes.json).');
    return false;
  }

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri.trim(), {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log('✅ Kết nối cơ sở dữ liệu MongoDB Atlas thành công!');

    // Auto-seed sample quizzes if DB is empty
    await autoSeedIfNeeded();
    return true;
  } catch (err) {
    console.error('⚠️  Không thể kết nối MongoDB:', err.message);
    console.log('ℹ️  Tự động chuyển về dùng data/quizzes.json để hệ thống không bị gián đoạn.');
    isConnected = false;
    return false;
  }
}

async function autoSeedIfNeeded() {
  try {
    const Quiz = require('../models/Quiz');
    const count = await Quiz.countDocuments();
    if (count === 0) {
      const localFile = path.join(__dirname, '..', 'data', 'quizzes.json');
      if (fs.existsSync(localFile)) {
        const localData = JSON.parse(fs.readFileSync(localFile, 'utf8'));
        if (Array.isArray(localData) && localData.length > 0) {
          console.log(`🌱 Đang đồng bộ ${localData.length} bộ đề thi mẫu vào MongoDB...`);
          await Quiz.insertMany(localData);
          console.log('🎉 Đồng bộ dữ liệu mẫu vào MongoDB thành công!');
        }
      }
    }
  } catch (err) {
    console.warn('Lỗi auto-seed MongoDB:', err.message);
  }
}

function getIsConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

module.exports = { connectDB, getIsConnected };

