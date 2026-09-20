const mongoose = require('mongoose')

// Singleton document: exactly one row exists (see controllers/appFeatureConfig.controller.js
// getOrCreateConfig), holding the master on/off switch for each nav-level feature. This is
// distinct from the per-user `featureFlags` on the User model (those gate what an *admin* can
// do to the system); this config gates what every *end user* sees in the app's navigation.
const appFeatureConfigSchema = new mongoose.Schema({
    features: {
        dashboard: { type: Boolean, default: true },
        expenses: { type: Boolean, default: true },
        newTransaction: { type: Boolean, default: true },
        profile: { type: Boolean, default: true },
        bills: { type: Boolean, default: true },
        notes: { type: Boolean, default: true },
        vault: { type: Boolean, default: true },
        routines: { type: Boolean, default: true },
        goals: { type: Boolean, default: true },
        messages: { type: Boolean, default: true },
        tasks: { type: Boolean, default: true },
        portfolioOverview: { type: Boolean, default: true },
        portfolioCrypto: { type: Boolean, default: true },
        portfolioStocks: { type: Boolean, default: true },
        portfolioMutualFunds: { type: Boolean, default: true },
        portfolioAnalytics: { type: Boolean, default: true }
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'credit-users',
        default: null
    }
}, {
    timestamps: true
})

module.exports = mongoose.model('app-feature-config', appFeatureConfigSchema)
