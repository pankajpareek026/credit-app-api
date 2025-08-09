// Modules
const Pkey = process.env.jwt_key
require('dotenv').config()
const express = require('express')
const cookieParser = require('cookie-parser')
require('./db/config.js')
const app = express()

// Import security middleware
const { applySecurityMiddleware } = require('./middleware/security.middleware.js')

// Import routes
const userRouter = require('./routes/user.route.js')
const clientRouter = require('./routes/client.route.js')
const shareRouter = require('./routes/share.route.js')
const transactionRouter = require('./routes/transaction.route.js')
const billReminderRouter = require('./routes/billReminder.route.js')
const noteRouter = require('./routes/note.route.js')
const vaultRouter = require('./routes/vault.route.js')
const loginRecordRouter = require('./routes/loginRecord.route.js')

// Import middleware
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler.middleware.js')
const { requestLogger } = require('./utils/logger.js')

// Apply production-grade security middleware
applySecurityMiddleware(app)

// Basic middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())

// Logger middleware
app.use(requestLogger)


// Routes
app.use('/api/auth', userRouter)
app.use('/api/clients', clientRouter)
app.use('/api/transactions', transactionRouter)
app.use('/api/share', shareRouter)
app.use('/api/billReminders', billReminderRouter)
app.use('/api/notes', noteRouter)
app.use('/api/vault', vaultRouter)
app.use('/api/login-records', loginRecordRouter)

// 404 handler for unmatched routes
app.use(notFoundHandler)

// Error handler middleware
app.use(errorHandler)



const port = process.env.port || 2205

app.listen(port, (err) => {
    if (err) throw err;
    console.log(`app is running on http://localhost:${port}`)
})












