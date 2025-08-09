const express = require('express');
const router = express.Router();
const vaultController = require('../controllers/vault.controller.js');
const authy = require('../middlewares/auth.middleware.js');

// Apply authentication middleware to all vault routes
router.use(authy);

// Credential management routes
router.post('/credentials', vaultController.createCredential);
router.get('/credentials', vaultController.getAllCredentials);
router.get('/credentials/:credentialId', vaultController.getCredential);
router.put('/credentials/:credentialId', vaultController.updateCredential);
router.delete('/credentials/:credentialId', vaultController.deleteCredential);

// Vault security routes
router.post('/unlock', vaultController.unlockVault);
router.patch('/master-password', vaultController.changeMasterPassword);

// Statistics route
router.get('/statistics', vaultController.getVaultStatistics);

module.exports = router; 