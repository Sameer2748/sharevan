import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'ap-south-1',
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'sharevan';

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
}

/**
 * Upload a file to S3
 * @param file - File buffer
 * @param folder - Folder path in S3 (e.g., 'profiles', 'packages', 'delivery-proofs')
 * @param originalName - Original filename
 * @returns Upload result with URL and key
 */
export const uploadToS3 = async (
  file: Buffer,
  folder: string,
  originalName: string,
  mimeType: string
): Promise<UploadResult> => {
  try {
    const fileExtension = path.extname(originalName);
    const fileName = `${uuidv4()}${fileExtension}`;
    const key = `${folder}/${fileName}`;

    const params: AWS.S3.PutObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: mimeType,
      ACL: 'public-read', // Make files publicly accessible
    };

    const result = await s3.upload(params).promise();

    return {
      url: result.Location,
      key: result.Key,
      bucket: BUCKET_NAME,
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error('Failed to upload file to S3');
  }
};

/**
 * Delete a file from S3
 * @param key - S3 object key
 */
export const deleteFromS3 = async (key: string): Promise<void> => {
  try {
    const params: AWS.S3.DeleteObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    await s3.deleteObject(params).promise();
  } catch (error) {
    console.error('S3 delete error:', error);
    throw new Error('Failed to delete file from S3');
  }
};

/**
 * Upload multiple files to S3
 * @param files - Array of file buffers with metadata
 * @param folder - Folder path in S3
 * @returns Array of upload results
 */
export const uploadMultipleToS3 = async (
  files: Array<{ buffer: Buffer; originalName: string; mimeType: string }>,
  folder: string
): Promise<UploadResult[]> => {
  try {
    const uploadPromises = files.map((file) =>
      uploadToS3(file.buffer, folder, file.originalName, file.mimeType)
    );

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Multiple S3 upload error:', error);
    throw new Error('Failed to upload multiple files to S3');
  }
};

/**
 * Get a signed URL for temporary access to a private file
 * @param key - S3 object key
 * @param expirySeconds - URL expiry time in seconds (default: 3600)
 * @returns Signed URL
 */
export const getSignedUrl = (key: string, expirySeconds: number = 3600): string => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Expires: expirySeconds,
  };

  return s3.getSignedUrl('getObject', params);
};

/**
 * Check if a file exists in S3
 * @param key - S3 object key
 * @returns True if file exists
 */
export const fileExists = async (key: string): Promise<boolean> => {
  try {
    await s3.headObject({ Bucket: BUCKET_NAME, Key: key }).promise();
    return true;
  } catch (error) {
    return false;
  }
};

// Folder constants for organization
export const S3_FOLDERS = {
  PROFILES: 'profiles',
  PACKAGES: 'packages',
  DELIVERY_PROOFS: 'delivery-proofs',
  DRIVER_DOCUMENTS: 'driver-documents',
} as const;
