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

        const { clientid } = req.headers;
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

        // Check if transaction exists
        const existingTransaction = await Transaction.findOne({
            _id: mongoose.Types.ObjectId(tId),
            parentId
        });

        if (!existingTransaction) {
            return next(ApiError.notFoundError("Transaction not found"));
        }

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

        // Update transaction
        const result = await Transaction.findOneAndUpdate(
            {
                _id: mongoose.Types.ObjectId(tId),
                parentId
            },
            {
                $set: {
                    amount: parseFloat(amount),
                    date: new Date(date),
                    type,
                    dis
                }
            },
            { new: true }
        );

        if (!result) {
            return next(ApiError.notFoundError("Transaction not found"));
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
        console.log("num q=>", numericQuery)
        console.log("clientId =>", clientId);
        console.log("query =>", query);
        console.log({ clientId: clientId, parentId, query });




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
        console.log("Result: " + result);


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
        console.log("parent Id =>>", parentId)
        console.log("client Id =>>", clientId)
        if (!clientId || !parentId) {
            return next(new ApiError(401, "Invalid user"))
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
                                            date: "$$trans.date",
                                            dis: "$$trans.dis",
                                            type: "$$trans.type"
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
        console.log("result: " + result)

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

        console.log("Cleaned transactions count: " + clientData.trns.length);

        return res.status(200).json(
            new ApiResponse(true, false, "success", clientData)
        )

    } catch (error) {
        console.log("error: " + error)
        return next(new ApiError(500, error.message))
    }
}

// Get detailed transaction information for modal
const getTransactionDetails = async (req, res, next) => {
    try {
        const { transactionId } = req.params;
        const parentId = req.body.user._id;

        console.log("Getting transaction details for ID:", transactionId);
        console.log("Parent ID:", parentId);

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
            updatedAt: transaction.updatedAt
        };

        console.log("Transaction details:", transactionDetails);

        return res.status(200).json(
            new ApiResponse(true, false, "Transaction details retrieved successfully", transactionDetails)
        );

    } catch (error) {
        console.log("Error getting transaction details:", error);
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
        const parentId = req.body.user._id;
        const { startDate, endDate, clientId } = req.query;

        // Build match conditions
        const matchConditions = { parentId };
        if (clientId) matchConditions.clientId = clientId;
        if (startDate || endDate) {
            matchConditions.date = {};
            if (startDate) matchConditions.date.$gte = new Date(startDate);
            if (endDate) matchConditions.date.$lte = new Date(endDate);
        }

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

        return res.status(200).json(
            new ApiResponse(true, false, "Transaction statistics retrieved successfully", responseData)
        );

    } catch (error) {
        console.error("Error in getTransactionStatistics:", error.message);
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

module.exports = {
    newTransaction,
    editTransaction,
    transactionDetails,
    searchTransaction,
    allTransactions,
    getTransactionDetails,
    batchCreateTransactions,
    getTransactionStatistics,
    bulkUpdateTransactionVisibility
}