const {
    transactionDetails,
    editTransaction,
    newTransaction,
    allTransactions,
    searchTransaction,
    getTransactionDetails,
    batchCreateTransactions,
    getTransactionStatistics,
    bulkUpdateTransactionVisibility,
    uploadTransactionAttachment,
    removeTransactionAttachment,
    createSeparator,
    updateSeparator,
    deleteSeparator,
    getTransactionAttachment
} = require('../controllers/transaction.controller');
const authy = require('../middlewares/auth.middleware');
const { uploadSingle, uploadMultiple, handleUploadError } = require('../middleware/cloudinary_upload');

const Router = require('express').Router
const router = Router();

// Basic transaction routes
router.route('/client/newTransaction').post(authy, newTransaction) // to add new transaction
router.route('/client/getTransactionDetail/:tId').get(authy, transactionDetails) // to get single  transaction detail
router.route("/client/editTransaction").put(authy, editTransaction) //edit transaction details
router.route("/client/transactions").get(authy, allTransactions)  //get all transaction  
router.route('/client/search').get(authy, searchTransaction)  //search transaction 
router.route('/client/transaction/:transactionId').get(authy, getTransactionDetails)  //get detailed transaction info for modal

// Enhanced transaction routes
router.route('/client/batchTransactions').post(authy, batchCreateTransactions) // batch create transactions
router.route('/client/statistics').get(authy, getTransactionStatistics) // get transaction statistics
router.route('/client/bulkVisibility').patch(authy, bulkUpdateTransactionVisibility) // bulk update transaction visibility

// File attachment routes
router.route('/client/transaction/:transactionId/upload').post(authy, uploadSingle, handleUploadError, uploadTransactionAttachment) // upload file attachment
router.route('/client/transaction/:transactionId/attachment/:attachmentId').delete(authy, removeTransactionAttachment) // remove file attachment
router.route('/client/transaction/:transactionId/attachment/:attachmentId').get(authy, getTransactionAttachment) // get file attachment

// Separator routes
router.route('/client/separator').post(authy, createSeparator) // create separator
router.route('/client/separator/:transactionId').put(authy, updateSeparator) // update separator
router.route('/client/separator/:transactionId').delete(authy, deleteSeparator) // delete separator

module.exports = router