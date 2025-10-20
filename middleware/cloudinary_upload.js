const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: process.env.CLOUDINARY_FOLDER || 'credit-app/transactions',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv'],
        transformation: [
            // Auto-optimize images
            { quality: 'auto', fetch_format: 'auto' },
            // Limit file size (10MB)
            { flags: 'attachment' }
        ],
        resource_type: 'auto', // Automatically detect resource type
        use_filename: true,
        unique_filename: true,
    },
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

// Configure multer with Cloudinary storage
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

// Utility function to delete file from Cloudinary
const deleteFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error('Error deleting file from Cloudinary:', error);
        throw error;
    }
};

// Utility function to get file info from Cloudinary
const getFileInfo = async (publicId) => {
    try {
        const result = await cloudinary.api.resource(publicId);
        return result;
    } catch (error) {
        console.error('Error getting file info from Cloudinary:', error);
        throw error;
    }
};

module.exports = {
    uploadSingle,
    uploadMultiple,
    handleUploadError,
    deleteFromCloudinary,
    getFileInfo,
    cloudinary
};
