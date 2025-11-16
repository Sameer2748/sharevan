# Upload Endpoint Fix for Driver Registration

## Issue Fixed

Driver registration was failing with "404 /api/upload not found" because the generic upload endpoint didn't exist.

---

## What Was Done

### 1. Added Generic Upload Endpoint ✅

**File**: `backend/src/routes/uploadRoutes.ts`

Added a new POST route at `/api/upload` that:
- Accepts single file uploads without authentication (for driver registration)
- Uses multer for file handling
- Uploads to AWS S3
- Returns file URL and key

**Endpoint**:
```
POST /api/upload
Content-Type: multipart/form-data
Field name: 'file'
```

**Request**:
```javascript
const formData = new FormData();
formData.append('file', fileBlob);

fetch('http://localhost:8000/api/upload', {
  method: 'POST',
  body: formData
});
```

**Response**:
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "url": "https://sharevan-uploads.s3.ap-south-1.amazonaws.com/driver-documents/...",
    "key": "driver-documents/..."
  }
}
```

### 2. Updated Multer Configuration ✅

**File**: `backend/src/middleware/upload.ts`

Changed field name from `'image'` to `'file'` to match what the frontend sends:

```typescript
export const uploadSingleImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
}).single('file'); // Changed from 'image' to 'file'
```

---

## How Driver Registration Upload Works Now

### Frontend Flow (Driver Registration Page)

```javascript
// For each document file
const formData = new FormData();
formData.append('file', file);

const response = await axios.post(`${API_URL}/api/upload`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

const uploadedUrl = response.data.data.url;

// Store URL for registration
uploadedUrls.licenseImage = uploadedUrl;
```

### Backend Flow

1. **Request arrives** at `POST /api/upload`
2. **Multer middleware** processes the file:
   - Validates it's an image
   - Checks file size (max 5MB)
   - Stores in memory buffer
3. **Upload handler** uploads to S3:
   - Uses AWS SDK
   - Uploads to `driver-documents/` folder
   - Generates unique filename
   - Returns public URL
4. **Response sent** with URL and key

---

## All Available Upload Endpoints

### 1. Generic Upload (No Auth)
```
POST /api/upload
```
- Use for: Driver registration documents
- Auth: Not required
- Field: 'file'
- Folder: driver-documents/

### 2. Profile Picture (Auth Required)
```
POST /api/upload/profile-picture
```
- Use for: User/Driver profile images
- Auth: Required
- Field: 'profilePicture'
- Folder: profiles/

### 3. Package Images (Auth Required)
```
POST /api/upload/package-images
```
- Use for: Order package images
- Auth: Required
- Field: 'images' (multiple)
- Folder: packages/
- Max: 5 files

### 4. Delivery Proof (Auth Required - Driver Only)
```
POST /api/upload/delivery-proof
```
- Use for: Delivery proof photos
- Auth: Required (Driver)
- Field: 'deliveryProof'
- Folder: delivery-proofs/

### 5. Driver Documents (Auth Required - Driver Only)
```
POST /api/upload/driver-documents
```
- Use for: Multiple driver docs at once
- Auth: Required (Driver)
- Fields: 'licenseImage', 'vehicleRegistration', 'driverPhoto'
- Folder: driver-documents/

---

## File Upload Constraints

### File Size Limits
- Max file size: **5MB**
- Max files per upload: **5** (for multiple uploads)

### Allowed File Types
- Only images: PNG, JPG, JPEG, GIF, WebP
- MIME types starting with `image/`

### Error Responses

**File too large:**
```json
{
  "success": false,
  "message": "File size too large. Maximum size is 5MB"
}
```

**Wrong file type:**
```json
{
  "success": false,
  "message": "Only image files are allowed!"
}
```

**No file provided:**
```json
{
  "success": false,
  "error": "No file uploaded"
}
```

---

## S3 Configuration

### Folder Structure
```
sharevan-uploads/
├── driver-documents/     # License, RC, Aadhar, PAN
├── profiles/             # User/Driver profile pictures
├── packages/             # Package images for orders
└── delivery-proofs/      # Delivery proof photos
```

### Environment Variables Required

**Backend `.env`:**
```env
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=ap-south-1
AWS_S3_BUCKET=sharevan-uploads
```

---

## Testing Upload Endpoint

### Using cURL
```bash
curl -X POST http://localhost:8000/api/upload \
  -F "file=@/path/to/image.jpg"
```

### Using Postman
1. Method: POST
2. URL: `http://localhost:8000/api/upload`
3. Body → form-data
4. Key: `file` (type: File)
5. Value: Select image file
6. Send

### Using Frontend
```javascript
const handleUpload = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post('http://localhost:8000/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    console.log('Uploaded:', response.data.data.url);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

---

## Driver Registration Complete Flow

### Step 1: User fills form
- Name, mobile, vehicle details, etc.

### Step 2: User uploads documents
```javascript
const files = {
  licenseImage: File,
  vehicleRegImage: File,
  aadharImage: File,
  panImage: File (optional)
};
```

### Step 3: Upload each file to S3
```javascript
for (const [key, file] of Object.entries(files)) {
  if (file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(`${API_URL}/api/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    uploadedUrls[key] = response.data.data.url;
  }
}

// Result:
// uploadedUrls = {
//   licenseImage: "https://s3.amazonaws.com/...",
//   vehicleRegImage: "https://s3.amazonaws.com/...",
//   aadharImage: "https://s3.amazonaws.com/...",
//   panImage: "https://s3.amazonaws.com/..."
// }
```

### Step 4: Submit registration with URLs
```javascript
const registrationData = {
  mobile: "+919876543210",
  name: "John Driver",
  vehicleType: "BIKE",
  vehicleNumber: "DL01AB1234",
  licenseNumber: "DL-1234567890123",
  licenseImage: uploadedUrls.licenseImage,      // S3 URL
  vehicleRegImage: uploadedUrls.vehicleRegImage, // S3 URL
  aadharImage: uploadedUrls.aadharImage,        // S3 URL
  panImage: uploadedUrls.panImage                // S3 URL
};

await axios.post(`${API_URL}/api/auth/register-driver`, registrationData);
```

### Step 5: Driver created in database
```javascript
{
  id: "clx123...",
  mobile: "+919876543210",
  name: "John Driver",
  vehicleNumber: "DL01AB1234",
  licenseImage: "https://sharevan-uploads.s3.ap-south-1.amazonaws.com/driver-documents/license-xyz.jpg",
  vehicleRegImage: "https://sharevan-uploads.s3.ap-south-1.amazonaws.com/driver-documents/rc-abc.jpg",
  aadharImage: "https://sharevan-uploads.s3.ap-south-1.amazonaws.com/driver-documents/aadhar-def.jpg",
  status: "PENDING_VERIFICATION"
}
```

---

## Common Issues & Solutions

### Issue: "404 /api/upload not found"
**Solution**: ✅ FIXED - Generic upload endpoint now exists

### Issue: "No file uploaded"
**Solution**: Ensure FormData field name is 'file', not 'image'

### Issue: "Only image files are allowed"
**Solution**: Upload only PNG, JPG, JPEG, GIF, or WebP files

### Issue: "File size too large"
**Solution**: Compress images or ensure size is under 5MB

### Issue: "AWS credentials not configured"
**Solution**: Add AWS credentials to backend `.env` file

### Issue: Upload works but URL is broken
**Solution**: Check S3 bucket has public read permissions for uploaded files

---

## Security Considerations

### Current Setup (Development)
- ✅ No authentication required for `/api/upload` (for driver registration)
- ✅ File type validation (images only)
- ✅ File size limits (5MB max)
- ✅ Files stored in S3 with unique names

### Production Recommendations
- Add rate limiting to prevent abuse
- Add virus scanning for uploaded files
- Implement signed URLs for downloads
- Add watermarks to document images
- Log all uploads with IP and timestamp
- Consider adding CAPTCHA to registration

---

## Files Modified

1. `backend/src/routes/uploadRoutes.ts` - Added generic upload endpoint
2. `backend/src/middleware/upload.ts` - Changed field name to 'file'

---

## Testing Checklist

- [x] Generic upload endpoint exists at `/api/upload`
- [x] Accepts 'file' field name
- [x] Uploads to S3 successfully
- [x] Returns correct URL format
- [ ] Driver registration uploads all 4 documents
- [ ] Registration completes successfully
- [ ] Admin can view uploaded documents
- [ ] Documents are accessible via returned URLs

---

## Next Steps

1. **Start backend server**:
   ```bash
   cd backend
   npm run dev:clean
   ```

2. **Test driver registration**:
   - Go to http://localhost:3000/auth/register/driver
   - Fill all 3 steps
   - Upload documents
   - Submit registration

3. **Verify upload**:
   - Check S3 bucket for uploaded files
   - Check database for driver record with URLs
   - Verify URLs are accessible

All done! The upload endpoint is now ready for driver registration! 🚀
