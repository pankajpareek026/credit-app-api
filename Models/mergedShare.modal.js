const mongoose = require('mongoose')

const mergedShareSchema = new mongoose.Schema({
    parentId: {
        type: String,
        required: [true, 'parentID is Required !']
    },
    clientIds: {
        type: [String],
        required: [true, 'clientIDs are Required !']
    },
    shareToken: {
        type: String,
        required: [true, 'share Token is Required !']
    },
    expireTime: {
        type: String,
        required: true
    }
}, {
    timestamps: true,
})

module.exports = mongoose.model('mergedShare', mergedShareSchema) 