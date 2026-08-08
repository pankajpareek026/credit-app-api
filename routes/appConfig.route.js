const express = require('express');
const router = express.Router();
const {
    getLatestVersion,
    publishVersion,
    uploadApkFile
} = require('../controllers/appConfig.controller');
const { releaseAuth } = require('../middlewares/releaseAuth.middleware');
const { uploadApk, handleUploadError } = require('../middleware/cloudinary_upload');

// Public: client apps poll this on startup to check for updates
router.get('/version', getLatestVersion);

// Release-key protected: publish a new app version (used by the release script)
router.post('/version', releaseAuth, publishVersion);

// Release-key protected: upload the APK file to Cloudinary, returns apkUrl to use above
router.post('/upload-apk', releaseAuth, uploadApk, handleUploadError, uploadApkFile);

module.exports = router;
