# Credit Management System - Backend Documentation

## Overview
This is a Node.js/Express.js backend API for a credit management system that allows users to manage clients, track transactions, and share transaction data with clients through secure links.

## Tech Stack

### Core Technologies
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Logging**: Winston
- **CORS**: Cross-Origin Resource Sharing enabled

### Dependencies
- `express`: Web framework
- `mongoose`: MongoDB ODM
- `jsonwebtoken`: JWT authentication
- `bcryptjs`: Password hashing
- `cookie-parser`: Cookie parsing middleware
- `cors`: Cross-origin resource sharing
- `dotenv`: Environment variable management
- `moment`: Date/time manipulation
- `winston`: Logging framework

## Project Structure

```
credit-API/
├── controllers/          # Business logic handlers
├── db/                  # Database configuration
├── middlewares/         # Express middlewares
├── Models/             # Mongoose schemas
├── routes/             # API route definitions
├── utils/              # Utility functions
├── index.js            # Application entry point
└── package.json        # Dependencies and scripts
```

## Core Features

### 1. Authentication System
- **Registration**: User registration with email/password validation
- **Login**: JWT-based authentication with cookie storage
- **Logout**: Session termination
- **Profile**: User profile management

### 2. Client Management
- **CRUD Operations**: Create, read, update, delete clients
- **Search**: Client search functionality
- **Balance Calculation**: Automatic balance calculation from transactions

### 3. Transaction Management
- **Transaction Types**: IN (received) and OUT (sent) transactions
- **CRUD Operations**: Full transaction lifecycle management
- **Search**: Transaction search by amount, description, or date
- **Balance Tracking**: Real-time balance calculation

### 4. Share System
- **Secure Links**: Time-limited share tokens for client access
- **Transaction Sharing**: Share transaction history with clients
- **Link Management**: Create and delete share links

## Database Models

### User Model (`user.modal.js`)
```javascript
{
  name: String (5-15 chars, required),
  email: String (unique, required),
  pass: String (min 8 chars, required),
  token: String (default: null)
}
```

### Client Model (`client.modal.js`)
```javascript
{
  parentId: String (required),
  name: String (max 15 chars, required),
  timestamps: true
}
```

### Transaction Model (`transaction.modal.js`)
```javascript
{
  clientId: ObjectId (ref: "client"),
  parentId: ObjectId (ref: "user"),
  amount: Number (required),
  date: Date (required),
  dis: String (required),
  type: String (required),
  timestamps: true
}
```

### Share Model (`share.modal.js`)
```javascript
{
  parentId: String (required),
  clientId: String (required),
  shareToken: String (required),
  clientName: String (required),
  expireTime: String (required)
}
```

## API Routes

### User Routes (`/`)
- `POST /login` - User authentication
- `POST /register` - User registration
- `POST /logout` - User logout (requires auth)
- `GET /userProfile` - Get user profile (requires auth)

### Client Routes (`/`)
- `POST /addClient` - Create new client (requires auth)
- `PUT /editClient` - Update client name (requires auth)
- `DELETE /deleteClient` - Delete client (requires auth)
- `GET /clients` - Get all clients (requires auth)
- `GET /search` - Search clients (requires auth)

### Transaction Routes (`/client/`)
- `POST /newTransaction` - Create transaction (requires auth)
- `GET /getTransactionDetail/:tId` - Get transaction details (requires auth)
- `PUT /editTransaction` - Update transaction (requires auth)
- `GET /transactions` - Get all transactions (requires auth)
- `GET /search` - Search transactions (requires auth)

### Share Routes (`/`)
- `POST /shareRequest/:value/:unit` - Generate share link (requires auth)
- `GET /share` - Access shared transactions (public)
- `DELETE /deleteSharedLink` - Delete share link (requires auth)

## Authentication & Security

### JWT Implementation
- **Token Generation**: Custom JWT generator with configurable expiration
- **Token Verification**: Secure token verification with error handling
- **Cookie Storage**: HTTP-only cookies for token storage
- **Session Management**: Automatic session expiration handling

### Security Features
- **Password Hashing**: bcryptjs with salt rounds
- **CORS Configuration**: Configurable cross-origin settings
- **Input Validation**: Comprehensive field validation
- **Error Handling**: Centralized error handling middleware

### Authentication Flow
1. User registers/logs in
2. JWT token generated and stored in HTTP-only cookie
3. Token verified on protected routes via middleware
4. User data attached to request body for controller access

## Response Format

### Success Response
```javascript
{
  isSuccess: true,
  isError: false,
  message: "Success message",
  responseData: data
}
```

### Error Response
```javascript
{
  isSuccess: false,
  isError: true,
  message: "Error message"
}
```

## Error Handling

### Custom Error Classes
- **ApiError**: Custom error class with status codes
- **ApiResponse**: Standardized response format
- **Global Error Handler**: Centralized error processing

### Error Types
- **Validation Errors**: Field validation failures
- **Authentication Errors**: JWT verification failures
- **Database Errors**: MongoDB operation failures
- **Business Logic Errors**: Application-specific errors

## Middleware Stack

### Core Middleware
1. **express.json()**: JSON body parsing
2. **cookieParser()**: Cookie parsing
3. **cors()**: Cross-origin resource sharing
4. **requestLogger**: Request logging and timing
5. **authy**: JWT authentication (for protected routes)
6. **errorHandler**: Global error handling

### Authentication Middleware (`auth.middleware.js`)
- JWT token extraction from headers/cookies
- Token verification and validation
- User data attachment to request
- Session expiration handling

## Environment Variables

### Required Environment Variables
- `MONGO_URL`: MongoDB connection string
- `CROSS_ORIGIN`: Allowed CORS origin
- `port`: Server port (default: 2205)
- `APP_STAGE`: Application stage (DEV/PROD)
- `jwt_key`: JWT secret key (deprecated, using hardcoded key)

### Security Note
⚠️ **CRITICAL**: The JWT private key is hardcoded in the source code, which is a major security vulnerability. This should be moved to environment variables immediately.

## Logging

### Winston Logger Configuration
- **Console Transport**: Development logging
- **File Transport**: Production logging to `combined.log`
- **Request Logging**: Request duration tracking
- **JSON Format**: Structured logging output

## Database Operations

### Mongoose Features
- **Schema Validation**: Built-in field validation
- **Timestamps**: Automatic created/updated timestamps
- **References**: Proper MongoDB relationships
- **Aggregation**: Complex queries for balance calculations

### Key Aggregations
- **Client Balance**: Sum of all transactions per client
- **Transaction History**: Detailed transaction listings
- **Search Operations**: Text and numeric search capabilities

## Business Logic

### Transaction Processing
- **Amount Handling**: Automatic sign conversion for OUT transactions
- **Balance Calculation**: Real-time balance updates
- **Type Validation**: IN/OUT transaction type enforcement

### Share Link System
- **Time-limited Tokens**: Configurable expiration times
- **Secure Access**: JWT-based share token verification
- **Client Isolation**: Data access restricted to specific client

### Data Validation
- **Field Requirements**: Comprehensive required field checking
- **Length Limits**: String length validation
- **Type Validation**: Data type enforcement
- **Business Rules**: Application-specific validation logic

## Performance Considerations

### Database Optimization
- **Indexing**: Proper MongoDB indexing for queries
- **Aggregation Pipeline**: Efficient data processing
- **Connection Pooling**: Mongoose connection management

### Security Optimizations
- **Input Sanitization**: Request data validation
- **Rate Limiting**: Not implemented (recommended addition)
- **SQL Injection Prevention**: Mongoose ODM protection

## Deployment

### Production Considerations
- **Environment Variables**: Secure configuration management
- **Logging**: Winston file logging for production
- **Error Handling**: Generic error messages in production
- **CORS Configuration**: Proper origin restrictions

### Development Setup
```bash
npm install
npm run dev  # Uses nodemon for development
```

### Production Setup
```bash
npm install
npm start    # Uses node for production
```

## API Documentation

### Authentication Endpoints

#### POST /login
**Purpose**: Authenticate user and create session
**Body**: `{ email: string, pass: string }`
**Response**: JWT token in cookie + user data

#### POST /register
**Purpose**: Create new user account
**Body**: `{ name: string, email: string, pass: string }`
**Validation**: Name (5-15 chars), Email (unique), Password (min 8 chars)

### Client Management Endpoints

#### POST /addClient
**Purpose**: Create new client
**Headers**: `token: JWT`
**Body**: `{ name: string }`
**Validation**: Name (max 15 chars)

#### GET /clients
**Purpose**: Get all clients with balance
**Headers**: `token: JWT`
**Response**: Array of clients with calculated balances

### Transaction Endpoints

#### POST /client/newTransaction
**Purpose**: Create new transaction
**Headers**: `token: JWT, clientid: string`
**Body**: `{ amount: number, date: string, dis: string, type: "IN"|"OUT" }`

#### GET /client/transactions
**Purpose**: Get all transactions for client
**Headers**: `token: JWT, clientid: string`
**Response**: Client data with transaction history and balance

### Share Endpoints

#### POST /shareRequest/:value/:unit
**Purpose**: Generate share link
**Headers**: `token: JWT`
**Body**: `{ clientId: string }`
**Params**: `value` (number), `unit` (time unit)
**Response**: Shareable URL with expiration

#### GET /share
**Purpose**: Access shared transactions
**Headers**: `sharetoken: string`
**Response**: Transaction history for shared client

## Security Recommendations

### Immediate Actions Required
1. **Move JWT Secret to Environment**: Remove hardcoded private key
2. **Implement Rate Limiting**: Prevent abuse
3. **Add Input Sanitization**: Enhanced validation
4. **Implement HTTPS**: Secure communication
5. **Add Request Size Limits**: Prevent large payload attacks

### Additional Security Measures
1. **API Key Management**: For external integrations
2. **Audit Logging**: Track sensitive operations
3. **Data Encryption**: Encrypt sensitive data at rest
4. **Regular Security Audits**: Ongoing security assessment

## Monitoring & Maintenance

### Health Checks
- Database connectivity monitoring
- API endpoint availability
- Response time tracking
- Error rate monitoring

### Backup Strategy
- Regular database backups
- Configuration backup
- Log file rotation
- Disaster recovery planning

## Future Enhancements

### Recommended Features
1. **User Roles**: Admin/User permission system
2. **Bulk Operations**: Batch transaction processing
3. **Export Functionality**: Data export capabilities
4. **Notification System**: Email/SMS notifications
5. **Analytics Dashboard**: Business intelligence features
6. **API Versioning**: Backward compatibility
7. **Caching Layer**: Redis integration
8. **Microservices Architecture**: Service decomposition 