const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getIsConnected } = require('../config/db');
const Bookmark = require('../models/Bookmark');
const StudyProgress = require('../models/StudyProgress');
const SpacedRepItem = require('../models/SpacedRepItem');

// Local storage files
const bookmarksFile = path.join(__dirname, '..', 'data', 'bookmarks.json');
const progressFile = path.join(__dirname, '..', 'data', 'progress.json');
const spacedRepFile = path.join(__dirname, '..', 'data', 'spaced_rep.json');

function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]', 'utf-8');
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/* ============================================================
   1. BOOKMARKS SERVICE
   ============================================================ */

async function getUserBookmarks(userId) {
  if (!userId) return [];
  if (getIsConnected()) {
    return await Bookmark.find({ userId }).sort({ createdAt: -1 }).lean();
  } else {
    const list = loadJSON(bookmarksFile);
    return list.filter(b => b.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

async function toggleBookmark(userId, { quizId, quizTitle, questionIndex, questionData, note = '' }) {
  if (!userId || !quizId || questionIndex === undefined) return null;

  if (getIsConnected()) {
    const existing = await Bookmark.findOne({ userId, quizId, questionIndex });
    if (existing) {
      await Bookmark.deleteOne({ _id: existing._id });
      return { action: 'removed', id: existing.id };
    } else {
      const newBM = new Bookmark({
        id: 'bm_' + uuidv4().substring(0, 8),
        userId,
        quizId,
        quizTitle: quizTitle || '',
        questionIndex,
        questionData,
        note
      });
      await newBM.save();
      return { action: 'added', bookmark: newBM.toObject() };
    }
  } else {
    const list = loadJSON(bookmarksFile);
    const idx = list.findIndex(b => b.userId === userId && b.quizId === quizId && b.questionIndex === questionIndex);
    if (idx !== -1) {
      const removedId = list[idx].id;
      list.splice(idx, 1);
      saveJSON(bookmarksFile, list);
      return { action: 'removed', id: removedId };
    } else {
      const newBM = {
        id: 'bm_' + uuidv4().substring(0, 8),
        userId,
        quizId,
        quizTitle: quizTitle || '',
        questionIndex,
        questionData,
        note,
        createdAt: new Date().toISOString()
      };
      list.push(newBM);
      saveJSON(bookmarksFile, list);
      return { action: 'added', bookmark: newBM };
    }
  }
}

async function updateBookmarkNote(userId, bookmarkId, note) {
  if (getIsConnected()) {
    return await Bookmark.findOneAndUpdate(
      { id: bookmarkId, userId },
      { $set: { note } },
      { new: true }
    ).lean();
  } else {
    const list = loadJSON(bookmarksFile);
    const idx = list.findIndex(b => b.id === bookmarkId && b.userId === userId);
    if (idx === -1) return null;
    list[idx].note = note;
    saveJSON(bookmarksFile, list);
    return list[idx];
  }
}

/* ============================================================
   2. STUDY PROGRESS SERVICE
   ============================================================ */

async function getQuizProgress(userId, quizId) {
  if (!userId || !quizId) return null;
  if (getIsConnected()) {
    const doc = await StudyProgress.findOne({ userId, quizId }).lean();
    if (doc && doc.answeredMap instanceof Map) {
      doc.answeredMap = Object.fromEntries(doc.answeredMap);
    }
    return doc;
  } else {
    const list = loadJSON(progressFile);
    return list.find(p => p.userId === userId && p.quizId === quizId) || null;
  }
}

async function saveQuizProgress(userId, quizId, { currentQIndex, answeredMap, stats }) {
  if (!userId || !quizId) return null;

  if (getIsConnected()) {
    const updated = await StudyProgress.findOneAndUpdate(
      { userId, quizId },
      {
        $set: {
          currentQIndex: currentQIndex || 0,
          answeredMap: answeredMap || {},
          stats: stats || { correct: 0, wrong: 0, total: 0 },
          lastStudiedAt: new Date()
        },
        $setOnInsert: {
          id: 'prog_' + uuidv4().substring(0, 8)
        }
      },
      { upsert: true, new: true }
    ).lean();
    return updated;
  } else {
    const list = loadJSON(progressFile);
    const idx = list.findIndex(p => p.userId === userId && p.quizId === quizId);
    const entry = {
      id: idx !== -1 ? list[idx].id : 'prog_' + uuidv4().substring(0, 8),
      userId,
      quizId,
      currentQIndex: currentQIndex || 0,
      answeredMap: answeredMap || {},
      stats: stats || { correct: 0, wrong: 0, total: 0 },
      lastStudiedAt: new Date().toISOString()
    };
    if (idx !== -1) {
      list[idx] = entry;
    } else {
      list.push(entry);
    }
    saveJSON(progressFile, list);
    return entry;
  }
}

/* ============================================================
   3. SPACED REPETITION (SM-2) SERVICE
   ============================================================ */

/**
 * Get cards due for review today for a user
 */
async function getDueCards(userId, quizId = null, limit = 50) {
  if (!userId) return [];
  const now = new Date();

  if (getIsConnected()) {
    const query = { userId, nextReviewDate: { $lte: now } };
    if (quizId) query.quizId = quizId;
    return await SpacedRepItem.find(query).sort({ nextReviewDate: 1 }).limit(limit).lean();
  } else {
    const list = loadJSON(spacedRepFile);
    return list
      .filter(item => item.userId === userId && (quizId ? item.quizId === quizId : true) && new Date(item.nextReviewDate) <= now)
      .sort((a, b) => new Date(a.nextReviewDate) - new Date(b.nextReviewDate))
      .slice(0, limit);
  }
}

/**
 * Record a review for a card using SM-2 algorithm
 * @param {string} userId
 * @param {object} cardData { quizId, quizTitle, questionIndex, questionData }
 * @param {number} quality 1: Again (sai), 2: Hard (khó), 3: Good (tốt), 4: Easy (dễ)
 */
async function recordCardReview(userId, { quizId, quizTitle, questionIndex, questionData }, quality) {
  if (!userId || !quizId || questionIndex === undefined) return null;

  let currentItem = null;
  if (getIsConnected()) {
    currentItem = await SpacedRepItem.findOne({ userId, quizId, questionIndex });
  } else {
    const list = loadJSON(spacedRepFile);
    currentItem = list.find(item => item.userId === userId && item.quizId === quizId && item.questionIndex === questionIndex);
  }

  let ef = currentItem ? currentItem.easinessFactor : 2.5;
  let rep = currentItem ? currentItem.repetition : 0;
  let interval = currentItem ? currentItem.interval : 1;

  // Convert quality 1-4 to SuperMemo 0-5 scale
  // 1 -> 1 (Again), 2 -> 3 (Pass with difficulty), 3 -> 4 (Good), 4 -> 5 (Perfect)
  const smQuality = quality === 1 ? 1 : quality === 2 ? 3 : quality === 3 ? 4 : 5;

  if (smQuality < 3) {
    // Failed: reset repetition & interval to 1 day
    rep = 0;
    interval = 1;
  } else {
    // Succeeded
    if (rep === 0) {
      interval = 1;
    } else if (rep === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * ef);
    }
    rep += 1;
  }

  // Calculate new Easiness Factor
  ef = ef + (0.1 - (5 - smQuality) * (0.08 + (5 - smQuality) * 0.02));
  if (ef < 1.3) ef = 1.3;
  if (ef > 2.8) ef = 2.8;

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  const updatedData = {
    userId,
    quizId,
    quizTitle: quizTitle || (currentItem ? currentItem.quizTitle : ''),
    questionIndex,
    questionData: questionData || (currentItem ? currentItem.questionData : null),
    easinessFactor: Math.round(ef * 100) / 100,
    repetition: rep,
    interval,
    nextReviewDate,
    lastReviewedAt: new Date()
  };

  if (getIsConnected()) {
    return await SpacedRepItem.findOneAndUpdate(
      { userId, quizId, questionIndex },
      {
        $set: updatedData,
        $setOnInsert: { id: 'sr_' + uuidv4().substring(0, 8) }
      },
      { upsert: true, new: true }
    ).lean();
  } else {
    const list = loadJSON(spacedRepFile);
    const idx = list.findIndex(i => i.userId === userId && i.quizId === quizId && i.questionIndex === questionIndex);
    const entry = {
      id: idx !== -1 ? list[idx].id : 'sr_' + uuidv4().substring(0, 8),
      ...updatedData,
      nextReviewDate: nextReviewDate.toISOString(),
      lastReviewedAt: new Date().toISOString()
    };
    if (idx !== -1) {
      list[idx] = entry;
    } else {
      list.push(entry);
    }
    saveJSON(spacedRepFile, list);
    return entry;
  }
}

module.exports = {
  getUserBookmarks,
  toggleBookmark,
  updateBookmarkNote,
  getQuizProgress,
  saveQuizProgress,
  getDueCards,
  recordCardReview
};

