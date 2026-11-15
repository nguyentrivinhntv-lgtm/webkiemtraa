const mongoose = require('mongoose');

const SpacedRepItemSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  quizId: { type: String, required: true, index: true },
  quizTitle: { type: String, default: '' },
  questionIndex: { type: Number, required: true },
  questionData: {
    question: { type: String, required: true },
    options: [{ label: String, text: String, _id: false }],
    correctAnswer: { type: Number, required: true },
    unit: { type: String, default: '' }
  },
  easinessFactor: { type: Number, default: 2.5 },
  repetition: { type: Number, default: 0 },
  interval: { type: Number, default: 1 }, // in days
  nextReviewDate: { type: Date, default: Date.now },
  lastReviewedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('SpacedRepItem', SpacedRepItemSchema);
