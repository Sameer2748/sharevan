'use client';

import { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  label?: string;
  maxFiles?: number;
  maxSizeMB?: number;
  value?: string[];
  onChange?: (urls: string[]) => void;
  onFilesSelected?: (files: File[]) => void;
  accept?: string;
  disabled?: boolean;
  className?: string;
}

export default function ImageUpload({
  label = 'Upload Images',
  maxFiles = 5,
  maxSizeMB = 5,
  value = [],
  onChange,
  onFilesSelected,
  accept = 'image/*',
  disabled = false,
  className = '',
}: ImageUploadProps) {
  const [previews, setPreviews] = useState<string[]>(value);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    // Validate number of files
    if (previews.length + files.length > maxFiles) {
      setError(`Maximum ${maxFiles} images allowed`);
      return;
    }

    // Validate file sizes
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const invalidFiles = files.filter((file) => file.size > maxSizeBytes);

    if (invalidFiles.length > 0) {
      setError(`Each image must be less than ${maxSizeMB}MB`);
      return;
    }

    // Validate file types
    const invalidTypes = files.filter((file) => !file.type.startsWith('image/'));
    if (invalidTypes.length > 0) {
      setError('Only image files are allowed');
      return;
    }

    setError(null);

    // Create preview URLs
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    const updatedPreviews = [...previews, ...newPreviews];
    setPreviews(updatedPreviews);

    // Call callback with files
    if (onFilesSelected) {
      onFilesSelected(files);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (index: number) => {
    const newPreviews = previews.filter((_, i) => i !== index);
    setPreviews(newPreviews);

    if (onChange) {
      onChange(newPreviews);
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      )}

      {/* Upload Button */}
      {previews.length < maxFiles && (
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={maxFiles > 1}
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
          />
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <Upload className="w-8 h-8" />
            <div className="text-sm">
              <span className="text-primary font-medium">Click to upload</span> or drag and drop
            </div>
            <div className="text-xs text-gray-400">
              {maxFiles > 1 && `Up to ${maxFiles} images, `}
              Max {maxSizeMB}MB each
            </div>
          </div>
        </button>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>
      )}

      {/* Image Previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-xl overflow-hidden border-2 border-gray-200">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {previews.length === 0 && !disabled && (
        <div className="text-center py-4">
          <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No images uploaded yet</p>
        </div>
      )}
    </div>
  );
}
