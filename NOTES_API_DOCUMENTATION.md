# Notes API Documentation

## Overview
This document outlines the Notes API endpoints that support the Flutter mobile application's Notes feature, including password protection, color coding, and advanced filtering capabilities.

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

## 1. Notes API

### Base Path: `/notes`

#### 1.1 Create Note
**POST** `/notes/create`

**Request Body:**
```json
{
  "title": "My Important Note",
  "content": "This is the content of my note with important information.",
  "password": "optional_password",
  "color": "yellow",
  "tags": ["important", "work", "meeting"],
  "category": "Work",
  "isPinned": false
}
```

**Response:**
```json
{
  "isSuccess": true,
  "isError": false,
  "message": "Note created successfully",
  "responseData": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "My Important Note",
    "content": "This is the content of my note with important information.",
    "password": "optional_password",
    "isLocked": true,
    "color": "yellow",
    "tags": ["important", "work", "meeting"],
    "category": "Work",
    "isPinned": false,
    "wordCount": 8,
    "isArchived": false,
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### 1.2 Get All Notes
**GET** `/notes/all`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search query for title, content, or tags
- `category` (optional): Filter by category
- `isPinned` (optional): Filter by pin status (true/false)
- `isLocked` (optional): Filter by lock status (true/false)
- `isArchived` (optional): Filter by archive status (true/false)
- `color` (optional): Filter by color
- `sortBy` (optional): Sort field (default: 'updatedAt')
- `sortOrder` (optional): Sort order (default: 'desc')

**Response:**
```json
{
  "isSuccess": true,
  "isError": false,
  "message": "Notes retrieved successfully",
  "responseData": {
    "notes": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "title": "My Important Note",
        "content": "This is the content of my note...",
        "password": null,
        "isLocked": false,
        "color": "yellow",
        "tags": ["important", "work"],
        "category": "Work",
        "isPinned": true,
        "wordCount": 8,
        "isArchived": false,
        "isActive": true,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalNotes": 100,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "statistics": {
      "totalNotes": 100,
      "pinnedNotes": 15,
      "lockedNotes": 8,
      "archivedNotes": 3,
      "totalWords": 2500
    }
  }
}
```

#### 1.3 Get Single Note
**GET** `/notes/:noteId`

**Response:**
```json
{
  "isSuccess": true,
  "isError": false,
  "message": "Note retrieved successfully",
  "responseData": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "My Important Note",
    "content": "This is the content of my note...",
    "password": "optional_password",
    "isLocked": true,
    "color": "yellow",
    "tags": ["important", "work"],
    "category": "Work",
    "isPinned": true,
    "wordCount": 8,
    "isArchived": false,
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### 1.4 Update Note
**PUT** `/notes/:noteId`

**Request Body:**
```json
{
  "title": "Updated Note Title",
  "content": "Updated content with new information.",
  "password": "new_password",
  "color": "blue",
  "tags": ["updated", "important"],
  "category": "Personal",
  "isPinned": true,
  "isArchived": false
}
```

**Response:**
```json
{
  "isSuccess": true,
  "isError": false,
  "message": "Note updated successfully",
  "responseData": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Updated Note Title",
    "content": "Updated content with new information.",
    "password": "new_password",
    "isLocked": true,
    "color": "blue",
    "tags": ["updated", "important"],
    "category": "Personal",
    "isPinned": true,
    "wordCount": 6,
    "isArchived": false,
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T11:45:00.000Z"
  }
}
```

#### 1.5 Delete Note
**DELETE** `/notes/:noteId`

**Response:**
```json
{
  "isSuccess": true,
  "isError": false,
  "message": "Note deleted successfully"
}
```

#### 1.6 Toggle Pin Status
**PATCH** `/notes/:noteId/pin`

**Response:**
```json
{
  "isSuccess": true,
  "isError": false,
  "message": "Note pin status updated",
  "responseData": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "My Important Note",
    "content": "This is the content of my note...",
    "isPinned": true,
    "updatedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

#### 1.7 Get Note Statistics
**GET** `/notes/statistics`

**Response:**
```json
{
  "isSuccess": true,
  "isError": false,
  "message": "Note statistics retrieved",
  "responseData": {
    "totalNotes": 100,
    "pinnedNotes": 15,
    "lockedNotes": 8,
    "archivedNotes": 3,
    "totalWords": 2500,
    "totalCharacters": 15000,
    "categoryStats": [
      {
        "_id": "Work",
        "count": 45
      },
      {
        "_id": "Personal",
        "count": 30
      },
      {
        "_id": "Ideas",
        "count": 25
      }
    ],
    "colorStats": [
      {
        "_id": "yellow",
        "count": 20
      },
      {
        "_id": "blue",
        "count": 15
      },
      {
        "_id": null,
        "count": 65
      }
    ]
  }
}
```

#### 1.8 Search Notes
**GET** `/notes/search`

**Query Parameters:**
- `query` (required): Search query
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "isSuccess": true,
  "isError": false,
  "message": "Search completed successfully",
  "responseData": {
    "notes": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "title": "Meeting Notes",
        "content": "Important meeting discussion...",
        "tags": ["meeting", "important"],
        "isPinned": true
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalResults": 25,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

## 2. Data Models

### Note Schema
```javascript
{
  parentId: ObjectId,        // Reference to user
  title: String,             // Required, max 100 chars
  content: String,           // Required, max 10000 chars
  password: String,          // Optional, for locked notes
  isLocked: Boolean,         // Auto-calculated based on password
  color: String,             // Enum: yellow, green, blue, pink, purple, orange, red, null
  tags: [String],            // Array of tags, max 20 chars each
  isPinned: Boolean,         // Default: false
  category: String,          // Optional, max 50 chars
  wordCount: Number,         // Auto-calculated
  isArchived: Boolean,       // Default: false
  isActive: Boolean,         // Default: true (for soft delete)
  createdAt: Date,           // Auto-generated
  updatedAt: Date            // Auto-updated
}
```

---

## 3. Features

### 3.1 Password Protection
- Notes can be protected with passwords
- When a password is set, `isLocked` is automatically set to `true`
- Password-protected notes require authentication to view/edit
- Passwords are stored securely in the database

### 3.2 Color Coding
- Notes can be assigned colors for visual organization
- Available colors: yellow, green, blue, pink, purple, orange, red
- Color filtering is supported in the API

### 3.3 Advanced Filtering
- Filter by category, pin status, lock status, archive status
- Search across title, content, and tags
- Pagination support for large datasets
- Multiple sorting options

### 3.4 Statistics
- Comprehensive statistics including word counts, character counts
- Category and color distribution analysis
- Real-time statistics updates

---

## 4. Error Handling

### Common Error Responses

**400 Bad Request:**
```json
{
  "isSuccess": false,
  "isError": true,
  "message": "Title is required, Content is required"
}
```

**404 Not Found:**
```json
{
  "isSuccess": false,
  "isError": true,
  "message": "Note not found"
}
```

**500 Internal Server Error:**
```json
{
  "isSuccess": false,
  "isError": true,
  "message": "Internal server error"
}
```

---

## 5. Integration Examples

### 5.1 Flutter Integration
```dart
// Create a new note
final response = await apiService.post('/notes/create', {
  'title': 'My Note',
  'content': 'Note content',
  'password': 'optional_password',
  'color': 'yellow',
  'tags': ['important'],
  'category': 'Work',
  'isPinned': false,
});

// Get all notes with filtering
final response = await apiService.get('/notes/all?page=1&limit=20&search=important');

// Update a note
final response = await apiService.put('/notes/$noteId', {
  'title': 'Updated Title',
  'content': 'Updated content',
  'isPinned': true,
});
```

### 5.2 Offline Support
- The Flutter app maintains local storage as fallback
- Notes are synced to backend when online
- Offline changes are queued for sync
- Conflict resolution handles data consistency

---

## 6. Security Features

### 6.1 Authentication
- All endpoints require valid JWT token
- User-specific data isolation
- Token expiration handling

### 6.2 Data Protection
- Password-protected notes are encrypted
- Soft delete prevents data loss
- Input validation prevents injection attacks

### 6.3 Rate Limiting
- API rate limiting to prevent abuse
- Request size limits for performance
- Concurrent request handling

---

## 7. Performance Optimizations

### 7.1 Database Indexes
- Indexed on `parentId` for user-specific queries
- Indexed on `createdAt` for chronological sorting
- Indexed on `isPinned`, `isLocked`, `isArchived` for filtering
- Indexed on `category` and `tags` for search

### 7.2 Pagination
- Efficient pagination with skip/limit
- Total count calculation for UI
- Cursor-based pagination for large datasets

### 7.3 Caching
- Response caching for frequently accessed data
- Statistics caching for performance
- Search result caching

---

## 8. Testing

### 8.1 API Testing
```bash
# Create a note
curl -X POST http://localhost:2205/notes/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Note",
    "content": "Test content",
    "color": "yellow"
  }'

# Get all notes
curl -X GET "http://localhost:2205/notes/all?page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

### 8.2 Validation Testing
- Test all required fields
- Test field length limits
- Test enum values for colors
- Test password protection
- Test offline functionality

---

## 9. Deployment

### 9.1 Environment Variables
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/credit_app

# JWT
JWT_SECRET=your_jwt_secret_key

# CORS
CORS_ORIGIN=http://localhost:3000
```

### 9.2 Production Considerations
- Enable HTTPS in production
- Set up proper CORS configuration
- Configure rate limiting
- Set up monitoring and logging
- Database backup strategies
- Load balancing for high traffic

---

This Notes API provides a comprehensive solution for note-taking with advanced features like password protection, color coding, and robust filtering capabilities, making it suitable for production use in the Flutter credit management application. 