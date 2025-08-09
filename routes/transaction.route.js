const { 
    transactionDetails, 
    editTransaction, 
    newTransaction, 
    allTransactions, 
    searchTransaction, 
    getTransactionDetails,
    batchCreateTransactions,
    getTransactionStatistics,
    bulkUpdateTransactionVisibility
} = require('../controllers/transaction.controller');
const authy = require('../middlewares/auth.middleware');

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


module.exports = router