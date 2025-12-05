const Joi = require('joi');

/**
 * User Validation Schemas
 */
const userSchemas = {
    // Register user schema
    register: Joi.object({
        name: Joi.string()
            .min(5)
            .max(12)
            .required()
            .messages({
                'string.min': 'Name must be at least 5 characters long',
                'string.max': 'Name must not exceed 12 characters',
                'any.required': 'Name is required'
            }),
        email: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Please enter a valid email address',
                'any.required': 'Email is required'
            }),
        pass: Joi.string()
            .min(8)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .required()
            .messages({
                'string.min': 'Password must be at least 8 characters long',
                'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
                'any.required': 'Password is required'
            })
    }),

    // Login user schema
    login: Joi.object({
        email: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Please enter a valid email address',
                'any.required': 'Email is required'
            }),
        pass: Joi.string()
            .required()
            .messages({
                'any.required': 'Password is required'
            })
    }),

    // Update profile schema
    updateProfile: Joi.object({
        name: Joi.string()
            .min(5)
            .max(12)
            .optional()
            .messages({
                'string.min': 'Name must be at least 5 characters long',
                'string.max': 'Name must not exceed 12 characters'
            }),
        email: Joi.string()
            .email()
            .optional()
            .messages({
                'string.email': 'Please enter a valid email address'
            })
    })
};

/**
 * Client Validation Schemas
 */
const clientSchemas = {
    // Create client schema
    create: Joi.object({
        name: Joi.string()
            .min(2)
            .max(15)
            .required()
            .messages({
                'string.min': 'Client name must be at least 2 characters long',
                'string.max': 'Client name must not exceed 15 characters',
                'any.required': 'Client name is required'
            }),
        phoneNumber: Joi.string()
            .pattern(/^[\+]?[1-9][\d]{0,15}$/)
            .optional()
            .messages({
                'string.pattern.base': 'Please enter a valid phone number'
            }),
        email: Joi.string()
            .email()
            .optional()
            .messages({
                'string.email': 'Please enter a valid email address'
            }),
        notes: Joi.string()
            .max(200)
            .optional()
            .messages({
                'string.max': 'Notes must not exceed 200 characters'
            })
    }),

    // Update client schema
    update: Joi.object({
        newName: Joi.string()
            .min(2)
            .max(15)
            .required()
            .messages({
                'string.min': 'Client name must be at least 2 characters long',
                'string.max': 'Client name must not exceed 15 characters',
                'any.required': 'New client name is required'
            }),
        clientId: Joi.string()
            .required()
            .messages({
                'any.required': 'Client ID is required'
            }),
        currentName: Joi.string()
            .required()
            .messages({
                'any.required': 'Current client name is required'
            })
    }),

    // Search client schema
    search: Joi.object({
        query: Joi.string()
            .min(2)
            .max(50)
            .required()
            .messages({
                'string.min': 'Search query must be at least 2 characters long',
                'string.max': 'Search query must not exceed 50 characters',
                'any.required': 'Search query is required'
            })
    }),

    // Create client with transactions schema
    createWithTransactions: Joi.object({
        clientData: Joi.object({
            name: Joi.string()
                .min(2)
                .max(15)
                .required()
                .messages({
                    'string.min': 'Client name must be at least 2 characters long',
                    'string.max': 'Client name must not exceed 15 characters',
                    'any.required': 'Client name is required'
                }),
            phoneNumber: Joi.string()
                .pattern(/^[\+]?[1-9][\d]{0,15}$/)
                .optional()
                .messages({
                    'string.pattern.base': 'Please enter a valid phone number'
                }),
            email: Joi.string()
                .email()
                .optional()
                .messages({
                    'string.email': 'Please enter a valid email address'
                }),
            notes: Joi.string()
                .max(200)
                .optional()
                .messages({
                    'string.max': 'Notes must not exceed 200 characters'
                })
        }).required(),
        transactions: Joi.array().items(
            Joi.object({
                amount: Joi.number()
                    .required()
                    .messages({
                        'any.required': 'Transaction amount is required'
                    }),
                date: Joi.date()
                    .max('now')
                    .required()
                    .messages({
                        'date.max': 'Transaction date cannot be in the future',
                        'any.required': 'Transaction date is required'
                    }),
                dis: Joi.string()
                    .max(500)
                    .required()
                    .messages({
                        'string.max': 'Transaction description must not exceed 500 characters',
                        'any.required': 'Transaction description is required'
                    }),
                type: Joi.string()
                    .valid('IN', 'OUT')
                    .required()
                    .messages({
                        'any.only': 'Transaction type must be either IN or OUT',
                        'any.required': 'Transaction type is required'
                    })
            })
        ).optional()
    })
};

/**
 * Transaction Validation Schemas
 */
const transactionSchemas = {
    // Create transaction schema
    create: Joi.object({
        amount: Joi.number()
            .positive()
            .required()
            .messages({
                'number.base': 'Amount must be a valid number',
                'number.positive': 'Amount must be positive',
                'any.required': 'Amount is required'
            }),
        date: Joi.date()
            .max('now')
            .required()
            .messages({
                'date.base': 'Date must be a valid date',
                'date.max': 'Transaction date cannot be in the future',
                'any.required': 'Date is required'
            }),
        dis: Joi.string()
            .min(1)
            .max(500)
            .required()
            .messages({
                'string.min': 'Description must not be empty',
                'string.max': 'Description must not exceed 500 characters',
                'any.required': 'Description is required'
            }),
        type: Joi.string()
            .valid('IN', 'OUT')
            .required()
            .messages({
                'any.only': 'Type must be either IN or OUT',
                'any.required': 'Type is required'
            })
    }),

    // Update transaction schema
    update: Joi.object({
        tId: Joi.string()
            .required()
            .messages({
                'any.required': 'Transaction ID is required'
            }),
        amount: Joi.number()
            .positive()
            .required()
            .messages({
                'number.base': 'Amount must be a valid number',
                'number.positive': 'Amount must be positive',
                'any.required': 'Amount is required'
            }),
        date: Joi.date()
            .max('now')
            .required()
            .messages({
                'date.base': 'Date must be a valid date',
                'date.max': 'Transaction date cannot be in the future',
                'any.required': 'Date is required'
            }),
        dis: Joi.string()
            .min(1)
            .max(500)
            .required()
            .messages({
                'string.min': 'Description must not be empty',
                'string.max': 'Description must not exceed 500 characters',
                'any.required': 'Description is required'
            }),
        type: Joi.string()
            .valid('IN', 'OUT')
            .required()
            .messages({
                'any.only': 'Type must be either IN or OUT',
                'any.required': 'Type is required'
            })
    }),

    // Batch create transactions schema
    batchCreate: Joi.object({
        transactions: Joi.array()
            .items(
                Joi.object({
                    clientid: Joi.string()
                        .required()
                        .messages({
                            'any.required': 'Client ID is required'
                        }),
                    amount: Joi.number()
                        .positive()
                        .required()
                        .messages({
                            'number.base': 'Amount must be a valid number',
                            'number.positive': 'Amount must be positive',
                            'any.required': 'Amount is required'
                        }),
                    date: Joi.date()
                        .max('now')
                        .required()
                        .messages({
                            'date.base': 'Date must be a valid date',
                            'date.max': 'Transaction date cannot be in the future',
                            'any.required': 'Date is required'
                        }),
                    dis: Joi.string()
                        .min(1)
                        .max(500)
                        .required()
                        .messages({
                            'string.min': 'Description must not be empty',
                            'string.max': 'Description must not exceed 500 characters',
                            'any.required': 'Description is required'
                        }),
                    type: Joi.string()
                        .valid('IN', 'OUT')
                        .required()
                        .messages({
                            'any.only': 'Type must be either IN or OUT',
                            'any.required': 'Type is required'
                        })
                })
            )
            .min(1)
            .max(100)
            .required()
            .messages({
                'array.min': 'At least one transaction is required',
                'array.max': 'Maximum 100 transactions allowed per batch',
                'any.required': 'Transactions array is required'
            })
    }),

    // Get transaction statistics schema
    getStatistics: Joi.object({
        startDate: Joi.date()
            .optional()
            .messages({
                'date.base': 'Start date must be a valid date'
            }),
        endDate: Joi.date()
            .optional()
            .messages({
                'date.base': 'End date must be a valid date'
            }),
        clientId: Joi.string()
            .optional()
            .messages({
                'string.base': 'Client ID must be a string'
            })
    })
};

/**
 * Share Validation Schemas
 */
const shareSchemas = {
    // Generate share link schema
    generateLink: Joi.object({
        clientId: Joi.string()
            .required()
            .messages({
                'any.required': 'Client ID is required'
            })
    }),

    // Generate merged share link schema
    generateMergedLink: Joi.object({
        clientIds: Joi.array()
            .items(Joi.string())
            .min(2)
            .max(10)
            .required()
            .messages({
                'array.min': 'At least 2 client IDs are required',
                'array.max': 'Maximum 10 client IDs allowed',
                'any.required': 'Client IDs array is required'
            })
    }),

    // Delete share token schema
    deleteToken: Joi.object({
        shareid: Joi.string()
            .required()
            .messages({
                'any.required': 'Share ID is required'
            })
    })
};

/**
 * Note Validation Schemas
 */
const noteSchemas = {
    // Create note schema
    create: Joi.object({
        title: Joi.string()
            .min(1)
            .max(100)
            .required()
            .messages({
                'string.min': 'Title must not be empty',
                'string.max': 'Title must not exceed 100 characters',
                'any.required': 'Title is required'
            }),
        content: Joi.string()
            .min(1)
            .max(10000)
            .required()
            .messages({
                'string.min': 'Content must not be empty',
                'string.max': 'Content must not exceed 10000 characters',
                'any.required': 'Content is required'
            }),
        password: Joi.string()
            .min(4)
            .max(50)
            .optional()
            .messages({
                'string.min': 'Password must be at least 4 characters long',
                'string.max': 'Password must not exceed 50 characters'
            }),
        color: Joi.string()
            .valid('yellow', 'green', 'blue', 'pink', 'purple', 'orange', 'red', null)
            .optional()
            .messages({
                'any.only': 'Color must be one of the allowed values'
            }),
        tags: Joi.array()
            .items(
                Joi.string()
                    .min(1)
                    .max(20)
                    .messages({
                        'string.min': 'Tag must not be empty',
                        'string.max': 'Tag must not exceed 20 characters'
                    })
            )
            .optional()
            .messages({
                'array.base': 'Tags must be an array'
            }),
        category: Joi.string()
            .max(50)
            .optional()
            .messages({
                'string.max': 'Category must not exceed 50 characters'
            }),
        isPinned: Joi.boolean()
            .optional()
            .messages({
                'boolean.base': 'isPinned must be a boolean'
            })
    }),

    // Update note schema
    update: Joi.object({
        title: Joi.string()
            .min(1)
            .max(100)
            .optional()
            .messages({
                'string.min': 'Title must not be empty',
                'string.max': 'Title must not exceed 100 characters'
            }),
        content: Joi.string()
            .min(1)
            .max(10000)
            .optional()
            .messages({
                'string.min': 'Content must not be empty',
                'string.max': 'Content must not exceed 10000 characters'
            }),
        password: Joi.string()
            .min(4)
            .max(50)
            .optional()
            .messages({
                'string.min': 'Password must be at least 4 characters long',
                'string.max': 'Password must not exceed 50 characters'
            }),
        color: Joi.string()
            .valid('yellow', 'green', 'blue', 'pink', 'purple', 'orange', 'red', null)
            .optional()
            .messages({
                'any.only': 'Color must be one of the allowed values'
            }),
        tags: Joi.array()
            .items(
                Joi.string()
                    .min(1)
                    .max(20)
                    .messages({
                        'string.min': 'Tag must not be empty',
                        'string.max': 'Tag must not exceed 20 characters'
                    })
            )
            .optional()
            .messages({
                'array.base': 'Tags must be an array'
            }),
        category: Joi.string()
            .max(50)
            .optional()
            .messages({
                'string.max': 'Category must not exceed 50 characters'
            }),
        isPinned: Joi.boolean()
            .optional()
            .messages({
                'boolean.base': 'isPinned must be a boolean'
            }),
        isArchived: Joi.boolean()
            .optional()
            .messages({
                'boolean.base': 'isArchived must be a boolean'
            })
    }),

    // Lock note schema
    lock: Joi.object({
        password: Joi.string()
            .min(4)
            .max(50)
            .required()
            .messages({
                'string.min': 'Password must be at least 4 characters long',
                'string.max': 'Password must not exceed 50 characters',
                'any.required': 'Password is required'
            })
    }),

    // Unlock note schema
    unlock: Joi.object({
        password: Joi.string()
            .required()
            .messages({
                'any.required': 'Password is required'
            })
    }),

    // Get notes with filters schema
    getNotes: Joi.object({
        page: Joi.number()
            .integer()
            .min(1)
            .default(1)
            .messages({
                'number.base': 'Page must be a number',
                'number.integer': 'Page must be an integer',
                'number.min': 'Page must be at least 1'
            }),
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .default(20)
            .messages({
                'number.base': 'Limit must be a number',
                'number.integer': 'Limit must be an integer',
                'number.min': 'Limit must be at least 1',
                'number.max': 'Limit must not exceed 100'
            }),
        search: Joi.string()
            .min(2)
            .max(100)
            .optional()
            .messages({
                'string.min': 'Search term must be at least 2 characters long',
                'string.max': 'Search term must not exceed 100 characters'
            }),
        category: Joi.string()
            .max(50)
            .optional()
            .messages({
                'string.max': 'Category must not exceed 50 characters'
            }),
        isPinned: Joi.boolean()
            .optional()
            .messages({
                'boolean.base': 'isPinned must be a boolean'
            }),
        isLocked: Joi.boolean()
            .optional()
            .messages({
                'boolean.base': 'isLocked must be a boolean'
            }),
        isArchived: Joi.boolean()
            .optional()
            .messages({
                'boolean.base': 'isArchived must be a boolean'
            }),
        color: Joi.string()
            .valid('yellow', 'green', 'blue', 'pink', 'purple', 'orange', 'red')
            .optional()
            .messages({
                'any.only': 'Color must be one of the allowed values'
            }),
        sortBy: Joi.string()
            .valid('createdAt', 'updatedAt', 'title', 'category')
            .default('updatedAt')
            .messages({
                'any.only': 'sortBy must be one of the allowed values'
            }),
        sortOrder: Joi.string()
            .valid('asc', 'desc')
            .default('desc')
            .messages({
                'any.only': 'sortOrder must be either asc or desc'
            })
    })
};

/**
 * Bill Reminder Validation Schemas
 */
const billReminderSchemas = {
    // Create bill reminder schema
    create: Joi.object({
        provider: Joi.string()
            .min(1)
            .max(30)
            .required()
            .messages({
                'string.min': 'Provider must not be empty',
                'string.max': 'Provider must not exceed 30 characters',
                'any.required': 'Provider is required'
            }),
        amount: Joi.number()
            .positive()
            .required()
            .messages({
                'number.base': 'Amount must be a valid number',
                'number.positive': 'Amount must be positive',
                'any.required': 'Amount is required'
            }),
        remark: Joi.string()
            .max(200)
            .optional()
            .messages({
                'string.max': 'Remark must not exceed 200 characters'
            }),
        dueDate: Joi.date()
            .greater('now')
            .required()
            .messages({
                'date.base': 'Due date must be a valid date',
                'date.greater': 'Due date must be in the future',
                'any.required': 'Due date is required'
            }),
        category: Joi.string()
            .valid('UTILITIES', 'RENT', 'INSURANCE', 'SUBSCRIPTION', 'LOAN', 'CREDIT_CARD', 'OTHER')
            .default('OTHER')
            .messages({
                'any.only': 'Category must be one of the allowed values'
            }),
        isActive: Joi.boolean()
            .default(true)
            .messages({
                'boolean.base': 'isActive must be a boolean'
            })
    }),

    // Update bill reminder schema
    update: Joi.object({
        provider: Joi.string()
            .min(1)
            .max(30)
            .optional()
            .messages({
                'string.min': 'Provider must not be empty',
                'string.max': 'Provider must not exceed 30 characters'
            }),
        amount: Joi.number()
            .positive()
            .optional()
            .messages({
                'number.base': 'Amount must be a valid number',
                'number.positive': 'Amount must be positive'
            }),
        remark: Joi.string()
            .max(200)
            .optional()
            .messages({
                'string.max': 'Remark must not exceed 200 characters'
            }),
        dueDate: Joi.date()
            .greater('now')
            .optional()
            .messages({
                'date.base': 'Due date must be a valid date',
                'date.greater': 'Due date must be in the future'
            }),
        category: Joi.string()
            .valid('UTILITIES', 'RENT', 'INSURANCE', 'SUBSCRIPTION', 'LOAN', 'CREDIT_CARD', 'OTHER')
            .optional()
            .messages({
                'any.only': 'Category must be one of the allowed values'
            }),
        isActive: Joi.boolean()
            .optional()
            .messages({
                'boolean.base': 'isActive must be a boolean'
            }),
        isPaid: Joi.boolean()
            .optional()
            .messages({
                'boolean.base': 'isPaid must be a boolean'
            })
    }),

    // Snooze bill reminder schema
    snooze: Joi.object({
        days: Joi.number()
            .integer()
            .min(1)
            .max(30)
            .default(7)
            .messages({
                'number.base': 'Days must be a number',
                'number.integer': 'Days must be an integer',
                'number.min': 'Days must be at least 1',
                'number.max': 'Days must not exceed 30'
            })
    }),

    // Get bill reminders with filters schema
    getBillReminders: Joi.object({
        page: Joi.number()
            .integer()
            .min(1)
            .default(1)
            .messages({
                'number.base': 'Page must be a number',
                'number.integer': 'Page must be an integer',
                'number.min': 'Page must be at least 1'
            }),
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .default(20)
            .messages({
                'number.base': 'Limit must be a number',
                'number.integer': 'Limit must be an integer',
                'number.min': 'Limit must be at least 1',
                'number.max': 'Limit must not exceed 100'
            }),
        category: Joi.string()
            .valid('UTILITIES', 'RENT', 'INSURANCE', 'SUBSCRIPTION', 'LOAN', 'CREDIT_CARD', 'OTHER')
            .optional()
            .messages({
                'any.only': 'Category must be one of the allowed values'
            }),
        isActive: Joi.boolean()
            .optional()
            .messages({
                'boolean.base': 'isActive must be a boolean'
            }),
        isPaid: Joi.boolean()
            .optional()
            .messages({
                'boolean.base': 'isPaid must be a boolean'
            }),
        search: Joi.string()
            .min(2)
            .max(100)
            .optional()
            .messages({
                'string.min': 'Search term must be at least 2 characters long',
                'string.max': 'Search term must not exceed 100 characters'
            })
    })
};

/**
 * Vault Validation Schemas
 */
const vaultSchemas = {
    // Create credential schema
    createCredential: Joi.object({
        title: Joi.string()
            .min(1)
            .max(100)
            .required()
            .messages({
                'string.min': 'Title must not be empty',
                'string.max': 'Title must not exceed 100 characters',
                'any.required': 'Title is required'
            }),
        username: Joi.string()
            .min(1)
            .max(50)
            .required()
            .messages({
                'string.min': 'Username must not be empty',
                'string.max': 'Username must not exceed 50 characters',
                'any.required': 'Username is required'
            }),
        password: Joi.string()
            .min(8)
            .max(100)
            .required()
            .messages({
                'string.min': 'Password must be at least 8 characters long',
                'string.max': 'Password must not exceed 100 characters',
                'any.required': 'Password is required'
            }),
        url: Joi.string()
            .uri()
            .optional()
            .messages({
                'string.uri': 'URL must be a valid URI'
            }),
        notes: Joi.string()
            .max(1000)
            .optional()
            .messages({
                'string.max': 'Notes must not exceed 1000 characters'
            }),
        category: Joi.string()
            .max(50)
            .default('general')
            .messages({
                'string.max': 'Category must not exceed 50 characters'
            }),
        isActive: Joi.boolean()
            .default(true)
            .messages({
                'boolean.base': 'isActive must be a boolean'
            })
    }),

    // Update credential schema
    updateCredential: Joi.object({
        title: Joi.string()
            .min(1)
            .max(100)
            .optional()
            .messages({
                'string.min': 'Title must not be empty',
                'string.max': 'Title must not exceed 100 characters'
            }),
        username: Joi.string()
            .min(1)
            .max(50)
            .optional()
            .messages({
                'string.min': 'Username must not be empty',
                'string.max': 'Username must not exceed 50 characters'
            }),
        password: Joi.string()
            .min(8)
            .max(100)
            .optional()
            .messages({
                'string.min': 'Password must be at least 8 characters long',
                'string.max': 'Password must not exceed 100 characters'
            }),
        url: Joi.string()
            .uri()
            .optional()
            .messages({
                'string.uri': 'URL must be a valid URI'
            }),
        notes: Joi.string()
            .max(1000)
            .optional()
            .messages({
                'string.max': 'Notes must not exceed 1000 characters'
            }),
        category: Joi.string()
            .max(50)
            .optional()
            .messages({
                'string.max': 'Category must not exceed 50 characters'
            }),
        isActive: Joi.boolean()
            .optional()
            .messages({
                'boolean.base': 'isActive must be a boolean'
            })
    }),

    // Unlock vault schema
    unlockVault: Joi.object({
        masterPassword: Joi.string()
            .min(8)
            .max(100)
            .required()
            .messages({
                'string.min': 'Master password must be at least 8 characters long',
                'string.max': 'Master password must not exceed 100 characters',
                'any.required': 'Master password is required'
            })
    }),

    // Change master password schema
    changeMasterPassword: Joi.object({
        currentPassword: Joi.string()
            .required()
            .messages({
                'any.required': 'Current password is required'
            }),
        newPassword: Joi.string()
            .min(8)
            .max(100)
            .required()
            .messages({
                'string.min': 'New password must be at least 8 characters long',
                'string.max': 'New password must not exceed 100 characters',
                'any.required': 'New password is required'
            })
    }),

    // Get credentials with filters schema
    getCredentials: Joi.object({
        page: Joi.number()
            .integer()
            .min(1)
            .default(1)
            .messages({
                'number.base': 'Page must be a number',
                'number.integer': 'Page must be an integer',
                'number.min': 'Page must be at least 1'
            }),
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .default(20)
            .messages({
                'number.base': 'Limit must be a number',
                'number.integer': 'Limit must be an integer',
                'number.min': 'Limit must be at least 1',
                'number.max': 'Limit must not exceed 100'
            }),
        category: Joi.string()
            .max(50)
            .optional()
            .messages({
                'string.max': 'Category must not exceed 50 characters'
            }),
        isActive: Joi.boolean()
            .optional()
            .messages({
                'boolean.base': 'isActive must be a boolean'
            }),
        search: Joi.string()
            .min(2)
            .max(100)
            .optional()
            .messages({
                'string.min': 'Search term must be at least 2 characters long',
                'string.max': 'Search term must not exceed 100 characters'
            })
    })
};

/**
 * Expense Validation Schemas
 */
const expenseSchemas = {
    // Create expense schema
    create: Joi.object({
        title: Joi.string()
            .min(1)
            .max(100)
            .required()
            .messages({
                'string.min': 'Title must not be empty',
                'string.max': 'Title must not exceed 100 characters',
                'any.required': 'Title is required'
            }),
        amount: Joi.number()
            .positive()
            .required()
            .messages({
                'number.base': 'Amount must be a valid number',
                'number.positive': 'Amount must be positive',
                'any.required': 'Amount is required'
            }),
        date: Joi.date()
            .max('now')
            .required()
            .messages({
                'date.base': 'Date must be a valid date',
                'date.max': 'Expense date cannot be in the future',
                'any.required': 'Date is required'
            }),
        category: Joi.string()
            .valid('FOOD', 'TRANSPORT', 'BILLS', 'ENTERTAINMENT', 'HEALTH', 'SHOPPING', 'EDUCATION', 'INVESTMENT', 'OTHER')
            .default('OTHER')
            .messages({
                'any.only': 'Category must be one of the allowed values'
            }),
        paymentMethod: Joi.string()
            .valid('CASH', 'CARD', 'UPI', 'BANK', 'WALLET', 'OTHER')
            .default('CASH')
            .messages({
                'any.only': 'Payment method must be one of the allowed values'
            }),
        tags: Joi.array()
            .items(
                Joi.string()
                    .min(1)
                    .max(20)
                    .messages({
                        'string.min': 'Tag must not be empty',
                        'string.max': 'Tag must not exceed 20 characters'
                    })
            )
            .optional()
            .messages({
                'array.base': 'Tags must be an array'
            }),
        notes: Joi.string()
            .max(500)
            .optional()
            .messages({
                'string.max': 'Notes must not exceed 500 characters'
            })
    }),

    // Update expense schema
    update: Joi.object({
        title: Joi.string()
            .min(1)
            .max(100)
            .optional()
            .messages({
                'string.min': 'Title must not be empty',
                'string.max': 'Title must not exceed 100 characters'
            }),
        amount: Joi.number()
            .positive()
            .optional()
            .messages({
                'number.base': 'Amount must be a valid number',
                'number.positive': 'Amount must be positive'
            }),
        date: Joi.date()
            .max('now')
            .optional()
            .messages({
                'date.base': 'Date must be a valid date',
                'date.max': 'Expense date cannot be in the future'
            }),
        category: Joi.string()
            .valid('FOOD', 'TRANSPORT', 'BILLS', 'ENTERTAINMENT', 'HEALTH', 'SHOPPING', 'EDUCATION', 'INVESTMENT', 'OTHER')
            .optional()
            .messages({
                'any.only': 'Category must be one of the allowed values'
            }),
        paymentMethod: Joi.string()
            .valid('CASH', 'CARD', 'UPI', 'BANK', 'WALLET', 'OTHER')
            .optional()
            .messages({
                'any.only': 'Payment method must be one of the allowed values'
            }),
        tags: Joi.array()
            .items(
                Joi.string()
                    .min(1)
                    .max(20)
                    .messages({
                        'string.min': 'Tag must not be empty',
                        'string.max': 'Tag must not exceed 20 characters'
                    })
            )
            .optional()
            .messages({
                'array.base': 'Tags must be an array'
            }),
        notes: Joi.string()
            .max(500)
            .optional()
            .messages({
                'string.max': 'Notes must not exceed 500 characters'
            }),
        isActive: Joi.boolean()
            .optional()
            .messages({
                'boolean.base': 'isActive must be a boolean'
            })
    }),

    // Get expenses with filters schema
    getExpenses: Joi.object({
        page: Joi.number()
            .integer()
            .min(1)
            .default(1)
            .messages({
                'number.base': 'Page must be a number',
                'number.integer': 'Page must be an integer',
                'number.min': 'Page must be at least 1'
            }),
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .default(20)
            .messages({
                'number.base': 'Limit must be a number',
                'number.integer': 'Limit must be an integer',
                'number.min': 'Limit must be at least 1',
                'number.max': 'Limit must not exceed 100'
            }),
        search: Joi.string()
            .min(2)
            .max(100)
            .optional()
            .messages({
                'string.min': 'Search term must be at least 2 characters long',
                'string.max': 'Search term must not exceed 100 characters'
            }),
        category: Joi.string()
            .valid('FOOD', 'TRANSPORT', 'BILLS', 'ENTERTAINMENT', 'HEALTH', 'SHOPPING', 'EDUCATION', 'INVESTMENT', 'OTHER')
            .optional()
            .messages({
                'any.only': 'Category must be one of the allowed values'
            }),
        paymentMethod: Joi.string()
            .valid('CASH', 'CARD', 'UPI', 'BANK', 'WALLET', 'OTHER')
            .optional()
            .messages({
                'any.only': 'Payment method must be one of the allowed values'
            }),
        isActive: Joi.boolean()
            .optional()
            .messages({
                'boolean.base': 'isActive must be a boolean'
            }),
        startDate: Joi.date()
            .optional()
            .messages({
                'date.base': 'Start date must be a valid date'
            }),
        endDate: Joi.date()
            .optional()
            .messages({
                'date.base': 'End date must be a valid date'
            }),
        sortBy: Joi.string()
            .valid('date', 'amount', 'title', 'category', 'createdAt')
            .default('date')
            .messages({
                'any.only': 'sortBy must be one of the allowed values'
            }),
        sortOrder: Joi.string()
            .valid('asc', 'desc')
            .default('desc')
            .messages({
                'any.only': 'sortOrder must be either asc or desc'
            })
    }),

    // Get expense statistics schema
    getStatistics: Joi.object({
        startDate: Joi.date()
            .optional()
            .messages({
                'date.base': 'Start date must be a valid date'
            }),
        endDate: Joi.date()
            .optional()
            .messages({
                'date.base': 'End date must be a valid date'
            }),
        category: Joi.string()
            .valid('FOOD', 'TRANSPORT', 'BILLS', 'ENTERTAINMENT', 'HEALTH', 'SHOPPING', 'EDUCATION', 'INVESTMENT', 'OTHER')
            .optional()
            .messages({
                'any.only': 'Category must be one of the allowed values'
            }),
        paymentMethod: Joi.string()
            .valid('CASH', 'CARD', 'UPI', 'BANK', 'WALLET', 'OTHER')
            .optional()
            .messages({
                'any.only': 'Payment method must be one of the allowed values'
            })
    }),

    // Bulk create expenses schema
    bulkCreate: Joi.object({
        expenses: Joi.array()
            .items(
                Joi.object({
                    title: Joi.string()
                        .min(1)
                        .max(100)
                        .required()
                        .messages({
                            'string.min': 'Title must not be empty',
                            'string.max': 'Title must not exceed 100 characters',
                            'any.required': 'Title is required'
                        }),
                    amount: Joi.number()
                        .positive()
                        .required()
                        .messages({
                            'number.base': 'Amount must be a valid number',
                            'number.positive': 'Amount must be positive',
                            'any.required': 'Amount is required'
                        }),
                    date: Joi.date()
                        .max('now')
                        .required()
                        .messages({
                            'date.base': 'Date must be a valid date',
                            'date.max': 'Expense date cannot be in the future',
                            'any.required': 'Date is required'
                        }),
                    category: Joi.string()
                        .valid('FOOD', 'TRANSPORT', 'BILLS', 'ENTERTAINMENT', 'HEALTH', 'SHOPPING', 'EDUCATION', 'INVESTMENT', 'OTHER')
                        .default('OTHER')
                        .messages({
                            'any.only': 'Category must be one of the allowed values'
                        }),
                    paymentMethod: Joi.string()
                        .valid('CASH', 'CARD', 'UPI', 'BANK', 'WALLET', 'OTHER')
                        .default('CASH')
                        .messages({
                            'any.only': 'Payment method must be one of the allowed values'
                        }),
                    tags: Joi.array()
                        .items(
                            Joi.string()
                                .min(1)
                                .max(20)
                                .messages({
                                    'string.min': 'Tag must not be empty',
                                    'string.max': 'Tag must not exceed 20 characters'
                                })
                        )
                        .optional()
                        .messages({
                            'array.base': 'Tags must be an array'
                        }),
                    notes: Joi.string()
                        .max(500)
                        .optional()
                        .messages({
                            'string.max': 'Notes must not exceed 500 characters'
                        })
                })
            )
            .min(1)
            .max(100)
            .required()
            .messages({
                'array.min': 'At least one expense is required',
                'array.max': 'Maximum 100 expenses allowed per batch',
                'any.required': 'Expenses array is required'
            })
    })
};

/**
 * Budget Validation Schemas
 */
const budgetSchemas = {
    // Create budget schema
    create: Joi.object({
        title: Joi.string()
            .min(1)
            .max(100)
            .required()
            .messages({
                'string.min': 'Title must not be empty',
                'string.max': 'Title must not exceed 100 characters',
                'any.required': 'Title is required'
            }),
        allocatedAmount: Joi.number()
            .positive()
            .required()
            .messages({
                'number.base': 'Allocated amount must be a valid number',
                'number.positive': 'Allocated amount must be positive',
                'any.required': 'Allocated amount is required'
            }),
        spentAmount: Joi.number()
            .min(0)
            .default(0)
            .optional()
            .messages({
                'number.base': 'Spent amount must be a valid number',
                'number.min': 'Spent amount cannot be negative'
            }),
        category: Joi.string()
            .valid('FOOD', 'TRANSPORT', 'BILLS', 'ENTERTAINMENT', 'HEALTH', 'SHOPPING', 'EDUCATION', 'INVESTMENT', 'OTHER')
            .default('OTHER')
            .required()
            .messages({
                'any.only': 'Category must be one of the allowed values',
                'any.required': 'Category is required'
            }),
        period: Joi.string()
            .valid('MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM')
            .default('MONTHLY')
            .required()
            .messages({
                'any.only': 'Period must be one of the allowed values',
                'any.required': 'Period is required'
            }),
        startDate: Joi.date()
            .required()
            .messages({
                'date.base': 'Start date must be a valid date',
                'any.required': 'Start date is required'
            }),
        endDate: Joi.date()
            .greater(Joi.ref('startDate'))
            .required()
            .messages({
                'date.base': 'End date must be a valid date',
                'date.greater': 'End date must be after start date',
                'any.required': 'End date is required'
            }),
        isActive: Joi.boolean()
            .default(true)
            .optional()
            .messages({
                'boolean.base': 'isActive must be a boolean'
            })
    }),

    // Update budget schema
    update: Joi.object({
        title: Joi.string()
            .min(1)
            .max(100)
            .optional()
            .messages({
                'string.min': 'Title must not be empty',
                'string.max': 'Title must not exceed 100 characters'
            }),
        allocatedAmount: Joi.number()
            .positive()
            .optional()
            .messages({
                'number.base': 'Allocated amount must be a valid number',
                'number.positive': 'Allocated amount must be positive'
            }),
        spentAmount: Joi.number()
            .min(0)
            .optional()
            .messages({
                'number.base': 'Spent amount must be a valid number',
                'number.min': 'Spent amount cannot be negative'
            }),
        category: Joi.string()
            .valid('FOOD', 'TRANSPORT', 'BILLS', 'ENTERTAINMENT', 'HEALTH', 'SHOPPING', 'EDUCATION', 'INVESTMENT', 'OTHER')
            .optional()
            .messages({
                'any.only': 'Category must be one of the allowed values'
            }),
        period: Joi.string()
            .valid('MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM')
            .optional()
            .messages({
                'any.only': 'Period must be one of the allowed values'
            }),
        startDate: Joi.date()
            .optional()
            .messages({
                'date.base': 'Start date must be a valid date'
            }),
        endDate: Joi.date()
            .optional()
            .messages({
                'date.base': 'End date must be a valid date'
            }),
        isActive: Joi.boolean()
            .optional()
            .messages({
                'boolean.base': 'isActive must be a boolean'
            })
    }),

    // Get budgets with filters schema
    getBudgets: Joi.object({
        page: Joi.number()
            .integer()
            .min(1)
            .default(1)
            .messages({
                'number.base': 'Page must be a number',
                'number.integer': 'Page must be an integer',
                'number.min': 'Page must be at least 1'
            }),
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .default(20)
            .messages({
                'number.base': 'Limit must be a number',
                'number.integer': 'Limit must be an integer',
                'number.min': 'Limit must be at least 1',
                'number.max': 'Limit must not exceed 100'
            }),
        search: Joi.string()
            .min(1)
            .max(100)
            .optional()
            .messages({
                'string.min': 'Search term must be at least 1 character long',
                'string.max': 'Search term must not exceed 100 characters'
            }),
        category: Joi.string()
            .valid('FOOD', 'TRANSPORT', 'BILLS', 'ENTERTAINMENT', 'HEALTH', 'SHOPPING', 'EDUCATION', 'INVESTMENT', 'OTHER')
            .optional()
            .messages({
                'any.only': 'Category must be one of the allowed values'
            }),
        period: Joi.string()
            .valid('MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM')
            .optional()
            .messages({
                'any.only': 'Period must be one of the allowed values'
            }),
        isActive: Joi.boolean()
            .optional()
            .messages({
                'boolean.base': 'isActive must be a boolean'
            }),
        sortBy: Joi.string()
            .valid('createdAt', 'startDate', 'endDate', 'allocatedAmount', 'title')
            .default('createdAt')
            .messages({
                'any.only': 'sortBy must be one of the allowed values'
            }),
        sortOrder: Joi.string()
            .valid('asc', 'desc')
            .default('desc')
            .messages({
                'any.only': 'sortOrder must be either asc or desc'
            })
    }),

    // Get budget statistics schema
    getStatistics: Joi.object({
        startDate: Joi.date()
            .optional()
            .messages({
                'date.base': 'Start date must be a valid date'
            }),
        endDate: Joi.date()
            .optional()
            .messages({
                'date.base': 'End date must be a valid date'
            }),
        category: Joi.string()
            .valid('FOOD', 'TRANSPORT', 'BILLS', 'ENTERTAINMENT', 'HEALTH', 'SHOPPING', 'EDUCATION', 'INVESTMENT', 'OTHER')
            .optional()
            .messages({
                'any.only': 'Category must be one of the allowed values'
            })
    })
};

/**
 * Tasks Validation Schemas
 */
const tasksSchemas = {
    // Upsert entire tree (optional)
    upsertTree: Joi.object({
        mainLists: Joi.array().items(
            Joi.object({
                listId: Joi.string().optional(),
                name: Joi.string().min(1).max(100).required(),
                subLists: Joi.array().items(
                    Joi.object({
                        subListId: Joi.string().optional(),
                        name: Joi.string().min(1).max(100).required(),
                        tasks: Joi.array().items(
                            Joi.object({
                                taskId: Joi.string().optional(),
                                title: Joi.string().min(1).max(200).required(),
                                status: Joi.string().valid('Applied', 'Pending', 'Completed', 'In Progress').default('Pending'),
                                jobUrl: Joi.string().uri().allow(null, ''),
                                dueDate: Joi.date().allow(null),
                                notes: Joi.string().max(2000).allow(null, ''),
                                amount: Joi.number().positive().allow(null),
                                subtasks: Joi.array().items(
                                    Joi.object({
                                        subTaskId: Joi.string().optional(),
                                        title: Joi.string().min(1).max(200).required(),
                                        status: Joi.string().valid('Pending', 'Completed', 'In Progress').default('Pending'),
                                        dueDate: Joi.date().allow(null),
                                    })
                                ).default([])
                            })
                        ).default([])
                    })
                ).default([])
            })
        ).default([])
    }),

    // Create main list
    createMainList: Joi.object({
        name: Joi.string().min(1).max(100).required(),
    }),

    // Create sub-list
    createSubList: Joi.object({
        name: Joi.string().min(1).max(100).required(),
    }),

    // Create task
    createTask: Joi.object({
        title: Joi.string().min(1).max(200).required(),
        status: Joi.string().valid('Applied', 'Pending', 'Completed', 'In Progress').default('Pending'),
        jobUrl: Joi.string().uri().allow(null, ''),
        dueDate: Joi.date().allow(null),
        notes: Joi.string().max(2000).allow(null, ''),
        amount: Joi.number().positive().allow(null),
        subtasks: Joi.array().items(
            Joi.object({
                title: Joi.string().min(1).max(200).required(),
                status: Joi.string().valid('Pending', 'Completed', 'In Progress').default('Pending'),
                dueDate: Joi.date().allow(null),
            })
        ).default([])
    }),

    // Update task
    updateTask: Joi.object({
        title: Joi.string().min(1).max(200).optional(),
        status: Joi.string().valid('Applied', 'Pending', 'Completed', 'In Progress').optional(),
        jobUrl: Joi.string().uri().allow(null, ''),
        dueDate: Joi.date().allow(null),
        notes: Joi.string().max(2000).allow(null, ''),
        amount: Joi.number().positive().allow(null),
        subtasks: Joi.array().items(
            Joi.object({
                subTaskId: Joi.string().optional(),
                title: Joi.string().min(1).max(200).required(),
                status: Joi.string().valid('Pending', 'Completed', 'In Progress').default('Pending'),
                dueDate: Joi.date().allow(null),
            })
        ).optional()
    })
};

/**
 * OTP Validation Schemas
 */
const otpSchemas = {
    // Request OTP schema
    requestOtp: Joi.object({
        email: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Please enter a valid email address',
                'any.required': 'Email is required'
            }),
        purpose: Joi.string()
            .valid('login', 'password_reset')
            .required()
            .messages({
                'any.only': 'Purpose must be either "login" or "password_reset"',
                'any.required': 'Purpose is required'
            })
    }),

    // Verify OTP schema
    verifyOtp: Joi.object({
        email: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Please enter a valid email address',
                'any.required': 'Email is required'
            }),
        otp: Joi.string()
            .length(6)
            .pattern(/^\d+$/)
            .required()
            .messages({
                'string.length': 'OTP must be exactly 6 digits',
                'string.pattern.base': 'OTP must contain only numbers',
                'any.required': 'OTP is required'
            }),
        purpose: Joi.string()
            .valid('login', 'password_reset')
            .required()
            .messages({
                'any.only': 'Purpose must be either "login" or "password_reset"',
                'any.required': 'Purpose is required'
            })
    }),

    // Reset password schema
    resetPassword: Joi.object({
        email: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Please enter a valid email address',
                'any.required': 'Email is required'
            }),
        otp: Joi.string()
            .length(6)
            .pattern(/^\d+$/)
            .required()
            .messages({
                'string.length': 'OTP must be exactly 6 digits',
                'string.pattern.base': 'OTP must contain only numbers',
                'any.required': 'OTP is required'
            }),
        newPassword: Joi.string()
            .min(8)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .required()
            .messages({
                'string.min': 'Password must be at least 8 characters long',
                'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
                'any.required': 'New password is required'
            })
    })
};

/**
 * Portfolio Validation Schemas
 */
const portfolioSchemas = {
    // Create asset schema
    createAsset: Joi.object({
        assetType: Joi.string()
            .valid('CRYPTO', 'STOCK', 'MUTUAL_FUND')
            .required()
            .messages({
                'any.only': 'Asset type must be CRYPTO, STOCK, or MUTUAL_FUND',
                'any.required': 'Asset type is required'
            }),
        symbol: Joi.string()
            .trim()
            .max(50)
            .required()
            .messages({
                'string.max': 'Symbol must not exceed 50 characters',
                'any.required': 'Symbol is required'
            }),
        name: Joi.string()
            .trim()
            .max(200)
            .required()
            .messages({
                'string.max': 'Name must not exceed 200 characters',
                'any.required': 'Name is required'
            }),
        quantity: Joi.number()
            .min(0)
            .required()
            .messages({
                'number.min': 'Quantity must be greater than or equal to 0',
                'any.required': 'Quantity is required'
            }),
        averageBuyPrice: Joi.number()
            .min(0)
            .required()
            .messages({
                'number.min': 'Average buy price must be greater than or equal to 0',
                'any.required': 'Average buy price is required'
            }),
        currentPrice: Joi.number()
            .min(0)
            .optional()
            .messages({
                'number.min': 'Current price must be greater than or equal to 0'
            }),
        exchange: Joi.string()
            .trim()
            .max(50)
            .optional()
            .messages({
                'string.max': 'Exchange must not exceed 50 characters'
            }),
        notes: Joi.string()
            .trim()
            .max(500)
            .optional()
            .messages({
                'string.max': 'Notes must not exceed 500 characters'
            })
    }),

    // Update asset schema
    updateAsset: Joi.object({
        assetType: Joi.string()
            .valid('CRYPTO', 'STOCK', 'MUTUAL_FUND')
            .optional(),
        symbol: Joi.string()
            .trim()
            .max(50)
            .optional(),
        name: Joi.string()
            .trim()
            .max(200)
            .optional(),
        quantity: Joi.number()
            .min(0)
            .optional(),
        averageBuyPrice: Joi.number()
            .min(0)
            .optional(),
        currentPrice: Joi.number()
            .min(0)
            .optional(),
        exchange: Joi.string()
            .trim()
            .max(50)
            .optional(),
        notes: Joi.string()
            .trim()
            .max(500)
            .optional(),
        isActive: Joi.boolean()
            .optional()
    }),

    // Create transaction schema
    createTransaction: Joi.object({
        assetId: Joi.string()
            .required()
            .messages({
                'any.required': 'Asset ID is required'
            }),
        assetType: Joi.string()
            .valid('CRYPTO', 'STOCK', 'MUTUAL_FUND')
            .required()
            .messages({
                'any.only': 'Asset type must be CRYPTO, STOCK, or MUTUAL_FUND',
                'any.required': 'Asset type is required'
            }),
        transactionType: Joi.string()
            .valid('BUY', 'SELL', 'TRANSFER')
            .required()
            .messages({
                'any.only': 'Transaction type must be BUY, SELL, or TRANSFER',
                'any.required': 'Transaction type is required'
            }),
        quantity: Joi.number()
            .min(0)
            .required()
            .messages({
                'number.min': 'Quantity must be greater than or equal to 0',
                'any.required': 'Quantity is required'
            }),
        price: Joi.number()
            .min(0)
            .required()
            .messages({
                'number.min': 'Price must be greater than or equal to 0',
                'any.required': 'Price is required'
            }),
        fees: Joi.number()
            .min(0)
            .optional()
            .default(0)
            .messages({
                'number.min': 'Fees must be greater than or equal to 0'
            }),
        date: Joi.date()
            .required()
            .messages({
                'any.required': 'Date is required'
            }),
        exchange: Joi.string()
            .trim()
            .max(50)
            .optional(),
        notes: Joi.string()
            .trim()
            .max(500)
            .optional()
    }),

    // Update transaction schema
    updateTransaction: Joi.object({
        assetType: Joi.string()
            .valid('CRYPTO', 'STOCK', 'MUTUAL_FUND')
            .optional(),
        transactionType: Joi.string()
            .valid('BUY', 'SELL', 'TRANSFER')
            .optional(),
        quantity: Joi.number()
            .min(0)
            .optional(),
        price: Joi.number()
            .min(0)
            .optional(),
        fees: Joi.number()
            .min(0)
            .optional(),
        date: Joi.date()
            .optional(),
        exchange: Joi.string()
            .trim()
            .max(50)
            .optional(),
        notes: Joi.string()
            .trim()
            .max(500)
            .optional()
    }),

    // Get assets schema (query)
    getAssets: Joi.object({
        page: Joi.number()
            .integer()
            .min(1)
            .optional()
            .default(1),
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .optional()
            .default(50),
        assetType: Joi.string()
            .valid('CRYPTO', 'STOCK', 'MUTUAL_FUND')
            .optional(),
        search: Joi.string()
            .optional(),
        isActive: Joi.boolean()
            .optional()
            .default(true),
        sortBy: Joi.string()
            .valid('createdAt', 'symbol', 'name', 'currentValue', 'profitLoss')
            .optional()
            .default('createdAt'),
        sortOrder: Joi.string()
            .valid('asc', 'desc')
            .optional()
            .default('desc')
    }),

    // Get transactions schema (query)
    getTransactions: Joi.object({
        page: Joi.number()
            .integer()
            .min(1)
            .optional()
            .default(1),
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .optional()
            .default(50),
        assetId: Joi.string()
            .optional(),
        assetType: Joi.string()
            .valid('CRYPTO', 'STOCK', 'MUTUAL_FUND')
            .optional(),
        transactionType: Joi.string()
            .valid('BUY', 'SELL', 'TRANSFER')
            .optional(),
        startDate: Joi.date()
            .optional(),
        endDate: Joi.date()
            .optional(),
        sortBy: Joi.string()
            .valid('date', 'quantity', 'price', 'totalAmount')
            .optional()
            .default('date'),
        sortOrder: Joi.string()
            .valid('asc', 'desc')
            .optional()
            .default('desc')
    }),

    // Get snapshots schema (query)
    getSnapshots: Joi.object({
        startDate: Joi.date()
            .optional(),
        endDate: Joi.date()
            .optional(),
        limit: Joi.number()
            .integer()
            .min(1)
            .max(1000)
            .optional()
            .default(365)
    }),

    // Get analytics schema (query)
    getAnalytics: Joi.object({
        startDate: Joi.date()
            .optional(),
        endDate: Joi.date()
            .optional()
    })
};

/**
 * Budget Section Validation Schemas
 */
const budgetSectionSchemas = {
    // Create budget section schema
    create: Joi.object({
        title: Joi.string()
            .min(1)
            .max(100)
            .required()
            .messages({
                'string.min': 'Title must not be empty',
                'string.max': 'Title must not exceed 100 characters',
                'any.required': 'Title is required'
            }),
        description: Joi.string()
            .max(500)
            .allow('', null)
            .optional()
            .messages({
                'string.max': 'Description must not exceed 500 characters'
            }),
        startDate: Joi.date()
            .required()
            .messages({
                'date.base': 'Start date must be a valid date',
                'any.required': 'Start date is required'
            }),
        endDate: Joi.date()
            .greater(Joi.ref('startDate'))
            .required()
            .messages({
                'date.base': 'End date must be a valid date',
                'date.greater': 'End date must be after start date',
                'any.required': 'End date is required'
            }),
        targetBudget: Joi.number()
            .positive()
            .allow(null)
            .optional()
            .messages({
                'number.base': 'Target budget must be a valid number',
                'number.positive': 'Target budget must be positive'
            }),
        isActive: Joi.boolean()
            .default(true)
            .optional()
            .messages({
                'boolean.base': 'isActive must be a boolean'
            })
    }),

    // Update budget section schema
    update: Joi.object({
        title: Joi.string()
            .min(1)
            .max(100)
            .optional()
            .messages({
                'string.min': 'Title must not be empty',
                'string.max': 'Title must not exceed 100 characters'
            }),
        description: Joi.string()
            .max(500)
            .allow('', null)
            .optional()
            .messages({
                'string.max': 'Description must not exceed 500 characters'
            }),
        startDate: Joi.date()
            .optional()
            .messages({
                'date.base': 'Start date must be a valid date'
            }),
        endDate: Joi.date()
            .optional()
            .messages({
                'date.base': 'End date must be a valid date'
            }),
        targetBudget: Joi.number()
            .positive()
            .allow(null)
            .optional()
            .messages({
                'number.base': 'Target budget must be a valid number',
                'number.positive': 'Target budget must be positive'
            }),
        isActive: Joi.boolean()
            .optional()
            .messages({
                'boolean.base': 'isActive must be a boolean'
            })
    }),

    // Get budget sections with filters schema
    getAll: Joi.object({
        page: Joi.number()
            .integer()
            .min(1)
            .default(1)
            .messages({
                'number.base': 'Page must be a number',
                'number.integer': 'Page must be an integer',
                'number.min': 'Page must be at least 1'
            }),
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .default(20)
            .messages({
                'number.base': 'Limit must be a number',
                'number.integer': 'Limit must be an integer',
                'number.min': 'Limit must be at least 1',
                'number.max': 'Limit must not exceed 100'
            }),
        search: Joi.string()
            .min(1)
            .max(100)
            .optional()
            .messages({
                'string.min': 'Search term must be at least 1 character long',
                'string.max': 'Search term must not exceed 100 characters'
            }),
        isActive: Joi.boolean()
            .optional()
            .messages({
                'boolean.base': 'isActive must be a boolean'
            }),
        sortBy: Joi.string()
            .valid('createdAt', 'startDate', 'endDate', 'title')
            .default('createdAt')
            .messages({
                'any.only': 'sortBy must be one of the allowed values'
            }),
        sortOrder: Joi.string()
            .valid('asc', 'desc')
            .default('desc')
            .messages({
                'any.only': 'sortOrder must be either asc or desc'
            })
    })
};

/**
 * Income Validation Schemas
 */
const incomeSchemas = {
    // Create income schema
    create: Joi.object({
        budgetSectionId: Joi.string()
            .required()
            .messages({
                'string.base': 'Budget section ID must be a string',
                'any.required': 'Budget section ID is required'
            }),
        title: Joi.string()
            .min(1)
            .max(100)
            .required()
            .messages({
                'string.min': 'Title must not be empty',
                'string.max': 'Title must not exceed 100 characters',
                'any.required': 'Title is required'
            }),
        amount: Joi.number()
            .positive()
            .min(0.01)
            .required()
            .messages({
                'number.base': 'Amount must be a valid number',
                'number.positive': 'Amount must be positive',
                'number.min': 'Amount must be at least 0.01',
                'any.required': 'Amount is required'
            }),
        date: Joi.date()
            .required()
            .messages({
                'date.base': 'Date must be a valid date',
                'any.required': 'Date is required'
            }),
        description: Joi.string()
            .min(3)
            .max(500)
            .required()
            .messages({
                'string.min': 'Description must be at least 3 characters',
                'string.max': 'Description must not exceed 500 characters',
                'any.required': 'Description is required'
            }),
        sourceType: Joi.string()
            .valid('SALARY', 'GIFT', 'SAVINGS', 'LOAN', 'OTHER')
            .default('OTHER')
            .required()
            .messages({
                'any.only': 'Source type must be one of the allowed values',
                'any.required': 'Source type is required'
            }),
        notes: Joi.string()
            .max(1000)
            .allow('', null)
            .optional()
            .messages({
                'string.max': 'Notes must not exceed 1000 characters'
            }),
        isActive: Joi.boolean()
            .default(true)
            .optional()
            .messages({
                'boolean.base': 'isActive must be a boolean'
            })
    }),

    // Update income schema
    update: Joi.object({
        budgetSectionId: Joi.string()
            .optional()
            .messages({
                'string.base': 'Budget section ID must be a string'
            }),
        title: Joi.string()
            .min(1)
            .max(100)
            .optional()
            .messages({
                'string.min': 'Title must not be empty',
                'string.max': 'Title must not exceed 100 characters'
            }),
        amount: Joi.number()
            .positive()
            .min(0.01)
            .optional()
            .messages({
                'number.base': 'Amount must be a valid number',
                'number.positive': 'Amount must be positive',
                'number.min': 'Amount must be at least 0.01'
            }),
        date: Joi.date()
            .optional()
            .messages({
                'date.base': 'Date must be a valid date'
            }),
        description: Joi.string()
            .min(3)
            .max(500)
            .optional()
            .messages({
                'string.min': 'Description must be at least 3 characters',
                'string.max': 'Description must not exceed 500 characters'
            }),
        sourceType: Joi.string()
            .valid('SALARY', 'GIFT', 'SAVINGS', 'LOAN', 'OTHER')
            .optional()
            .messages({
                'any.only': 'Source type must be one of the allowed values'
            }),
        notes: Joi.string()
            .max(1000)
            .allow('', null)
            .optional()
            .messages({
                'string.max': 'Notes must not exceed 1000 characters'
            }),
        isActive: Joi.boolean()
            .optional()
            .messages({
                'boolean.base': 'isActive must be a boolean'
            })
    }),

    // Get incomes with filters schema
    getAll: Joi.object({
        page: Joi.number()
            .integer()
            .min(1)
            .default(1)
            .messages({
                'number.base': 'Page must be a number',
                'number.integer': 'Page must be an integer',
                'number.min': 'Page must be at least 1'
            }),
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .default(20)
            .messages({
                'number.base': 'Limit must be a number',
                'number.integer': 'Limit must be an integer',
                'number.min': 'Limit must be at least 1',
                'number.max': 'Limit must not exceed 100'
            }),
        search: Joi.string()
            .min(1)
            .max(100)
            .optional()
            .messages({
                'string.min': 'Search term must be at least 1 character long',
                'string.max': 'Search term must not exceed 100 characters'
            }),
        budgetSectionId: Joi.string()
            .optional()
            .messages({
                'string.base': 'Budget section ID must be a string'
            }),
        sourceType: Joi.string()
            .valid('SALARY', 'GIFT', 'SAVINGS', 'LOAN', 'OTHER')
            .optional()
            .messages({
                'any.only': 'Source type must be one of the allowed values'
            }),
        isActive: Joi.boolean()
            .optional()
            .messages({
                'boolean.base': 'isActive must be a boolean'
            }),
        sortBy: Joi.string()
            .valid('createdAt', 'date', 'amount', 'title')
            .default('date')
            .messages({
                'any.only': 'sortBy must be one of the allowed values'
            }),
        sortOrder: Joi.string()
            .valid('asc', 'desc')
            .default('desc')
            .messages({
                'any.only': 'sortOrder must be either asc or desc'
            })
    }),

    // Get income statistics schema
    getStatistics: Joi.object({
        budgetSectionId: Joi.string()
            .optional()
            .messages({
                'string.base': 'Budget section ID must be a string'
            }),
        startDate: Joi.date()
            .optional()
            .messages({
                'date.base': 'Start date must be a valid date'
            }),
        endDate: Joi.date()
            .optional()
            .messages({
                'date.base': 'End date must be a valid date'
            })
    })
};

module.exports = {
    budgetSectionSchemas,
    incomeSchemas,
    userSchemas,
    clientSchemas,
    transactionSchemas,
    shareSchemas,
    noteSchemas,
    billReminderSchemas,
    vaultSchemas,
    expenseSchemas,
    budgetSchemas,
    tasksSchemas,
    otpSchemas,
    portfolioSchemas
}; 