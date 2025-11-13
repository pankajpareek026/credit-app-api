const Router = require('express').Router;
const authy = require('../middlewares/auth.middleware');
const {
  createSeparator,
  updateSeparator,
  deleteSeparator,
} = require('../controllers/transaction.controller');

const router = Router();

// Separator routes mapped directly under /api/client for mobile clients
router.post('/separator', authy, createSeparator);
router.put('/separator/:transactionId', authy, updateSeparator);
router.delete('/separator/:transactionId', authy, deleteSeparator);

module.exports = router;
