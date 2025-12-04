const {
    // Asset management
    createAsset,
    getAssets,
    getAssetById,
    updateAsset,
    deleteAsset,
    
    // Transaction management
    createTransaction,
    getTransactions,
    getTransactionById,
    updateTransaction,
    deleteTransaction,
    
    // Snapshot management
    getSnapshots,
    createSnapshot,
    
    // Overview & Analytics
    getOverview,
    getAnalytics,
    
    // Price updates
    updatePrices
} = require('../controllers/portfolio.controller');
const authy = require('../middlewares/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const { portfolioSchemas } = require('../utils/validationSchemas');

const Router = require('express').Router;
const router = Router();

/**
 * ============================================
 * ASSET ROUTES
 * ============================================
 */

// Create new asset
router.route("/assets").post(
    authy,
    validateRequest(portfolioSchemas.createAsset),
    createAsset
);

// Get all assets with pagination and filtering
router.route("/assets").get(
    authy,
    validateRequest(portfolioSchemas.getAssets, 'query'),
    getAssets
);

// Get single asset
router.route("/assets/:assetId").get(
    authy,
    getAssetById
);

// Update asset
router.route("/assets/:assetId").put(
    authy,
    validateRequest(portfolioSchemas.updateAsset),
    updateAsset
);

// Delete asset (soft delete)
router.route("/assets/:assetId").delete(
    authy,
    deleteAsset
);

/**
 * ============================================
 * TRANSACTION ROUTES
 * ============================================
 */

// Create new transaction
router.route("/transactions").post(
    authy,
    validateRequest(portfolioSchemas.createTransaction),
    createTransaction
);

// Get all transactions with pagination and filtering
router.route("/transactions").get(
    authy,
    validateRequest(portfolioSchemas.getTransactions, 'query'),
    getTransactions
);

// Get single transaction
router.route("/transactions/:transactionId").get(
    authy,
    getTransactionById
);

// Update transaction
router.route("/transactions/:transactionId").put(
    authy,
    validateRequest(portfolioSchemas.updateTransaction),
    updateTransaction
);

// Delete transaction
router.route("/transactions/:transactionId").delete(
    authy,
    deleteTransaction
);

/**
 * ============================================
 * SNAPSHOT ROUTES
 * ============================================
 */

// Get portfolio snapshots
router.route("/snapshots").get(
    authy,
    validateRequest(portfolioSchemas.getSnapshots, 'query'),
    getSnapshots
);

// Create manual snapshot
router.route("/snapshots").post(
    authy,
    createSnapshot
);

/**
 * ============================================
 * OVERVIEW & ANALYTICS ROUTES
 * ============================================
 */

// Get portfolio overview
router.route("/overview").get(
    authy,
    getOverview
);

// Get portfolio analytics
router.route("/analytics").get(
    authy,
    validateRequest(portfolioSchemas.getAnalytics, 'query'),
    getAnalytics
);

/**
 * ============================================
 * PRICE UPDATE ROUTES
 * ============================================
 */

// Batch update prices
router.route("/update-prices").post(
    authy,
    updatePrices
);

module.exports = router;

