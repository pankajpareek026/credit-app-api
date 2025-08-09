const { default: mongoose } = require("mongoose");
const BillReminder = require("../Models/billReminder.modal");
const ApiError = require("../utils/apiError.utils");
const ApiResponse = require("../utils/apiResponse.utils");

// Create new bill reminder
const createBillReminder = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;
        const { 
            provider, 
            amount, 
            remark, 
            dueDate, 
            category,
            isActive = true 
        } = req.body;

        // Validation
        const messages = [];
        !provider && messages.push("Provider is required");
        !amount && messages.push("Amount is required");
        !dueDate && messages.push("Due date is required");

        if (messages.length > 0) {
            return next(new ApiError(400, messages.join(", ")));
        }

        // Validate amount
        if (isNaN(amount) || parseFloat(amount) <= 0) {
            return next(new ApiError(400, "Amount must be a positive number"));
        }

        // Validate due date
        const dueDateObj = new Date(dueDate);
        if (isNaN(dueDateObj.getTime())) {
            return next(new ApiError(400, "Invalid due date format"));
        }

        // Create bill reminder
        const billReminder = await BillReminder.create({
            parentId,
            provider: provider.trim(),
            amount: parseFloat(amount),
            remark: remark ? remark.trim() : null,
            dueDate: dueDateObj,
            category: category || 'general',
            isActive,
            isPaid: false
        });

        return res.status(201).json(
            new ApiResponse(201, "Bill reminder created successfully", billReminder)
        );
    } catch (error) {
        return next(new ApiError(500, "Internal server error"));
    }
};

// Get all bill reminders with filtering and pagination
const getAllBillReminders = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;
        const {
            page = 1,
            limit = 10,
            status,
            category,
            isActive,
            isPaid
        } = req.query;

        // Build filter object
        const filter = { parentId };

        if (status === 'active') filter.isActive = true;
        if (status === 'inactive') filter.isActive = false;
        if (status === 'paid') filter.isPaid = true;
        if (status === 'unpaid') filter.isPaid = false;
        if (category) filter.category = category;
        if (isActive !== undefined) filter.isActive = isActive === 'true';
        if (isPaid !== undefined) filter.isPaid = isPaid === 'true';

        // Build sort object
        const sort = { dueDate: 1, createdAt: -1 };

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get bill reminders with pagination
        const billReminders = await BillReminder.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Get total count for pagination
        const totalReminders = await BillReminder.countDocuments(filter);

        // Get statistics
        const stats = await BillReminder.aggregate([
            { $match: { parentId: new mongoose.Types.ObjectId(parentId) } },
            {
                $group: {
                    _id: null,
                    totalReminders: { $sum: 1 },
                    activeReminders: { $sum: { $cond: ['$isActive', 1, 0] } },
                    paidReminders: { $sum: { $cond: ['$isPaid', 1, 0] } },
                    overdueReminders: { 
                        $sum: { 
                            $cond: [
                                { $and: [{ $lt: ['$dueDate', new Date()] }, { $eq: ['$isPaid', false] }] }, 
                                1, 
                                0 
                            ] 
                        } 
                    },
                    totalAmount: { $sum: '$amount' },
                    paidAmount: { 
                        $sum: { 
                            $cond: ['$isPaid', '$amount', 0] 
                        } 
                    }
                }
            }
        ]);

        const responseData = {
            reminders: billReminders,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalReminders / parseInt(limit)),
                totalReminders,
                hasNextPage: skip + billReminders.length < totalReminders,
                hasPrevPage: parseInt(page) > 1
            },
            statistics: stats[0] || {
                totalReminders: 0,
                activeReminders: 0,
                paidReminders: 0,
                overdueReminders: 0,
                totalAmount: 0,
                paidAmount: 0
            }
        };

        return res.status(200).json(
            new ApiResponse(200, "Bill reminders retrieved successfully", responseData)
        );
    } catch (error) {
        return next(new ApiError(500, "Internal server error"));
    }
};

// Get single bill reminder by ID
const getBillReminder = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;
        const { reminderId } = req.params;

        if (!reminderId) {
            return next(new ApiError(400, "Reminder ID is required"));
        }

        const billReminder = await BillReminder.findOne({
            _id: reminderId,
            parentId
        });

        if (!billReminder) {
            return next(new ApiError(404, "Bill reminder not found"));
        }

        return res.status(200).json(
            new ApiResponse(200, "Bill reminder retrieved successfully", billReminder)
        );
    } catch (error) {
        return next(new ApiError(500, "Internal server error"));
    }
};

// Update bill reminder
const updateBillReminder = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;
        const { reminderId } = req.params;
        const { 
            provider, 
            amount, 
            remark, 
            dueDate, 
            category,
            isActive,
            isPaid 
        } = req.body;

        if (!reminderId) {
            return next(new ApiError(400, "Reminder ID is required"));
        }

        const billReminder = await BillReminder.findOne({
            _id: reminderId,
            parentId
        });

        if (!billReminder) {
            return next(new ApiError(404, "Bill reminder not found"));
        }

        // Build update object
        const updateData = {};
        if (provider !== undefined) updateData.provider = provider.trim();
        if (amount !== undefined) {
            if (isNaN(amount) || parseFloat(amount) <= 0) {
                return next(new ApiError(400, "Amount must be a positive number"));
            }
            updateData.amount = parseFloat(amount);
        }
        if (remark !== undefined) updateData.remark = remark ? remark.trim() : null;
        if (dueDate !== undefined) {
            const dueDateObj = new Date(dueDate);
            if (isNaN(dueDateObj.getTime())) {
                return next(new ApiError(400, "Invalid due date format"));
            }
            updateData.dueDate = dueDateObj;
        }
        if (category !== undefined) updateData.category = category;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (isPaid !== undefined) updateData.isPaid = isPaid;

        updateData.updatedAt = new Date();

        const updatedReminder = await BillReminder.findByIdAndUpdate(
            reminderId,
            updateData,
            { new: true }
        );

        return res.status(200).json(
            new ApiResponse(200, "Bill reminder updated successfully", updatedReminder)
        );
    } catch (error) {
        return next(new ApiError(500, "Internal server error"));
    }
};

// Delete bill reminder
const deleteBillReminder = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;
        const { reminderId } = req.params;

        if (!reminderId) {
            return next(new ApiError(400, "Reminder ID is required"));
        }

        const billReminder = await BillReminder.findOne({
            _id: reminderId,
            parentId
        });

        if (!billReminder) {
            return next(new ApiError(404, "Bill reminder not found"));
        }

        await BillReminder.findByIdAndDelete(reminderId);

        return res.status(200).json(
            new ApiResponse(200, "Bill reminder deleted successfully")
        );
    } catch (error) {
        return next(new ApiError(500, "Internal server error"));
    }
};

// Mark bill reminder as paid
const markAsPaid = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;
        const { reminderId } = req.params;

        if (!reminderId) {
            return next(new ApiError(400, "Reminder ID is required"));
        }

        const billReminder = await BillReminder.findOne({
            _id: reminderId,
            parentId
        });

        if (!billReminder) {
            return next(new ApiError(404, "Bill reminder not found"));
        }

        billReminder.isPaid = true;
        billReminder.paidAt = new Date();
        billReminder.updatedAt = new Date();
        await billReminder.save();

        return res.status(200).json(
            new ApiResponse(200, "Bill reminder marked as paid", billReminder)
        );
    } catch (error) {
        return next(new ApiError(500, "Internal server error"));
    }
};

// Snooze bill reminder
const snoozeBillReminder = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;
        const { reminderId } = req.params;
        const { days = 3 } = req.body;

        if (!reminderId) {
            return next(new ApiError(400, "Reminder ID is required"));
        }

        if (isNaN(days) || days < 1 || days > 30) {
            return next(new ApiError(400, "Days must be between 1 and 30"));
        }

        const billReminder = await BillReminder.findOne({
            _id: reminderId,
            parentId
        });

        if (!billReminder) {
            return next(new ApiError(404, "Bill reminder not found"));
        }

        // Add days to due date
        const newDueDate = new Date(billReminder.dueDate);
        newDueDate.setDate(newDueDate.getDate() + parseInt(days));

        billReminder.dueDate = newDueDate;
        billReminder.updatedAt = new Date();
        await billReminder.save();

        return res.status(200).json(
            new ApiResponse(200, `Bill reminder snoozed for ${days} days`, billReminder)
        );
    } catch (error) {
        return next(new ApiError(500, "Internal server error"));
    }
};

// Get bill reminder statistics
const getBillReminderStatistics = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;

        const stats = await BillReminder.aggregate([
            { $match: { parentId: new mongoose.Types.ObjectId(parentId) } },
            {
                $group: {
                    _id: null,
                    totalReminders: { $sum: 1 },
                    activeReminders: { $sum: { $cond: ['$isActive', 1, 0] } },
                    paidReminders: { $sum: { $cond: ['$isPaid', 1, 0] } },
                    overdueReminders: { 
                        $sum: { 
                            $cond: [
                                { $and: [{ $lt: ['$dueDate', new Date()] }, { $eq: ['$isPaid', false] }] }, 
                                1, 
                                0 
                            ] 
                        } 
                    },
                    totalAmount: { $sum: '$amount' },
                    paidAmount: { 
                        $sum: { 
                            $cond: ['$isPaid', '$amount', 0] 
                        } 
                    },
                    pendingAmount: { 
                        $sum: { 
                            $cond: ['$isPaid', 0, '$amount'] 
                        } 
                    }
                }
            }
        ]);

        // Get category statistics
        const categoryStats = await BillReminder.aggregate([
            { $match: { parentId: new mongoose.Types.ObjectId(parentId) } },
            { $group: { _id: '$category', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
            { $sort: { count: -1 } }
        ]);

        // Get provider statistics
        const providerStats = await BillReminder.aggregate([
            { $match: { parentId: new mongoose.Types.ObjectId(parentId) } },
            { $group: { _id: '$provider', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
            { $sort: { count: -1 } }
        ]);

        const responseData = {
            ...stats[0],
            categoryStats,
            providerStats
        };

        return res.status(200).json(
            new ApiResponse(200, "Bill reminder statistics retrieved", responseData)
        );
    } catch (error) {
        return next(new ApiError(500, "Internal server error"));
    }
};

module.exports = {
    createBillReminder,
    getAllBillReminders,
    getBillReminder,
    updateBillReminder,
    deleteBillReminder,
    markAsPaid,
    snoozeBillReminder,
    getBillReminderStatistics
}; 