# Enhanced API Documentation

## Overview
This document outlines the enhanced backend APIs that support the new Flutter mobile application features, including bill reminders, enhanced client management, and transaction auto-matching.

## Base URL
```
http://localhost:2205
```

## Authentication
All endpoints require authentication via JWT token in the request headers:
```
Authorization: Bearer <token>
```

---

## 1. Bill Reminders API

### Base Path: `/billReminders`

#### 1.1 Create Bill Reminder
**POST** `/billReminders/create`

**Request Body:**
```json
{
  "title": "Electricity Bill",
  "amount": 150.00,
  "dueDate": "2024-02-15T00:00:00.000Z",
  "provider": "Electric Company",
  "category": "UTILITIES",
  "notes": "Monthly electricity bill",
  "isRecurring": true,
  "recurringInterval": "MONTHLY",
  "reminderDate": "2024-02-10T00:00:00.000Z"
}
```

**Response:**
```json
{
  "isSuccess": true,
  "isError": false,
  "message": "Bill reminder created successfully",
  "responseData": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Electricity Bill",
    "amount": 150.00,
    "dueDate": "2024-02-15T00:00:00.000Z",
    "provider": "Electric Company",
    "category": "UTILITIES",
    "status": "PENDING",
    "isRecurring": true,
    "recurringInterval": "MONTHLY",
    "notes": "Monthly electricity bill",
    "reminderDate": "2024-02-10T00:00:00.000Z",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### 1.2 Get All Bill Reminders
**GET** `/billReminders/all`

**Query Parameters:**
- `status` (optional): Filter by status (PENDING, PAID, OVERDUE, SNOOZED)
- `category` (optional): Filter by category
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "isSuccess": true,
  "isError": false,
  "message": "Bill reminders retrieved successfully",
  "responseData": {
    "billReminders": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "hasNext": true,
      "hasPrev": false
    },
    "statistics": {
      "total": 2500.00,
      "pending": 1500.00,
      "overdue": 500.00,
      "paid": 500.00
    }
  }
}
```

#### 1.3 Get Single Bill Reminder
**GET** `/billReminders/:reminderId`

**Response:**
```json
{
  "isSuccess": true,
  "isError": false,
  "message": "Bill reminder retrieved successfully",
  "responseData": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Electricity Bill",
    "amount": 150.00,
    "dueDate": "2024-02-15T00:00:00.000Z",
    "provider": "Electric Company",
    "category": "UTILITIES",
    "status": "PENDING",
    "isRecurring": true,
    "recurringInterval": "MONTHLY",
    "notes": "Monthly electricity bill",
    "reminderDate": "2024-02-10T00:00:00.000Z",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### 1.4 Update Bill Reminder
**PUT** `/billReminders/:reminderId`

**Request Body:**
```json
{
  "title": "Updated Electricity Bill",
  "amount": 160.00,
  "dueDate": "2024-02-20T00:00:00.000Z",
  "provider": "Electric Company",
  "category": "UTILITIES",
  "notes": "Updated monthly electricity bill",
  "status": "PAID"
}
```

#### 1.5 Delete Bill Reminder
**DELETE** `/billReminders/:reminderId`

#### 1.6 Update Bill Reminder Status
**PATCH** `/billReminders/:reminderId/status`

**Request Body:**
```json
{
  "status": "PAID"
}
```

#### 1.7 Get Overdue Bill Reminders
**GET** `/billReminders/overdue`

#### 1.8 Get Upcoming Bill Reminders
**GET** `/billReminders/upcoming?days=7`

---

## 2. Enhanced Client Management API

### Base Path: `/client`

#### 2.1 Create Client with Transactions
**POST** `/client/createWithTransactions`

**Request Body:**
```json
{
  "clientData": {
    "name": "John Doe",
    "phoneNumber": "+1234567890",
    "email": "john@example.com",
    "notes": "Important client"
  },
  "transactions": [
    {
      "amount": 1000,
      "date": "2024-01-15T10:30:00.000Z",
      "dis": "Initial payment",
      "type": "IN"
    },
    {
      "amount": 500,
      "date": "2024-01-16T14:20:00.000Z",
      "dis": "Second payment",
      "type": "IN"
    }
  ]
}
```

**Response:**
```json
{
  "isSuccess": true,
  "isError": false,
  "message": "Client created successfully with transactions",
  "responseData": {
    "client": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "phoneNumber": "+1234567890",
      "email": "john@example.com",
      "notes": "Important client",
      "totalBalance": 1500,
      "lastTransactionDate": "2024-01-16T14:20:00.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "transactions": [...],
    "totalBalance": 1500
  }
}
```

#### 2.2 Auto-Match Transactions
**POST** `/client/autoMatchTransactions`

**Request Body:**
```json
{
  "transactions": [
    {
      "amount": 1000,
      "date": "2024-01-15T10:30:00.000Z",
      "dis": "Payment from John Doe",
      "type": "IN"
    },
    {
      "amount": 500,
      "date": "2024-01-16T14:20:00.000Z",
      "dis": "Payment from Jane Smith",
      "type": "IN"
    }
  ]
}
```

**Response:**
```json
{
  "isSuccess": true,
  "isError": false,
  "message": "Transaction matching completed",
  "responseData": {
    "matched": [
      {
        "client": {...},
        "transaction": {...}
      }
    ],
    "unmatched": [
      {
        "amount": 500,
        "date": "2024-01-16T14:20:00.000Z",
        "dis": "Payment from Unknown",
        "type": "IN"
      }
    ],
    "newClients": []
  }
}
```

#### 2.3 Get Client Statistics
**GET** `/client/statistics`

**Response:**
```json
{
  "isSuccess": true,
  "isError": false,
  "message": "Client statistics retrieved successfully",
  "responseData": {
    "totalClients": 25,
    "totalBalance": 50000,
    "averageBalance": 2000,
    "activeClients": 20
  }
}
```

#### 2.4 Enhanced Client Creation
**POST** `/client/addClient`

**Request Body:**
```json
{
  "name": "John Doe",
  "phoneNumber": "+1234567890",
  "email": "john@example.com",
  "notes": "Important client"
}
```

---

## 3. Enhanced Transaction Management API

### Base Path: `/client`

#### 3.1 Batch Create Transactions
**POST** `/client/batchTransactions`

**Request Body:**
```json
{
  "transactions": [
    {
      "clientid": "507f1f77bcf86cd799439011",
      "amount": 1000,
      "date": "2024-01-15T10:30:00.000Z",
      "dis": "Payment",
      "type": "IN"
    },
    {
      "clientid": "507f1f77bcf86cd799439012",
      "amount": 500,
      "date": "2024-01-16T14:20:00.000Z",
      "dis": "Payment",
      "type": "IN"
    }
  ]
}
```

**Response:**
```json
{
  "isSuccess": true,
  "isError": false,
  "message": "Batch transaction processing completed",
  "responseData": {
    "created": [...],
    "failed": [...],
    "totalAmount": 1500
  }
}
```

#### 3.2 Get Transaction Statistics
**GET** `/client/statistics?startDate=2024-01-01&endDate=2024-01-31&clientId=507f1f77bcf86cd799439011`

**Response:**
```json
{
  "isSuccess": true,
  "isError": false,
  "message": "Transaction statistics retrieved successfully",
  "responseData": {
    "totalTransactions": 150,
    "totalAmount": 50000,
    "averageAmount": 333.33,
    "maxAmount": 5000,
    "minAmount": 50,
    "creditTransactions": 100,
    "debitTransactions": 50,
    "creditAmount": 75000,
    "debitAmount": -25000
  }
}
```

#### 3.3 Bulk Update Transaction Visibility
**PATCH** `/client/bulkVisibility`

**Request Body:**
```json
{
  "transactionIds": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
  "isHidden": true
}
```

---

## 4. Data Models

### Bill Reminder Model
```javascript
{
  _id: ObjectId,
  parentId: ObjectId, // User ID
  title: String, // Required, max 50 chars
  amount: Number, // Required, positive
  dueDate: Date, // Required
  provider: String, // Required, max 30 chars
  category: String, // Enum: UTILITIES, RENT, INSURANCE, SUBSCRIPTION, LOAN, CREDIT_CARD, OTHER
  status: String, // Enum: PENDING, PAID, OVERDUE, SNOOZED
  isRecurring: Boolean, // Default: false
  recurringInterval: String, // Enum: MONTHLY, QUARTERLY, YEARLY
  notes: String, // Max 200 chars
  reminderDate: Date, // Required
  isActive: Boolean, // Default: true
  createdAt: Date,
  updatedAt: Date
}
```

### Enhanced Client Model
```javascript
{
  _id: ObjectId,
  parentId: String, // User ID
  name: String, // Required, max 15 chars
  phoneNumber: String, // Optional, validated
  email: String, // Optional, validated
  notes: String, // Max 200 chars
  isActive: Boolean, // Default: true
  lastTransactionDate: Date,
  totalBalance: Number, // Default: 0
  createdAt: Date,
  updatedAt: Date
}
```

---

## 5. Error Handling

All endpoints return consistent error responses:

```json
{
  "isSuccess": false,
  "isError": true,
  "message": "Error description",
  "responseData": null
}
```

Common HTTP Status Codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized
- `404`: Not Found
- `409`: Conflict (duplicate entry)
- `500`: Internal Server Error

---

## 6. Security Features

1. **JWT Authentication**: All endpoints require valid JWT tokens
2. **Input Validation**: Comprehensive validation for all inputs
3. **Data Sanitization**: All user inputs are sanitized
4. **Rate Limiting**: Implemented to prevent abuse
5. **Secure Storage**: Sensitive data encrypted in database
6. **CORS Protection**: Configured for specific origins

---

## 7. Performance Optimizations

1. **Database Indexing**: Optimized indexes for common queries
2. **Pagination**: All list endpoints support pagination
3. **Caching**: Implemented for frequently accessed data
4. **Batch Operations**: Support for bulk operations
5. **Query Optimization**: Efficient aggregation pipelines

---

## 8. Integration Examples

### Flutter Integration Example

```dart
// Create bill reminder
final response = await http.post(
  Uri.parse('$baseUrl/billReminders/create'),
  headers: {
    'Authorization': 'Bearer $token',
    'Content-Type': 'application/json',
  },
  body: jsonEncode({
    'title': 'Electricity Bill',
    'amount': 150.00,
    'dueDate': DateTime.now().add(Duration(days: 30)).toIso8601String(),
    'provider': 'Electric Company',
    'category': 'UTILITIES',
    'reminderDate': DateTime.now().add(Duration(days: 25)).toIso8601String(),
  }),
);

// Auto-match transactions
final response = await http.post(
  Uri.parse('$baseUrl/client/autoMatchTransactions'),
  headers: {
    'Authorization': 'Bearer $token',
    'Content-Type': 'application/json',
  },
  body: jsonEncode({
    'transactions': parsedTransactions,
  }),
);
```

---

## 9. Testing

### Test Endpoints
- **Health Check**: `GET /health`
- **API Status**: `GET /status`

### Sample Test Data
```json
{
  "billReminders": [
    {
      "title": "Electricity Bill",
      "amount": 150.00,
      "dueDate": "2024-02-15T00:00:00.000Z",
      "provider": "Electric Company",
      "category": "UTILITIES"
    }
  ],
  "clients": [
    {
      "name": "John Doe",
      "phoneNumber": "+1234567890",
      "email": "john@example.com"
    }
  ],
  "transactions": [
    {
      "amount": 1000,
      "date": "2024-01-15T10:30:00.000Z",
      "dis": "Payment",
      "type": "IN"
    }
  ]
}
```

---

## 10. Deployment

### Environment Variables
```env
PORT=2205
MONGODB_URI=mongodb://localhost:27017/credit_app
JWT_SECRET=your_jwt_secret
CROSS_ORIGIN=http://localhost:3000
```

### Production Considerations
1. **HTTPS**: All production endpoints should use HTTPS
2. **Load Balancing**: Implement for high traffic
3. **Monitoring**: Implement logging and monitoring
4. **Backup**: Regular database backups
5. **Security**: Regular security audits

---

This enhanced API provides comprehensive support for the Flutter mobile application's new features while maintaining backward compatibility with existing functionality. 