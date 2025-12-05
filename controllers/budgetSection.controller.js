const BudgetSection = require('../Models/budgetSection.modal');
const Income = require('../Models/income.modal');
const Expense = require('../Models/expense.modal');
const ApiError = require('../utils/apiError.utils');
const ApiResponse = require('../utils/apiResponse.utils');

/**
 * Create a new budget section
 */
const createBudgetSection = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const budgetSectionData = { ...req.body, parentId };

        // Validate end date is after start date
        if (new Date(budgetSectionData.endDate) <= new Date(budgetSectionData.startDate)) {
            return next(ApiError.validationError([{
                field: 'endDate',
                message: 'End date must be after start date'
            }]));
        }

        const newBudgetSection = await BudgetSection.create(budgetSectionData);
        
        return res.status(201).json(
            ApiResponse.created(newBudgetSection, "Budget section created successfully")
        );
    } catch (error) {
        console.error('Create budget section error:', error);
        return next(ApiError.internalError('Failed to create budget section'));
    }
};

/**
 * Get all budget sections with pagination and filtering
 */
const getAllBudgetSections = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const {
            page = 1,
            limit = 20,
            search,
            isActive = true,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build filter object
        const filter = { parentId, isActive };

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
        const [sections, totalCount] = await Promise.all([
            BudgetSection.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            BudgetSection.countDocuments(filter)
        ]);

        // Calculate total income, total expenses, and balance for each section
        const sectionsWithBalance = await Promise.all(
            sections.map(async (section) => {
                // Calculate total income
                const incomeResult = await Income.aggregate([
                    {
                        $match: {
                            parentId: parentId,
                            budgetSectionId: section._id,
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

                const totalIncome = incomeResult.length > 0 ? incomeResult[0].total : 0;

                // Calculate total expenses
                const expenseResult = await Expense.aggregate([
                    {
                        $match: {
                            parentId: parentId,
                            budgetSectionId: section._id,
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

                const totalExpenses = expenseResult.length > 0 ? expenseResult[0].total : 0;

                // Calculate balance (can be negative)
                const balance = totalIncome - totalExpenses;

                return {
                    ...section,
                    totalIncome,
                    totalExpenses,
                    balance
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
            ApiResponse.paginated(sectionsWithBalance, pagination, "Budget sections retrieved successfully")
        );
    } catch (error) {
        console.error('Get all budget sections error:', error);
        return next(ApiError.internalError('Failed to retrieve budget sections'));
    }
};

/**
 * Get single budget section by ID
 */
const getBudgetSection = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const { sectionId } = req.params;

        const sectionData = await BudgetSection.findOne({ _id: sectionId, parentId }).lean();

        if (!sectionData) {
            return next(ApiError.notFoundError('Budget section not found'));
        }

        // Calculate total income
        const incomeResult = await Income.aggregate([
            {
                $match: {
                    parentId: parentId,
                    budgetSectionId: sectionData._id,
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

        const totalIncome = incomeResult.length > 0 ? incomeResult[0].total : 0;

        // Calculate total expenses
        const expenseResult = await Expense.aggregate([
            {
                $match: {
                    parentId: parentId,
                    budgetSectionId: sectionData._id,
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

        const totalExpenses = expenseResult.length > 0 ? expenseResult[0].total : 0;

        // Calculate balance (can be negative)
        const balance = totalIncome - totalExpenses;

        // Get income entries
        const incomes = await Income.find({
            parentId: parentId,
            budgetSectionId: sectionData._id,
            isActive: true
        }).sort({ date: -1 }).lean();

        // Get expense entries
        const expenses = await Expense.find({
            parentId: parentId,
            budgetSectionId: sectionData._id,
            isActive: true
        }).sort({ date: -1 }).lean();

        return res.status(200).json(
            ApiResponse.success({
                ...sectionData,
                totalIncome,
                totalExpenses,
                balance,
                incomes,
                expenses
            }, "Budget section retrieved successfully")
        );
    } catch (error) {
        console.error('Get budget section error:', error);
        return next(ApiError.internalError('Failed to retrieve budget section'));
    }
};

/**
 * Update budget section
 */
const updateBudgetSection = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const { sectionId } = req.params;

        const sectionData = await BudgetSection.findOne({ _id: sectionId, parentId });

        if (!sectionData) {
            return next(ApiError.notFoundError('Budget section not found'));
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
            if (new Date(req.body.endDate) <= sectionData.startDate) {
                return next(ApiError.validationError([{
                    field: 'endDate',
                    message: 'End date must be after start date'
                }]));
            }
        } else if (req.body.startDate && !req.body.endDate) {
            if (sectionData.endDate <= new Date(req.body.startDate)) {
                return next(ApiError.validationError([{
                    field: 'startDate',
                    message: 'Start date must be before end date'
                }]));
            }
        }

        const updatedSection = await BudgetSection.findByIdAndUpdate(
            sectionId,
            { ...req.body, updatedAt: new Date() },
            { new: true, runValidators: true }
        );

        return res.status(200).json(
            ApiResponse.updated(updatedSection, "Budget section updated successfully")
        );
    } catch (error) {
        console.error('Update budget section error:', error);
        return next(ApiError.internalError('Failed to update budget section'));
    }
};

/**
 * Delete budget section (soft delete)
 */
const deleteBudgetSection = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const { sectionId } = req.params;

        const sectionData = await BudgetSection.findOne({ _id: sectionId, parentId });

        if (!sectionData) {
            return next(ApiError.notFoundError('Budget section not found'));
        }

        await BudgetSection.findByIdAndUpdate(sectionId, { isActive: false });

        return res.status(200).json(
            ApiResponse.deleted("Budget section deleted successfully")
        );
    } catch (error) {
        console.error('Delete budget section error:', error);
        return next(ApiError.internalError('Failed to delete budget section'));
    }
};

/**
 * Get budget section statistics
 */
const getBudgetSectionStatistics = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const { sectionId } = req.params;

        const sectionData = await BudgetSection.findOne({ _id: sectionId, parentId }).lean();

        if (!sectionData) {
            return next(ApiError.notFoundError('Budget section not found'));
        }

        // Calculate total income
        const incomeResult = await Income.aggregate([
            {
                $match: {
                    parentId: parentId,
                    budgetSectionId: sectionData._id,
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

        const totalIncome = incomeResult.length > 0 ? incomeResult[0].total : 0;

        // Calculate total expenses
        const expenseResult = await Expense.aggregate([
            {
                $match: {
                    parentId: parentId,
                    budgetSectionId: sectionData._id,
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

        const totalExpenses = expenseResult.length > 0 ? expenseResult[0].total : 0;

        // Calculate balance
        const balance = totalIncome - totalExpenses;

        // Income source breakdown
        const incomeSourceBreakdown = await Income.aggregate([
            {
                $match: {
                    parentId: parentId,
                    budgetSectionId: sectionData._id,
                    isActive: true
                }
            },
            {
                $group: {
                    _id: '$sourceType',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { total: -1 } }
        ]);

        // Expense category breakdown
        const expenseCategoryBreakdown = await Expense.aggregate([
            {
                $match: {
                    parentId: parentId,
                    budgetSectionId: sectionData._id,
                    isActive: true
                }
            },
            {
                $group: {
                    _id: '$category',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { total: -1 } }
        ]);

        const statistics = {
            totalIncome,
            totalExpenses,
            balance,
            incomeSourceBreakdown,
            expenseCategoryBreakdown,
            targetBudget: sectionData.targetBudget || null,
            balancePercentage: sectionData.targetBudget 
                ? (balance / sectionData.targetBudget) * 100 
                : null
        };

        return res.status(200).json(
            ApiResponse.success(statistics, "Budget section statistics retrieved successfully")
        );
    } catch (error) {
        console.error('Get budget section statistics error:', error);
        return next(ApiError.internalError('Failed to retrieve budget section statistics'));
    }
};

module.exports = {
    createBudgetSection,
    getAllBudgetSections,
    getBudgetSection,
    updateBudgetSection,
    deleteBudgetSection,
    getBudgetSectionStatistics
};

