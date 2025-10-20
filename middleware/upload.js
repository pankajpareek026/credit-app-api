const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Ensure transaction-attachments subdirectory exists
const transactionAttachmentsDir = path.join(uploadsDir, 'transaction-attachments');
if (!fs.existsSync(transactionAttachmentsDir)) {
    fs.mkdirSync(transactionAttachmentsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, transactionAttachmentsDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp and original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        const fileName = `transaction-${uniqueSuffix}${fileExtension}`;
        cb(null, fileName);
    }
});

// File filter to allow only specific file types
const fileFilter = (req, file, cb) => {
    // Allowed file types
    const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images, PDFs, documents, and text files are allowed.'), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 5 // Maximum 5 files per request
    }
});

// Middleware for single file upload
const uploadSingle = upload.single('attachment');

// Middleware for multiple file uploads
const uploadMultiple = upload.array('attachments', 5);

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                isSuccess: false,
                message: 'File size too large. Maximum size is 10MB.',
                error: error.message
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                isSuccess: false,
                message: 'Too many files. Maximum 5 files allowed.',
                error: error.message
            });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                isSuccess: false,
                message: 'Unexpected file field.',
                error: error.message
            });
        }
    }

    if (error.message === 'Invalid file type. Only images, PDFs, documents, and text files are allowed.') {
        return res.status(400).json({
            isSuccess: false,
            message: error.message,
            error: error.message
        });
    }

    next(error);
};

module.exports = {
    uploadSingle,
    uploadMultiple,
    handleUploadError
};
