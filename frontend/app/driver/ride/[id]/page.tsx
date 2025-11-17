'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { driverAPI, orderAPI } from '@/lib/api'
import { toast } from 'sonner'
import { ArrowLeft, MapPin, Upload, X, Phone, Check, Loader2 } from 'lucide-react'
import Image from 'next/image'

export default function ActiveRideDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const { user, isAuthenticated, hasHydrated } = useAuthStore()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [parcelImage, setParcelImage] = useState<File | null>(null)
  const [parcelImagePreview, setParcelImagePreview] = useState<string | null>(null)
  const [showPickupOtpModal, setShowPickupOtpModal] = useState(false)
  const [showDropOtpModal, setShowDropOtpModal] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpLoading, setOtpLoading] = useState(false)
  const [showSuccessScreen, setShowSuccessScreen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (!hasHydrated) return

    if (!isAuthenticated || user?.role !== 'DRIVER') {
      router.replace('/auth/login?role=driver')
      return
    }

    fetchOrderDetails()
  }, [hasHydrated, isAuthenticated, user, params.id, router])

  const fetchOrderDetails = async () => {
    try {
      const response = await orderAPI.getOrderById(params.id as string)
      console.log('Order response:', response.data)
      // Backend returns { success: true, data: order }
      setOrder(response.data.data)
    } catch (error: any) {
      console.error('Failed to load order:', error)
      toast.error(error.response?.data?.error || 'Failed to load order details')
      router.back()
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB')
        return
      }

      setParcelImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setParcelImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleReachedPickup = async () => {
    try {
      await driverAPI.updateOrderStatus(params.id as string, 'DRIVER_ARRIVED')
      await fetchOrderDetails()
      toast.success('Status updated')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update status')
    }
  }

  const handleConfirmPickup = () => {
    if (!parcelImage) {
      toast.error('Please upload parcel image')
      return
    }
    setShowPickupOtpModal(true)
  }

  const handleVerifyPickupOTP = async () => {
    const otpString = otp.join('')
    if (otpString.length !== 6) {
      toast.error('Please enter 6-digit OTP')
      return
    }

    setOtpLoading(true)
    try {
      await driverAPI.verifyPickupOtp(params.id as string, otpString)
      setShowPickupOtpModal(false)
      setShowSuccessScreen(true)
      setSuccessMessage('Pickup Confirmed Successfully!')

      setTimeout(() => {
        setShowSuccessScreen(false)
        fetchOrderDetails()
      }, 2000)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Invalid OTP')
      setOtp(['', '', '', '', '', ''])
    } finally {
      setOtpLoading(false)
    }
  }

  const handleConfirmDrop = () => {
    setShowDropOtpModal(true)
  }

  const handleVerifyDropOTP = async () => {
    const otpString = otp.join('')
    if (otpString.length !== 6) {
      toast.error('Please enter 6-digit OTP')
      return
    }

    setOtpLoading(true)
    try {
      await driverAPI.verifyDeliveryOtp(params.id as string, otpString)
      setShowDropOtpModal(false)
      setShowSuccessScreen(true)
      setSuccessMessage('Delivery Completed Successfully!')

      setTimeout(() => {
        setShowSuccessScreen(false)
        router.push('/driver/dashboard')
      }, 2000)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Invalid OTP')
      setOtp(['', '', '', '', '', ''])
    } finally {
      setOtpLoading(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0]
    const updated = [...otp]
    updated[index] = value
    setOtp(updated)

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  const getProgress = () => {
    if (!order) return []

    const steps = [
      {
        label: 'Booked a Van',
        time: new Date(order.createdAt).toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        completed: true,
      },
      {
        label: 'Picked Up Cargo',
        time: order.pickedUpAt
          ? new Date(order.pickedUpAt).toLocaleString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '',
        completed: ['PICKED_UP', 'IN_TRANSIT', 'REACHED_DESTINATION', 'DELIVERED'].includes(
          order.status
        ),
      },
      {
        label: 'Milestone 1: Heathrow',
        time: '',
        completed: false,
      },
      {
        label: 'Drop off time',
        time: 'Estimated, 24:46 PM',
        completed: order.status === 'DELIVERED',
      },
    ]

    return steps
  }

  if (!hasHydrated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#103EF7]" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Order not found</p>
          <button
            onClick={() => router.push('/driver/dashboard')}
            className="px-6 py-2 bg-[#103EF7] text-white rounded-full"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Success Screen
  if (showSuccessScreen) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center animate-scale-in">
            <Check className="w-12 h-12 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{successMessage}</p>
        </div>
      </div>
    )
  }

  const progress = getProgress()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Active Ride Details</h1>
        </div>
        <button className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-full hover:bg-red-50">
          Help
        </button>
      </div>

      <div className="p-6 max-w-md mx-auto">
        {/* URGENT Badge */}
        <div className="mb-4">
          <span className="px-4 py-1 bg-red-50 border border-red-200 text-red-600 text-sm font-medium rounded-full">
            URGENT
          </span>
        </div>

        {/* Addresses */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-1">Pickup</p>
            <p className="text-gray-900 font-medium">{order.pickupAddress}</p>
          </div>

          {order.status === 'DRIVER_ASSIGNED' && (
            <button
              onClick={() => window.open(`https://maps.google.com/?q=${order.pickupLat},${order.pickupLng}`, '_blank')}
              className="w-full mb-4 py-3 border-2 border-[#103EF7] text-[#103EF7] rounded-full font-semibold flex items-center justify-center gap-2 hover:bg-blue-50 transition"
            >
              <MapPin className="w-5 h-5" />
              View Pick Up Direction
            </button>
          )}

          {order.status === 'IN_TRANSIT' && (
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Drop Off</p>
                <p className="text-gray-900 font-medium">{order.deliveryAddress}</p>
              </div>

              <button
                onClick={() => window.open(`https://maps.google.com/?q=${order.deliveryLat},${order.deliveryLng}`, '_blank')}
                className="w-full mb-4 py-3 border-2 border-[#103EF7] text-[#103EF7] rounded-full font-semibold flex items-center justify-center gap-2 hover:bg-blue-50 transition"
              >
                <MapPin className="w-5 h-5" />
                View Drop Off Direction
              </button>
            </>
          )}
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm space-y-3">
          <div>
            <p className="text-sm text-gray-500">Distance Between Pickup and Drop</p>
            <p className="text-gray-900 font-medium">{(order.distance / 1000).toFixed(0)} KM</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Parcel Size</p>
            <p className="text-gray-900 font-medium">
              {order.packageSize} ({order.packageWeight} kg)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Number of Package</p>
              <p className="text-gray-900 font-medium">1</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Drop of Time</p>
              <p className="text-red-600 font-medium">Today, {new Date(order.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-500">Fare</p>
            <p className="text-gray-900 font-bold text-2xl">£{order.totalPrice}</p>
          </div>
        </div>

        {/* Parcel Image Upload (Only at DRIVER_ARRIVED status) */}
        {order.status === 'DRIVER_ARRIVED' && !parcelImagePreview && (
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <p className="text-sm font-medium text-gray-700 mb-3">Parcel Image</p>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#103EF7] transition">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">Upload Parcel Image</span>
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          </div>
        )}

        {parcelImagePreview && (
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Parcel Image</p>
              {order.status === 'DRIVER_ARRIVED' && (
                <button onClick={() => { setParcelImage(null); setParcelImagePreview(null); }} className="text-red-500">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="relative">
              <Image src={parcelImagePreview} alt="Parcel" width={400} height={300} className="rounded-lg w-full object-cover" />
              <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-white px-2 py-1 rounded text-xs">
                <div className="w-3 h-3 bg-blue-500 rounded-sm" />
                <span>Photo.Jpg</span>
              </div>
            </div>
          </div>
        )}

        {/* Progress Timeline */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <p className="text-sm font-medium text-gray-700 mb-4">Progress</p>
          <div className="space-y-4">
            {progress.map((step, index) => (
              <div key={index} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-4 h-4 rounded-full ${
                      step.completed ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                  {index < progress.length - 1 && (
                    <div className={`w-0.5 h-12 ${step.completed ? 'bg-green-500' : 'bg-gray-300'}`} />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <p className={`font-medium ${step.completed ? 'text-gray-900' : 'text-gray-400'}`}>
                    {step.label}
                  </p>
                  {step.time && (
                    <p className="text-xs text-gray-500 mt-1">{step.time}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {order.status === 'DRIVER_ASSIGNED' && (
            <button
              onClick={handleReachedPickup}
              className="w-full bg-[#103EF7] text-white py-4 rounded-full font-semibold text-lg hover:bg-[#0D35D1] transition"
            >
              Reached Pickup Location
            </button>
          )}

          {order.status === 'DRIVER_ARRIVED' && parcelImage && (
            <button
              onClick={handleConfirmPickup}
              className="w-full bg-[#103EF7] text-white py-4 rounded-full font-semibold text-lg hover:bg-[#0D35D1] transition"
            >
              Confirm Pickup
            </button>
          )}

          {(order.status === 'PICKED_UP' || order.status === 'IN_TRANSIT') && (
            <>
              <button
                onClick={() => window.location.href = `tel:${order.user.mobile}`}
                className="w-full bg-[#103EF7] text-white py-4 rounded-full font-semibold text-lg hover:bg-[#0D35D1] transition flex items-center justify-center gap-2"
              >
                <Phone className="w-5 h-5" />
                Call User
              </button>
              <button
                onClick={handleConfirmDrop}
                className="w-full bg-white border-2 border-[#103EF7] text-[#103EF7] py-4 rounded-full font-semibold hover:bg-blue-50 transition"
              >
                Confirm Drop
              </button>
            </>
          )}
        </div>
      </div>

      {/* Pickup OTP Modal */}
      {showPickupOtpModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowPickupOtpModal(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verify Pickup</h2>
            <p className="text-sm text-gray-600 mb-6">Enter OTP</p>

            <div className="flex items-center justify-center gap-3 mb-6">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-[#103EF7] focus:outline-none"
                  autoFocus={index === 0}
                />
              ))}
            </div>

            <button
              onClick={handleVerifyPickupOTP}
              disabled={otpLoading}
              className="w-full bg-[#103EF7] text-white py-4 rounded-full font-semibold hover:bg-[#0D35D1] transition disabled:opacity-50"
            >
              {otpLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Verify'}
            </button>
          </div>
        </>
      )}

      {/* Drop OTP Modal */}
      {showDropOtpModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowDropOtpModal(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verify Drop</h2>
            <p className="text-sm text-gray-600 mb-6">Enter OTP</p>

            <div className="flex items-center justify-center gap-3 mb-6">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-[#103EF7] focus:outline-none"
                  autoFocus={index === 0}
                />
              ))}
            </div>

            <button
              onClick={handleVerifyDropOTP}
              disabled={otpLoading}
              className="w-full bg-[#103EF7] text-white py-4 rounded-full font-semibold hover:bg-[#0D35D1] transition disabled:opacity-50"
            >
              {otpLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Verify'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
