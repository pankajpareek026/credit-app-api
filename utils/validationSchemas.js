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

module.exports = {
    userSchemas,
    clientSchemas,
    transactionSchemas,
    shareSchemas,
    noteSchemas,
    billReminderSchemas,
    vaultSchemas,
    expenseSchemas,
    tasksSchemas
}; 