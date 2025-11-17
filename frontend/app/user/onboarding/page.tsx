'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Upload, X } from 'lucide-react'
import { useAuthStore } from '@/lib/store/authStore'
import { userAPI } from '@/lib/api'
import { COUNTRY_CODES } from '@/lib/countryCodes'
import Image from 'next/image'

export default function OnboardingPage() {
  const router = useRouter()
  const { user, isAuthenticated, hasHydrated, updateUser } = useAuthStore()

  const [formData, setFormData] = useState({
    name: user?.name || '',
    dateOfBirth: '',
    countryCode: '+91',
    mobile: '',
    profileImage: null as File | null,
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!hasHydrated) return

    if (!isAuthenticated || user?.role !== 'USER') {
      router.replace('/auth/login?role=user')
      return
    }

    // If already completed onboarding, redirect to dashboard
    if (user?.onboardingCompleted) {
      router.replace('/user/dashboard')
    }
  }, [hasHydrated, isAuthenticated, user, router])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB')
        return
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file')
        return
      }

      setFormData(prev => ({ ...prev, profileImage: file }))
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setFormData(prev => ({ ...prev, profileImage: null }))
    setImagePreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.dateOfBirth) {
      toast.error('Name and date of birth are required')
      return
    }

    // Validate mobile if provided
    if (formData.mobile && formData.mobile.length < 10) {
      toast.error('Please enter a valid mobile number')
      return
    }

    setLoading(true)
    try {
      const data = new FormData()
      data.append('name', formData.name)
      data.append('dateOfBirth', formData.dateOfBirth)
      
      if (formData.mobile) {
        data.append('countryCode', formData.countryCode)
        data.append('mobile', formData.mobile)
      }
      
      if (formData.profileImage) {
        data.append('profileImage', formData.profileImage)
      }

      const response = await userAPI.completeOnboarding(data)
      
      // Update user in store
      updateUser(response.data.data)
      
      toast.success('Onboarding completed successfully!')
      router.replace('/user/dashboard')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to complete onboarding')
    } finally {
      setLoading(false)
    }
  }

  if (!hasHydrated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F58FF] via-[#1F6CFF] to-[#469BFF] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Complete Your Profile</h1>
          <p className="text-sm text-gray-600">Just a few more details to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Profile Image */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              {imagePreview ? (
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-primary">
                  <Image
                    src={imagePreview}
                    alt="Profile preview"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="w-24 h-24 rounded-full border-4 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-primary transition">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-gray-500">Profile Picture (Optional)</p>
          </div>

          {/* Email (Read-only) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Email Address
            </label>
            <div className="flex items-center border border-gray-300 rounded-xl px-4 py-3.5 bg-gray-50">
              <span className="text-base text-gray-700">{user?.email || 'email@example.com'}</span>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter your full name"
              className="w-full border border-gray-300 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Date of Birth */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Date of Birth *
            </label>
            <input
              type="date"
              required
              value={formData.dateOfBirth}
              onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
              max={new Date().toISOString().split('T')[0]}
              className="w-full border border-gray-300 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Phone Number (Optional) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Mobile Number (Optional)
            </label>
            <div className="flex gap-2">
              <select
                value={formData.countryCode}
                onChange={(e) => setFormData(prev => ({ ...prev, countryCode: e.target.value }))}
                className="w-28 px-3 py-3.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {COUNTRY_CODES.map((country) => (
                  <option key={country.code} value={country.dialCode}>
                    {country.flag} {country.dialCode}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={formData.mobile}
                onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value.replace(/\D/g, '') }))}
                maxLength={15}
                placeholder="987 654 3210"
                className="flex-1 border border-gray-300 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <p className="text-xs text-gray-500">We'll use this for order updates</p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#0F58FF] py-3.5 text-base font-semibold text-white shadow-lg shadow-[#0F58FF]/40 transition hover:bg-[#0d4fe0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Completing...
              </span>
            ) : (
              'Complete Profile'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
