const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getIsConnected } = require('../config/db');
const User = require('../models/User');

const usersFile = path.join(__dirname, '..', 'data', 'users.json');

// Helper for local JSON storage
function loadLocalUsers() {
  if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, '[]', 'utf-8');
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
  } catch {
    return [];
  }
}

function saveLocalUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf-8');
}

/**
 * Find user by Email (case-insensitive)
 */
async function findUserByEmail(email) {
  const normalizedEmail = (email || '').toLowerCase().trim();
  if (getIsConnected()) {
    return await User.findOne({ email: normalizedEmail }).lean();
  } else {
    const list = loadLocalUsers();
    return list.find(u => (u.email || '').toLowerCase() === normalizedEmail) || null;
  }
}

/**
 * Find user by ID
 */
async function findUserById(id) {
  if (getIsConnected()) {
    return await User.findOne({ id }).select('-password').lean();
  } else {
    const list = loadLocalUsers();
    const user = list.find(u => u.id === id);
    if (!user) return null;
    const { password, ...safeUser } = user;
    return safeUser;
  }
}

/**
 * Create a new user with hashed password
 */
async function createUser({ name, email, password, role = 'student', studentId = '', classRoom = '' }) {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    throw new Error('Email đã được đăng ký trong hệ thống!');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = {
    id: 'user_' + uuidv4().substring(0, 8),
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role: ['student', 'teacher', 'admin'].includes(role) ? role : 'student',
    studentId: (studentId || '').trim(),
    classRoom: (classRoom || '').trim(),
    avatar: '',
    createdAt: new Date()
  };

  if (getIsConnected()) {
    const userDoc = new User(newUser);
    await userDoc.save();
    const obj = userDoc.toObject();
    delete obj.password;
    return obj;
  } else {
    const list = loadLocalUsers();
    list.push(newUser);
    saveLocalUsers(list);
    const { password: _, ...safeUser } = newUser;
    return safeUser;
  }
}

/**
 * Validate user password
 */
async function validatePassword(inputPassword, storedHashedPassword) {
  return await bcrypt.compare(inputPassword, storedHashedPassword);
}

/**
 * Update user profile
 */
async function updateUser(id, updateData) {
  const allowedUpdates = {};
  if (updateData.name) allowedUpdates.name = updateData.name.trim();
  if (updateData.studentId !== undefined) allowedUpdates.studentId = updateData.studentId.trim();
  if (updateData.classRoom !== undefined) allowedUpdates.classRoom = updateData.classRoom.trim();
  if (updateData.avatar !== undefined) allowedUpdates.avatar = updateData.avatar;

  if (getIsConnected()) {
    const updated = await User.findOneAndUpdate(
      { id },
      { $set: allowedUpdates },
      { new: true }
    ).select('-password').lean();
    return updated;
  } else {
    const list = loadLocalUsers();
    const index = list.findIndex(u => u.id === id);
    if (index === -1) return null;
    list[index] = { ...list[index], ...allowedUpdates };
    saveLocalUsers(list);
    const { password, ...safeUser } = list[index];
    return safeUser;
  }
}

/**
 * Change password
 */
async function changePassword(id, oldPassword, newPassword) {
  let user;
  if (getIsConnected()) {
    user = await User.findOne({ id });
  } else {
    const list = loadLocalUsers();
    user = list.find(u => u.id === id);
  }

  if (!user) {
    throw new Error('Người dùng không tồn tại');
  }

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    throw new Error('Mật khẩu hiện tại không chính xác!');
  }

  const salt = await bcrypt.genSalt(10);
  const newHashed = await bcrypt.hash(newPassword, salt);

  if (getIsConnected()) {
    user.password = newHashed;
    await user.save();
  } else {
    const list = loadLocalUsers();
    const idx = list.findIndex(u => u.id === id);
    list[idx].password = newHashed;
    saveLocalUsers(list);
  }

  return true;
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  validatePassword,
  updateUser,
  changePassword
};
