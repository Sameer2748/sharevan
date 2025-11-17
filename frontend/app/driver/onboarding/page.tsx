'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Upload, X, Check } from 'lucide-react'
import { useAuthStore } from '@/lib/store/authStore'
import { driverAPI } from '@/lib/api'
import { COUNTRY_CODES } from '@/lib/countryCodes'
import Image from 'next/image'

export default function DriverOnboardingPage() {
  const router = useRouter()
  const { user, isAuthenticated, hasHydrated, updateUser } = useAuthStore()

  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    dateOfBirth: '',
    countryCode: '+44',
    mobile: '',
    email: user?.email || '',
    licenseNumber: '',
    residentNumber: '', // Aadhar or other ID
  })

  const [files, setFiles] = useState({
    profileImage: null as File | null,
    licenseImage: null as File | null,
    residentIdImage: null as File | null,
  })

  const [imagePreviews, setImagePreviews] = useState<{ [key: string]: string | null }>({
    profileImage: null,
    licenseImage: null,
    residentIdImage: null,
  })

  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!hasHydrated) return

    if (!isAuthenticated || user?.role !== 'DRIVER') {
      router.replace('/auth/login?role=driver')
      return
    }

    // If already completed onboarding, redirect to dashboard
    if (user?.onboardingCompleted) {
      router.replace('/driver/dashboard')
    }
  }, [hasHydrated, isAuthenticated, user, router])

  const handleImageChange = (field: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB')
        return
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file (JPEG or PNG)')
        return
      }

      setFiles(prev => ({ ...prev, [field]: file }))

      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviews(prev => ({ ...prev, [field]: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = (field: string) => {
    setFiles(prev => ({ ...prev, [field]: null }))
    setImagePreviews(prev => ({ ...prev, [field]: null }))
  }

  const validateStep1 = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter your full name')
      return false
    }

    if (!formData.dateOfBirth) {
      toast.error('Please select your date of birth')
      return false
    }

    if (!formData.mobile || formData.mobile.length < 10) {
      toast.error('Please enter a valid phone number')
      return false
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email address')
      return false
    }

    return true
  }

  const validateStep2 = () => {
    if (!formData.licenseNumber.trim()) {
      toast.error('Please enter license number')
      return false
    }

    if (!files.licenseImage) {
      toast.error('Please upload license photo')
      return false
    }

    if (!formData.residentNumber.trim()) {
      toast.error('Please enter resident number')
      return false
    }

    if (!files.residentIdImage) {
      toast.error('Please upload resident ID photo')
      return false
    }

    return true
  }

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2)
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!acceptedTerms) {
      toast.error('Please accept the terms and conditions')
      return
    }

    setLoading(true)

    try {
      const data = new FormData()

      // Convert DD/MM/YYYY to ISO format (YYYY-MM-DD)
      const [day, month, year] = formData.dateOfBirth.split('/')
      const isoDate = `${year}-${month}-${day}`

      // Add all form fields
      data.append('name', formData.name.trim())
      data.append('dateOfBirth', isoDate)
      data.append('mobile', `${formData.countryCode}${formData.mobile}`)
      data.append('email', formData.email.trim())
      data.append('licenseNumber', formData.licenseNumber.trim().toUpperCase())
      data.append('aadharNumber', formData.residentNumber.trim())

      // Add file uploads
      if (files.profileImage) {
        data.append('profileImage', files.profileImage)
      }

      if (files.licenseImage) {
        data.append('licenseImage', files.licenseImage)
      }

      if (files.residentIdImage) {
        data.append('aadharImage', files.residentIdImage)
      }

      const response = await driverAPI.completeOnboarding(data)

      updateUser(response.data.data.driver)
      toast.success('Onboarding completed successfully!')

      router.push('/driver/dashboard')
    } catch (error: any) {
      console.error('Onboarding error:', error)
      toast.error(error.response?.data?.error || 'Failed to complete onboarding')
    } finally {
      setLoading(false)
    }
  }

  if (!hasHydrated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-primary">sharevan</h1>
        <p className="text-sm text-gray-600 mt-1">
          Complete Onboarding Process to Register Yourself as a Driver
        </p>
      </div>

      {/* Step Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => currentStep > 1 && setCurrentStep(1)}
          className={`flex-1 py-4 text-sm font-medium ${
            currentStep === 1
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-400'
          }`}
        >
          Personal Details
        </button>
        <button
          onClick={() => currentStep > 2 && setCurrentStep(2)}
          className={`flex-1 py-4 text-sm font-medium ${
            currentStep === 2
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-400'
          }`}
        >
          Identity Proof
        </button>
        <button
          className={`flex-1 py-4 text-sm font-medium ${
            currentStep === 3
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-400'
          }`}
        >
          T&C
        </button>
      </div>

      {/* Form Content */}
      <div className="max-w-md mx-auto px-6 py-8">
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter Name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <input
                type="text"
                value={formData.dateOfBirth}
                onChange={(e) => {
                  let value = e.target.value.replace(/\D/g, '')
                  if (value.length >= 2) {
                    value = value.slice(0, 2) + '/' + value.slice(2)
                  }
                  if (value.length >= 5) {
                    value = value.slice(0, 5) + '/' + value.slice(5, 9)
                  }
                  setFormData({ ...formData, dateOfBirth: value })
                }}
                placeholder="DD/MM/YYYY"
                maxLength={10}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.countryCode}
                  onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                  className="w-24 px-2 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
                >
                  {COUNTRY_CODES.slice(0, 10).map((country) => (
                    <option key={country.code} value={country.dialCode}>
                      {country.dialCode}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                    let formatted = value
                    if (value.length > 3) {
                      formatted = value.slice(0, 3) + ' ' + value.slice(3)
                    }
                    if (value.length > 6) {
                      formatted = value.slice(0, 3) + ' ' + value.slice(3, 6) + ' ' + value.slice(6)
                    }
                    setFormData({ ...formData, mobile: value })
                  }}
                  placeholder="984 242 424"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Email Id
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter E-mail Id"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
              />
            </div>

            <div className="flex flex-col items-center">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Upload a Profile Photo
              </label>
              <p className="text-xs text-gray-400 mb-4">Image Should be JPEG or PNG</p>

              {imagePreviews.profileImage ? (
                <div className="relative">
                  <Image
                    src={imagePreviews.profileImage}
                    alt="Profile"
                    width={120}
                    height={120}
                    className="rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage('profileImage')}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange('profileImage', e)}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                License Number
              </label>
              <input
                type="text"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                placeholder="242424CD2r"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900 uppercase"
              />
            </div>

            <div className="flex flex-col items-center">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Upload a License Photo
              </label>
              <p className="text-xs text-gray-400 mb-4">Image Should be JPEG or PNG</p>

              {imagePreviews.licenseImage ? (
                <div className="relative">
                  <Image
                    src={imagePreviews.licenseImage}
                    alt="License"
                    width={200}
                    height={150}
                    className="rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage('licenseImage')}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange('licenseImage', e)}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resident Number
              </label>
              <input
                type="text"
                value={formData.residentNumber}
                onChange={(e) => setFormData({ ...formData, residentNumber: e.target.value })}
                placeholder="242424CD2r"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
              />
            </div>

            <div className="flex flex-col items-center">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Upload a Resident ID
              </label>
              <p className="text-xs text-gray-400 mb-4">Image Should be JPEG or PNG</p>

              {imagePreviews.residentIdImage ? (
                <div className="relative">
                  <Image
                    src={imagePreviews.residentIdImage}
                    alt="Resident ID"
                    width={200}
                    height={150}
                    className="rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage('residentIdImage')}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange('residentIdImage', e)}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Terms and Conditions</h2>

            <div className="bg-gray-50 rounded-lg p-6 max-h-96 overflow-y-auto text-sm text-gray-600 leading-relaxed">
              <p className="mb-4">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
                incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
                exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure
                dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
                Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt
                mollit anim id est laborum.
              </p>
              <p className="mb-4">
                Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque
                laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi
                architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas
                sit aspernatur aut odit aut fugit.
              </p>
              <p className="mb-4">
                At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium
                voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint
                occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt
                mollitia animi, id est laborum et dolorum fuga.
              </p>
              <p>
                Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta
                nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere
                possimus, omnis voluptas assumenda est, omnis dolor repellendus.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="terms" className="text-sm text-gray-700">
                I agree to the Terms and Conditions
              </label>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex gap-4">
          {currentStep > 1 && (
            <button
              onClick={handleBack}
              className="flex-1 py-3 border border-gray-300 rounded-full text-gray-700 font-medium hover:bg-gray-50"
            >
              Back
            </button>
          )}

          {currentStep < 3 ? (
            <button
              onClick={handleNext}
              className="flex-1 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary/90"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || !acceptedTerms}
              className="flex-1 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Continue'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
