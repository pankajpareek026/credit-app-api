const { default: mongoose } = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Note = require("../Models/note.modal");
const ApiError = require("../utils/apiError.utils");
const ApiResponse = require("../utils/apiResponse.utils");

// Encryption key (in production, this should be stored in environment variables)
const ENCRYPTION_KEY = process.env.NOTE_ENCRYPTION_KEY || 'your-secure-encryption-key-32-chars-long';
const ALGORITHM = 'aes-256-cbc';

// Encrypt text
const encryptText = (text) => {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

// Decrypt text
const decryptText = (encryptedText) => {
  if (!encryptedText) return null;
  try {
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedData = textParts.join(':');
    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return null;
  }
};

// Create new note
const createNote = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;
        const { title, content, password, color, tags, category, isPinned } = req.body;

        // Validation
        const messages = [];
        !title && messages.push("Title is required");
        !content && messages.push("Content is required");

        if (messages.length > 0) {
            return next(new ApiError(400, messages.join(", ")));
        }

        // Hash password if provided
        let hashedPassword = null;
        if (password && password.length > 0) {
            hashedPassword = await bcrypt.hash(password, 12);
        }

        // Encrypt content if password is provided
        let encryptedContent = content.trim();
        if (password && password.length > 0) {
            encryptedContent = encryptText(content.trim());
        }

        // Create note
        const note = await Note.create({
            parentId,
            title: title.trim(),
            content: encryptedContent,
            password: hashedPassword,
            isLocked: password && password.length > 0,
            color: color || null,
            tags: tags || [],
            category: category || null,
            isPinned: isPinned || false
        });

        return res.status(201).json(
            new ApiResponse(201, "Note created successfully", note)
        );
    } catch (error) {
        return next(new ApiError(500, "Internal server error"));
    }
};

// Get all notes with filtering and pagination
const getAllNotes = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;
        const {
            page = 1,
            limit = 20,
            search,
            category,
            isPinned,
            isLocked,
            isArchived,
            color,
            sortBy = 'updatedAt',
            sortOrder = 'desc'
        } = req.query;

        // Build filter object
        const filter = { parentId, isActive: true };

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        if (category) filter.category = category;
        if (isPinned !== undefined) filter.isPinned = isPinned === 'true';
        if (isLocked !== undefined) filter.isLocked = isLocked === 'true';
        if (isArchived !== undefined) filter.isArchived = isArchived === 'true';
        if (color) filter.color = color;

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get notes with pagination
        const notes = await Note.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Decrypt content for unlocked notes
        const decryptedNotes = notes.map(note => {
            if (!note.isLocked) {
                return {
                    ...note,
                    content: decryptText(note.content) || note.content
                };
            }
            return note;
        });

        // Get total count for pagination
        const totalNotes = await Note.countDocuments(filter);

        // Get statistics
        const stats = await Note.aggregate([
            { $match: { parentId: new mongoose.Types.ObjectId(parentId), isActive: true } },
            {
                $group: {
                    _id: null,
                    totalNotes: { $sum: 1 },
                    pinnedNotes: { $sum: { $cond: ['$isPinned', 1, 0] } },
                    lockedNotes: { $sum: { $cond: ['$isLocked', 1, 0] } },
                    archivedNotes: { $sum: { $cond: ['$isArchived', 1, 0] } },
                    totalWords: { $sum: '$wordCount' }
                }
            }
        ]);

        const responseData = {
            notes: decryptedNotes,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalNotes / parseInt(limit)),
                totalNotes,
                hasNextPage: skip + notes.length < totalNotes,
                hasPrevPage: parseInt(page) > 1
            },
            statistics: stats[0] || {
                totalNotes: 0,
                pinnedNotes: 0,
                lockedNotes: 0,
                archivedNotes: 0,
                totalWords: 0
            }
        };

        return res.status(200).json(
            new ApiResponse(200, "Notes retrieved successfully", responseData)
        );
    } catch (error) {
        return next(new ApiError(500, "Internal server error"));
    }
};

// Get single note by ID
const getNote = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;
        const { noteId } = req.params;

        if (!noteId) {
            return next(new ApiError(400, "Note ID is required"));
        }

        const note = await Note.findOne({
            _id: noteId,
            parentId,
            isActive: true
        });

        if (!note) {
            return next(new ApiError(404, "Note not found"));
        }

        return res.status(200).json(
            new ApiResponse(200, "Note retrieved successfully", note)
        );
    } catch (error) {
        return next(new ApiError(500, "Internal server error"));
    }
};

// Update note
const updateNote = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;
        const { noteId } = req.params;
        const { title, content, password, color, tags, category, isPinned, isArchived } = req.body;

        if (!noteId) {
            return next(new ApiError(400, "Note ID is required"));
        }

        // Check if note exists
        const existingNote = await Note.findOne({
            _id: noteId,
            parentId,
            isActive: true
        });

        if (!existingNote) {
            return next(new ApiError(404, "Note not found"));
        }

        // Build update object
        const updateData = {};
        if (title !== undefined) updateData.title = title.trim();
        if (content !== undefined) updateData.content = content.trim();
        if (password !== undefined) {
            updateData.password = password || null;
            updateData.isLocked = password && password.length > 0;
        }
        if (color !== undefined) updateData.color = color;
        if (tags !== undefined) updateData.tags = tags;
        if (category !== undefined) updateData.category = category;
        if (isPinned !== undefined) updateData.isPinned = isPinned;
        if (isArchived !== undefined) updateData.isArchived = isArchived;

        const updatedNote = await Note.findByIdAndUpdate(
            noteId,
            updateData,
            { new: true, runValidators: true }
        );

        return res.status(200).json(
            new ApiResponse(200, "Note updated successfully", updatedNote)
        );
    } catch (error) {
        return next(new ApiError(500, "Internal server error"));
    }
};

// Delete note (soft delete)
const deleteNote = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;
        const { noteId } = req.params;

        if (!noteId) {
            return next(new ApiError(400, "Note ID is required"));
        }

        const note = await Note.findOne({
            _id: noteId,
            parentId,
            isActive: true
        });

        if (!note) {
            return next(new ApiError(404, "Note not found"));
        }

        // Soft delete
        await Note.findByIdAndUpdate(noteId, { isActive: false });

        return res.status(200).json(
            new ApiResponse(200, "Note deleted successfully")
        );
    } catch (error) {
        return next(new ApiError(500, "Internal server error"));
    }
};

// Toggle note pin status
const togglePinNote = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;
        const { noteId } = req.params;

        if (!noteId) {
            return next(new ApiError(400, "Note ID is required"));
        }

        const note = await Note.findOne({
            _id: noteId,
            parentId,
            isActive: true
        });

        if (!note) {
            return next(new ApiError(404, "Note not found"));
        }

        const updatedNote = await Note.findByIdAndUpdate(
            noteId,
            { isPinned: !note.isPinned },
            { new: true }
        );

        return res.status(200).json(
            new ApiResponse(200, "Note pin status updated", updatedNote)
        );
    } catch (error) {
        return next(new ApiError(500, "Internal server error"));
    }
};

// Lock note with password
const lockNote = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;
        const { noteId } = req.params;
        const { password } = req.body;

        if (!noteId) {
            return next(new ApiError(400, "Note ID is required"));
        }

        if (!password || password.length < 4) {
            return next(new ApiError(400, "Password must be at least 4 characters"));
        }

        const note = await Note.findOne({
            _id: noteId,
            parentId,
            isActive: true
        });

        if (!note) {
            return next(new ApiError(404, "Note not found"));
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Encrypt content
        const encryptedContent = encryptText(note.content);

        // Update note
        note.password = hashedPassword;
        note.content = encryptedContent;
        note.isLocked = true;
        note.updatedAt = new Date();
        await note.save();

        return res.status(200).json(
            new ApiResponse(200, "Note locked successfully", {
                id: note._id,
                isLocked: true
            })
        );
    } catch (error) {
        return next(new ApiError(500, "Internal server error"));
    }
};

// Unlock note with password
const unlockNote = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;
        const { noteId } = req.params;
        const { password } = req.body;

        if (!noteId) {
            return next(new ApiError(400, "Note ID is required"));
        }

        if (!password) {
            return next(new ApiError(400, "Password is required"));
        }

        const note = await Note.findOne({
            _id: noteId,
            parentId,
            isActive: true
        });

        if (!note) {
            return next(new ApiError(404, "Note not found"));
        }

        if (!note.isLocked) {
            return next(new ApiError(400, "Note is not locked"));
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, note.password);
        if (!isPasswordValid) {
            return next(new ApiError(401, "Invalid password"));
        }

        // Decrypt content
        const decryptedContent = decryptText(note.content);

        // Update note
        note.password = null;
        note.content = decryptedContent;
        note.isLocked = false;
        note.updatedAt = new Date();
        await note.save();

        return res.status(200).json(
            new ApiResponse(200, "Note unlocked successfully", {
                id: note._id,
                content: decryptedContent,
                isLocked: false
            })
        );
    } catch (error) {
        return next(new ApiError(500, "Internal server error"));
    }
};

// Get note statistics
const getNoteStatistics = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;

        const stats = await Note.aggregate([
            { $match: { parentId: new mongoose.Types.ObjectId(parentId), isActive: true } },
            {
                $group: {
                    _id: null,
                    totalNotes: { $sum: 1 },
                    pinnedNotes: { $sum: { $cond: ['$isPinned', 1, 0] } },
                    lockedNotes: { $sum: { $cond: ['$isLocked', 1, 0] } },
                    archivedNotes: { $sum: { $cond: ['$isArchived', 1, 0] } },
                    totalWords: { $sum: '$wordCount' },
                    totalCharacters: { $sum: { $strLenCP: '$content' } }
                }
            }
        ]);

        // Get category statistics
        const categoryStats = await Note.aggregate([
            { $match: { parentId: new mongoose.Types.ObjectId(parentId), isActive: true } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Get color statistics
        const colorStats = await Note.aggregate([
            { $match: { parentId: new mongoose.Types.ObjectId(parentId), isActive: true } },
            { $group: { _id: '$color', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const responseData = {
            ...stats[0],
            categoryStats,
            colorStats
        };

        return res.status(200).json(
            new ApiResponse(200, "Note statistics retrieved", responseData)
        );
    } catch (error) {
        return next(new ApiError(500, "Internal server error"));
    }
};

// Search notes
const searchNotes = async (req, res, next) => {
    try {
        const parentId = req.body.user._id;
        const { query, page = 1, limit = 20 } = req.query;

        if (!query) {
            return next(new ApiError(400, "Search query is required"));
        }

        const filter = {
            parentId,
            isActive: true,
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { content: { $regex: query, $options: 'i' } },
                { tags: { $in: [new RegExp(query, 'i')] } }
            ]
        };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const notes = await Note.find(filter)
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const totalResults = await Note.countDocuments(filter);

        const responseData = {
            notes,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalResults / parseInt(limit)),
                totalResults,
                hasNextPage: skip + notes.length < totalResults,
                hasPrevPage: parseInt(page) > 1
            }
        };

        return res.status(200).json(
            new ApiResponse(200, "Search completed successfully", responseData)
        );
    } catch (error) {
        return next(new ApiError(500, "Internal server error"));
    }
};

module.exports = {
    createNote,
    getAllNotes,
    getNote,
    updateNote,
    deleteNote,
    togglePinNote,
    lockNote,
    unlockNote,
    getNoteStatistics,
    searchNotes
}; 