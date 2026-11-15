const mongoose = require('mongoose');

const StudyProgressSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  quizId: { type: String, required: true, index: true },
  currentQIndex: { type: Number, default: 0 },
  answeredMap: { type: Map, of: String, default: {} }, // { "0": "correct", "1": "wrong" }
  stats: {
    correct: { type: Number, default: 0 },
    wrong: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  lastStudiedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('StudyProgress', StudyProgressSchema);

