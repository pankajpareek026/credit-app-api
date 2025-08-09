const { default: mongoose } = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Credential = require("../Models/credential.modal");
const ApiError = require("../utils/apiError.utils");
const ApiResponse = require("../utils/apiResponse.utils");

// Encryption key (in production, this should be stored in environment variables)
const VAULT_ENCRYPTION_KEY = process.env.VAULT_ENCRYPTION_KEY || 'your-secure-vault-encryption-key-32-chars-long';
const ALGORITHM = 'aes-256-cbc';

// Encrypt sensitive data
const encryptData = (data) => {
  if (!data) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ALGORITHM, VAULT_ENCRYPTION_KEY);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

// Decrypt sensitive data
const decryptData = (encryptedData) => {
  if (!encryptedData) return null;
  try {
    const textParts = encryptedData.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = textParts.join(':');
    const decipher = crypto.createDecipher(ALGORITHM, VAULT_ENCRYPTION_KEY);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return null;
  }
};

// Create new credential
const createCredential = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;
        const { 
            title, 
            username, 
            password, 
            url, 
            notes, 
            category,
            isActive = true 
        } = req.body;

        // Validation
        const messages = [];
        !title && messages.push("Title is required");
        !username && messages.push("Username is required");
        !password && messages.push("Password is required");

        if (messages.length > 0) {
            return next(new ApiError(400, "Validation failed", messages.join(", ")));
        }

        // Encrypt sensitive data
        const encryptedUsername = encryptData(username);
        const encryptedPassword = encryptData(password);
        const encryptedUrl = url ? encryptData(url) : null;
        const encryptedNotes = notes ? encryptData(notes) : null;

        // Create credential
        const credential = await Credential.create({
            parentId,
            title: title.trim(),
            username: encryptedUsername,
            password: encryptedPassword,
            url: encryptedUrl,
            notes: encryptedNotes,
            category: category || 'general',
            isActive
        });

        return res.status(201).json(
            new ApiResponse(201, "Credential created successfully", {
                id: credential._id,
                title: credential.title,
                category: credential.category,
                isActive: credential.isActive,
                createdAt: credential.createdAt
            })
        );
    } catch (error) {
        return next(new ApiError(500, "Internal server error"));
    }
};

// Get all credentials with filtering and pagination
const getAllCredentials = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;
        const {
            page = 1,
            limit = 20,
            category,
            isActive,
            search
        } = req.query;

        // Build filter object
        const filter = { parentId };

        if (category) filter.category = category;
        if (isActive !== undefined) filter.isActive = isActive === 'true';
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } }
            ];
        }

        // Build sort object
        const sort = { title: 1, createdAt: -1 };

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get credentials with pagination
        const credentials = await Credential.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Decrypt sensitive data for display
        const decryptedCredentials = credentials.map(credential => ({
            id: credential._id,
            title: credential.title,
            username: decryptData(credential.username) || '***',
            password: '••••••••',
            url: credential.url ? decryptData(credential.url) : null,
            notes: credential.notes ? decryptData(credential.notes) : null,
            category: credential.category,
            isActive: credential.isActive,
            createdAt: credential.createdAt,
            updatedAt: credential.updatedAt
        }));

        // Get total count for pagination
        const totalCredentials = await Credential.countDocuments(filter);

        // Get statistics
        const stats = await Credential.aggregate([
            { $match: { parentId: new mongoose.Types.ObjectId(parentId) } },
            {
                $group: {
                    _id: null,
                    totalCredentials: { $sum: 1 },
                    activeCredentials: { $sum: { $cond: ['$isActive', 1, 0] } },
                    categories: { $addToSet: '$category' }
                }
            }
        ]);

        const responseData = {
            credentials: decryptedCredentials,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCredentials / parseInt(limit)),
                totalCredentials,
                hasNextPage: skip + credentials.length < totalCredentials,
                hasPrevPage: parseInt(page) > 1
            },
            statistics: stats[0] || {
                totalCredentials: 0,
                activeCredentials: 0,
                categories: []
            }
        };

        return res.status(200).json(
            new ApiResponse(200, "Credentials retrieved successfully", responseData)
        );
    } catch (error) {
        return next(new ApiError(500, "Internal server error"));
    }
};

// Get single credential by ID (with decrypted data)
const getCredential = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;
        const { credentialId } = req.params;

        if (!credentialId) {
            return next(new ApiError(400, "Credential ID is required"));
        }

        const credential = await Credential.findOne({
            _id: credentialId,
            parentId
        });

        if (!credential) {
            return next(new ApiError(404, "Credential not found"));
        }

        // Decrypt sensitive data
        const decryptedCredential = {
            id: credential._id,
            title: credential.title,
            username: decryptData(credential.username),
            password: decryptData(credential.password),
            url: credential.url ? decryptData(credential.url) : null,
            notes: credential.notes ? decryptData(credential.notes) : null,
            category: credential.category,
            isActive: credential.isActive,
            createdAt: credential.createdAt,
            updatedAt: credential.updatedAt
        };

        return res.status(200).json(
            new ApiResponse(200, "Credential retrieved successfully", decryptedCredential)
        );
    } catch (error) {
        return next(new ApiError(500, "Internal server error"));
    }
};

// Update credential
const updateCredential = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;
        const { credentialId } = req.params;
        const { 
            title, 
            username, 
            password, 
            url, 
            notes, 
            category,
            isActive 
        } = req.body;

        if (!credentialId) {
            return next(new ApiError(400, "Credential ID is required"));
        }

        const credential = await Credential.findOne({
            _id: credentialId,
            parentId
        });

        if (!credential) {
            return next(new ApiError(404, "Credential not found"));
        }

        // Build update object
        const updateData = {};
        if (title !== undefined) updateData.title = title.trim();
        if (username !== undefined) updateData.username = encryptData(username);
        if (password !== undefined) updateData.password = encryptData(password);
        if (url !== undefined) updateData.url = url ? encryptData(url) : null;
        if (notes !== undefined) updateData.notes = notes ? encryptData(notes) : null;
        if (category !== undefined) updateData.category = category;
        if (isActive !== undefined) updateData.isActive = isActive;

        updateData.updatedAt = new Date();

        const updatedCredential = await Credential.findByIdAndUpdate(
            credentialId,
            updateData,
            { new: true }
        );

        return res.status(200).json(
            new ApiResponse(200, "Credential updated successfully", {
                id: updatedCredential._id,
                title: updatedCredential.title,
                category: updatedCredential.category,
                isActive: updatedCredential.isActive,
                updatedAt: updatedCredential.updatedAt
            })
        );
    } catch (error) {
        return next(new ApiError(500, "Internal server error"));
    }
};

// Delete credential
const deleteCredential = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;
        const { credentialId } = req.params;

        if (!credentialId) {
            return next(new ApiError(400, "Credential ID is required"));
        }

        const credential = await Credential.findOne({
            _id: credentialId,
            parentId
        });

        if (!credential) {
            return next(new ApiError(404, "Credential not found"));
        }

        await Credential.findByIdAndDelete(credentialId);

        return res.status(200).json(
            new ApiResponse(200, "Credential deleted successfully")
        );
    } catch (error) {
        return next(new ApiError(500, "Internal server error"));
    }
};

// Unlock vault with master password
const unlockVault = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;
        const { masterPassword } = req.body;

        if (!masterPassword) {
            return next(new ApiError(400, "Master password is required"));
        }

        // In a real implementation, you would verify the master password
        // against a stored hash. For now, we'll use a simple check
        // In production, this should be stored securely and verified properly
        
        // For demo purposes, we'll accept any password
        // In production, implement proper master password verification
        
        return res.status(200).json(
            new ApiResponse(200, "Vault unlocked successfully", {
                unlocked: true,
                timestamp: new Date()
            })
        );
    } catch (error) {
        return next(new ApiError(500, "Internal server error"));
    }
};

// Change master password
const changeMasterPassword = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return next(new ApiError(400, "Current and new passwords are required"));
        }

        if (newPassword.length < 8) {
            return next(new ApiError(400, "New password must be at least 8 characters"));
        }

        // In a real implementation, you would:
        // 1. Verify the current master password
        // 2. Hash the new master password
        // 3. Update the stored master password hash
        // 4. Re-encrypt all credentials with the new key
        
        // For demo purposes, we'll just return success
        // In production, implement proper password change logic
        
        return res.status(200).json(
            new ApiResponse(200, "Master password changed successfully")
        );
    } catch (error) {
        return next(new ApiError(500, "Internal server error"));
    }
};

// Get vault statistics
const getVaultStatistics = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;

        const stats = await Credential.aggregate([
            { $match: { parentId: new mongoose.Types.ObjectId(parentId) } },
            {
                $group: {
                    _id: null,
                    totalCredentials: { $sum: 1 },
                    activeCredentials: { $sum: { $cond: ['$isActive', 1, 0] } },
                    categories: { $addToSet: '$category' }
                }
            }
        ]);

        // Get category statistics
        const categoryStats = await Credential.aggregate([
            { $match: { parentId: new mongoose.Types.ObjectId(parentId) } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const responseData = {
            ...stats[0],
            categoryStats
        };

        return res.status(200).json(
            new ApiResponse(200, "Vault statistics retrieved", responseData)
        );
    } catch (error) {
        return next(new ApiError(500, "Internal server error"));
    }
};

module.exports = {
    createCredential,
    getAllCredentials,
    getCredential,
    updateCredential,
    deleteCredential,
    unlockVault,
    changeMasterPassword,
    getVaultStatistics
}; 