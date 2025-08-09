const mongoose = require('mongoose')

const clientsSchema = new mongoose.Schema({
    parentId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        require: true,
        maxLength: [15, 'name must not be more than 15 charachers !']
    },
    phoneNumber: {
        type: String,
        maxLength: [15, 'Phone number must not exceed 15 characters'],
        validate: {
            validator: function(v) {
                // Basic phone number validation (allows international formats)
                return /^[\+]?[1-9][\d]{0,15}$/.test(v);
            },
            message: 'Please enter a valid phone number'
        }
    },
    email: {
        type: String,
        validate: {
            validator: function(v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: 'Please enter a valid email address'
        }
    },
    notes: {
        type: String,
        maxLength: [200, 'Notes must not exceed 200 characters']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastTransactionDate: {
        type: Date
    },
    totalBalance: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
})

// Index for efficient queries
clientsSchema.index({ parentId: 1, name: 1 });
clientsSchema.index({ parentId: 1, isActive: 1 });
clientsSchema.index({ phoneNumber: 1 });

// Virtual for formatted balance
clientsSchema.virtual('formattedBalance').get(function() {
    return this.totalBalance.toFixed(2);
});

module.exports = mongoose.model('clients', clientsSchema)