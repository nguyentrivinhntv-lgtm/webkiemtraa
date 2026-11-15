const mongoose = require('mongoose');

const OptionSchema = new mongoose.Schema({
  label: { type: String, required: true }, // 'A', 'B', 'C', 'D'
  text: { type: String, required: true }
}, { _id: false });

const QuestionSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  displayId: { type: Number },
  unit: { type: String, default: '' },
  section: { type: String, default: '' },
  question: { type: String, required: true },
  options: [OptionSchema],
  correctAnswer: { type: Number, required: true, default: 0 },
  type: { type: String, default: 'multiple-choice' }
}, { _id: false });

const PassageSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  title: { type: String, required: true },
  text: { type: String, required: true },
  questions: [QuestionSchema]
}, { _id: false });

const QuizSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  type: {
    type: String,
    enum: ['multiple-choice', 'reading-comprehension'],
    default: 'multiple-choice'
  },
  timeLimit: { type: Number, default: 60 }, // minutes
  shuffleQuestions: { type: Boolean, default: false },
  shuffleOptions: { type: Boolean, default: false },
  showResult: { type: Boolean, default: true },
  totalQuestions: { type: Number, default: 0 },
  questions: [QuestionSchema],
  passages: [PassageSchema],
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('Quiz', QuizSchema);

