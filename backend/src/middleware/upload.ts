import multer from 'multer';
import { Request } from 'express';

// Configure memory storage (we'll upload directly to S3)
const storage = multer.memoryStorage();

// File filter to allow only images
const imageFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) => {
  // Accept images only
  if (!file.mimetype.startsWith('image/')) {
    return callback(new Error('Only image files are allowed!'));
  }
  callback(null, true);
};

// File size limits
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 5; // Maximum 5 files per upload

// General upload instance for use with .fields(), .single(), .array()
export const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10,
  },
});

// Single image upload middleware (accepts 'image' or 'file' field name)
export const uploadSingleImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
}).single('file');

// Multiple images upload middleware (for package images)
export const uploadMultipleImages = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
}).array('images', MAX_FILES);

// Profile picture upload middleware
export const uploadProfilePicture = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
}).single('profilePicture');

// Profile image upload for onboarding
export const uploadProfileImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
}).single('profileImage');

// Delivery proof image upload middleware
export const uploadDeliveryProof = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
}).single('deliveryProof');

// Driver documents upload (license, vehicle registration, etc.)
export const uploadDriverDocuments = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 3, // License, vehicle registration, photo
  },
}).fields([
  { name: 'licenseImage', maxCount: 1 },
  { name: 'vehicleRegistration', maxCount: 1 },
  { name: 'driverPhoto', maxCount: 1 },
]);

// Error handler middleware for multer errors
export const handleMulterError = (
  error: any,
  req: Request,
  res: any,
  next: any
) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB',
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: `Too many files. Maximum ${MAX_FILES} files allowed`,
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field in file upload',
      });
    }
  }

  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  next(error);
};
