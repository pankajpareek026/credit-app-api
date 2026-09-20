const AppFeatureConfig = require('../Models/appFeatureConfig.modal');
const ApiError = require('../utils/apiError.utils');

// There is exactly one config document. Created lazily on first read/write so no
// migration/seed script is needed - schema defaults (all features enabled) apply until
// an admin changes something.
//
// findOneAndUpdate+upsert (rather than findOne then create) makes this atomic: two
// concurrent first-requests can't both pass a "does it exist" check and each insert
// their own singleton document.
async function getOrCreateConfig() {
    return AppFeatureConfig.findOneAndUpdate(
        {},
        { $setOnInsert: {} },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
}

// GET /api/app/feature-config - any authenticated user; the app calls this on startup
// to decide which nav tabs to render.
const getFeatureConfig = async (req, res, next) => {
    try {
        const config = await getOrCreateConfig();

        res.status(200).json({
            isSuccess: true,
            isError: false,
            message: 'Feature config retrieved successfully',
            responseData: {
                features: config.features,
                updatedAt: config.updatedAt
            }
        });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/app/feature-config - admin only (see adminRoleMiddleware on the route).
// Body: { features: { <key>: true|false, ... } } - partial updates are merged, unknown
// keys are rejected so a typo can't silently no-op.
const updateFeatureConfig = async (req, res, next) => {
    try {
        const { features } = req.body;

        if (!features || typeof features !== 'object' || Array.isArray(features)) {
            return next(ApiError.badRequestError('`features` must be an object of featureKey -> boolean'));
        }

        const config = await getOrCreateConfig();
        const validKeys = Object.keys(config.features.toObject());

        for (const [key, value] of Object.entries(features)) {
            if (!validKeys.includes(key)) {
                return next(ApiError.badRequestError(`Unknown feature key: ${key}`));
            }
            if (typeof value !== 'boolean') {
                return next(ApiError.badRequestError(`Feature "${key}" must be a boolean`));
            }
            config.features[key] = value;
        }

        config.updatedBy = req.body.user?._id || null;
        await config.save();

        res.status(200).json({
            isSuccess: true,
            isError: false,
            message: 'Feature config updated successfully',
            responseData: {
                features: config.features,
                updatedAt: config.updatedAt
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getFeatureConfig,
    updateFeatureConfig
};
