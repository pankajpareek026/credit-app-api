const { default: mongoose } = require("mongoose");
const clients = require("../Models/client.modal");
const ApiError = require("../utils/apiError.utils");
const ApiResponse = require("../utils/apiResponse.utils");
const { clientSchemas } = require('../utils/validationSchemas');
const { validateObjectId } = require('../middleware/validation.middleware');
const {
    isValidEmail,
    isValidPhoneNumber,
    validateStringLength
} = require('../utils/validationUtils');

// add new client
const newClient = async (req, res, next) => {
    try {
        // Validate request body using Joi schema
        const { error, value } = clientSchemas.create.validate(req.body, {
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
        const { name, phoneNumber, email, notes } = value;


        // Check if client with same name already exists for this user
        const existingClient = await clients.findOne({
            parentId,
            name: { $regex: new RegExp(`^${name}$`, 'i') },
            isActive: true
        });

        if (existingClient) {
            return next(ApiError.conflictError("Client with this name already exists"));
        }

        // Create a new client with provided data
        const clientData = { parentId, name };
        if (phoneNumber) clientData.phoneNumber = phoneNumber;
        if (email) clientData.email = email;
        if (notes) clientData.notes = notes;

        const result = await clients.create(clientData);

        return res.status(201).json(
            ApiResponse.created(result, `'${name}' added successfully!`)
        );


    } catch (error) {
        // Handle database errors
        if (error.code === 11000) {
            return next(ApiError.conflictError('Client with this name already exists'));
        }

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => ({
                field: err.path,
                message: err.message,
                value: err.value
            }));
            return next(ApiError.validationError(validationErrors));
        }

        // Handle other errors
        console.error("Error at /addClient:", error.message);
        return next(ApiError.internalError('Failed to add client'));
    }
}


// edit client name 
const editClient = async (req, res, next) => {
    try {
        // Validate request body using Joi schema
        const { error, value } = clientSchemas.update.validate(req.body, {
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

        const { clientId, newName, currentName } = value;
        const { _id: parentId } = req.body.user;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(clientId)) {
            return next(ApiError.validationError([{
                field: 'clientId',
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

        // Check if new name already exists for another client
        const nameExists = await clients.findOne({
            parentId,
            name: { $regex: new RegExp(`^${newName}$`, 'i') },
            _id: { $ne: mongoose.Types.ObjectId(clientId) },
            isActive: true
        });

        if (nameExists) {
            return next(ApiError.conflictError("Client with this name already exists"));
        }

        // Update client name
        const result = await clients.findOneAndUpdate(
            {
                parentId,
                _id: mongoose.Types.ObjectId(clientId)
            },
            { name: newName },
            { new: true }
        );

        if (!result) {
            return next(ApiError.notFoundError("Client not found"));
        }

        return res.status(200).json(
            ApiResponse.success(result, `'${currentName}' updated successfully.`)
        );

    } catch (error) {
        console.error("Error in editClient:", error.message);
        return next(ApiError.internalError('Failed to update client'));
    }
}

// get all clients associated with user
const allClients = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;


        if (!parentId) {
            return next(ApiError.authenticationError("Unauthorized user"));
        }

        // Validate pagination parameters if provided
        const { page = 1, limit = 50, sortBy = 'balance', sortOrder = 'asc' } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
            return next(ApiError.validationError([{
                field: 'pagination',
                message: 'Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 100',
                value: { page: pageNum, limit: limitNum }
            }]));
        }

        const skip = (pageNum - 1) * limitNum;


        // Debug: Check total clients in database
        const totalClientsInDB = await clients.countDocuments({});
        const totalActiveClientsInDB = await clients.countDocuments({ isActive: true });
        const clientsForThisUser = await clients.countDocuments({ parentId, isActive: true });


        let result = await clients.aggregate([
            {
                $match: {
                    parentId,
                    isActive: true
                },
            },
            {
                $lookup: {
                    from: "transactions",
                    localField: "_id",
                    foreignField: "clientId",
                    as: "tDetails",
                },
            },
            {
                $unwind: {
                    path: "$tDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $group: {
                    _id: "$_id",
                    doc: {
                        $first: "$$ROOT",
                    },
                    balance: {
                        $sum: "$tDetails.amount",
                    },
                    lastDate: {
                        $last: "$tDetails.date",
                    },
                    transactionCount: {
                        $sum: { $cond: [{ $ne: ["$tDetails", null] }, 1, 0] }
                    }
                },
            },
            {
                $project: {
                    _id: "$doc._id",
                    name: "$doc.name",
                    phoneNumber: "$doc.phoneNumber",
                    email: "$doc.email",
                    notes: "$doc.notes",
                    balance: 1,
                    lastDate: {
                        $ifNull: ["$lastDate", "$$NOW"],
                    },
                    transactionCount: 1,
                    createdAt: "$doc.createdAt",
                    updatedAt: "$doc.updatedAt"
                },
            },
            {
                $sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 }
            },
            {
                $facet: {
                    data: [{ $skip: skip }, { $limit: limitNum }],
                    totalCount: [{ $count: "count" }]
                }
            }
        ]);

        const clientsData = result[0].data || [];
        const totalCount = result[0].totalCount[0]?.count || 0;
        const totalPages = Math.ceil(totalCount / limitNum);


        const pagination = {
            currentPage: pageNum,
            totalPages,
            totalCount,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1
        };

        if (clientsData.length > 0) {
            return res.status(200).json(
                ApiResponse.paginated(clientsData, "Clients retrieved successfully", pagination)
            );
        }

        return res.status(200).json(
            ApiResponse.success([], "No clients found")
        );

    } catch (error) {
        console.error("Error in allClients:", error.message);
        return next(ApiError.internalError('Failed to retrieve clients'));
    }
}
// delete client
const deleteClient = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const { clientid: clientId, clientname } = req.headers;

        if (!parentId) {
            return next(ApiError.authenticationError("Unauthorized user"));
        }

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

        // Soft delete client (set isActive to false instead of hard delete)
        const deleteResult = await clients.findOneAndUpdate(
            {
                parentId,
                _id: mongoose.Types.ObjectId(clientId)
            },
            {
                isActive: false,
                deletedAt: new Date()
            },
            { new: true }
        );

        if (!deleteResult) {
            return next(ApiError.notFoundError("Client not found"));
        }

        return res.status(200).json(
            ApiResponse.success(deleteResult, `'${clientname || existingClient.name}' deleted successfully`)
        );

    } catch (error) {
        console.error("Error in deleteClient:", error.message);
        return next(ApiError.internalError('Failed to delete client'));
    }
}

// search client 
const searchClient = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;
        const query = req.headers.query; // client name in which you have to find from database

        if (!parentId) {
            return next(ApiError.authenticationError("Unauthorized user"));
        }

        if (!query || query.trim().length === 0) {
            return next(ApiError.validationError([{
                field: 'query',
                message: 'Search query is required',
                value: query
            }]));
        }

        // Sanitize and validate search query
        const sanitizedQuery = query.trim();
        if (sanitizedQuery.length < 2) {
            return next(ApiError.validationError([{
                field: 'query',
                message: 'Search query must be at least 2 characters long',
                value: sanitizedQuery
            }]));
        }

        // Validate query length
        if (sanitizedQuery.length > 50) {
            return next(ApiError.validationError([{
                field: 'query',
                message: 'Search query must be less than 50 characters',
                value: sanitizedQuery
            }]));
        }

        // Aggregation to search user and calculate balance
        let result = await clients.aggregate([
            {
                "$match": {
                    "parentId": parentId,
                    "isActive": true,
                    "name": { "$regex": sanitizedQuery, "$options": "i" }
                }
            },
            {
                "$lookup": {
                    "from": "transactions",
                    "localField": "_id",
                    "foreignField": "clientId",
                    "as": "trns"
                }
            },
            {
                "$unwind": {
                    "path": "$trns",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                "$group": {
                    "_id": "$_id",
                    "parentId": { "$first": "$parentId" },
                    "client": { "$first": "$$ROOT" },
                    "balance": { "$sum": "$trns.amount" },
                    "lastDate": { "$last": "$trns.date" },
                    "transactionCount": {
                        "$sum": { $cond: [{ $ne: ["$trns", null] }, 1, 0] }
                    }
                }
            },
            {
                "$project": {
                    "_id": "$client._id",
                    "name": "$client.name",
                    "phoneNumber": "$client.phoneNumber",
                    "email": "$client.email",
                    "notes": "$client.notes",
                    "parentId": 1,
                    "balance": 1,
                    "transactionCount": 1,
                    "lastDate": {
                        "$ifNull": ["$lastDate", "$$NOW"]
                    }
                }
            },
            {
                "$sort": { "name": 1 }
            }
        ]);

        if (result.length > 0) {
            return res.status(200).json(
                ApiResponse.success(result, "Clients found successfully")
            );
        }

        return res.status(200).json(
            ApiResponse.success([], "No clients found matching your search")
        );

    } catch (error) {
        console.error("Error in searchClient:", error.message);
        return next(ApiError.internalError('Failed to search clients'));
    }
}







// Enhanced client creation with transaction auto-matching
const createClientWithTransactions = async (req, res, next) => {
    try {
        // Validate request body using Joi schema
        const { error, value } = clientSchemas.createWithTransactions.validate(req.body, {
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
        const { clientData, transactions } = value;

        // Check if client already exists
        const existingClient = await clients.findOne({
            parentId,
            name: { $regex: new RegExp(`^${clientData.name}$`, 'i') },
            isActive: true
        });

        if (existingClient) {
            return next(ApiError.conflictError("Client with this name already exists"));
        }

        // Create client
        const clientResult = await clients.create({
            parentId,
            name: clientData.name,
            phoneNumber: clientData.phoneNumber,
            email: clientData.email,
            notes: clientData.notes
        });

        let createdTransactions = [];
        let totalBalance = 0;

        // Add transactions if provided
        if (transactions && transactions.length > 0) {
            const Transaction = require("../Models/transaction.modal");

            for (const transaction of transactions) {
                // Validate transaction data
                const transactionValidation = validateTransactionData(transaction);
                if (transactionValidation.error) {
                    return next(ApiError.validationError(transactionValidation.errors));
                }

                const transactionData = {
                    clientId: clientResult._id,
                    parentId,
                    amount: parseFloat(transaction.amount),
                    date: new Date(transaction.date),
                    dis: transaction.dis,
                    type: transaction.type
                };

                const transactionResult = await Transaction.create(transactionData);
                createdTransactions.push(transactionResult);
                totalBalance += transactionData.amount;
            }

            // Update client's total balance and last transaction date
            await clients.findByIdAndUpdate(clientResult._id, {
                totalBalance,
                lastTransactionDate: new Date()
            });
        }

        const responseData = {
            client: clientResult,
            transactions: createdTransactions,
            totalBalance
        };

        return res.status(201).json(
            ApiResponse.created(responseData, "Client created successfully with transactions")
        );

    } catch (error) {
        console.error("Error in createClientWithTransactions:", error.message);
        return next(ApiError.internalError('Failed to create client with transactions'));
    }
};

// Helper function to validate transaction data
const validateTransactionData = (transaction) => {
    const errors = [];

    if (!transaction.amount || isNaN(parseFloat(transaction.amount))) {
        errors.push({
            field: 'amount',
            message: 'Valid transaction amount is required',
            value: transaction.amount
        });
    }

    if (!transaction.date || isNaN(new Date(transaction.date).getTime())) {
        errors.push({
            field: 'date',
            message: 'Valid transaction date is required',
            value: transaction.date
        });
    }

    if (!transaction.type || !['IN', 'OUT'].includes(transaction.type)) {
        errors.push({
            field: 'type',
            message: 'Transaction type must be IN or OUT',
            value: transaction.type
        });
    }

    return {
        error: errors.length > 0,
        errors
    };
};

// Auto-match transactions to existing clients
const autoMatchTransactions = async (req, res, next) => {
    try {
        // Validate request body using Joi schema
        const { error, value } = clientSchemas.autoMatch.validate(req.body, {
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
        const { transactions } = value;

        const Transaction = require("../Models/transaction.modal");
        const results = {
            matched: [],
            unmatched: [],
            newClients: []
        };

        for (const transaction of transactions) {
            // Validate transaction data
            const transactionValidation = validateTransactionData(transaction);
            if (transactionValidation.error) {
                results.unmatched.push({
                    transaction,
                    error: transactionValidation.errors
                });
                continue;
            }

            // Try to find matching client by name pattern
            const clientName = extractClientNameFromTransaction(transaction);

            if (clientName) {
                const existingClient = await clients.findOne({
                    parentId,
                    name: { $regex: new RegExp(clientName, 'i') },
                    isActive: true
                });

                if (existingClient) {
                    // Add transaction to existing client
                    const transactionData = {
                        clientId: existingClient._id,
                        parentId,
                        amount: parseFloat(transaction.amount),
                        date: new Date(transaction.date),
                        dis: transaction.dis,
                        type: transaction.type
                    };

                    const transactionResult = await Transaction.create(transactionData);

                    // Update client balance
                    await clients.findByIdAndUpdate(existingClient._id, {
                        $inc: { totalBalance: transactionData.amount },
                        lastTransactionDate: new Date()
                    });

                    results.matched.push({
                        client: existingClient,
                        transaction: transactionResult
                    });
                } else {
                    results.unmatched.push(transaction);
                }
            } else {
                results.unmatched.push(transaction);
            }
        }

        return res.status(200).json(
            ApiResponse.success(results, "Transaction matching completed")
        );

    } catch (error) {
        console.error("Error in autoMatchTransactions:", error.message);
        return next(ApiError.internalError('Failed to auto-match transactions'));
    }
};

// Helper function to extract client name from transaction description
const extractClientNameFromTransaction = (transaction) => {
    const description = transaction.dis || '';

    // Common patterns for extracting client names
    const patterns = [
        /(?:from|to|with)\s+([A-Za-z\s]+?)(?:\s+on|\s+at|\s+for|$)/i,
        /([A-Za-z\s]+?)\s+(?:payment|transaction|transfer)/i,
        /([A-Za-z\s]+?)\s+(?:UPI|NEFT|IMPS)/i
    ];

    for (const pattern of patterns) {
        const match = description.match(pattern);
        if (match && match[1]) {
            const name = match[1].trim();
            if (name.length > 2 && name.length <= 15) {
                return name;
            }
        }
    }

    return null;
};

// Get client statistics
const getClientStatistics = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;

        if (!parentId) {
            return next(ApiError.authenticationError("Unauthorized user"));
        }

        const stats = await clients.aggregate([
            { $match: { parentId, isActive: true } },
            {
                $lookup: {
                    from: "transactions",
                    localField: "_id",
                    foreignField: "clientId",
                    as: "transactions"
                }
            },
            {
                $group: {
                    _id: null,
                    totalClients: { $sum: 1 },
                    totalBalance: { $sum: "$totalBalance" },
                    averageBalance: { $avg: "$totalBalance" },
                    activeClients: {
                        $sum: {
                            $cond: [
                                { $gt: [{ $size: "$transactions" }, 0] },
                                1,
                                0
                            ]
                        }
                    },
                    totalTransactions: {
                        $sum: { $size: "$transactions" }
                    }
                }
            }
        ]);

        const responseData = stats[0] || {
            totalClients: 0,
            totalBalance: 0,
            averageBalance: 0,
            activeClients: 0,
            totalTransactions: 0
        };

        return res.status(200).json(
            ApiResponse.success(responseData, "Client statistics retrieved successfully")
        );

    } catch (error) {
        console.error("Error in getClientStatistics:", error.message);
        return next(ApiError.internalError('Failed to retrieve client statistics'));
    }
};

module.exports = {
    newClient,
    editClient,
    searchClient,
    allClients,
    deleteClient,
    createClientWithTransactions,
    autoMatchTransactions,
    getClientStatistics
}