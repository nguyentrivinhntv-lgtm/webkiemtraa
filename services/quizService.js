const path = require('path');
const { getIsConnected } = require('../config/db');
const { safeReadJson, safeWriteJson } = require('../utils/jsonStorage');
const Quiz = require('../models/Quiz');
const Submission = require('../models/Submission');

const dataFile = path.join(__dirname, '..', 'data', 'quizzes.json');

// Helper for local JSON operations
function loadLocalQuizzes() {
  return safeReadJson(dataFile, []);
}

function saveLocalQuizzes(data) {
  safeWriteJson(dataFile, data);
}

// Submissions local file
const subFile = path.join(__dirname, '..', 'data', 'submissions.json');
function loadLocalSubmissions() {
  return safeReadJson(subFile, []);
}
function saveLocalSubmissions(data) {
  safeWriteJson(subFile, data);
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

/**
 * Get submissions by user ID
 */
async function getUserSubmissions(userId) {
  if (!userId) return [];
  if (getIsConnected()) {
    return await Submission.find({ userId }).sort({ submittedAt: -1 }).lean();
  } else {
    const subs = loadLocalSubmissions();
    return subs.filter(s => s.userId === userId);
  }
}

module.exports = {
  getAllQuizzes,
  getQuizById,
  createQuiz,
  deleteQuiz,
  createSubmission,
  getSubmissions,
  getUserSubmissions
};

