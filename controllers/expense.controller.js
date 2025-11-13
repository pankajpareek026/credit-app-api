const expense = require('../Models/expense.modal');
const ApiError = require('../utils/apiError.utils');
const ApiResponse = require('../utils/apiResponse.utils');

/**
 * Create a new expense
 */
const createExpense = async (req, res, next) => {
    try {
        // Get parentId from user (added by auth middleware)
        // Note: req.body.user might be preserved or removed by validation middleware
        // So we check both req.body.user and a preserved reference
        const parentId = req.body.user?._id || req.user?._id;

        if (!parentId) {
            return next(new ApiError(400, 'User ID not found in request'));
        }

        // Extract only the expense fields from req.body (exclude user object and any other unknown fields)
        // Validation middleware should have already validated and stripped unknown fields
        const {
            title,
            amount,
            date,
            category,
            paymentMethod,
            tags,
            notes,
            isActive
        } = req.body;

        // Validate required fields are present (should already be validated by middleware, but double-check)
        if (!title || amount === undefined || !date || !category || !paymentMethod) {
            return next(ApiError.validationError([{
                field: 'required_fields',
                message: 'Missing required fields: title, amount, date, category, paymentMethod'
            }]));
        }

        // Build expense data object with only valid fields
        const expenseData = {
            parentId,
            title: title.trim(),
            amount: parseFloat(amount),
            date: new Date(date),
            category: category.toUpperCase(),
            paymentMethod: paymentMethod.toUpperCase(),
            tags: Array.isArray(tags) ? tags.filter(tag => tag && tag.trim()).map(tag => tag.trim()) : [],
            isActive: isActive !== undefined ? Boolean(isActive) : true
        };

        // Only include notes if it's provided and not empty
        if (notes && notes.trim()) {
            expenseData.notes = notes.trim();
        }

        const newExpense = await expense.create(expenseData);

        return res.status(201).json(
            ApiResponse.created(newExpense, "Expense created successfully")
        );
    } catch (error) {
        console.error('Create expense error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });

        // Check if it's a validation error from Mongoose
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors || {}).map(err => ({
                field: err.path,
                message: err.message
            }));
            return next(ApiError.validationError(validationErrors));
        }

        return next(ApiError.internalError('Failed to create expense'));
    }
};

/**
 * Get all expenses with pagination and filtering
 */
const getAllExpenses = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const {
            page = 1,
            limit = 20,
            search,
            category,
            paymentMethod,
            isActive = true,
            startDate,
            endDate,
            sortBy = 'date',
            sortOrder = 'desc'
        } = req.query;

        // Build filter object
        const filter = { parentId, isActive };

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { notes: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        if (category) {
            filter.category = category;
        }

        if (paymentMethod) {
            filter.paymentMethod = paymentMethod;
        }

        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Execute query with pagination
        const [expenses, totalCount] = await Promise.all([
            expense.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            expense.countDocuments(filter)
        ]);

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        const pagination = {
            currentPage: parseInt(page),
            totalPages,
            totalItems: totalCount,
            itemsPerPage: parseInt(limit),
            hasNextPage,
            hasPrevPage
        };

        return res.status(200).json(
            ApiResponse.paginated(expenses, pagination, "Expenses retrieved successfully")
        );
    } catch (error) {
        console.error('Get all expenses error:', error);
        return next(ApiError.internalError('Failed to retrieve expenses'));
    }
};

/**
 * Get single expense by ID
 */
const getExpense = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const { expenseId } = req.params;

        const expenseData = await expense.findOne({ _id: expenseId, parentId });

        if (!expenseData) {
            return next(ApiError.notFoundError('Expense not found'));
        }

        return res.status(200).json(
            ApiResponse.success(expenseData, "Expense retrieved successfully")
        );
    } catch (error) {
        console.error('Get expense error:', error);
        return next(ApiError.internalError('Failed to retrieve expense'));
    }
};

/**
 * Update expense
 */
const updateExpense = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const { expenseId } = req.params;

        const expenseData = await expense.findOne({ _id: expenseId, parentId });

        if (!expenseData) {
            return next(ApiError.notFoundError('Expense not found'));
        }

        const updatedExpense = await expense.findByIdAndUpdate(
            expenseId,
            { ...req.body, updatedAt: new Date() },
            { new: true, runValidators: true }
        );

        return res.status(200).json(
            ApiResponse.updated(updatedExpense, "Expense updated successfully")
        );
    } catch (error) {
        console.error('Update expense error:', error);
        return next(ApiError.internalError('Failed to update expense'));
    }
};

/**
 * Delete expense (soft delete)
 */
const deleteExpense = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const { expenseId } = req.params;

        const expenseData = await expense.findOne({ _id: expenseId, parentId });

        if (!expenseData) {
            return next(ApiError.notFoundError('Expense not found'));
        }

        await expense.findByIdAndUpdate(expenseId, { isActive: false });

        return res.status(200).json(
            ApiResponse.deleted("Expense deleted successfully")
        );
    } catch (error) {
        console.error('Delete expense error:', error);
        return next(ApiError.internalError('Failed to delete expense'));
    }
};

/**
 * Get expense statistics
 */
const getExpenseStatistics = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const { startDate, endDate, category, paymentMethod } = req.query;

        // Build filter object
        const filter = { parentId, isActive: true };

        if (category) {
            filter.category = category;
        }

        if (paymentMethod) {
            filter.paymentMethod = paymentMethod;
        }

        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        // Get basic statistics
        const [totalExpenses, totalAmount, categoryStats, paymentMethodStats, dailyBreakdown] = await Promise.all([
            expense.countDocuments(filter),
            expense.aggregate([
                { $match: filter },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            expense.aggregate([
                { $match: filter },
                { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
                { $sort: { total: -1 } }
            ]),
            expense.aggregate([
                { $match: filter },
                { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } },
                { $sort: { total: -1 } }
            ]),
            expense.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: {
                            year: { $year: '$date' },
                            month: { $month: '$date' },
                            day: { $dayOfMonth: '$date' }
                        },
                        total: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
                { $limit: 30 }
            ])
        ]);

        // Calculate total income (for now set to 0, can be extended later with income tracking)
        // TODO: If income tracking is added, calculate from income model/transactions
        const totalIncome = 0;

        const statistics = {
            totalExpenses: totalAmount[0]?.total || 0,
            totalIncome: totalIncome,
            averageAmount: totalExpenses > 0 ? (totalAmount[0]?.total || 0) / totalExpenses : 0,
            categoryBreakdown: categoryStats,
            paymentMethodBreakdown: paymentMethodStats,
            dailyBreakdown: dailyBreakdown
        };

        return res.status(200).json(
            ApiResponse.success(statistics, "Expense statistics retrieved successfully")
        );
    } catch (error) {
        console.error('Get expense statistics error:', error);
        return next(ApiError.internalError('Failed to retrieve expense statistics'));
    }
};

/**
 * Bulk create expenses
 */
const bulkCreateExpenses = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const { expenses } = req.body;

        // Add parentId to each expense
        const expensesWithParentId = expenses.map(expenseData => ({
            ...expenseData,
            parentId
        }));

        const createdExpenses = await expense.insertMany(expensesWithParentId);

        const totalAmount = createdExpenses.reduce((sum, exp) => sum + exp.amount, 0);

        return res.status(201).json(
            ApiResponse.created({
                expenses: createdExpenses,
                totalCreated: createdExpenses.length,
                totalAmount
            }, "Expenses created successfully")
        );
    } catch (error) {
        console.error('Bulk create expenses error:', error);
        return next(ApiError.internalError('Failed to create expenses'));
    }
};

module.exports = {
    createExpense,
    getAllExpenses,
    getExpense,
    updateExpense,
    deleteExpense,
    getExpenseStatistics,
    bulkCreateExpenses
};
