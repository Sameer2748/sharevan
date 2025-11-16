'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { userAPI, uploadAPI } from '@/lib/api';
import { toast } from 'sonner';
import Navbar from '@/components/shared/Navbar';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Camera, Loader2 } from 'lucide-react';

export default function UserProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    profileImage: '',
  });

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated || user?.role !== 'USER') {
      router.replace('/auth/login?role=user');
      return;
    }

    fetchProfile();
  }, [hasHydrated, isAuthenticated, user?.role]);

  const fetchProfile = async () => {
    try {
      const response = await userAPI.getProfile();
      const profile = response.data.data;
      setFormData({
        name: profile.name || '',
        mobile: profile.mobile || '',
        email: profile.email || '',
        profileImage: profile.profileImage || '',
      });
    } catch (error: any) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploading(true);
    try {
      const uploadResponse = await uploadAPI.uploadProfilePicture(file);
      const imageUrl = uploadResponse.data.data.url;
      setFormData((prev) => ({ ...prev, profileImage: imageUrl }));
      toast.success('Profile picture uploaded');
    } catch (error: any) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSaving(true);
    try {
      const response = await userAPI.updateProfile({
        name: formData.name.trim(),
        email: formData.email || undefined,
        profileImage: formData.profileImage || undefined,
      });

      updateUser(response.data.data);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!hasHydrated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" text="Loading profile..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title="Profile" showBack />

      <div className="px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                {formData.profileImage ? (
                  <img
                    src={formData.profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-5xl font-bold text-gray-400">
                    {formData.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <label
                htmlFor="profile-image"
                className="absolute bottom-0 right-0 bg-primary text-white p-3 rounded-full cursor-pointer hover:bg-primary-600 transition-all shadow-lg"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
              </label>
              <input
                id="profile-image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
              />
            </div>
          </div>

          {/* Name Field */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <label className="block text-sm text-gray-500 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full text-base font-medium text-gray-900 bg-transparent border-none outline-none"
              placeholder="Enter your name"
            />
          </div>

          {/* Phone Number Field (Read-only) */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <label className="block text-sm text-gray-500 mb-1">Phone Number</label>
            <input
              type="text"
              value={formData.mobile}
              disabled
              className="w-full text-base font-medium text-gray-900 bg-transparent border-none outline-none"
            />
          </div>

          {/* Email Field */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <label className="block text-sm text-gray-500 mb-1">Email Id</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full text-base font-medium text-gray-900 bg-transparent border-none outline-none"
              placeholder="Enter your email"
            />
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={saving || uploading}
            className="w-full bg-primary text-white py-4 rounded-xl font-semibold hover:bg-primary-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
