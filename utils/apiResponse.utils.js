class ApiResponse {
    constructor(
        isSuccess = true, 
        isError = false, 
        message = "Success", 
        data = null,
        pagination = null,
        metadata = null
    ) {
        this.isSuccess = isSuccess
        this.isError = isError
        this.responseData = data
        this.message = message
        this.pagination = pagination
        this.metadata = metadata
        this.timestamp = new Date().toISOString()
        this.requestId = null
    }

    /**
     * Set request ID
     * @param {string} requestId - Request ID
     * @returns {ApiResponse} This response instance
     */
    setRequestId(requestId) {
        this.requestId = requestId
        return this
    }

    /**
     * Add pagination information
     * @param {Object} pagination - Pagination object
     * @returns {ApiResponse} This response instance
     */
    setPagination(pagination) {
        this.pagination = {
            currentPage: pagination.currentPage || 1,
            totalPages: pagination.totalPages || 1,
            totalItems: pagination.totalItems || 0,
            itemsPerPage: pagination.itemsPerPage || 20,
            hasNextPage: pagination.hasNextPage || false,
            hasPrevPage: pagination.hasPrevPage || false
        }
        return this
    }

    /**
     * Add metadata information
     * @param {Object} metadata - Metadata object
     * @returns {ApiResponse} This response instance
     */
    setMetadata(metadata) {
        this.metadata = {
            ...this.metadata,
            ...metadata
        }
        return this
    }

    /**
     * Create success response
     * @param {any} data - Response data
     * @param {string} message - Success message
     * @returns {ApiResponse} Success response instance
     */
    static success(data = null, message = "Success") {
        return new ApiResponse(true, false, message, data)
    }

    /**
     * Create error response
     * @param {string} message - Error message
     * @param {any} data - Error data
     * @returns {ApiResponse} Error response instance
     */
    static error(message = "Error occurred", data = null) {
        return new ApiResponse(false, true, message, data)
    }

    /**
     * Create paginated response
     * @param {Array} data - Response data
     * @param {Object} pagination - Pagination information
     * @param {string} message - Success message
     * @returns {ApiResponse} Paginated response instance
     */
    static paginated(data, pagination, message = "Data retrieved successfully") {
        const response = new ApiResponse(true, false, message, data)
        return response.setPagination(pagination)
    }

    /**
     * Create list response
     * @param {Array} data - Response data
     * @param {number} total - Total count
     * @param {string} message - Success message
     * @returns {ApiResponse} List response instance
     */
    static list(data, total, message = "List retrieved successfully") {
        return new ApiResponse(true, false, message, data, {
            totalItems: total,
            currentPage: 1,
            totalPages: 1,
            itemsPerPage: data.length,
            hasNextPage: false,
            hasPrevPage: false
        })
    }

    /**
     * Create created response
     * @param {any} data - Created data
     * @param {string} message - Success message
     * @returns {ApiResponse} Created response instance
     */
    static created(data = null, message = "Resource created successfully") {
        return new ApiResponse(true, false, message, data)
    }

    /**
     * Create updated response
     * @param {any} data - Updated data
     * @param {string} message - Success message
     * @returns {ApiResponse} Updated response instance
     */
    static updated(data = null, message = "Resource updated successfully") {
        return new ApiResponse(true, false, message, data)
    }

    /**
     * Create deleted response
     * @param {string} message - Success message
     * @returns {ApiResponse} Deleted response instance
     */
    static deleted(message = "Resource deleted successfully") {
        return new ApiResponse(true, false, message, null)
    }

    /**
     * Get response object
     * @returns {Object} Formatted response object
     */
    toResponse() {
        const response = {
            isSuccess: this.isSuccess,
            isError: this.isError,
            message: this.message,
            responseData: this.responseData,
            timestamp: this.timestamp
        }

        if (this.pagination) {
            response.pagination = this.pagination
        }

        if (this.metadata) {
            response.metadata = this.metadata
        }

        if (this.requestId) {
            response.requestId = this.requestId
        }

        return response
    }
}

module.exports = ApiResponse