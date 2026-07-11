const { default: mongoose } = require("mongoose");
const clients = require("../Models/client.modal");
const ApiError = require("../utils/apiError.utils");
const ApiResponse = require("../utils/apiResponse.utils");
const Transaction = require("../Models/transaction.modal");
const { transactionSchemas } = require('../utils/validationSchemas');
const {
    validateAmount,
    validateDate,
    validateStringLength
} = require('../utils/validationUtils');
const path = require('path');
const fs = require('fs');
const { deleteFromCloudinary } = require('../middleware/cloudinary_upload');

// to add new transaction to the database in reference of client
const newTransaction = async (req, res, next) => {
    try {
        // Validate request body using Joi schema
        const { error, value } = transactionSchemas.create.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const validationErrors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));
            return next(ApiError.validationError(validationErrors));
        }

        const parentId = req.body.user._id;
        const { clientid: clientId } = req.headers;

        if (!clientId) {
            return next(ApiError.validationError([{
                field: 'clientid',
                message: 'Client ID is required',
                value: clientId
            }]));
        }

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(clientId)) {
            return next(ApiError.validationError([{
                field: 'clientid',
                message: 'Invalid client ID format',
                value: clientId
            }]));
        }

        // Check if client exists
        const existingClient = await clients.findOne({
            parentId,
            _id: mongoose.Types.ObjectId(clientId),
            isActive: true
        });

        if (!existingClient) {
            return next(ApiError.notFoundError("Client not found"));
        }

        let { amount, date, dis, type } = value;

        // Validate amount
        if (!validateAmount(amount)) {
            return next(ApiError.validationError([{
                field: 'amount',
                message: 'Invalid amount format',
                value: amount
            }]));
        }

        // Validate date
        if (!validateDate(date)) {
            return next(ApiError.validationError([{
                field: 'date',
                message: 'Invalid date format',
                value: date
            }]));
        }

        // Validate description length
        if (!validateStringLength(dis, 1, 500)) {
            return next(ApiError.validationError([{
                field: 'dis',
                message: 'Description must be between 1 and 500 characters',
                value: dis
            }]));
        }

        // Handle amount sign based on transaction type
        if (type === "OUT" && amount > 0) {
            amount = parseFloat(amount) * -1;
        } else if (type === "IN" && amount < 0) {
            amount = Math.abs(parseFloat(amount));
        }

        // Create transaction
        const result = await Transaction.create({
            clientId: mongoose.Types.ObjectId(clientId),
            parentId,
            amount: parseFloat(amount),
            date: new Date(date),
            dis,
            type
        });

        if (!result._id) {
            return next(ApiError.internalError('Failed to create transaction'));
        }

        // Update client balance
        await clients.findByIdAndUpdate(clientId, {
            $inc: { totalBalance: parseFloat(amount) },
            lastTransactionDate: new Date()
        });

        return res.status(201).json(
            ApiResponse.created(result, 'Transaction saved successfully!')
        );

    } catch (error) {
        console.error("Error in newTransaction:", error.message);

        // Handle database errors
        if (error.code === 11000) {
            return next(ApiError.conflictError('Transaction already exists'));
        }

        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => ({
                field: err.path,
                message: err.message,
                value: err.value
            }));
            return next(ApiError.validationError(validationErrors));
        }

        return next(ApiError.internalError('Failed to create transaction'));
    }
}

// to get detail of single transaction using transaction _id
const transactionDetails = async (req, res, next) => {
    try {
        const { tId } = req.params;
        const parentId = req.body.user._id;

        if (!tId) {
            return next(ApiError.validationError([{
                field: 'tId',
                message: 'Transaction ID is required',
                value: tId
            }]));
        }

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(tId)) {
            return next(ApiError.validationError([{
                field: 'tId',
                message: 'Invalid transaction ID format',
                value: tId
            }]));
        }

        const transactionDetail = await Transaction.findOne({
            _id: mongoose.Types.ObjectId(tId),
            parentId
        }).select('-clientId -parentId -createdAt -updatedAt -__v');

        if (transactionDetail) {
            return res.status(200).json(
                ApiResponse.success(transactionDetail, "Transaction details retrieved successfully")
            );
        }

        return res.status(404).json(
            ApiResponse.success(null, "Transaction not found")
        );

    } catch (error) {
        console.error("Error in transactionDetails:", error.message);
        return next(ApiError.internalError('Failed to retrieve transaction details'));
    }
}

// to edit transaction
const editTransaction = async (req, res, next) => {
    try {
        // Validate request body using Joi schema
        const { error, value } = transactionSchemas.update.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const validationErrors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));
            return next(ApiError.validationError(validationErrors));
        }

        const parentId = req.body.user._id;
        let { amount, date, dis, type, tId } = value;

        if (!tId) {
            return next(ApiError.validationError([{
                field: 'tId',
                message: 'Transaction ID is required',
                value: tId
            }]));
        }

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(tId)) {
            return next(ApiError.validationError([{
                field: 'tId',
                message: 'Invalid transaction ID format',
                value: tId
            }]));
        }

        // Check if transaction exists and get current details for balance recalculation
        const existingTransaction = await Transaction.findOne({
            _id: mongoose.Types.ObjectId(tId),
            parentId
        });

        if (!existingTransaction) {
            return next(ApiError.notFoundError("Transaction not found"));
        }

        // Prepare updated fields
        const updateFields = {};
        let finalAmount = existingTransaction.amount;
        let typeChanged = false;

        if (type !== undefined) {
            updateFields.type = type;
            typeChanged = true;
        } else {
            type = existingTransaction.type;
        }

        if (amount !== undefined) {
            // Handle amount sign based on transaction type
            let processedAmount = parseFloat(amount);
            if (type === "OUT" && processedAmount > 0) {
                processedAmount = -processedAmount;
            } else if (type === "IN" && processedAmount < 0) {
                processedAmount = Math.abs(processedAmount);
            }
            updateFields.amount = processedAmount;
            finalAmount = processedAmount;
        } else if (typeChanged) {
            // If type changed but amount didn't, we still need to potentially flip the sign
            let currentAmount = existingTransaction.amount;
            if (type === "OUT" && currentAmount > 0) {
                currentAmount = -currentAmount;
            } else if (type === "IN" && currentAmount < 0) {
                currentAmount = Math.abs(currentAmount);
            }
            updateFields.amount = currentAmount;
            finalAmount = currentAmount;
        }

        if (date !== undefined) {
            updateFields.date = new Date(date);
        }

        if (dis !== undefined) {
            updateFields.dis = dis;
        }

        // Update transaction
        const result = await Transaction.findOneAndUpdate(
            {
                _id: mongoose.Types.ObjectId(tId),
                parentId
            },
            { $set: updateFields },
            { new: true }
        );

        if (!result) {
            return next(ApiError.notFoundError("Transaction not found during update"));
        }

        // Recalculate client balance if amount or type changed
        if (amount !== undefined || typeChanged) {
            const amountDiff = finalAmount - existingTransaction.amount;

            await clients.findByIdAndUpdate(existingTransaction.clientId, {
                $inc: { totalBalance: amountDiff },
                lastTransactionDate: new Date()
            });
        } else if (date !== undefined) {
            // Update lastTransactionDate if only date changed
            await clients.findByIdAndUpdate(existingTransaction.clientId, {
                lastTransactionDate: new Date()
            });
        }

        return res.status(200).json(
            ApiResponse.success(result, "Transaction updated successfully")
        );

    } catch (error) {
        console.error("Error in editTransaction:", error.message);

        // Handle database errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => ({
                field: err.path,
                message: err.message,
                value: err.value
            }));
            return next(ApiError.validationError(validationErrors));
        }

        return next(ApiError.internalError('Failed to update transaction'));
    }
}
// search transaction associated with given client id

const searchTransaction = async (req, res, next) => {
    try {
        const { clientid: clientId } = req.headers;
        const { _id: parentId } = req.body.user;
        let query = req.headers.query;

        // Convert the query to a number
        const numericQuery = parseFloat(query);




        const result = await Transaction.aggregate(
            [
                {
                    $match: {
                        $and: [
                            { clientId: mongoose.Types.ObjectId(clientId) },
                            { parentId: mongoose.Types.ObjectId(parentId) },
                            {
                                $or: [
                                    { amount: query },
                                    { dis: query },
                                    { amount: { $regex: `${query}`, $options: 'i' } },
                                    { dis: { $regex: `${query}`, $options: 'i' } },
                                    { amount: -query },
                                    { dis: -query },
                                    { amount: { $regex: `${query}`, $options: 'i' } },
                                    { dis: { $regex: `${query}`, $options: 'i' } }
                                ]
                            }
                        ]
                    }
                }
            ]

        );


        // if transaction found 
        if (result.length > 0) {
            return res.json({
                type: "success",
                isSuccess: true,
                isError: false,
                responseData: result,


            })
        }

        // Respond with search result or appropriate message
        return res.status(200).json({
            type: "success",
            isSuccess: true,
            isError: false,
            message: "transaction not found"

        })
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({
            isSuccess: false,
            isError: true,
            type: "error",
            message: "An error occurred while processing the search."
        });
    }
}
// to display all transaction associated with the client
const allTransactions = async (req, res, next) => {
    try {
        const clientId = req.headers.clientid
        const parentId = req.body.user._id;
        // `parentId` missing genuinely means the auth middleware didn't
        // populate a user - that's a real 401. `clientId` missing just
        // means the request didn't include the header - a client bug, not
        // an auth failure. These used to share one 401, which meant a
        // missing clientid header (e.g. from stale/incomplete transaction
        // data client-side) would trigger the app's session-expiry
        // handling and log the user out for no auth-related reason.
        if (!parentId) {
            return next(ApiError.authenticationError("Unauthorized user"));
        }
        if (!clientId) {
            return next(ApiError.badRequestError("Client ID is required"));
        }

        // 
        const result = await clients.aggregate(
            [
                {
                    $match: {
                        $and: [
                            { parentId },
                            { _id: mongoose.Types.ObjectId(clientId) }
                        ]
                    }
                },
                {
                    $lookup: {
                        from: "transactions",
                        localField: "_id",
                        foreignField: "clientId",
                        as: "tDetails"
                    }
                },
                {
                    $unwind: {
                        path: "$tDetails",
                        preserveNullAndEmptyArrays: true // Preserve documents if no matching documents are found in transactions
                    }
                },
                {
                    $sort: {
                        "tDetails.date": 1 // Sort transactions by date in ascending order
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        doc: { $first: "$$ROOT" },
                        trns: { $push: "$tDetails" },
                        balance: { $sum: { $ifNull: ["$tDetails.amount", 0] } } // Use $ifNull to handle cases where there are no transactions
                    }
                },
                {
                    $project: {
                        _id: 0,
                        name: "$doc.name",
                        balance: 1,
                        trns: {
                            $map: {
                                input: "$trns",
                                as: "trans",
                                in: {
                                    $cond: {
                                        if: { $ne: ["$$trans", null] },
                                        then: {
                                            amount: "$$trans.amount",
                                            tId: "$$trans._id",
                                            // Was missing entirely - every transaction row silently had no
                                            // clientId, so any client code reading it back (e.g. re-loading
                                            // the list after an edit, using the clientId off the last-loaded
                                            // transaction) got an empty string instead of the real ID.
                                            clientId: "$doc._id",
                                            date: "$$trans.date",
                                            dis: "$$trans.dis",
                                            type: "$$trans.type",
                                            hidden: { $ifNull: ["$$trans.hidden", false] },
                                            isSeparator: { $ifNull: ["$$trans.isSeparator", false] },
                                            separator: "$$trans.separator",
                                            position: { $ifNull: ["$$trans.position", 0] },
                                            attachments: { $ifNull: ["$$trans.attachments", []] }
                                        },
                                        else: null
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $addFields: {
                        trns: {
                            $filter: {
                                input: "$trns",
                                cond: { $ne: ["$$this", null] }
                            }
                        }
                    }
                }
            ]


        )

        // Handle case where no client is found or no transactions exist
        if (!result || result.length === 0) {
            return res.status(200).json(
                new ApiResponse(true, false, "success", {
                    name: "Unknown Client",
                    balance: 0,
                    trns: []
                })
            )
        }

        // Handle case where client exists but has no transactions
        const clientData = result[0];
        if (!clientData || !clientData.trns) {
            return res.status(200).json(
                new ApiResponse(true, false, "success", {
                    name: clientData?.name || "Unknown Client",
                    balance: 0,
                    trns: []
                })
            )
        }

        // Validate and clean transaction data
        if (Array.isArray(clientData.trns)) {
            clientData.trns = clientData.trns.filter(transaction =>
                transaction &&
                transaction.tId &&
                transaction.amount !== undefined &&
                transaction.dis &&
                transaction.type
            );
        } else {
            clientData.trns = [];
        }


        return res.status(200).json(
            new ApiResponse(true, false, "success", clientData)
        )

    } catch (error) {
        return next(new ApiError(500, error.message))
    }
}

// Get detailed transaction information for modal
const getTransactionDetails = async (req, res, next) => {
    try {
        const { transactionId } = req.params;
        const parentId = req.body.user._id;


        if (!transactionId || !parentId) {
            return next(new ApiError(400, "Missing required parameters"));
        }

        // Find the transaction and verify it belongs to the user
        const transaction = await Transaction.findOne({
            _id: transactionId,
            parentId: parentId
        }).select('-__v');

        if (!transaction) {
            return next(new ApiError(404, "Transaction not found"));
        }

        // Get client information
        const client = await clients.findOne({
            _id: transaction.clientId,
            parentId: parentId
        });

        const transactionDetails = {
            id: transaction._id,
            clientId: transaction.clientId,
            clientName: client?.name || "Unknown Client",
            amount: transaction.amount,
            date: transaction.date,
            description: transaction.dis,
            type: transaction.type,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt,
            // Previously uploaded receipts/images live here - without this,
            // the details view has no way to know they exist even though
            // they're already persisted on the transaction document.
            attachments: transaction.attachments
        };


        return res.status(200).json(
            new ApiResponse(true, false, "Transaction details retrieved successfully", transactionDetails)
        );

    } catch (error) {
        return next(new ApiError(500, error.message));
    }
}

// Batch transaction operations
const batchCreateTransactions = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;
        const { transactions } = req.body;

        if (!transactions || !Array.isArray(transactions)) {
            return next(new ApiError(400, "Transactions array is required"));
        }

        if (transactions.length === 0) {
            return next(new ApiError(400, "At least one transaction is required"));
        }

        const results = {
            created: [],
            failed: [],
            totalAmount: 0
        };

        for (const transaction of transactions) {
            try {
                const { clientid: clientId, amount, date, dis, type } = transaction;

                // Validation
                const messages = [];
                !amount && messages.push("Amount is required");
                !date && messages.push("Date is required");
                !dis && messages.push("Description is required");
                !type && messages.push("Type is required");
                !clientId && messages.push("Client ID is required");

                if (messages.length > 0) {
                    results.failed.push({
                        transaction,
                        error: messages.join(", ")
                    });
                    continue;
                }

                // Validate amount
                if (type === "IN" && amount < 0) {
                    results.failed.push({
                        transaction,
                        error: "Amount should be greater than 0 for IN transactions"
                    });
                    continue;
                }

                // Process amount
                let processedAmount = parseFloat(amount);
                if (type === "OUT" && amount > 0) {
                    processedAmount = -processedAmount;
                }

                // Create transaction
                const transactionResult = await Transaction.create({
                    clientId,
                    parentId,
                    amount: processedAmount,
                    date: new Date(date),
                    dis,
                    type
                });

                // Update client balance
                await clients.findByIdAndUpdate(clientId, {
                    $inc: { totalBalance: processedAmount },
                    lastTransactionDate: new Date()
                });

                results.created.push(transactionResult);
                results.totalAmount += processedAmount;

            } catch (error) {
                results.failed.push({
                    transaction,
                    error: error.message
                });
            }
        }

        return res.status(200).json(
            new ApiResponse(true, false, "Batch transaction processing completed", results)
        );

    } catch (error) {
        console.error("Error in batchCreateTransactions:", error.message);
        return next(new ApiError(500, "Internal server error"));
    }
};

// Get transaction statistics
const getTransactionStatistics = async (req, res, next) => {
    try {
        const parentIdRaw = req.body.user._id;
        const { startDate, endDate, clientId } = req.query;

        console.log('📊 getTransactionStatistics: Request received');
        console.log('📊 getTransactionStatistics: parentIdRaw:', parentIdRaw, 'type:', typeof parentIdRaw);
        console.log('📊 getTransactionStatistics: startDate:', startDate);
        console.log('📊 getTransactionStatistics: endDate:', endDate);
        console.log('📊 getTransactionStatistics: clientId:', clientId);

        // Convert parentId to ObjectId to ensure proper matching (handle both string and ObjectId)
        let parentIdString = parentIdRaw?.toString();
        let parentIdObjectId = null;
        if (parentIdString && mongoose.Types.ObjectId.isValid(parentIdString)) {
            try {
                parentIdObjectId = new mongoose.Types.ObjectId(parentIdString);
            } catch (e) {
                console.warn("📊 Could not convert parentId to ObjectId:", e.message);
            }
        }

        // Build match conditions - exclude hidden transactions and separators
        // Handle both String and ObjectId formats for parentId (for backward compatibility)
        const matchConditions = {
            $or: parentIdObjectId
                ? [{ parentId: parentIdString }, { parentId: parentIdObjectId }]
                : [{ parentId: parentIdString }],
            hidden: { $ne: true }, // Exclude hidden transactions
            isSeparator: { $ne: true } // Exclude separators
        };

        if (clientId) {
            // Convert clientId to ObjectId if it's a valid ObjectId string
            try {
                if (mongoose.Types.ObjectId.isValid(clientId)) {
                    matchConditions.clientId = new mongoose.Types.ObjectId(clientId);
                } else {
                    matchConditions.clientId = clientId;
                }
            } catch (e) {
                // If clientId is not a valid ObjectId, use it as string
                matchConditions.clientId = clientId;
            }
        }

        if (startDate || endDate) {
            matchConditions.date = {};
            if (startDate) {
                // Parse ISO string - handle both with and without timezone
                const start = new Date(startDate);
                // Always set to start of day (00:00:00) in local timezone
                // This ensures we capture all transactions from the start date
                start.setHours(0, 0, 0, 0);
                matchConditions.date.$gte = start;
                console.log('📊 getTransactionStatistics: startDate parsed:', start.toISOString(), 'local:', start.toString());
            }
            if (endDate) {
                // Parse ISO string - handle both with and without timezone
                const end = new Date(endDate);
                // Always set to end of day (23:59:59.999) in local timezone
                // This ensures we capture all transactions until the end date
                end.setHours(23, 59, 59, 999);
                matchConditions.date.$lte = end;
                console.log('📊 getTransactionStatistics: endDate parsed:', end.toISOString(), 'local:', end.toString());
            }
        }

        console.log('📊 getTransactionStatistics: Match conditions:', JSON.stringify(matchConditions, null, 2));

        const stats = await Transaction.aggregate([
            { $match: matchConditions },
            {
                $group: {
                    _id: null,
                    totalTransactions: { $sum: 1 },
                    totalAmount: { $sum: "$amount" },
                    averageAmount: { $avg: "$amount" },
                    maxAmount: { $max: "$amount" },
                    minAmount: { $min: "$amount" },
                    creditTransactions: {
                        $sum: { $cond: [{ $eq: ["$type", "IN"] }, 1, 0] }
                    },
                    debitTransactions: {
                        $sum: { $cond: [{ $eq: ["$type", "OUT"] }, 1, 0] }
                    },
                    creditAmount: {
                        $sum: { $cond: [{ $eq: ["$type", "IN"] }, "$amount", 0] }
                    },
                    debitAmount: {
                        $sum: { $cond: [{ $eq: ["$type", "OUT"] }, "$amount", 0] }
                    }
                }
            }
        ]);

        console.log('📊 getTransactionStatistics: Aggregation result:', JSON.stringify(stats, null, 2));
        console.log('📊 getTransactionStatistics: Number of results:', stats.length);

        // If no results and we have date filters, try a test query without date filters to debug
        if (stats.length === 0 && (startDate || endDate)) {
            const testMatchConditions = {
                $or: parentIdObjectId
                    ? [{ parentId: parentIdString }, { parentId: parentIdObjectId }]
                    : [{ parentId: parentIdString }],
                hidden: { $ne: true },
                isSeparator: { $ne: true }
            };
            if (clientId) {
                if (mongoose.Types.ObjectId.isValid(clientId)) {
                    testMatchConditions.clientId = new mongoose.Types.ObjectId(clientId);
                } else {
                    testMatchConditions.clientId = clientId;
                }
            }
            const testCount = await Transaction.countDocuments(testMatchConditions);
            console.log('📊 getTransactionStatistics: Test query (no date filter) count:', testCount);
        }

        const responseData = stats[0] || {
            totalTransactions: 0,
            totalAmount: 0,
            averageAmount: 0,
            maxAmount: 0,
            minAmount: 0,
            creditTransactions: 0,
            debitTransactions: 0,
            creditAmount: 0,
            debitAmount: 0
        };

        // Remove _id from responseData if it exists
        if (responseData._id !== undefined) {
            delete responseData._id;
        }

        // Ensure all numeric values are properly set (handle null/undefined from aggregation)
        // Use nullish coalescing and explicit number conversion
        responseData.totalTransactions = Number(responseData.totalTransactions ?? 0);
        responseData.totalAmount = Number(responseData.totalAmount ?? 0);
        responseData.averageAmount = Number(responseData.averageAmount ?? 0);
        responseData.maxAmount = Number(responseData.maxAmount ?? 0);
        responseData.minAmount = Number(responseData.minAmount ?? 0);
        responseData.creditTransactions = Number(responseData.creditTransactions ?? 0);
        responseData.debitTransactions = Number(responseData.debitTransactions ?? 0);
        responseData.creditAmount = Number(responseData.creditAmount ?? 0);
        responseData.debitAmount = Number(responseData.debitAmount ?? 0);

        console.log('📊 getTransactionStatistics: Final responseData after normalization:', JSON.stringify(responseData, null, 2));

        console.log('📊 getTransactionStatistics: Final responseData:', JSON.stringify(responseData, null, 2));

        // Use toResponse() to ensure proper serialization
        const apiResponse = new ApiResponse(true, false, "Transaction statistics retrieved successfully", responseData);
        return res.status(200).json(apiResponse.toResponse());

    } catch (error) {
        console.error("❌ Error in getTransactionStatistics:", error);
        console.error("❌ Error stack:", error.stack);
        return next(new ApiError(500, "Internal server error"));
    }
};

// Bulk update transaction visibility
const bulkUpdateTransactionVisibility = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;
        const { transactionIds, isHidden } = req.body;

        if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
            return next(new ApiError(400, "Transaction IDs array is required"));
        }

        if (typeof isHidden !== 'boolean') {
            return next(new ApiError(400, "isHidden boolean value is required"));
        }

        const result = await Transaction.updateMany(
            {
                _id: { $in: transactionIds },
                parentId
            },
            { isHidden }
        );

        return res.status(200).json(
            new ApiResponse(true, false, `Successfully updated ${result.modifiedCount} transactions`)
        );

    } catch (error) {
        console.error("Error in bulkUpdateTransactionVisibility:", error.message);
        return next(new ApiError(500, "Internal server error"));
    }
};

// Upload file attachment to transaction
const uploadTransactionAttachment = async (req, res, next) => {
    try {
        const { transactionId } = req.params;
        const parentId = req.body.user._id;

        if (!transactionId) {
            return next(new ApiError(400, "Transaction ID is required"));
        }

        if (!req.file) {
            return next(new ApiError(400, "No file uploaded"));
        }

        // Verify transaction exists and belongs to user
        const transaction = await Transaction.findOne({
            _id: transactionId,
            parentId
        });

        // The installed multer-storage-cloudinary version (4.0.0 - confirmed by
        // reading its actual _handleFile implementation) only ever calls back
        // with `{ path: resp.secure_url, size: resp.bytes, filename: resp.public_id }`.
        // It never sets req.file.public_id/secure_url/url - those are from an
        // older/different version's convention. Reading those non-existent
        // fields meant every attachment object below was missing its required
        // publicId/secureUrl/url, so Transaction.findByIdAndUpdate's schema
        // validation threw on every single upload (reported as a generic 500).
        const cloudinaryPublicId = req.file.filename;
        const cloudinarySecureUrl = req.file.path;

        if (!transaction) {
            // Clean up uploaded file from Cloudinary if transaction doesn't exist
            if (cloudinaryPublicId) {
                try {
                    await deleteFromCloudinary(cloudinaryPublicId);
                } catch (deleteError) {
                    console.error("Error cleaning up file from Cloudinary:", deleteError.message);
                }
            }
            return next(new ApiError(404, "Transaction not found"));
        }

        // Create attachment object with Cloudinary data
        const attachment = {
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            publicId: cloudinaryPublicId,
            secureUrl: cloudinarySecureUrl,
            // This library version doesn't expose a separate non-secure URL -
            // reuse the (always-HTTPS) secure one rather than leaving this
            // required field undefined.
            url: cloudinarySecureUrl,
            path: cloudinarySecureUrl,
            uploadedAt: new Date()
        };

        // Add attachment to transaction
        const updatedTransaction = await Transaction.findByIdAndUpdate(
            transactionId,
            { $push: { attachments: attachment } },
            { new: true }
        );

        return res.status(200).json(
            new ApiResponse(true, false, "File uploaded successfully", {
                attachment,
                transactionId: updatedTransaction._id
            })
        );

    } catch (error) {
        console.error("Error in uploadTransactionAttachment:", error.message);

        // Clean up uploaded file from Cloudinary on error. req.file.filename
        // is where this storage engine version puts the Cloudinary public_id
        // (see comment above) - req.file.public_id is never set and this
        // cleanup silently never ran before, leaking orphaned files in
        // Cloudinary on every failed upload.
        if (req.file && req.file.filename) {
            try {
                await deleteFromCloudinary(req.file.filename);
            } catch (deleteError) {
                console.error("Error cleaning up file from Cloudinary:", deleteError.message);
            }
        }

        return next(new ApiError(500, "Failed to upload file"));
    }
};

// Remove file attachment from transaction
const removeTransactionAttachment = async (req, res, next) => {
    try {
        const { transactionId, attachmentId } = req.params;
        const parentId = req.body.user._id;

        if (!transactionId || !attachmentId) {
            return next(new ApiError(400, "Transaction ID and Attachment ID are required"));
        }

        // Find transaction and verify ownership
        const transaction = await Transaction.findOne({
            _id: transactionId,
            parentId
        });

        if (!transaction) {
            return next(new ApiError(404, "Transaction not found"));
        }

        // Find the attachment to remove
        const attachment = transaction.attachments.id(attachmentId);
        if (!attachment) {
            return next(new ApiError(404, "Attachment not found"));
        }

        // Remove file from Cloudinary
        try {
            if (attachment.publicId) {
                await deleteFromCloudinary(attachment.publicId);
            }
        } catch (fileError) {
            console.error("Error removing file from Cloudinary:", fileError.message);
            // Continue with database removal even if Cloudinary deletion fails
        }

        // Remove attachment from transaction
        await Transaction.findByIdAndUpdate(
            transactionId,
            { $pull: { attachments: { _id: attachmentId } } }
        );

        return res.status(200).json(
            new ApiResponse(true, false, "Attachment removed successfully")
        );

    } catch (error) {
        console.error("Error in removeTransactionAttachment:", error.message);
        return next(new ApiError(500, "Failed to remove attachment"));
    }
};

// Create separator
const createSeparator = async (req, res, next) => {
    try {
        const { clientid: clientId } = req.headers;
        const parentId = req.body.user._id;
        const { title, description, color, position } = req.body;

        if (!clientId) {
            return next(new ApiError(400, "Client ID is required"));
        }

        if (!title || title.trim().length === 0) {
            return next(new ApiError(400, "Separator title is required"));
        }

        // Verify client exists
        const client = await clients.findOne({
            _id: clientId,
            parentId
        });

        if (!client) {
            return next(new ApiError(404, "Client not found"));
        }

        // Create separator transaction
        const separatorTransaction = await Transaction.create({
            clientId: mongoose.Types.ObjectId(clientId),
            parentId,
            amount: 0, // Separators have no amount
            date: new Date(),
            dis: title, // Use title as description
            type: "SEPARATOR", // Special type for separators
            isSeparator: true,
            separator: {
                title: title.trim(),
                description: description ? description.trim() : "",
                color: color || "#3B82F6",
                position: position || 0,
                isVisible: true
            },
            position: position || 0
        });

        return res.status(201).json(
            new ApiResponse(true, false, "Separator created successfully", separatorTransaction)
        );

    } catch (error) {
        console.error("Error in createSeparator:", error.message);
        return next(new ApiError(500, "Failed to create separator"));
    }
};

// Update separator
const updateSeparator = async (req, res, next) => {
    try {
        const { transactionId } = req.params;
        const parentId = req.body.user._id;
        const { title, description, color, position, isVisible } = req.body;

        if (!title || title.trim().length === 0) {
            return next(new ApiError(400, "Separator title is required"));
        }

        // Find and verify separator transaction
        const transaction = await Transaction.findOne({
            _id: transactionId,
            parentId,
            isSeparator: true
        });

        if (!transaction) {
            return next(new ApiError(404, "Separator not found"));
        }

        // Update separator
        const updatedTransaction = await Transaction.findByIdAndUpdate(
            transactionId,
            {
                $set: {
                    dis: title.trim(),
                    separator: {
                        title: title.trim(),
                        description: description ? description.trim() : "",
                        color: color || transaction.separator.color,
                        position: position !== undefined ? position : transaction.separator.position,
                        isVisible: isVisible !== undefined ? isVisible : transaction.separator.isVisible
                    },
                    position: position !== undefined ? position : transaction.position
                }
            },
            { new: true }
        );

        return res.status(200).json(
            new ApiResponse(true, false, "Separator updated successfully", updatedTransaction)
        );

    } catch (error) {
        console.error("Error in updateSeparator:", error.message);
        return next(new ApiError(500, "Failed to update separator"));
    }
};

// Delete separator
const deleteSeparator = async (req, res, next) => {
    try {
        const { transactionId } = req.params;
        const parentId = req.body.user._id;

        // Find and verify separator transaction
        const transaction = await Transaction.findOne({
            _id: transactionId,
            parentId,
            isSeparator: true
        });

        if (!transaction) {
            return next(new ApiError(404, "Separator not found"));
        }

        // Delete separator transaction
        await Transaction.findByIdAndDelete(transactionId);

        return res.status(200).json(
            new ApiResponse(true, false, "Separator deleted successfully")
        );

    } catch (error) {
        console.error("Error in deleteSeparator:", error.message);
        return next(new ApiError(500, "Failed to delete separator"));
    }
};

// Get file attachment
const getTransactionAttachment = async (req, res, next) => {
    try {
        const { transactionId, attachmentId } = req.params;
        const parentId = req.body.user._id;

        // Find transaction and verify ownership
        const transaction = await Transaction.findOne({
            _id: transactionId,
            parentId
        });

        if (!transaction) {
            return next(new ApiError(404, "Transaction not found"));
        }

        // Find the attachment
        const attachment = transaction.attachments.id(attachmentId);
        if (!attachment) {
            return next(new ApiError(404, "Attachment not found"));
        }

        // For Cloudinary files, redirect to the secure URL
        if (attachment.secureUrl) {
            return res.redirect(attachment.secureUrl);
        }

        // Fallback for legacy files (if any)
        if (attachment.path && fs.existsSync(attachment.path)) {
            // Set appropriate headers
            res.setHeader('Content-Type', attachment.mimetype);
            res.setHeader('Content-Disposition', `inline; filename="${attachment.originalName}"`);

            // Stream the file
            const fileStream = fs.createReadStream(attachment.path);
            fileStream.pipe(res);
        } else {
            return next(new ApiError(404, "File not found"));
        }

    } catch (error) {
        console.error("Error in getTransactionAttachment:", error.message);
        return next(new ApiError(500, "Failed to retrieve attachment"));
    }
};

module.exports = {
    newTransaction,
    editTransaction,
    transactionDetails,
    searchTransaction,
    allTransactions,
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
}