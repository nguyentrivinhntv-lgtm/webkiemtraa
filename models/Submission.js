const mongoose = require('mongoose');

const DetailSchema = new mongoose.Schema({
  questionIndex: { type: Number },
  question: { type: String },
  options: [{ label: String, text: String, _id: false }],
  studentAnswer: { type: Number },
  correctAnswer: { type: Number },
  isCorrect: { type: Boolean }
}, { _id: false });

const SubmissionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  quizId: { type: String, required: true, index: true },
  quizTitle: { type: String, required: true },
  studentName: { type: String, required: true },
  studentId: { type: String, default: '' },
  score: { type: Number, required: true },
  correctCount: { type: Number, required: true },
  wrongCount: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  timeSpent: { type: Number, default: 0 },
  details: [DetailSchema],
  submittedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('Submission', SubmissionSchema);
