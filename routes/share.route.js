const { GenetateShareLink, getTransactionByShareToken, deleteShareToken, generateMergedShareLink, getMergedTransactionData } = require('../controllers/share.controller')
const authy = require('../middlewares/auth.middleware')

const Router = require('express').Router
const router = Router()
// legacy share routes
router.route('/shareRequest/:value/:unit').post(authy, GenetateShareLink)
router.route('/share').get(getTransactionByShareToken)
router.route('/deleteSharedLink').delete(authy, deleteShareToken)

// Merged Share Routes
router.route('/share/merged/:value/:unit').post(authy, generateMergedShareLink);
router.route('/share/merged/:id').get(getMergedTransactionData);


module.exports = router