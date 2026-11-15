const mongoose = require('mongoose');

const BookmarkSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  quizId: { type: String, required: true, index: true },
  quizTitle: { type: String, default: '' },
  questionIndex: { type: Number, required: true },
  questionData: {
    question: { type: String, required: true },
    options: [{ label: String, text: String, _id: false }],
    correctAnswer: { type: Number, required: true },
    unit: { type: String, default: '' },
    section: { type: String, default: '' }
  },
  note: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('Bookmark', BookmarkSchema);

