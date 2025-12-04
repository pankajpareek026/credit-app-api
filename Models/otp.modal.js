const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true
    },
    otp: {
        type: String,
        required: [true, 'OTP is required'],
        length: [6, 'OTP must be 6 digits']
    },
    purpose: {
        type: String,
        enum: ['login', 'password_reset'],
        required: [true, 'OTP purpose is required']
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'credit-users',
        default: null
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expireAfterSeconds: 0 } // Auto-delete expired OTPs
    },
    attempts: {
        type: Number,
        default: 0,
        max: [5, 'Maximum verification attempts exceeded']
    },
    verifiedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index for efficient queries
otpSchema.index({ email: 1, purpose: 1, createdAt: -1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to check if OTP is valid
otpSchema.methods.isValid = function() {
    return !this.isVerified && this.expiresAt > new Date() && this.attempts < 5;
};

// Method to increment attempts
otpSchema.methods.incrementAttempts = function() {
    this.attempts += 1;
    return this.save();
};

// Method to mark as verified
otpSchema.methods.markAsVerified = function() {
    this.isVerified = true;
    this.verifiedAt = new Date();
    return this.save();
};

// Static method to clean expired OTPs
otpSchema.statics.cleanExpired = async function() {
    return this.deleteMany({ expiresAt: { $lt: new Date() } });
};

module.exports = mongoose.model('otps', otpSchema);

