const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getIsConnected } = require('../config/db');
const Classroom = require('../models/Classroom');
const Submission = require('../models/Submission');
const quizService = require('./quizService');

const dataFile = path.join(__dirname, '..', 'data', 'classrooms.json');

function loadLocalClassrooms() {
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

function saveLocalClassrooms(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Generate 6-char unique uppercase class code
 */
function generateClassCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create new classroom
 */
async function createClassroom({ name, teacherId, teacherName }) {
  if (!name || !name.trim()) {
    throw new Error('Vui lòng nhập tên lớp học');
  }

  let code = generateClassCode();
  const id = uuidv4();

  if (getIsConnected()) {
    // Ensure unique code
    while (await Classroom.findOne({ code })) {
      code = generateClassCode();
    }

    const classroom = new Classroom({
      id,
      name: name.trim(),
      code,
      teacherId,
      teacherName: teacherName || '',
      students: [],
      assignments: []
    });

    await classroom.save();
    return classroom.toObject();
  } else {
    const list = loadLocalClassrooms();
    while (list.some(c => c.code === code)) {
      code = generateClassCode();
    }

    const classroom = {
      id,
      name: name.trim(),
      code,
      teacherId,
      teacherName: teacherName || '',
      students: [],
      assignments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    list.unshift(classroom);
    saveLocalClassrooms(list);
    return classroom;
  }
}

/**
 * Get classrooms created by a teacher
 */
async function getClassroomsByTeacher(teacherId) {
  if (getIsConnected()) {
    return await Classroom.find({ teacherId }).sort({ createdAt: -1 }).lean();
  } else {
    const list = loadLocalClassrooms();
    return list.filter(c => c.teacherId === teacherId);
  }
}

/**
 * Get classrooms a student has joined
 */
async function getClassroomsByStudent(userId) {
  if (getIsConnected()) {
    return await Classroom.find({ 'students.userId': userId }).sort({ createdAt: -1 }).lean();
  } else {
    const list = loadLocalClassrooms();
    return list.filter(c => c.students?.some(s => s.userId === userId));
  }
}

/**
 * Get classroom by ID
 */
async function getClassroomById(id) {
  if (getIsConnected()) {
    return await Classroom.findOne({ id }).lean();
  } else {
    const list = loadLocalClassrooms();
    return list.find(c => c.id === id) || null;
  }
}

/**
 * Student joins classroom by 6-char code
 */
async function joinClassroom(code, studentUser) {
  if (!code || !code.trim()) {
    throw new Error('Vui lòng nhập mã lớp học');
  }

  const cleanCode = code.trim().toUpperCase();

  if (getIsConnected()) {
    const classroom = await Classroom.findOne({ code: cleanCode });
    if (!classroom) {
      throw new Error(`Không tìm thấy lớp học với mã "${cleanCode}"`);
    }

    const alreadyJoined = classroom.students.some(s => s.userId === studentUser.id);
    if (alreadyJoined) {
      throw new Error('Bạn đã tham gia lớp học này rồi');
    }

    classroom.students.push({
      userId: studentUser.id,
      name: studentUser.name,
      email: studentUser.email,
      studentId: studentUser.studentId || '',
      classRoom: studentUser.classRoom || '',
      joinedAt: new Date()
    });

    await classroom.save();
    return classroom.toObject();
  } else {
    const list = loadLocalClassrooms();
    const classroom = list.find(c => c.code === cleanCode);
    if (!classroom) {
      throw new Error(`Không tìm thấy lớp học với mã "${cleanCode}"`);
    }

    const alreadyJoined = classroom.students?.some(s => s.userId === studentUser.id);
    if (alreadyJoined) {
      throw new Error('Bạn đã tham gia lớp học này rồi');
    }

    if (!classroom.students) classroom.students = [];
    classroom.students.push({
      userId: studentUser.id,
      name: studentUser.name,
      email: studentUser.email,
      studentId: studentUser.studentId || '',
      classRoom: studentUser.classRoom || '',
      joinedAt: new Date().toISOString()
    });

    classroom.updatedAt = new Date().toISOString();
    saveLocalClassrooms(list);
    return classroom;
  }
}

/**
 * Teacher assigns a quiz to the classroom
 */
async function assignQuizToClass(classId, teacherId, { quizId, dueDate }) {
  const quiz = await quizService.getQuizById(quizId);
  if (!quiz) {
    throw new Error('Không tìm thấy bài thi được chọn');
  }

  const assignment = {
    id: uuidv4(),
    quizId: quiz.id,
    quizTitle: quiz.title,
    dueDate: dueDate ? new Date(dueDate) : null,
    createdAt: new Date()
  };

  if (getIsConnected()) {
    const classroom = await Classroom.findOne({ id: classId, teacherId });
    if (!classroom) {
      throw new Error('Không tìm thấy lớp học hoặc bạn không có quyền quản lý lớp này');
    }

    // Check if already assigned
    const alreadyAssigned = classroom.assignments.some(a => a.quizId === quizId);
    if (alreadyAssigned) {
      throw new Error('Bài thi này đã được giao cho lớp trước đó');
    }

    classroom.assignments.unshift(assignment);
    await classroom.save();
    return classroom.toObject();
  } else {
    const list = loadLocalClassrooms();
    const classroom = list.find(c => c.id === classId && c.teacherId === teacherId);
    if (!classroom) {
      throw new Error('Không tìm thấy lớp học hoặc bạn không có quyền quản lý lớp này');
    }

    if (!classroom.assignments) classroom.assignments = [];
    const alreadyAssigned = classroom.assignments.some(a => a.quizId === quizId);
    if (alreadyAssigned) {
      throw new Error('Bài thi này đã được giao cho lớp trước đó');
    }

    assignment.createdAt = new Date().toISOString();
    classroom.assignments.unshift(assignment);
    classroom.updatedAt = new Date().toISOString();
    saveLocalClassrooms(list);
    return classroom;
  }
}

/**
 * Get classroom progress matrix (Teacher view: student submissions for each assigned quiz)
 */
async function getClassroomProgress(classId, teacherId) {
  const classroom = await getClassroomById(classId);
  if (!classroom) {
    throw new Error('Không tìm thấy lớp học');
  }

  const students = classroom.students || [];
  const assignments = classroom.assignments || [];

  // For each assignment, fetch all submissions
  const matrix = [];

  for (const student of students) {
    const studentStatus = {
      student,
      quizzes: []
    };

    for (const assign of assignments) {
      const submissions = await quizService.getSubmissions(assign.quizId);

      // Find match by student ID or userId or studentName
      const match = submissions.find(s => {
        if (s.userId && s.userId === student.userId) return true;
        if (student.studentId && s.studentId && s.studentId.toLowerCase() === student.studentId.toLowerCase()) return true;
        if (s.studentName && s.studentName.toLowerCase().includes(student.name.toLowerCase())) return true;
        return false;
      });

      studentStatus.quizzes.push({
        quizId: assign.quizId,
        quizTitle: assign.quizTitle,
        dueDate: assign.dueDate,
        isSubmitted: !!match,
        score: match ? match.score : null,
        timeSpent: match ? match.timeSpent : null,
        tabSwitches: match ? match.tabSwitches : 0,
        submittedAt: match ? match.submittedAt : null
      });
    }

    matrix.push(studentStatus);
  }

  return {
    classroom: {
      id: classroom.id,
      name: classroom.name,
      code: classroom.code,
      teacherName: classroom.teacherName,
      totalStudents: students.length,
      totalAssignments: assignments.length
    },
    assignments,
    progressMatrix: matrix
  };
}

/**
 * Delete a classroom
 */
async function deleteClassroom(classId, teacherId) {
  if (getIsConnected()) {
    const res = await Classroom.deleteOne({ id: classId, teacherId });
    if (res.deletedCount === 0) {
      throw new Error('Không tìm thấy lớp học để xóa');
    }
    return true;
  } else {
    let list = loadLocalClassrooms();
    const initialLen = list.length;
    list = list.filter(c => !(c.id === classId && c.teacherId === teacherId));
    if (list.length === initialLen) {
      throw new Error('Không tìm thấy lớp học để xóa');
    }
    saveLocalClassrooms(list);
    return true;
  }
}

module.exports = {
  createClassroom,
  getClassroomsByTeacher,
  getClassroomsByStudent,
  getClassroomById,
  joinClassroom,
  assignQuizToClass,
  getClassroomProgress,
  deleteClassroom
};
