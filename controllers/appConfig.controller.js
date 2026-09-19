const crypto = require('crypto');
const AppConfig = require('../Models/appConfig.modal');
const ApiError = require('../utils/apiError.utils');
const ApiResponse = require('../utils/apiResponse.utils');
const { uploadApkBuffer } = require('../middleware/cloudinary_upload');

/**
 * Get the latest published app version info (public, used by client apps
 * on startup to decide whether to show an "update available" prompt).
 */
const getLatestVersion = async (req, res, next) => {
    try {
        const platform = (req.query.platform || 'android').toLowerCase();

        const config = await AppConfig.findOne({ key: 'app_version', platform });

        if (!config) {
            return next(ApiError.notFoundError('No published version found for this platform'));
        }

        return res.status(200).json(
            ApiResponse.success({
                platform: config.platform,
                latestVersion: config.latestVersion,
                latestVersionCode: config.latestVersionCode,
                apkUrl: config.apkUrl,
                apkSha256: config.apkSha256,
                releaseNotes: config.releaseNotes,
                forceUpdate: config.forceUpdate
            }, "Latest app version retrieved successfully")
        );
    } catch (error) {
        console.error('Get latest app version error:', error);
        return next(ApiError.internalError('Failed to retrieve latest app version'));
    }
};

/**
 * Publish a new app version (admin-only). Upserts the singleton document
 * for the given platform so there is always exactly one "latest" per platform.
 */
const publishVersion = async (req, res, next) => {
    try {
        const {
            platform = 'android',
            latestVersion,
            latestVersionCode,
            apkUrl,
            apkSha256,
            releaseNotes,
            forceUpdate
        } = req.body;

        if (!latestVersion || !latestVersionCode || !apkUrl) {
            return next(ApiError.validationError([
                { field: 'latestVersion/latestVersionCode/apkUrl', message: 'latestVersion, latestVersionCode and apkUrl are required' }
            ]));
        }

        if (apkSha256 && !/^[a-f0-9]{64}$/i.test(apkSha256)) {
            return next(ApiError.validationError([
                { field: 'apkSha256', message: 'apkSha256 must be a 64-character hex SHA256 hash' }
            ]));
        }

        const config = await AppConfig.findOneAndUpdate(
            { key: 'app_version', platform },
            {
                key: 'app_version',
                platform,
                latestVersion,
                latestVersionCode,
                apkUrl,
                apkSha256: apkSha256 || '',
                releaseNotes: releaseNotes || '',
                forceUpdate: !!forceUpdate
            },
            { new: true, upsert: true, runValidators: true }
        );

        return res.status(200).json(
            ApiResponse.updated(config, "App version published successfully")
        );
    } catch (error) {
        console.error('Publish app version error:', error);
        return next(ApiError.internalError('Failed to publish app version'));
    }
};

/**
 * Upload an APK file to Cloudinary (admin-only) and return its URL,
 * for use as the `apkUrl` in a subsequent publishVersion call.
 */
const uploadApkFile = async (req, res, next) => {
    try {
        if (!req.file) {
            return next(ApiError.badRequestError('No APK file provided'));
        }

        // Hash the exact bytes received before they leave this process, so
        // the caller (release.js) can confirm nothing was corrupted between
        // its local build and this upload.
        const sha256 = crypto.createHash('sha256').update(req.file.buffer).digest('hex');

        const result = await uploadApkBuffer(req.file.buffer, req.file.originalname);

        return res.status(200).json(
            ApiResponse.success({
                apkUrl: result.secure_url,
                publicId: result.public_id,
                apkSha256: sha256
            }, "APK uploaded successfully")
        );
    } catch (error) {
        console.error('Upload APK error:', error);
        return next(ApiError.internalError('Failed to upload APK'));
    }
};

module.exports = {
    getLatestVersion,
    publishVersion,
    uploadApkFile
};
