const mongoose = require('mongoose');

const goalActivitySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  value: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    trim: true
  }
}, { _id: false });

const goalMilestoneSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  targetDate: {
    type: Date,
    required: true
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedDate: {
    type: Date
  },
  value: {
    type: Number,
    default: 0
  }
}, { _id: false });

const goalSchema = new mongoose.Schema({
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'credit-users',
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
    maxlength: 1000
  },
  type: {
    type: String,
    enum: ['financial', 'education', 'physical', 'career', 'personal', 'health', 'social', 'hobby', 'other'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'paused', 'cancelled'],
    default: 'active'
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  startDate: {
    type: Date,
    required: true
  },
  targetDate: {
    type: Date,
    required: true
  },
  completedDate: {
    type: Date
  },
  targetValue: {
    type: Number,
    required: true,
    min: 0
  },
  targetUnit: {
    type: String,
    required: true,
    trim: true
  },
  currentValue: {
    type: Number,
    default: 0,
    min: 0
  },
  progressPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: String,
    required: true,
    trim: true
  },
  tags: {
    type: [String],
    default: []
  },
  reward: {
    type: String,
    trim: true,
    maxlength: 500
  },
  consequence: {
    type: String,
    trim: true,
    maxlength: 500
  },
  streakDays: {
    type: Number,
    default: 0,
    min: 0
  },
  longestStreak: {
    type: Number,
    default: 0,
    min: 0
  },
  hasReminders: {
    type: Boolean,
    default: false
  },
  reminderDates: {
    type: [Date],
    default: []
  },
  activities: {
    type: [goalActivitySchema],
    default: []
  },
  milestones: {
    type: [goalMilestoneSchema],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
goalSchema.index({ parentId: 1, status: 1 });
goalSchema.index({ parentId: 1, type: 1 });
goalSchema.index({ parentId: 1, targetDate: 1 });
goalSchema.index({ parentId: 1, createdAt: -1 });
goalSchema.index({ parentId: 1, isActive: 1 });

// Virtual for checking if goal is overdue
goalSchema.virtual('isOverdue').get(function() {
  return this.status === 'active' && this.targetDate < new Date();
});

// Virtual for checking if goal is due today
goalSchema.virtual('isDueToday').get(function() {
  const today = new Date();
  const targetDate = this.targetDate;
  return targetDate.toDateString() === today.toDateString();
});

// Virtual for checking if goal is due soon (within 7 days)
goalSchema.virtual('isDueSoon').get(function() {
  const today = new Date();
  const sevenDaysFromNow = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
  return this.targetDate <= sevenDaysFromNow && this.targetDate >= today;
});

// Virtual for checking if goal has ended
goalSchema.virtual('hasEnded').get(function() {
  return this.targetDate < new Date() || this.status === 'completed' || this.status === 'cancelled';
});

// Virtual for type display name
goalSchema.virtual('typeDisplayName').get(function() {
  const typeMap = {
    'financial': 'Financial',
    'education': 'Education',
    'physical': 'Physical',
    'career': 'Career',
    'personal': 'Personal',
    'health': 'Health',
    'social': 'Social',
    'hobby': 'Hobby',
    'other': 'Other'
  };
  return typeMap[this.type] || this.type;
});

// Ensure virtuals are serialized
goalSchema.set('toJSON', { virtuals: true });
goalSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Goal', goalSchema);
