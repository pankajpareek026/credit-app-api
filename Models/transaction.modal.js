const mongoose = require('mongoose');

// File attachment schema
const attachmentSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    mimetype: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    // Cloudinary fields
    publicId: {
        type: String,
        required: true
    },
    secureUrl: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    // Legacy path field for backward compatibility
    path: {
        type: String,
        required: false
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

// Separator schema
const separatorSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    color: {
        type: String,
        default: '#3B82F6' // Default blue color
    },
    position: {
        type: Number,
        required: true
    },
    isVisible: {
        type: Boolean,
        default: true
    }
}, { _id: true });

const transactionSchema = new mongoose.Schema({

    /**
     * 
amount
15000
date
"2024-01-14T20:20"
dis
"CASH"
type
"IN"
     */
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "client"
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    amount: {
        type: Number,
        require: [true, "Amount is required"]
    },
    date: {
        type: Date,
        required: [true, "Date is required"]
    },
    dis: {
        type: String,
        required: [true, "Discription is required"]
    },
    type: {
        type: String,
        required: [true, "Transaction is required"]
    },
    // File attachments
    attachments: {
        type: [attachmentSchema],
        default: []
    },
    // Separator information (if this transaction is a separator)
    isSeparator: {
        type: Boolean,
        default: false
    },
    separator: {
        type: separatorSchema,
        default: null
    },
    // Position for ordering (used for separators and transactions)
    position: {
        type: Number,
        default: 0
    },
    // Hidden flag for soft delete
    hidden: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
})

const Transaction = mongoose.model("Transaction", transactionSchema)
module.exports = Transaction