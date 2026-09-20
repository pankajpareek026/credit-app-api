const express = require('express');
const router = express.Router();
const authy = require('../middlewares/auth.middleware');
const { adminRoleMiddleware } = require('../middlewares/featureFlag.middleware');
const { getFeatureConfig, updateFeatureConfig } = require('../controllers/appFeatureConfig.controller');

// Any logged-in user: the app fetches this on startup/login to know which nav tabs to show.
router.get('/feature-config', authy, getFeatureConfig);

// Admin only: toggle which features are visible to all users.
router.patch('/feature-config', authy, adminRoleMiddleware(['admin', 'super_admin']), updateFeatureConfig);

module.exports = router;
