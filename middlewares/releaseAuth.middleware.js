const ApiError = require('../utils/apiError.utils');

/**
 * Narrow-scope auth for the release-automation script: checks a single
 * static secret instead of requiring a full admin session, so publishing
 * an app version doesn't need the (currently unmounted) admin panel API.
 */
const releaseAuth = (req, res, next) => {
    const providedKey = req.header('x-release-key');
    const expectedKey = process.env.RELEASE_API_KEY;

    if (!expectedKey) {
        return next(ApiError.internalError('RELEASE_API_KEY is not configured on the server'));
    }

    if (!providedKey || providedKey !== expectedKey) {
        return next(ApiError.authenticationError('Invalid or missing release key'));
    }

    next();
};

module.exports = { releaseAuth };
