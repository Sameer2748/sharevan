'use client';

import { useState } from 'react';
import { X, Star } from 'lucide-react';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  driverName: string;
  driverImage?: string;
}

export default function RatingModal({
  isOpen,
  onClose,
  onSubmit,
  driverName,
  driverImage,
}: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;

    setSubmitting(true);
    try {
      await onSubmit(rating, comment);
      onClose();
    } catch (error) {
      console.error('Failed to submit rating:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative border-b border-gray-100 px-6 py-4">
          <h3 className="text-xl font-bold text-gray-900 text-center">
            Rate Your Delivery
          </h3>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1 rounded-full hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Driver Info */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {driverImage ? (
                <img
                  src={driverImage}
                  alt={driverName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                driverName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">How was your experience with</p>
              <p className="text-lg font-semibold text-gray-900">{driverName}?</p>
            </div>
          </div>

          {/* Star Rating */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  className={`w-12 h-12 ${
                    star <= (hoverRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  } transition-colors`}
                />
              </button>
            ))}
          </div>

          {/* Rating Text */}
          {rating > 0 && (
            <div className="text-center">
              <p className="text-lg font-medium text-gray-700">
                {rating === 5 && '🌟 Excellent!'}
                {rating === 4 && '😊 Great!'}
                {rating === 3 && '👍 Good'}
                {rating === 2 && '😐 Okay'}
                {rating === 1 && '😞 Poor'}
              </p>
            </div>
          )}

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Share your experience (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us about your delivery experience..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              maxLength={500}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {comment.length}/500
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-blue-500/30"
          >
            {submitting ? 'Submitting...' : 'Submit Rating'}
          </button>
        </div>
      </div>
    </div>
  );
}
