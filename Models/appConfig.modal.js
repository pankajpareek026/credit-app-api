const mongoose = require('mongoose');

// Singleton document (single row identified by `key`) holding the latest
// published app version info, used by clients to detect available updates.
const appConfigSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        default: 'app_version'
    },
    platform: {
        type: String,
        required: true,
        enum: ['android', 'ios'],
        default: 'android'
    },
    latestVersion: {
        type: String,
        required: true,
        trim: true
    },
    latestVersionCode: {
        type: Number,
        required: true,
        min: 1
    },
    apkUrl: {
        type: String,
        required: true,
        trim: true
    },
    apkSha256: {
        type: String,
        trim: true,
        default: '',
        match: [/^([a-f0-9]{64})?$/i, 'apkSha256 must be a 64-character hex SHA256 hash']
    },
    releaseNotes: {
        type: String,
        trim: true,
        default: ''
    },
    forceUpdate: {
        type: Boolean,
        default: false
    },
    publishedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('AppConfig', appConfigSchema);
