const PortfolioAsset = require('../Models/portfolioAsset.modal');
const PortfolioTransaction = require('../Models/portfolioTransaction.modal');
const PortfolioSnapshot = require('../Models/portfolioSnapshot.modal');
const ApiError = require('../utils/apiError.utils');
const ApiResponse = require('../utils/apiResponse.utils');
const { batchUpdatePrices, fetchInrToUsdRate } = require('../utils/priceService');

/**
 * ============================================
 * ASSET MANAGEMENT
 * ============================================
 */

/**
 * Create a new portfolio asset
 */
const createAsset = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;

        if (!parentId) {
            return next(new ApiError(400, 'User ID not found in request'));
        }

        const {
            assetType,
            symbol,
            name,
            quantity,
            averageBuyPrice,
            currentPrice,
            exchange,
            notes
        } = req.body;

        // Validate required fields
        if (!assetType || !symbol || !name || quantity === undefined || averageBuyPrice === undefined) {
            return next(ApiError.validationError([{
                field: 'required_fields',
                message: 'Missing required fields: assetType, symbol, name, quantity, averageBuyPrice'
            }]));
        }

        // Calculate initial values
        const totalInvested = quantity * averageBuyPrice;
        const currentValue = quantity * (currentPrice || averageBuyPrice);
        const profitLoss = currentValue - totalInvested;
        const profitLossPercentage = totalInvested > 0 ? ((profitLoss / totalInvested) * 100) : 0;

        const assetData = {
            parentId,
            assetType: assetType.toUpperCase(),
            symbol: symbol.trim().toUpperCase(),
            name: name.trim(),
            quantity: parseFloat(quantity),
            averageBuyPrice: parseFloat(averageBuyPrice),
            currentPrice: parseFloat(currentPrice || averageBuyPrice),
            totalInvested,
            currentValue,
            profitLoss,
            profitLossPercentage,
            isActive: true
        };

        if (exchange) {
            assetData.exchange = exchange.trim();
        }

        if (notes && notes.trim()) {
            assetData.notes = notes.trim();
        }

        const newAsset = await PortfolioAsset.create(assetData);

        return res.status(201).json(
            ApiResponse.created(newAsset, "Portfolio asset created successfully")
        );
    } catch (error) {
        console.error('Create asset error:', error);
        
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors || {}).map(err => ({
                field: err.path,
                message: err.message
            }));
            return next(ApiError.validationError(validationErrors));
        }

        return next(ApiError.internalError('Failed to create portfolio asset'));
    }
};

/**
 * Get all assets with pagination and filtering
 */
const getAssets = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const {
            page = 1,
            limit = 50,
            assetType,
            search,
            isActive = true,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build filter object
        const filter = { parentId, isActive };

        if (assetType) {
            filter.assetType = assetType.toUpperCase();
        }

        if (search) {
            filter.$or = [
                { symbol: { $regex: search, $options: 'i' } },
                { name: { $regex: search, $options: 'i' } }
            ];
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Execute query
        const [assets, totalCount] = await Promise.all([
            PortfolioAsset.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            PortfolioAsset.countDocuments(filter)
        ]);

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limit);
        const pagination = {
            currentPage: parseInt(page),
            totalPages,
            totalItems: totalCount,
            itemsPerPage: parseInt(limit),
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        };

        return res.status(200).json(
            ApiResponse.paginated(assets, pagination, "Portfolio assets retrieved successfully")
        );
    } catch (error) {
        console.error('Get assets error:', error);
        return next(ApiError.internalError('Failed to retrieve portfolio assets'));
    }
};

/**
 * Get single asset by ID
 */
const getAssetById = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const { assetId } = req.params;

        const asset = await PortfolioAsset.findOne({ _id: assetId, parentId });

        if (!asset) {
            return next(ApiError.notFoundError('Portfolio asset not found'));
        }

        return res.status(200).json(
            ApiResponse.success(asset, "Portfolio asset retrieved successfully")
        );
    } catch (error) {
        console.error('Get asset error:', error);
        return next(ApiError.internalError('Failed to retrieve portfolio asset'));
    }
};

/**
 * Update asset
 */
const updateAsset = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const { assetId } = req.params;

        const asset = await PortfolioAsset.findOne({ _id: assetId, parentId });

        if (!asset) {
            return next(ApiError.notFoundError('Portfolio asset not found'));
        }

        // Update fields
        const updateData = { ...req.body };
        
        // Recalculate if quantity or prices changed
        if (updateData.quantity !== undefined || updateData.averageBuyPrice !== undefined || updateData.currentPrice !== undefined) {
            const quantity = updateData.quantity !== undefined ? parseFloat(updateData.quantity) : asset.quantity;
            const averageBuyPrice = updateData.averageBuyPrice !== undefined ? parseFloat(updateData.averageBuyPrice) : asset.averageBuyPrice;
            const currentPrice = updateData.currentPrice !== undefined ? parseFloat(updateData.currentPrice) : asset.currentPrice;

            updateData.totalInvested = quantity * averageBuyPrice;
            updateData.currentValue = quantity * currentPrice;
            updateData.profitLoss = updateData.currentValue - updateData.totalInvested;
            updateData.profitLossPercentage = updateData.totalInvested > 0 
                ? ((updateData.profitLoss / updateData.totalInvested) * 100) 
                : 0;
        }

        const updatedAsset = await PortfolioAsset.findByIdAndUpdate(
            assetId,
            updateData,
            { new: true, runValidators: true }
        );

        return res.status(200).json(
            ApiResponse.updated(updatedAsset, "Portfolio asset updated successfully")
        );
    } catch (error) {
        console.error('Update asset error:', error);
        return next(ApiError.internalError('Failed to update portfolio asset'));
    }
};

/**
 * Delete asset (soft delete)
 */
const deleteAsset = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const { assetId } = req.params;

        const asset = await PortfolioAsset.findOne({ _id: assetId, parentId });

        if (!asset) {
            return next(ApiError.notFoundError('Portfolio asset not found'));
        }

        await PortfolioAsset.findByIdAndUpdate(assetId, { isActive: false });

        return res.status(200).json(
            ApiResponse.deleted("Portfolio asset deleted successfully")
        );
    } catch (error) {
        console.error('Delete asset error:', error);
        return next(ApiError.internalError('Failed to delete portfolio asset'));
    }
};

/**
 * ============================================
 * TRANSACTION MANAGEMENT
 * ============================================
 */

/**
 * Create transaction and update asset
 */
const createTransaction = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;

        const {
            assetId,
            assetType,
            transactionType,
            quantity,
            price,
            fees = 0,
            date,
            exchange,
            notes
        } = req.body;

        // Validate required fields
        if (!assetId || !assetType || !transactionType || quantity === undefined || price === undefined || !date) {
            return next(ApiError.validationError([{
                field: 'required_fields',
                message: 'Missing required fields: assetId, assetType, transactionType, quantity, price, date'
            }]));
        }

        // Get asset
        const asset = await PortfolioAsset.findOne({ _id: assetId, parentId });

        if (!asset) {
            return next(ApiError.notFoundError('Portfolio asset not found'));
        }

        // Create transaction
        const transactionData = {
            parentId,
            assetId,
            assetType: assetType.toUpperCase(),
            transactionType: transactionType.toUpperCase(),
            quantity: parseFloat(quantity),
            price: parseFloat(price),
            fees: parseFloat(fees),
            date: new Date(date),
            isActive: true
        };

        if (exchange) {
            transactionData.exchange = exchange.trim();
        }

        if (notes && notes.trim()) {
            transactionData.notes = notes.trim();
        }

        const newTransaction = await PortfolioTransaction.create(transactionData);

        // Update asset based on transaction type
        let newQuantity = asset.quantity;
        let newTotalInvested = asset.totalInvested;

        if (transactionType.toUpperCase() === 'BUY') {
            newQuantity += parseFloat(quantity);
            newTotalInvested += (parseFloat(quantity) * parseFloat(price) + parseFloat(fees));
        } else if (transactionType.toUpperCase() === 'SELL') {
            newQuantity -= parseFloat(quantity);
            // For sell, reduce total invested proportionally
            const sellValue = parseFloat(quantity) * parseFloat(price) - parseFloat(fees);
            const avgPrice = asset.totalInvested / asset.quantity;
            newTotalInvested -= (parseFloat(quantity) * avgPrice);
        }

        // Recalculate average buy price
        const newAverageBuyPrice = newQuantity > 0 ? (newTotalInvested / newQuantity) : 0;

        // Update asset
        await PortfolioAsset.findByIdAndUpdate(assetId, {
            quantity: newQuantity,
            averageBuyPrice: newAverageBuyPrice,
            totalInvested: newTotalInvested,
            currentValue: newQuantity * asset.currentPrice,
            profitLoss: (newQuantity * asset.currentPrice) - newTotalInvested,
            profitLossPercentage: newTotalInvested > 0 
                ? (((newQuantity * asset.currentPrice) - newTotalInvested) / newTotalInvested) * 100 
                : 0
        });

        return res.status(201).json(
            ApiResponse.created(newTransaction, "Portfolio transaction created successfully")
        );
    } catch (error) {
        console.error('Create transaction error:', error);
        return next(ApiError.internalError('Failed to create portfolio transaction'));
    }
};

/**
 * Get all transactions with pagination and filtering
 */
const getTransactions = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const {
            page = 1,
            limit = 50,
            assetId,
            assetType,
            transactionType,
            startDate,
            endDate,
            sortBy = 'date',
            sortOrder = 'desc'
        } = req.query;

        // Build filter object
        const filter = { parentId };

        if (assetId) {
            filter.assetId = assetId;
        }

        if (assetType) {
            filter.assetType = assetType.toUpperCase();
        }

        if (transactionType) {
            filter.transactionType = transactionType.toUpperCase();
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

        // Execute query
        const [transactions, totalCount] = await Promise.all([
            PortfolioTransaction.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            PortfolioTransaction.countDocuments(filter)
        ]);

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limit);
        const pagination = {
            currentPage: parseInt(page),
            totalPages,
            totalItems: totalCount,
            itemsPerPage: parseInt(limit),
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        };

        return res.status(200).json(
            ApiResponse.paginated(transactions, pagination, "Portfolio transactions retrieved successfully")
        );
    } catch (error) {
        console.error('Get transactions error:', error);
        return next(ApiError.internalError('Failed to retrieve portfolio transactions'));
    }
};

/**
 * Get single transaction by ID
 */
const getTransactionById = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const { transactionId } = req.params;

        const transaction = await PortfolioTransaction.findOne({ _id: transactionId, parentId });

        if (!transaction) {
            return next(ApiError.notFoundError('Portfolio transaction not found'));
        }

        return res.status(200).json(
            ApiResponse.success(transaction, "Portfolio transaction retrieved successfully")
        );
    } catch (error) {
        console.error('Get transaction error:', error);
        return next(ApiError.internalError('Failed to retrieve portfolio transaction'));
    }
};

/**
 * Update transaction
 */
const updateTransaction = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const { transactionId } = req.params;

        const transaction = await PortfolioTransaction.findOne({ _id: transactionId, parentId });

        if (!transaction) {
            return next(ApiError.notFoundError('Portfolio transaction not found'));
        }

        // Update transaction
        const updateData = { ...req.body };
        if (updateData.quantity !== undefined || updateData.price !== undefined) {
            updateData.totalAmount = (updateData.quantity || transaction.quantity) * (updateData.price || transaction.price);
        }

        const updatedTransaction = await PortfolioTransaction.findByIdAndUpdate(
            transactionId,
            updateData,
            { new: true, runValidators: true }
        );

        // Recalculate asset (simplified - in production, you might want to recalculate all transactions)
        const asset = await PortfolioAsset.findById(transaction.assetId);
        if (asset) {
            // Recalculate from all transactions
            const allTransactions = await PortfolioTransaction.find({ assetId: asset._id });
            let totalQuantity = 0;
            let totalInvested = 0;

            for (const txn of allTransactions) {
                if (txn.transactionType === 'BUY') {
                    totalQuantity += txn.quantity;
                    totalInvested += (txn.quantity * txn.price + (txn.fees || 0));
                } else if (txn.transactionType === 'SELL') {
                    totalQuantity -= txn.quantity;
                    const avgPrice = totalInvested / (totalQuantity + txn.quantity);
                    totalInvested -= (txn.quantity * avgPrice);
                }
            }

            const avgBuyPrice = totalQuantity > 0 ? (totalInvested / totalQuantity) : 0;

            await PortfolioAsset.findByIdAndUpdate(asset._id, {
                quantity: totalQuantity,
                averageBuyPrice: avgBuyPrice,
                totalInvested: totalInvested,
                currentValue: totalQuantity * asset.currentPrice,
                profitLoss: (totalQuantity * asset.currentPrice) - totalInvested,
                profitLossPercentage: totalInvested > 0 
                    ? (((totalQuantity * asset.currentPrice) - totalInvested) / totalInvested) * 100 
                    : 0
            });
        }

        return res.status(200).json(
            ApiResponse.updated(updatedTransaction, "Portfolio transaction updated successfully")
        );
    } catch (error) {
        console.error('Update transaction error:', error);
        return next(ApiError.internalError('Failed to update portfolio transaction'));
    }
};

/**
 * Delete transaction
 */
const deleteTransaction = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const { transactionId } = req.params;

        const transaction = await PortfolioTransaction.findOne({ _id: transactionId, parentId });

        if (!transaction) {
            return next(ApiError.notFoundError('Portfolio transaction not found'));
        }

        // Delete transaction
        await PortfolioTransaction.findByIdAndDelete(transactionId);

        // Recalculate asset
        const asset = await PortfolioAsset.findById(transaction.assetId);
        if (asset) {
            const allTransactions = await PortfolioTransaction.find({ assetId: asset._id });
            let totalQuantity = 0;
            let totalInvested = 0;

            for (const txn of allTransactions) {
                if (txn.transactionType === 'BUY') {
                    totalQuantity += txn.quantity;
                    totalInvested += (txn.quantity * txn.price + (txn.fees || 0));
                } else if (txn.transactionType === 'SELL') {
                    totalQuantity -= txn.quantity;
                    const avgPrice = totalInvested / (totalQuantity + txn.quantity);
                    totalInvested -= (txn.quantity * avgPrice);
                }
            }

            const avgBuyPrice = totalQuantity > 0 ? (totalInvested / totalQuantity) : 0;

            await PortfolioAsset.findByIdAndUpdate(asset._id, {
                quantity: totalQuantity,
                averageBuyPrice: avgBuyPrice,
                totalInvested: totalInvested,
                currentValue: totalQuantity * asset.currentPrice,
                profitLoss: (totalQuantity * asset.currentPrice) - totalInvested,
                profitLossPercentage: totalInvested > 0 
                    ? (((totalQuantity * asset.currentPrice) - totalInvested) / totalInvested) * 100 
                    : 0
            });
        }

        return res.status(200).json(
            ApiResponse.deleted("Portfolio transaction deleted successfully")
        );
    } catch (error) {
        console.error('Delete transaction error:', error);
        return next(ApiError.internalError('Failed to delete portfolio transaction'));
    }
};

/**
 * ============================================
 * SNAPSHOT MANAGEMENT
 * ============================================
 */

/**
 * Get portfolio snapshots
 */
const getSnapshots = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const {
            startDate,
            endDate,
            limit = 365
        } = req.query;

        // Build filter
        const filter = { parentId };

        if (startDate || endDate) {
            filter.snapshotDate = {};
            if (startDate) filter.snapshotDate.$gte = new Date(startDate);
            if (endDate) filter.snapshotDate.$lte = new Date(endDate);
        }

        // Get snapshots
        const snapshots = await PortfolioSnapshot.find(filter)
            .sort({ snapshotDate: -1 })
            .limit(parseInt(limit))
            .lean();

        return res.status(200).json(
            ApiResponse.success(snapshots, "Portfolio snapshots retrieved successfully")
        );
    } catch (error) {
        console.error('Get snapshots error:', error);
        return next(ApiError.internalError('Failed to retrieve portfolio snapshots'));
    }
};

/**
 * Create manual snapshot
 */
const createSnapshot = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;

        // Get all active assets
        const assets = await PortfolioAsset.find({ parentId, isActive: true }).lean();

        // Calculate totals
        let totalPortfolioValue = 0;
        let cryptoValue = 0;
        let stockValue = 0;
        let mutualFundValue = 0;
        let totalInvested = 0;
        const assetBreakdown = [];

        for (const asset of assets) {
            totalPortfolioValue += asset.currentValue;
            totalInvested += asset.totalInvested;

            if (asset.assetType === 'CRYPTO') {
                cryptoValue += asset.currentValue;
            } else if (asset.assetType === 'STOCK') {
                stockValue += asset.currentValue;
            } else if (asset.assetType === 'MUTUAL_FUND') {
                mutualFundValue += asset.currentValue;
            }

            assetBreakdown.push({
                assetId: asset._id,
                assetType: asset.assetType,
                symbol: asset.symbol,
                value: asset.currentValue,
                percentage: 0 // Will calculate after
            });
        }

        // Calculate percentages
        if (totalPortfolioValue > 0) {
            assetBreakdown.forEach(item => {
                item.percentage = (item.value / totalPortfolioValue) * 100;
            });
        }

        const totalProfitLoss = totalPortfolioValue - totalInvested;
        const totalProfitLossPercentage = totalInvested > 0 
            ? ((totalProfitLoss / totalInvested) * 100) 
            : 0;

        const snapshotData = {
            parentId,
            snapshotDate: new Date(),
            totalPortfolioValue,
            cryptoValue,
            stockValue,
            mutualFundValue,
            totalInvested,
            totalProfitLoss,
            totalProfitLossPercentage,
            assetBreakdown
        };

        const snapshot = await PortfolioSnapshot.create(snapshotData);

        return res.status(201).json(
            ApiResponse.created(snapshot, "Portfolio snapshot created successfully")
        );
    } catch (error) {
        console.error('Create snapshot error:', error);
        return next(ApiError.internalError('Failed to create portfolio snapshot'));
    }
};

/**
 * ============================================
 * OVERVIEW & ANALYTICS
 * ============================================
 */

/**
 * Get portfolio overview
 * NOTE: All values are stored canonically in INR on the backend.
 * For display, we also expose USD-equivalent values using a cached FX rate.
 */
const getOverview = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;

        // Get all active assets
        const assets = await PortfolioAsset.find({ parentId, isActive: true }).lean();

        // Calculate totals (INR)
        let totalPortfolioValue = 0;
        let cryptoValue = 0;
        let stockValue = 0;
        let mutualFundValue = 0;
        let totalInvested = 0;
        let totalProfitLoss = 0;
        const assetBreakdown = [];

        for (const asset of assets) {
            totalPortfolioValue += asset.currentValue;
            totalInvested += asset.totalInvested;
            totalProfitLoss += asset.profitLoss;

            if (asset.assetType === 'CRYPTO') {
                cryptoValue += asset.currentValue;
            } else if (asset.assetType === 'STOCK') {
                stockValue += asset.currentValue;
            } else if (asset.assetType === 'MUTUAL_FUND') {
                mutualFundValue += asset.currentValue;
            }

            assetBreakdown.push({
                assetId: asset._id,
                assetType: asset.assetType,
                symbol: asset.symbol,
                name: asset.name,
                value: asset.currentValue,
                percentage: 0,
                profitLoss: asset.profitLoss,
                profitLossPercentage: asset.profitLossPercentage
            });
        }

        // Calculate percentages
        if (totalPortfolioValue > 0) {
            assetBreakdown.forEach(item => {
                item.percentage = (item.value / totalPortfolioValue) * 100;
            });
        }

        const totalProfitLossPercentage = totalInvested > 0
            ? ((totalProfitLoss / totalInvested) * 100)
            : 0;

        // Attempt to fetch INR→USD FX rate for dual-currency display.
        // If the FX call fails, we still return INR values.
        let inrToUsdRate = null;
        let totalPortfolioValueUsd = null;
        let cryptoValueUsd = null;
        let stockValueUsd = null;
        let mutualFundValueUsd = null;
        let totalInvestedUsd = null;
        let totalProfitLossUsd = null;

        try {
            inrToUsdRate = await fetchInrToUsdRate();

            if (inrToUsdRate && !Number.isNaN(inrToUsdRate)) {
                totalPortfolioValueUsd = totalPortfolioValue * inrToUsdRate;
                cryptoValueUsd = cryptoValue * inrToUsdRate;
                stockValueUsd = stockValue * inrToUsdRate;
                mutualFundValueUsd = mutualFundValue * inrToUsdRate;
                totalInvestedUsd = totalInvested * inrToUsdRate;
                totalProfitLossUsd = totalProfitLoss * inrToUsdRate;
            }
        } catch (fxError) {
            console.error('Failed to fetch INR→USD FX rate for overview:', fxError.message);
        }

        const overview = {
            // Canonical INR values
            totalPortfolioValue,
            cryptoValue,
            stockValue,
            mutualFundValue,
            totalInvested,
            totalProfitLoss,
            totalProfitLossPercentage,
            assetBreakdown,
            totalAssets: assets.length,
            baseCurrency: 'INR',

            // FX + USD equivalents for dual-currency UI
            inrToUsdRate,
            totalPortfolioValueUsd,
            cryptoValueUsd,
            stockValueUsd,
            mutualFundValueUsd,
            totalInvestedUsd,
            totalProfitLossUsd
        };

        return res.status(200).json(
            ApiResponse.success(overview, "Portfolio overview retrieved successfully")
        );
    } catch (error) {
        console.error('Get overview error:', error);
        return next(ApiError.internalError('Failed to retrieve portfolio overview'));
    }
};

/**
 * Get analytics data for charts
 */
const getAnalytics = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;
        const {
            startDate,
            endDate = new Date().toISOString()
        } = req.query;

        // Default to last 1 year if no start date
        const defaultStartDate = new Date();
        defaultStartDate.setFullYear(defaultStartDate.getFullYear() - 1);
        const queryStartDate = startDate ? new Date(startDate) : defaultStartDate;

        // Get snapshots in date range
        const snapshots = await PortfolioSnapshot.find({
            parentId,
            snapshotDate: {
                $gte: queryStartDate,
                $lte: new Date(endDate)
            }
        })
        .sort({ snapshotDate: 1 })
        .lean();

        // Get current assets for comparison
        const assets = await PortfolioAsset.find({ parentId, isActive: true }).lean();

        // Calculate current totals
        let currentTotal = 0;
        let currentCrypto = 0;
        let currentStock = 0;
        let currentMutualFund = 0;
        let currentInvested = 0;

        for (const asset of assets) {
            currentTotal += asset.currentValue;
            currentInvested += asset.totalInvested;

            if (asset.assetType === 'CRYPTO') {
                currentCrypto += asset.currentValue;
            } else if (asset.assetType === 'STOCK') {
                currentStock += asset.currentValue;
            } else if (asset.assetType === 'MUTUAL_FUND') {
                currentMutualFund += asset.currentValue;
            }
        }

        // Format data for charts
        const growthData = snapshots.map(snapshot => ({
            date: snapshot.snapshotDate,
            value: snapshot.totalPortfolioValue,
            invested: snapshot.totalInvested,
            profitLoss: snapshot.totalProfitLoss
        }));

        // Add current data point
        growthData.push({
            date: new Date(),
            value: currentTotal,
            invested: currentInvested,
            profitLoss: currentTotal - currentInvested
        });

        // Calculate growth percentages
        const firstSnapshot = snapshots[0];
        const growthPercentage = firstSnapshot 
            ? ((currentTotal - firstSnapshot.totalPortfolioValue) / firstSnapshot.totalPortfolioValue) * 100
            : 0;

        const analytics = {
            growthData,
            currentTotal,
            currentCrypto,
            currentStock,
            currentMutualFund,
            currentInvested,
            growthPercentage,
            timeRange: {
                start: queryStartDate,
                end: new Date(endDate)
            }
        };

        return res.status(200).json(
            ApiResponse.success(analytics, "Portfolio analytics retrieved successfully")
        );
    } catch (error) {
        console.error('Get analytics error:', error);
        return next(ApiError.internalError('Failed to retrieve portfolio analytics'));
    }
};

/**
 * ============================================
 * PRICE UPDATES
 * ============================================
 */

/**
 * Batch update prices for all assets
 */
const updatePrices = async (req, res, next) => {
    try {
        const { _id: parentId } = req.body.user;

        // Get all active assets
        const assets = await PortfolioAsset.find({ parentId, isActive: true }).lean();

        if (assets.length === 0) {
            return res.status(200).json(
                ApiResponse.success({ updated: 0, failed: 0 }, "No assets to update")
            );
        }

        // Update prices using price service
        const { results, errors } = await batchUpdatePrices(assets);

        // Update assets in database
        const updatePromises = results.map(async (result) => {
            const asset = assets.find(a => (a._id.toString() === result.assetId.toString()));
            if (asset) {
                const currentValue = asset.quantity * result.price;
                const profitLoss = currentValue - asset.totalInvested;
                const profitLossPercentage = asset.totalInvested > 0 
                    ? ((profitLoss / asset.totalInvested) * 100) 
                    : 0;

                await PortfolioAsset.findByIdAndUpdate(result.assetId, {
                    currentPrice: result.price,
                    currentValue,
                    profitLoss,
                    profitLossPercentage
                });
            }
        });

        await Promise.all(updatePromises);

        return res.status(200).json(
            ApiResponse.success({
                updated: results.length,
                failed: errors.length,
                errors: errors.length > 0 ? errors : undefined
            }, "Prices updated successfully")
        );
    } catch (error) {
        console.error('Update prices error:', error);
        return next(ApiError.internalError('Failed to update prices'));
    }
};

module.exports = {
    // Asset management
    createAsset,
    getAssets,
    getAssetById,
    updateAsset,
    deleteAsset,
    
    // Transaction management
    createTransaction,
    getTransactions,
    getTransactionById,
    updateTransaction,
    deleteTransaction,
    
    // Snapshot management
    getSnapshots,
    createSnapshot,
    
    // Overview & Analytics
    getOverview,
    getAnalytics,
    
    // Price updates
    updatePrices
};

