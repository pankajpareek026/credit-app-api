const {
    newClient,
    editClient,
    deleteClient,
    searchClient,
    allClients,
    createClientWithTransactions,
    autoMatchTransactions,
    getClientStatistics
} = require('../controllers/client.controller');
const authy = require('../middlewares/auth.middleware');

const Router = require('express').Router;
const router = Router()

// Basic client operations
router.route("/addClient").post(authy, newClient)
router.route("/editClient").put(authy, editClient)
router.route("/deleteClient").delete(authy, deleteClient)
router.route('/').get(authy, allClients)
router.route("/search").get(authy, searchClient)

// Enhanced client operations
router.route("/createWithTransactions").post(authy, createClientWithTransactions)
router.route("/autoMatchTransactions").post(authy, autoMatchTransactions)
router.route("/statistics").get(authy, getClientStatistics)




module.exports = router;