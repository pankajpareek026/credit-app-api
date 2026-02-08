const Budget = require('../Models/budget.modal');
const Expense = require('../Models/expense.modal');
const ApiError = require('../utils/apiError.utils');
const ApiResponse = require('../utils/apiResponse.utils');

/**
 * Create a new budget
 */
const createBudget = async (req, res, next) => {
    try {
        const {
            title,
            allocatedAmount,
            spentAmount,
            category,
            period,
            startDate,
            endDate,
            isActive
        } = req.body;

        const budgetData = {
            parentId,
            title,
            allocatedAmount,
            spentAmount,
            category,
            period,
            startDate,
            endDate,
            isActive
        };

        // Validate end date is after start date
        if (new Date(budgetData.endDate) <= new Date(budgetData.startDate)) {
            return next(ApiError.validationError([{
                field: 'endDate',
                message: 'End date must be after start date'
            }]));
        }

        const newBudget = await Budget.create(budgetData);

        return res.status(201).json(
            ApiResponse.created(newBudget, "Budget created successfully")
        );
    } catch (error) {
        console.error('Create budget error:', error);
        return next(ApiError.internalError('Failed to create budget'));
    }
};

/**
 * Get all budgets with pagination and filtering
 */
const getAllBudgets = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const {
            page = 1,
            limit = 20,
            search,
            category,
            period,
            isActive = true,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build filter object
        const filter = { parentId, isActive };

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } }
            ];
        }

        if (category) {
            filter.category = category;
        }

        if (period) {
            filter.period = period;
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Execute query with pagination
        const [budgets, totalCount] = await Promise.all([
            Budget.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Budget.countDocuments(filter)
        ]);

        // Update spent amounts based on expenses
        const budgetsWithSpent = await Promise.all(
            budgets.map(async (budget) => {
                const startDate = new Date(budget.startDate);
                const endDate = new Date(budget.endDate);

                // Calculate spent amount from expenses in this budget period and category
                const expenses = await Expense.aggregate([
                    {
                        $match: {
                            parentId: parentId,
                            category: budget.category,
                            date: { $gte: startDate, $lte: endDate },
                            isActive: true
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$amount' }
                        }
                    }
                ]);

                const spentAmount = expenses.length > 0 ? expenses[0].total : 0;

                return {
                    ...budget,
                    spentAmount: spentAmount
                };
            })
        );

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
            ApiResponse.paginated(budgetsWithSpent, pagination, "Budgets retrieved successfully")
        );
    } catch (error) {
        console.error('Get all budgets error:', error);
        return next(ApiError.internalError('Failed to retrieve budgets'));
    }
};

/**
 * Get single budget by ID
 */
const getBudget = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const { budgetId } = req.params;

        const budgetData = await Budget.findOne({ _id: budgetId, parentId }).lean();

        if (!budgetData) {
            return next(ApiError.notFoundError('Budget not found'));
        }

        // Calculate spent amount from expenses
        const startDate = new Date(budgetData.startDate);
        const endDate = new Date(budgetData.endDate);

        const expenses = await Expense.aggregate([
            {
                $match: {
                    parentId: parentId,
                    category: budgetData.category,
                    date: { $gte: startDate, $lte: endDate },
                    isActive: true
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);

        const spentAmount = expenses.length > 0 ? expenses[0].total : 0;
        budgetData.spentAmount = spentAmount;

        return res.status(200).json(
            ApiResponse.success(budgetData, "Budget retrieved successfully")
        );
    } catch (error) {
        console.error('Get budget error:', error);
        return next(ApiError.internalError('Failed to retrieve budget'));
    }
};

/**
 * Update budget
 */
const updateBudget = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const { budgetId } = req.params;

        const budgetData = await Budget.findOne({ _id: budgetId, parentId });

        if (!budgetData) {
            return next(ApiError.notFoundError('Budget not found'));
        }

        // Validate end date if both dates are being updated
        if (req.body.startDate && req.body.endDate) {
            if (new Date(req.body.endDate) <= new Date(req.body.startDate)) {
                return next(ApiError.validationError([{
                    field: 'endDate',
                    message: 'End date must be after start date'
                }]));
            }
        } else if (req.body.endDate && !req.body.startDate) {
            if (new Date(req.body.endDate) <= budgetData.startDate) {
                return next(ApiError.validationError([{
                    field: 'endDate',
                    message: 'End date must be after start date'
                }]));
            }
        } else if (req.body.startDate && !req.body.endDate) {
            if (budgetData.endDate <= new Date(req.body.startDate)) {
                return next(ApiError.validationError([{
                    field: 'startDate',
                    message: 'Start date must be before end date'
                }]));
            }
        }

        const {
            title,
            allocatedAmount,
            spentAmount,
            category,
            period,
            startDate,
            endDate,
            isActive
        } = req.body;

        const updatedBudget = await Budget.findByIdAndUpdate(
            budgetId,
            {
                title,
                allocatedAmount,
                spentAmount,
                category,
                period,
                startDate,
                endDate,
                isActive,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        );

        return res.status(200).json(
            ApiResponse.updated(updatedBudget, "Budget updated successfully")
        );
    } catch (error) {
        console.error('Update budget error:', error);
        return next(ApiError.internalError('Failed to update budget'));
    }
};

/**
 * Delete budget (soft delete)
 */
const deleteBudget = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const { budgetId } = req.params;

        const budgetData = await Budget.findOne({ _id: budgetId, parentId });

        if (!budgetData) {
            return next(ApiError.notFoundError('Budget not found'));
        }

        await Budget.findByIdAndUpdate(budgetId, { isActive: false });

        return res.status(200).json(
            ApiResponse.deleted("Budget deleted successfully")
        );
    } catch (error) {
        console.error('Delete budget error:', error);
        return next(ApiError.internalError('Failed to delete budget'));
    }
};

/**
 * Get budget statistics
 */
const getBudgetStatistics = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const { startDate, endDate, category } = req.query;

        // Build filter object
        const filter = { parentId, isActive: true };

        if (category) {
            filter.category = category;
        }

        if (startDate || endDate) {
            filter.startDate = {};
            if (startDate) filter.startDate.$gte = new Date(startDate);
            if (endDate) filter.startDate.$lte = new Date(endDate);
        }

        // Get basic statistics
        const [totalBudgets, totalAllocated, totalSpent, categoryStats] = await Promise.all([
            Budget.countDocuments(filter),
            Budget.aggregate([
                { $match: filter },
                { $group: { _id: null, total: { $sum: '$allocatedAmount' } } }
            ]),
            Budget.aggregate([
                { $match: filter },
                { $group: { _id: null, total: { $sum: '$spentAmount' } } }
            ]),
            Budget.aggregate([
                { $match: filter },
                { $group: { _id: '$category', totalAllocated: { $sum: '$allocatedAmount' }, totalSpent: { $sum: '$spentAmount' }, count: { $sum: 1 } } },
                { $sort: { totalAllocated: -1 } }
            ])
        ]);

        const statistics = {
            totalBudgets,
            totalAllocated: totalAllocated[0]?.total || 0,
            totalSpent: totalSpent[0]?.total || 0,
            totalRemaining: (totalAllocated[0]?.total || 0) - (totalSpent[0]?.total || 0),
            categoryBreakdown: categoryStats
        };

        return res.status(200).json(
            ApiResponse.success(statistics, "Budget statistics retrieved successfully")
        );
    } catch (error) {
        console.error('Get budget statistics error:', error);
        return next(ApiError.internalError('Failed to retrieve budget statistics'));
    }
};

module.exports = {
    createBudget,
    getAllBudgets,
    getBudget,
    updateBudget,
    deleteBudget,
    getBudgetStatistics
};

