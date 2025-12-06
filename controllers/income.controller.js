const Income = require('../Models/income.modal');
const BudgetSection = require('../Models/budgetSection.modal');
const ApiError = require('../utils/apiError.utils');
const ApiResponse = require('../utils/apiResponse.utils');

/**
 * Create a new income entry
 */
const createIncome = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const incomeData = { ...req.body, parentId };

        // Validate budget section exists and belongs to user
        const budgetSection = await BudgetSection.findOne({
            _id: incomeData.budgetSectionId,
            parentId: parentId,
            isActive: true
        });

        if (!budgetSection) {
            return next(ApiError.notFoundError('Budget section not found or inactive'));
        }

        // Validate description is provided and meets minimum length
        if (!incomeData.description || incomeData.description.trim().length < 3) {
            return next(ApiError.validationError([{
                field: 'description',
                message: 'Description is required and must be at least 3 characters'
            }]));
        }

        const newIncome = await Income.create(incomeData);
        
        return res.status(201).json(
            ApiResponse.created(newIncome, "Income created successfully")
        );
    } catch (error) {
        console.error('Create income error:', error);
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors || {}).map(err => ({
                field: err.path,
                message: err.message
            }));
            return next(ApiError.validationError(validationErrors));
        }
        return next(ApiError.internalError('Failed to create income'));
    }
};

/**
 * Get all incomes with pagination and filtering
 */
const getAllIncomes = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const {
            page = 1,
            limit = 20,
            search,
            budgetSectionId,
            sourceType,
            isActive = true,
            startDate,
            endDate,
            sortBy = 'date',
            sortOrder = 'desc'
        } = req.query;

        // Build filter object
        const filter = { parentId, isActive };

        if (budgetSectionId) {
            filter.budgetSectionId = budgetSectionId;
        }

        if (sourceType) {
            filter.sourceType = sourceType;
        }

        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Execute query with pagination
        const [incomes, totalCount] = await Promise.all([
            Income.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Income.countDocuments(filter)
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
            ApiResponse.paginated(incomes, pagination, "Incomes retrieved successfully")
        );
    } catch (error) {
        console.error('Get all incomes error:', error);
        return next(ApiError.internalError('Failed to retrieve incomes'));
    }
};

/**
 * Get incomes by budget section
 */
const getIncomesBySection = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const { sectionId } = req.params;

        // Verify section belongs to user
        const section = await BudgetSection.findOne({ _id: sectionId, parentId });
        if (!section) {
            return next(ApiError.notFoundError('Budget section not found'));
        }

        const incomes = await Income.find({
            parentId: parentId,
            budgetSectionId: sectionId,
            isActive: true
        }).sort({ date: -1 }).lean();

        return res.status(200).json(
            ApiResponse.success(incomes, "Incomes retrieved successfully")
        );
    } catch (error) {
        console.error('Get incomes by section error:', error);
        return next(ApiError.internalError('Failed to retrieve incomes'));
    }
};

/**
 * Get single income by ID
 */
const getIncome = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const { incomeId } = req.params;

        const incomeData = await Income.findOne({ _id: incomeId, parentId }).lean();

        if (!incomeData) {
            return next(ApiError.notFoundError('Income not found'));
        }

        return res.status(200).json(
            ApiResponse.success(incomeData, "Income retrieved successfully")
        );
    } catch (error) {
        console.error('Get income error:', error);
        return next(ApiError.internalError('Failed to retrieve income'));
    }
};

/**
 * Update income
 */
const updateIncome = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const { incomeId } = req.params;

        const incomeData = await Income.findOne({ _id: incomeId, parentId });

        if (!incomeData) {
            return next(ApiError.notFoundError('Income not found'));
        }

        // If budgetSectionId is being updated, validate it exists
        if (req.body.budgetSectionId) {
            const budgetSection = await BudgetSection.findOne({
                _id: req.body.budgetSectionId,
                parentId: parentId,
                isActive: true
            });

            if (!budgetSection) {
                return next(ApiError.notFoundError('Budget section not found or inactive'));
            }
        }

        // Validate description if being updated
        if (req.body.description !== undefined) {
            if (!req.body.description || req.body.description.trim().length < 3) {
                return next(ApiError.validationError([{
                    field: 'description',
                    message: 'Description is required and must be at least 3 characters'
                }]));
            }
        }

        const updatedIncome = await Income.findByIdAndUpdate(
            incomeId,
            { ...req.body, updatedAt: new Date() },
            { new: true, runValidators: true }
        );

        return res.status(200).json(
            ApiResponse.updated(updatedIncome, "Income updated successfully")
        );
    } catch (error) {
        console.error('Update income error:', error);
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors || {}).map(err => ({
                field: err.path,
                message: err.message
            }));
            return next(ApiError.validationError(validationErrors));
        }
        return next(ApiError.internalError('Failed to update income'));
    }
};

/**
 * Delete income (soft delete)
 */
const deleteIncome = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const { incomeId } = req.params;

        const incomeData = await Income.findOne({ _id: incomeId, parentId });

        if (!incomeData) {
            return next(ApiError.notFoundError('Income not found'));
        }

        await Income.findByIdAndUpdate(incomeId, { isActive: false });

        return res.status(200).json(
            ApiResponse.deleted("Income deleted successfully")
        );
    } catch (error) {
        console.error('Delete income error:', error);
        return next(ApiError.internalError('Failed to delete income'));
    }
};

/**
 * Get income statistics
 */
const getIncomeStatistics = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const { budgetSectionId, startDate, endDate } = req.query;

        // Build filter object
        const filter = { parentId, isActive: true };

        if (budgetSectionId) {
            filter.budgetSectionId = budgetSectionId;
        }

        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        // Get basic statistics
        const [totalIncomes, totalAmount, sourceTypeStats] = await Promise.all([
            Income.countDocuments(filter),
            Income.aggregate([
                { $match: filter },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            Income.aggregate([
                { $match: filter },
                { $group: { _id: '$sourceType', total: { $sum: '$amount' }, count: { $sum: 1 } } },
                { $sort: { total: -1 } }
            ])
        ]);

        const statistics = {
            totalIncomes,
            totalAmount: totalAmount[0]?.total || 0,
            sourceTypeBreakdown: sourceTypeStats
        };

        return res.status(200).json(
            ApiResponse.success(statistics, "Income statistics retrieved successfully")
        );
    } catch (error) {
        console.error('Get income statistics error:', error);
        return next(ApiError.internalError('Failed to retrieve income statistics'));
    }
};

module.exports = {
    createIncome,
    getAllIncomes,
    getIncomesBySection,
    getIncome,
    updateIncome,
    deleteIncome,
    getIncomeStatistics
};

