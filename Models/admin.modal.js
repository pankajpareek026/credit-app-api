const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Admin User Schema - For system administrators
 * 
 * This model manages admin users who can:
 * - Manage regular users
 * - View system analytics
 * - Manage system settings
 * - Monitor system health
 * - Access admin dashboard
 */
const adminSchema = new mongoose.Schema({
    // Basic admin information
    username: {
        type: String,
        required: [true, 'Admin username is required'],
        unique: true,
        trim: true,
        minLength: [3, 'Username must be at least 3 characters'],
        maxLength: [20, 'Username must not exceed 20 characters']
    },

    email: {
        type: String,
        required: [true, 'Admin email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: function (v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: 'Please enter a valid email address'
        }
    },

    password: {
        type: String,
        required: [true, 'Admin password is required'],
        minLength: [8, 'Password must be at least 8 characters']
    },

    // Admin profile information
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxLength: [50, 'First name must not exceed 50 characters']
    },

    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxLength: [50, 'Last name must not exceed 50 characters']
    },

    // Admin role and permissions
    role: {
        type: String,
        enum: ['super_admin', 'admin', 'moderator', 'analyst'],
        default: 'admin',
        required: true
    },

    permissions: {
        userManagement: {
            canView: { type: Boolean, default: true },
            canCreate: { type: Boolean, default: true },
            canUpdate: { type: Boolean, default: true },
            canDelete: { type: Boolean, default: true },
            canSuspend: { type: Boolean, default: true }
        },
        systemManagement: {
            canViewAnalytics: { type: Boolean, default: true },
            canViewLogs: { type: Boolean, default: true },
            canManageSettings: { type: Boolean, default: false },
            canViewReports: { type: Boolean, default: true }
        },
        contentManagement: {
            canManageClients: { type: Boolean, default: true },
            canManageTransactions: { type: Boolean, default: true },
            canManageBills: { type: Boolean, default: true },
            canManageExpenses: { type: Boolean, default: true },
            canManageTasks: { type: Boolean, default: true }
        }
    },

    // Admin status and security
    isActive: {
        type: Boolean,
        default: true
    },

    isVerified: {
        type: Boolean,
        default: false
    },

    lastLogin: {
        type: Date,
        default: null
    },

    loginAttempts: {
        type: Number,
        default: 0
    },

    lockUntil: {
        type: Date,
        default: null
    },

    // Two-factor authentication
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },

    twoFactorSecret: {
        type: String,
        default: null
    },

    // Admin activity tracking
    lastActivity: {
        type: Date,
        default: Date.now
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    },

    // Additional metadata
    metadata: {
        type: Map,
        of: String,
        default: {}
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for efficient queries
adminSchema.index({ username: 1 });
adminSchema.index({ email: 1 });
adminSchema.index({ role: 1 });
adminSchema.index({ isActive: 1 });
adminSchema.index({ lastLogin: -1 });
adminSchema.index({ createdAt: -1 });

// Virtual for full name
adminSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual for account lock status
adminSchema.virtual('isLocked').get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
adminSchema.pre('save', async function (next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();

    try {
        // Hash password with cost of 12
        const hashedPassword = await bcrypt.hash(this.password, 12);
        this.password = hashedPassword;
        next();
    } catch (error) {
        next(error);
    }
});

// Instance method to compare password
adminSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

// Instance method to increment login attempts
adminSchema.methods.incLoginAttempts = function () {
    // If we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 1 }
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };

    // Lock account after 5 failed attempts for 2 hours
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
    }

    return this.updateOne(updates);
};

// Instance method to reset login attempts
adminSchema.methods.resetLoginAttempts = function () {
    return this.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 }
    });
};

// Static method to find admin by username or email
adminSchema.statics.findByCredentials = async function (identifier) {
    const admin = await this.findOne({
        $or: [
            { username: identifier },
            { email: identifier }
        ],
        isActive: true
    });

    return admin;
};

// Static method to get admin statistics
adminSchema.statics.getAdminStats = async function () {
    const stats = await this.aggregate([
        {
            $group: {
                _id: null,
                totalAdmins: { $sum: 1 },
                activeAdmins: {
                    $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
                },
                verifiedAdmins: {
                    $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] }
                },
                superAdmins: {
                    $sum: { $cond: [{ $eq: ['$role', 'super_admin'] }, 1, 0] }
                },
                admins: {
                    $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
                },
                moderators: {
                    $sum: { $cond: [{ $eq: ['$role', 'moderator'] }, 1, 0] }
                },
                analysts: {
                    $sum: { $cond: [{ $eq: ['$role', 'analyst'] }, 1, 0] }
                }
            }
        }
    ]);

    return stats[0] || {
        totalAdmins: 0,
        activeAdmins: 0,
        verifiedAdmins: 0,
        superAdmins: 0,
        admins: 0,
        moderators: 0,
        analysts: 0
    };
};

module.exports = mongoose.model('Admin', adminSchema);

