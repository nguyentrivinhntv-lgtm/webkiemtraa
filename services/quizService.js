const fs = require('fs');
const path = require('path');
const { getIsConnected } = require('../config/db');
const Quiz = require('../models/Quiz');
const Submission = require('../models/Submission');

const dataFile = path.join(__dirname, '..', 'data', 'quizzes.json');

// Helper for local JSON operations
function loadLocalQuizzes() {
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, '[]', 'utf-8');
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
  } catch {
    return [];
  }
}

function saveLocalQuizzes(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf-8');
}

// Submissions local file
const subFile = path.join(__dirname, '..', 'data', 'submissions.json');
function loadLocalSubmissions() {
  if (!fs.existsSync(subFile)) {
    fs.writeFileSync(subFile, '[]', 'utf-8');
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(subFile, 'utf-8'));
  } catch {
    return [];
  }
}
function saveLocalSubmissions(data) {
  fs.writeFileSync(subFile, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Get all quizzes summary (for homepage list)
 */
async function getAllQuizzes() {
  if (getIsConnected()) {
    return await Quiz.find({}, 'id title type timeLimit totalQuestions createdAt').sort({ createdAt: -1 }).lean();
  } else {
    const list = loadLocalQuizzes();
    return list.map(q => ({
      id: q.id,
      title: q.title,
      type: q.type,
      timeLimit: q.timeLimit,
      totalQuestions: q.totalQuestions,
      createdAt: q.createdAt
    }));
  }
}

/**
 * Get single quiz by ID (raw, including correct answers)
 */
async function getQuizById(id) {
  if (getIsConnected()) {
    return await Quiz.findOne({ id }).lean();
  } else {
    const list = loadLocalQuizzes();
    return list.find(q => q.id === id) || null;
  }
}

/**
 * Save / Create a new quiz
 */
async function createQuiz(quiz) {
  if (getIsConnected()) {
    const newQuiz = new Quiz(quiz);
    await newQuiz.save();
    return newQuiz.toObject();
  } else {
    const list = loadLocalQuizzes();
    list.push(quiz);
    saveLocalQuizzes(list);
    return quiz;
  }
}

/**
 * Delete a quiz by ID
 */
async function deleteQuiz(id) {
  if (getIsConnected()) {
    await Quiz.deleteOne({ id });
    await Submission.deleteMany({ quizId: id });
    return true;
  } else {
    let list = loadLocalQuizzes();
    const index = list.findIndex(q => q.id === id);
    if (index === -1) return false;
    list.splice(index, 1);
    saveLocalQuizzes(list);
    return true;
  }
}

/**
 * Save student submission
 */
async function createSubmission(sub) {
  if (getIsConnected()) {
    const newSub = new Submission(sub);
    await newSub.save();
    return newSub.toObject();
  } else {
    const subs = loadLocalSubmissions();
    subs.push(sub);
    saveLocalSubmissions(subs);
    return sub;
  }
}

/**
 * Get submissions for a quiz
 */
async function getSubmissions(quizId) {
  if (getIsConnected()) {
    return await Submission.find({ quizId }).sort({ submittedAt: -1 }).lean();
  } else {
    const subs = loadLocalSubmissions();
    return subs.filter(s => s.quizId === quizId);
  }
}

module.exports = {
  getAllQuizzes,
  getQuizById,
  createQuiz,
  deleteQuiz,
  createSubmission,
  getSubmissions
};
