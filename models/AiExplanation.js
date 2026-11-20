const mongoose = require('mongoose');

const AiExplanationSchema = new mongoose.Schema({
  questionHash: { type: String, required: true, unique: true, index: true },
  quizId: { type: String, index: true },
  questionIndex: { type: Number },
  questionText: { type: String, required: true },
  explanation: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('AiExplanation', AiExplanationSchema);
