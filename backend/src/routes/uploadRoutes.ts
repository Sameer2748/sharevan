import { Router, Request, Response, NextFunction } from 'express';
import {
  uploadSingleImage,
  uploadMultipleImages,
  uploadProfilePicture,
  uploadDeliveryProof,
  uploadDriverDocuments,
  handleMulterError,
} from '../middleware/upload';
import { uploadToS3, uploadMultipleToS3, S3_FOLDERS } from '../services/s3Service';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * POST /api/upload
 * Generic single file upload (no auth required for registration)
 */
router.post(
  '/',
  (req: Request, res: Response, next: NextFunction) => {
    uploadSingleImage(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
      }

      // Determine folder based on context or default to DRIVER_DOCUMENTS
      const folder = S3_FOLDERS.DRIVER_DOCUMENTS;

      const result = await uploadToS3(
        req.file.buffer,
        folder,
        req.file.originalname,
        req.file.mimetype
      );

      res.json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          url: result.url,
          key: result.key,
        },
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to upload file',
      });
    }
  }
);

/**
 * POST /api/upload/profile-picture
 * Upload user/driver profile picture
 */
router.post(
  '/profile-picture',
  authenticateToken,
  (req: Request, res: Response, next: NextFunction) => {
    uploadProfilePicture(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      const result = await uploadToS3(
        req.file.buffer,
        S3_FOLDERS.PROFILES,
        req.file.originalname,
        req.file.mimetype
      );

      res.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        data: {
          url: result.url,
          key: result.key,
        },
      });
    } catch (error: any) {
      console.error('Profile upload error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to upload profile picture',
      });
    }
  }
);

/**
 * POST /api/upload/package-images
 * Upload multiple package images for an order
 */
router.post(
  '/package-images',
  authenticateToken,
  (req: Request, res: Response, next: NextFunction) => {
    uploadMultipleImages(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded',
        });
      }

      const files = req.files.map((file) => ({
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
      }));

      const results = await uploadMultipleToS3(files, S3_FOLDERS.PACKAGES);

      res.json({
        success: true,
        message: 'Package images uploaded successfully',
        data: {
          images: results.map((r) => ({
            url: r.url,
            key: r.key,
          })),
        },
      });
    } catch (error: any) {
      console.error('Package images upload error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to upload package images',
      });
    }
  }
);

/**
 * POST /api/upload/delivery-proof
 * Upload delivery proof image (driver only)
 */
router.post(
  '/delivery-proof',
  authenticateToken,
  (req: Request, res: Response, next: NextFunction) => {
    uploadDeliveryProof(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      const userRole = (req as any).user?.role;

      if (userRole !== 'DRIVER') {
        return res.status(403).json({
          success: false,
          message: 'Only drivers can upload delivery proof',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      const result = await uploadToS3(
        req.file.buffer,
        S3_FOLDERS.DELIVERY_PROOFS,
        req.file.originalname,
        req.file.mimetype
      );

      res.json({
        success: true,
        message: 'Delivery proof uploaded successfully',
        data: {
          url: result.url,
          key: result.key,
        },
      });
    } catch (error: any) {
      console.error('Delivery proof upload error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to upload delivery proof',
      });
    }
  }
);

/**
 * POST /api/upload/driver-documents
 * Upload driver verification documents (license, vehicle reg, photo)
 */
router.post(
  '/driver-documents',
  authenticateToken,
  (req: Request, res: Response, next: NextFunction) => {
    uploadDriverDocuments(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      const userRole = (req as any).user?.role;

      if (userRole !== 'DRIVER') {
        return res.status(403).json({
          success: false,
          message: 'Only drivers can upload documents',
        });
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files || Object.keys(files).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded',
        });
      }

      const uploadResults: any = {};

      // Upload license image
      if (files.licenseImage && files.licenseImage[0]) {
        const file = files.licenseImage[0];
        const result = await uploadToS3(
          file.buffer,
          S3_FOLDERS.DRIVER_DOCUMENTS,
          file.originalname,
          file.mimetype
        );
        uploadResults.licenseImage = { url: result.url, key: result.key };
      }

      // Upload vehicle registration
      if (files.vehicleRegistration && files.vehicleRegistration[0]) {
        const file = files.vehicleRegistration[0];
        const result = await uploadToS3(
          file.buffer,
          S3_FOLDERS.DRIVER_DOCUMENTS,
          file.originalname,
          file.mimetype
        );
        uploadResults.vehicleRegistration = { url: result.url, key: result.key };
      }

      // Upload driver photo
      if (files.driverPhoto && files.driverPhoto[0]) {
        const file = files.driverPhoto[0];
        const result = await uploadToS3(
          file.buffer,
          S3_FOLDERS.DRIVER_DOCUMENTS,
          file.originalname,
          file.mimetype
        );
        uploadResults.driverPhoto = { url: result.url, key: result.key };
      }

      res.json({
        success: true,
        message: 'Driver documents uploaded successfully',
        data: uploadResults,
      });
    } catch (error: any) {
      console.error('Driver documents upload error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to upload driver documents',
      });
    }
  }
);

export default router;
