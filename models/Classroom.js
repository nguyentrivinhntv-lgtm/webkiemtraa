const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  teacherId: {
    type: String,
    required: true
  },
  teacherName: {
    type: String,
    default: ''
  },
  students: [
    {
      userId: String,
      name: String,
      email: String,
      studentId: String,
      classRoom: String,
      joinedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  assignments: [
    {
      id: String,
      quizId: String,
      quizTitle: String,
      dueDate: Date,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
}, {
  timestamps: true
});

module.exports = mongoose.models.Classroom || mongoose.model('Classroom', classroomSchema);
