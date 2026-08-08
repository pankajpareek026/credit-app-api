const AppConfig = require('../Models/appConfig.modal');
const ApiError = require('../utils/apiError.utils');
const ApiResponse = require('../utils/apiResponse.utils');

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
            releaseNotes,
            forceUpdate
        } = req.body;

        if (!latestVersion || !latestVersionCode || !apkUrl) {
            return next(ApiError.validationError([
                { field: 'latestVersion/latestVersionCode/apkUrl', message: 'latestVersion, latestVersionCode and apkUrl are required' }
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

        return res.status(200).json(
            ApiResponse.success({
                apkUrl: req.file.path,
                publicId: req.file.filename
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
