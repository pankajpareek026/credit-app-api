const mongoose = require('mongoose')
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required !'],
        minLength: [5, 'Too short Name !'],
        maxLength: [15, 'Too long Name !'],
        trim: true,

    },
    email: {
        type: String,
        unique: true,
        required: [true, 'Email is required !']
    },
    pass: {
        type: String,
        require: [true, 'Password is required !'],
        min: [8, 'too short password !']
    },
    //jwt token
    token: {
        type: String,
        default: null
    },
    // Dashboard "hide total balance" privacy toggle. Persisted here (rather
    // than only on-device) so the preference is the same across every
    // device the user logs into - see updateSettings/profile below in
    // user.controller.js for the sync endpoints (GET/PATCH /api/auth).
    hideTotalBalance: {
        type: Boolean,
        default: false
    },
    // Admin role and permissions
    isAdmin: {
        type: Boolean,
        default: false
    },
    adminRole: {
        type: String,
        enum: ['user', 'moderator', 'admin', 'super_admin'],
        default: 'user'
    },
    // Feature flags for admin capabilities
    featureFlags: {
        canViewAnalytics: { type: Boolean, default: false },
        canManageUsers: { type: Boolean, default: false },
        canManageSystem: { type: Boolean, default: false },
        canViewReports: { type: Boolean, default: false },
        canManageClients: { type: Boolean, default: false },
        canManageTransactions: { type: Boolean, default: false },
        canManageBills: { type: Boolean, default: false },
        canManageExpenses: { type: Boolean, default: false },
        canManageTasks: { type: Boolean, default: false },
        canManageNotes: { type: Boolean, default: false },
        canManageVault: { type: Boolean, default: false },
        canViewSystemHealth: { type: Boolean, default: false },
        canExportData: { type: Boolean, default: false },
        canBulkOperations: { type: Boolean, default: false }
    },
    // User status and metadata
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date,
        default: null
    },
    loginCount: {
        type: Number,
        default: 0
    },
    // Admin-specific metadata
    adminMetadata: {
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'credit-users' },
        permissionsGrantedAt: { type: Date, default: null },
        lastAdminAction: { type: Date, default: null }
    }
}, {
    timestamps: true
})
module.exports = new mongoose.model('credit-users', userSchema)