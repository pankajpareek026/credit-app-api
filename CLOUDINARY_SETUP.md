# Cloudinary Integration Setup Guide

This guide explains how to set up and use Cloudinary for file uploads in the CRDT Credit App.

## Overview

The application now uses Cloudinary for file storage instead of local file storage. This provides:
- Automatic image optimization
- CDN delivery for faster access
- Automatic format conversion
- Secure file storage
- Easy file management

## Setup Instructions

### 1. Create Cloudinary Account

1. Go to [Cloudinary.com](https://cloudinary.com)
2. Sign up for a free account
3. Note down your Cloud Name, API Key, and API Secret from the dashboard

### 2. Environment Configuration

Add the following environment variables to your `.env` file:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
CLOUDINARY_FOLDER=credit-app/transactions
```

### 3. Install Dependencies

The following packages have been added to `package.json`:

```json
{
  "cloudinary": "^2.5.0",
  "multer-storage-cloudinary": "^4.0.0"
}
```

Run `npm install` to install the new dependencies.

## API Endpoints

### File Upload Endpoints

#### Upload Single File
```
POST /api/transactions/client/transaction/:transactionId/upload
Content-Type: multipart/form-data

Body:
- attachment: File (required)
```

#### Remove File
```
DELETE /api/transactions/client/transaction/:transactionId/attachment/:attachmentId
```

#### Get File
```
GET /api/transactions/client/transaction/:transactionId/attachment/:attachmentId
```

### Separator Endpoints

#### Create Separator
```
POST /api/transactions/client/separator
Headers:
- clientid: Client ID (required)

Body:
{
  "title": "Separator Title",
  "description": "Optional description",
  "color": "#3B82F6",
  "position": 0
}
```

#### Update Separator
```
PUT /api/transactions/client/separator/:transactionId
Body:
{
  "title": "Updated Title",
  "description": "Updated description",
  "color": "#10B981",
  "position": 1,
  "isVisible": true
}
```

#### Delete Separator
```
DELETE /api/transactions/client/separator/:transactionId
```

## File Upload Features

### Supported File Types
- **Images**: JPG, JPEG, PNG, GIF, WebP
- **Documents**: PDF, DOC, DOCX, XLS, XLSX
- **Text**: TXT, CSV

### File Size Limits
- Maximum file size: 10MB
- Maximum files per request: 5

### Automatic Optimizations
- Images are automatically optimized for web delivery
- Format conversion (e.g., WebP for better compression)
- Quality optimization
- Responsive image generation

## Database Schema Changes

### Transaction Attachment Schema
```javascript
{
  filename: String,           // Cloudinary filename
  originalName: String,       // Original filename
  mimetype: String,          // MIME type
  size: Number,              // File size in bytes
  publicId: String,          // Cloudinary public ID
  secureUrl: String,         // HTTPS URL for secure access
  url: String,               // HTTP URL
  path: String,              // Legacy path (for backward compatibility)
  uploadedAt: Date           // Upload timestamp
}
```

### Separator Schema
```javascript
{
  title: String,             // Separator title
  description: String,       // Optional description
  color: String,             // Hex color code
  position: Number,          // Position for ordering
  isVisible: Boolean         // Visibility flag
}
```

## Frontend Integration

### TransactionAttachment Model
The Flutter model has been updated to support Cloudinary URLs:

```dart
class TransactionAttachment {
  final String id;
  final String filename;
  final String originalName;
  final String mimetype;
  final int size;
  final String path; // Legacy field
  final String? publicId; // Cloudinary public ID
  final String? secureUrl; // Cloudinary secure URL
  final String? url; // Cloudinary URL
  final DateTime uploadedAt;

  // Helper methods
  String get displayUrl => secureUrl ?? url ?? path;
  bool get isCloudinaryAttachment => publicId != null;
}
```

### File Upload Service
The `FileUploadService` handles:
- File picking from device
- Image capture from camera
- File upload to Cloudinary via API
- File deletion from Cloudinary
- Progress tracking

### File Attachment Widget
The `FileAttachmentWidget` provides:
- File list display
- Upload options (camera, gallery, file picker)
- File preview (especially for images)
- File deletion
- Progress indicators

## Security Features

### File Validation
- File type validation on both client and server
- File size limits enforced
- Malicious file detection

### Access Control
- User authentication required for all operations
- Transaction ownership verification
- Secure file URLs with expiration

### Data Protection
- Files stored securely on Cloudinary
- HTTPS-only access
- Automatic backup and redundancy

## Error Handling

### Common Error Scenarios
1. **File too large**: Returns 400 with size limit message
2. **Invalid file type**: Returns 400 with allowed types message
3. **Upload failure**: Returns 500 with error details
4. **File not found**: Returns 404
5. **Unauthorized access**: Returns 401/403

### Error Response Format
```json
{
  "isSuccess": false,
  "message": "Error description",
  "error": "Detailed error information"
}
```

## Performance Optimizations

### Cloudinary Features
- **Auto-optimization**: Images automatically optimized for web
- **CDN Delivery**: Global content delivery network
- **Format Conversion**: Automatic WebP/AVIF generation
- **Responsive Images**: Multiple sizes generated automatically

### Caching
- Browser caching for static assets
- CDN caching for improved performance
- API response caching where appropriate

## Monitoring and Analytics

### Cloudinary Dashboard
- Upload statistics
- Bandwidth usage
- Storage usage
- Performance metrics

### Application Logging
- Upload success/failure logs
- File access logs
- Error tracking
- Performance monitoring

## Migration from Local Storage

### Backward Compatibility
- Legacy file paths still supported
- Gradual migration to Cloudinary URLs
- Fallback mechanisms for old files

### Migration Process
1. Existing files remain accessible via legacy paths
2. New uploads automatically use Cloudinary
3. Old files can be migrated to Cloudinary as needed

## Troubleshooting

### Common Issues

#### 1. Upload Fails
- Check Cloudinary credentials
- Verify file size and type
- Check network connectivity
- Review server logs

#### 2. Files Not Displaying
- Verify Cloudinary URLs
- Check CORS settings
- Validate file permissions
- Test direct URL access

#### 3. Performance Issues
- Monitor Cloudinary usage
- Check CDN configuration
- Optimize image sizes
- Review caching settings

### Debug Mode
Enable debug logging by setting:
```env
DEBUG=cloudinary:*
```

## Best Practices

### File Management
- Use descriptive filenames
- Implement file cleanup for deleted transactions
- Monitor storage usage
- Regular backup verification

### Security
- Validate all uploads
- Use secure URLs for sensitive files
- Implement access controls
- Regular security audits

### Performance
- Optimize images before upload
- Use appropriate file formats
- Implement lazy loading
- Monitor bandwidth usage

## Support

For issues related to:
- **Cloudinary**: Check [Cloudinary Documentation](https://cloudinary.com/documentation)
- **API Integration**: Review this documentation
- **Frontend Issues**: Check Flutter file upload implementation
- **Backend Issues**: Review server logs and error handling

## Cost Considerations

### Cloudinary Free Tier
- 25 GB storage
- 25 GB bandwidth/month
- 25,000 transformations/month

### Optimization Tips
- Use appropriate image sizes
- Implement client-side compression
- Use WebP format when possible
- Monitor usage regularly
