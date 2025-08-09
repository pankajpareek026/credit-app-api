# Backend Development Rules & Guidelines

## Core Development Principles

### 1. API Consistency
- **NEVER** break existing API functionality unless explicitly instructed
- **ALWAYS** maintain backward compatibility for all public endpoints
- **NEVER** change route paths, request payloads, or response structures without approval
- **ALWAYS** follow the established response format using `ApiResponse` and `ApiError` classes

### 2. Response Format Standards
```javascript
// Success Response - ALWAYS use this format
{
  isSuccess: true,
  isError: false,
  message: "Success message",
  responseData: data
}

// Error Response - ALWAYS use this format
{
  isSuccess: false,
  isError: true,
  message: "Error message"
}
```

### 3. Authentication & Security
- **NEVER** bypass the `authy` middleware for protected routes
- **ALWAYS** verify JWT tokens before accessing user data
- **NEVER** expose sensitive information in error messages
- **ALWAYS** use the existing JWT utilities (`jwtGenerator`, `jwtVerify`)
- **NEVER** hardcode secrets or sensitive data

### 4. Database Operations
- **ALWAYS** use Mongoose models for database operations
- **NEVER** write raw MongoDB queries
- **ALWAYS** handle database errors with try-catch blocks
- **NEVER** assume database operations will succeed
- **ALWAYS** validate data before database operations

### 5. Error Handling
- **ALWAYS** use the `ApiError` class for custom errors
- **NEVER** throw generic Error objects
- **ALWAYS** pass errors to the `next()` function in Express
- **NEVER** send error responses directly from controllers
- **ALWAYS** use the global error handler middleware

## File Structure Rules

### 1. Controllers (`/controllers/`)
- **ALWAYS** place business logic in controller files
- **NEVER** put route definitions in controllers
- **ALWAYS** use async/await for database operations
- **NEVER** forget to handle errors in try-catch blocks
- **ALWAYS** validate input data before processing

### 2. Models (`/Models/`)
- **ALWAYS** use Mongoose schemas for data validation
- **NEVER** modify existing model schemas without approval
- **ALWAYS** include proper field validation rules
- **NEVER** remove required fields from existing models
- **ALWAYS** use timestamps for audit trails

### 3. Routes (`/routes/`)
- **ALWAYS** define routes in separate route files
- **NEVER** put business logic in route files
- **ALWAYS** apply authentication middleware where required
- **NEVER** create routes without corresponding controllers
- **ALWAYS** use descriptive route names

### 4. Middleware (`/middlewares/`)
- **ALWAYS** create reusable middleware functions
- **NEVER** duplicate middleware logic across files
- **ALWAYS** handle errors in middleware properly
- **NEVER** modify the `authy` middleware without approval
- **ALWAYS** test middleware thoroughly

### 5. Utils (`/utils/`)
- **ALWAYS** keep utility functions pure and reusable
- **NEVER** modify existing utility functions without approval
- **ALWAYS** handle errors in utility functions
- **NEVER** add business logic to utility functions
- **ALWAYS** document complex utility functions

## Code Quality Standards

### 1. Naming Conventions
- **ALWAYS** use camelCase for variables and functions
- **ALWAYS** use PascalCase for classes and models
- **ALWAYS** use descriptive names that explain purpose
- **NEVER** use abbreviations unless universally understood
- **ALWAYS** be consistent with existing naming patterns

### 2. Code Organization
- **ALWAYS** group related functionality together
- **NEVER** mix concerns in single files
- **ALWAYS** use proper indentation and formatting
- **NEVER** leave commented-out code in production
- **ALWAYS** add comments for complex logic

### 3. Async/Await Usage
- **ALWAYS** use async/await for asynchronous operations
- **NEVER** use .then()/.catch() unless absolutely necessary
- **ALWAYS** handle promise rejections properly
- **NEVER** forget to await async operations
- **ALWAYS** use try-catch blocks for error handling

## Security Guidelines

### 1. Input Validation
- **ALWAYS** validate all input data
- **NEVER** trust user input
- **ALWAYS** sanitize data before database operations
- **NEVER** expose internal error details to clients
- **ALWAYS** use Mongoose validation schemas

### 2. Authentication
- **ALWAYS** verify JWT tokens on protected routes
- **NEVER** store sensitive data in client-side storage
- **ALWAYS** use HTTP-only cookies for tokens
- **NEVER** expose authentication logic
- **ALWAYS** implement proper session management

### 3. Data Protection
- **ALWAYS** hash passwords using bcryptjs
- **NEVER** store plain-text passwords
- **ALWAYS** use environment variables for secrets
- **NEVER** log sensitive information
- **ALWAYS** implement proper access controls

## Database Guidelines

### 1. Schema Design
- **ALWAYS** define proper field types and constraints
- **NEVER** modify existing schemas without migration plan
- **ALWAYS** use references for relationships
- **NEVER** store calculated fields unless necessary
- **ALWAYS** include timestamps for audit trails

### 2. Query Optimization
- **ALWAYS** use Mongoose aggregation for complex queries
- **NEVER** perform multiple database calls when one will suffice
- **ALWAYS** use proper indexing for frequently queried fields
- **NEVER** load unnecessary data
- **ALWAYS** paginate large result sets

### 3. Data Integrity
- **ALWAYS** validate data before saving
- **NEVER** assume data consistency
- **ALWAYS** handle database errors gracefully
- **NEVER** ignore database operation failures
- **ALWAYS** use transactions for critical operations

## Environment Configuration

### 1. Environment Variables
- **ALWAYS** use environment variables for configuration
- **NEVER** hardcode configuration values
- **ALWAYS** validate required environment variables
- **NEVER** commit .env files to version control
- **ALWAYS** provide .env.example files

### 2. Configuration Management
- **ALWAYS** use different configurations for different environments
- **NEVER** use production credentials in development
- **ALWAYS** validate configuration on startup
- **NEVER** expose configuration details in logs
- **ALWAYS** use secure configuration management

## Testing Guidelines

### 1. Code Testing
- **ALWAYS** test new functionality thoroughly
- **NEVER** deploy untested code
- **ALWAYS** test error scenarios
- **NEVER** assume code works without testing
- **ALWAYS** test edge cases

### 2. API Testing
- **ALWAYS** test all API endpoints
- **NEVER** skip authentication testing
- **ALWAYS** test with invalid data
- **NEVER** assume API responses are correct
- **ALWAYS** test performance under load

## Deployment Guidelines

### 1. Production Deployment
- **ALWAYS** use production environment variables
- **NEVER** deploy with development configurations
- **ALWAYS** monitor application health
- **NEVER** ignore production errors
- **ALWAYS** implement proper logging

### 2. Monitoring
- **ALWAYS** monitor application performance
- **NEVER** ignore error logs
- **ALWAYS** set up alerting for critical issues
- **NEVER** deploy without monitoring
- **ALWAYS** track API usage and performance

## Documentation Standards

### 1. Code Documentation
- **ALWAYS** document complex functions
- **NEVER** leave undocumented code
- **ALWAYS** update documentation with code changes
- **NEVER** assume code is self-documenting
- **ALWAYS** use clear and concise documentation

### 2. API Documentation
- **ALWAYS** document all API endpoints
- **NEVER** assume API usage is obvious
- **ALWAYS** include request/response examples
- **NEVER** skip error response documentation
- **ALWAYS** keep documentation up to date

## Performance Guidelines

### 1. Optimization
- **ALWAYS** optimize database queries
- **NEVER** perform unnecessary operations
- **ALWAYS** use caching where appropriate
- **NEVER** ignore performance issues
- **ALWAYS** monitor response times

### 2. Resource Management
- **ALWAYS** close database connections properly
- **NEVER** leak memory or resources
- **ALWAYS** implement proper cleanup
- **NEVER** ignore resource usage
- **ALWAYS** optimize for scalability

## Maintenance Guidelines

### 1. Code Maintenance
- **ALWAYS** keep dependencies updated
- **NEVER** ignore security vulnerabilities
- **ALWAYS** refactor code when necessary
- **NEVER** let technical debt accumulate
- **ALWAYS** follow best practices

### 2. System Maintenance
- **ALWAYS** backup data regularly
- **NEVER** skip maintenance windows
- **ALWAYS** test backup and recovery procedures
- **NEVER** ignore system warnings
- **ALWAYS** plan for disaster recovery

## Critical Security Rules

### 1. JWT Security
- **CRITICAL**: Move hardcoded JWT secret to environment variables
- **NEVER** use the hardcoded private key in production
- **ALWAYS** rotate JWT secrets regularly
- **NEVER** expose JWT secrets in logs or responses

### 2. Input Sanitization
- **ALWAYS** validate and sanitize all user inputs
- **NEVER** trust data from client requests
- **ALWAYS** use proper validation libraries
- **NEVER** skip input validation for any endpoint

### 3. Error Handling
- **ALWAYS** handle errors gracefully
- **NEVER** expose internal system details
- **ALWAYS** log errors for debugging
- **NEVER** send stack traces to clients

## Emergency Procedures

### 1. Security Incidents
- **IMMEDIATELY** revoke compromised tokens
- **ALWAYS** investigate security incidents thoroughly
- **NEVER** ignore security warnings
- **ALWAYS** document security incidents

### 2. System Failures
- **ALWAYS** have backup procedures ready
- **NEVER** panic during system failures
- **ALWAYS** communicate with stakeholders
- **NEVER** make hasty changes during incidents

## Compliance Requirements

### 1. Data Protection
- **ALWAYS** follow data protection regulations
- **NEVER** store unnecessary personal data
- **ALWAYS** implement proper data retention policies
- **NEVER** ignore privacy requirements

### 2. Audit Requirements
- **ALWAYS** maintain audit logs
- **NEVER** delete audit records
- **ALWAYS** track user actions
- **NEVER** ignore audit requirements

## Final Notes

### 1. Code Review
- **ALWAYS** review code before deployment
- **NEVER** skip code review process
- **ALWAYS** address review comments
- **NEVER** deploy without approval

### 2. Continuous Improvement
- **ALWAYS** learn from mistakes
- **NEVER** repeat known issues
- **ALWAYS** stay updated with best practices
- **NEVER** stop improving processes

### 3. Team Collaboration
- **ALWAYS** communicate with team members
- **NEVER** work in isolation
- **ALWAYS** share knowledge and best practices
- **NEVER** assume others understand your code

Remember: These rules are designed to maintain code quality, security, and consistency. Following them ensures the reliability and maintainability of the credit management system backend. 