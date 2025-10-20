const expense = require('../Models/expense.modal');
const ApiError = require('../utils/apiError.utils');
const ApiResponse = require('../utils/apiResponse.utils');

/**
 * Create a new expense
 */
const createExpense = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const expenseData = { ...req.body, parentId };

        const newExpense = await expense.create(expenseData);
        
        return res.status(201).json(
            ApiResponse.created(newExpense, "Expense created successfully")
        );
    } catch (error) {
        console.error('Create expense error:', error);
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

        const statistics = {
            totalExpenses,
            totalAmount: totalAmount[0]?.total || 0,
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
