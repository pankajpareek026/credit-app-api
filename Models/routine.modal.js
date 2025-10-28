const mongoose = require('mongoose');

const routineStepSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  estimatedDuration: {
    type: Number,
    default: 0,
    min: 0
  },
  order: {
    type: Number,
    required: true,
    min: 0
  },
  isOptional: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const routineProgressSchema = new mongoose.Schema({
  routineId: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  stepCompletions: {
    type: Map,
    of: Boolean,
    default: {}
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  mood: {
    type: String,
    enum: ['excellent', 'good', 'okay', 'poor', 'terrible'],
    default: 'okay'
  },
  energyLevel: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  }
}, { _id: false });

const routineSchema = new mongoose.Schema({
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'credit-users',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['morning', 'evening', 'workout', 'study', 'work', 'personal', 'health', 'other'],
    required: true
  },
  color: {
    type: String,
    default: '#3B82F6',
    match: /^#[0-9A-F]{6}$/i
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  durationInDays: {
    type: Number,
    required: true,
    min: 1
  },
  steps: {
    type: [routineStepSchema],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: {
    type: [String],
    default: []
  },
  reminderTime: {
    type: String,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  reminderDays: {
    type: [String],
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    default: []
  },
  progress: {
    type: [routineProgressSchema],
    default: []
  },
  statistics: {
    totalDays: {
      type: Number,
      default: 0
    },
    completedDays: {
      type: Number,
      default: 0
    },
    currentStreak: {
      type: Number,
      default: 0
    },
    longestStreak: {
      type: Number,
      default: 0
    },
    averageCompletionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
routineSchema.index({ parentId: 1, type: 1 });
routineSchema.index({ parentId: 1, startDate: 1 });
routineSchema.index({ parentId: 1, endDate: 1 });
routineSchema.index({ parentId: 1, isActive: 1 });
routineSchema.index({ parentId: 1, createdAt: -1 });

// Virtual for checking if routine is currently active
routineSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  return this.isActive && this.startDate <= now && this.endDate >= now;
});

// Virtual for checking if routine has ended
routineSchema.virtual('hasEnded').get(function() {
  return this.endDate < new Date();
});

// Virtual for checking if routine is upcoming
routineSchema.virtual('isUpcoming').get(function() {
  return this.startDate > new Date();
});

// Virtual for completion percentage
routineSchema.virtual('completionPercentage').get(function() {
  if (this.statistics.totalDays === 0) return 0;
  return (this.statistics.completedDays / this.statistics.totalDays) * 100;
});

// Virtual for type display name
routineSchema.virtual('typeDisplayName').get(function() {
  const typeMap = {
    'morning': 'Morning Routine',
    'evening': 'Evening Routine',
    'workout': 'Workout Routine',
    'study': 'Study Routine',
    'work': 'Work Routine',
    'personal': 'Personal Routine',
    'health': 'Health Routine',
    'other': 'Other Routine'
  };
  return typeMap[this.type] || this.type;
});

// Ensure virtuals are serialized
routineSchema.set('toJSON', { virtuals: true });
routineSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Routine', routineSchema);
