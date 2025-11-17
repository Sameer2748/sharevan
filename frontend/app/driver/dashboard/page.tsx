'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { driverAPI } from '@/lib/api'
import { toast } from 'sonner'
import { MapPin, Menu, Bell, User, History, HelpCircle, Loader2 } from 'lucide-react'
import Image from 'next/image'
import driverTruckIcon from '@icons/driver-dashboard.png'

export default function DriverDashboard() {
  const router = useRouter()
  const { user, isAuthenticated, hasHydrated } = useAuthStore()
  const [activeOrder, setActiveOrder] = useState<any>(null)
  const [availableOrders, setAvailableOrders] = useState<any[]>([])
  const [showNewRideDrawer, setShowNewRideDrawer] = useState(false)
  const [selectedRide, setSelectedRide] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(false)
  const [seenOrderIds, setSeenOrderIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!hasHydrated) return

    if (!isAuthenticated || user?.role !== 'DRIVER') {
      router.replace('/auth/login?role=driver')
      return
    }

    // Check if onboarding is completed
    if (!user.onboardingCompleted) {
      router.replace('/driver/onboarding')
      return
    }

    fetchData()

    // Poll for new orders every 5 seconds
    const pollInterval = setInterval(() => {
      fetchAvailableOrders()
      if (activeOrder) {
        fetchActiveOrder()
      }
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [hasHydrated, isAuthenticated, user, router])

  const fetchData = async () => {
    try {
      await Promise.all([fetchActiveOrder(), fetchAvailableOrders()])
    } finally {
      setLoading(false)
    }
  }

  const fetchActiveOrder = async () => {
    try {
      const response = await driverAPI.getActiveOrder()
      setActiveOrder(response.data.data.order)
    } catch (error) {
      console.error('Failed to fetch active order')
    }
  }

  const fetchAvailableOrders = async () => {
    try {
      const response = await driverAPI.getAvailableOrders()
      const orders = response.data.data.orders || []
      setAvailableOrders(orders)

      // Filter out orders that have already been seen
      const unseenOrders = orders.filter((order: any) => !seenOrderIds.has(order.id))

      // Show drawer only if there are NEW unseen orders and drawer is not already showing
      if (unseenOrders.length > 0 && !showNewRideDrawer) {
        const newOrder = unseenOrders[0]
        setShowNewRideDrawer(true)
        setSelectedRide(newOrder)
        // Mark this order as seen
        setSeenOrderIds(prev => new Set([...prev, newOrder.id]))
      } else if (orders.length === 0 && showNewRideDrawer) {
        // Close drawer if no orders available
        setShowNewRideDrawer(false)
        setSelectedRide(null)
      }
    } catch (error) {
      console.error('Failed to fetch orders')
    }
  }

  const handleAcceptRide = async (orderId: string) => {
    try {
      await driverAPI.acceptOrder(orderId)
      toast.success('Ride accepted!')
      setShowNewRideDrawer(false)
      await fetchActiveOrder()
      await fetchAvailableOrders()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to accept ride')
    }
  }

  const handleRejectRide = () => {
    setShowNewRideDrawer(false)
    setSelectedRide(null)
  }

  const toggleOnlineStatus = async () => {
    try {
      const newStatus = !isOnline
      await driverAPI.toggleOnlineStatus(newStatus)
      setIsOnline(newStatus)
      toast.success(newStatus ? 'You are now online' : 'You are now offline')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update status')
    }
  }

  if (!hasHydrated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#103EF7]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Blue Background */}
      <div className="bg-gradient-to-b from-[#103EF7] to-[#1E4FFF] pt-12 pb-32 px-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white/80 text-sm">Welcome</p>
              <p className="text-white font-semibold text-lg">{user?.name || 'Driver'}</p>
            </div>
          </div>
          <Bell className="w-6 h-6 text-white" />
        </div>

        {/* Online/Offline Toggle */}
        <div className="mb-8 flex items-center justify-center">
          <button
            onClick={toggleOnlineStatus}
            className={`px-6 py-2 rounded-full font-semibold text-sm transition flex items-center gap-2 ${
              isOnline
                ? 'bg-green-500 text-white'
                : 'bg-white/20 text-white border border-white/40'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-white' : 'bg-gray-400'}`} />
            {isOnline ? 'Online' : 'Offline'}
          </button>
        </div>

        {/* Location */}
        <div className="flex items-center justify-center gap-2 text-white/90 mb-8">
          <MapPin className="w-5 h-5" />
          <span className="text-sm">Oxford, United Kingdom</span>
        </div>

        {/* Earnings Banner */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm mb-1">Earn Upto</p>
              <p className="text-white text-3xl font-bold">£245</p>
              <p className="text-white/80 text-sm">with Sharevan</p>
            </div>
            <Image
              src={driverTruckIcon}
              alt="Delivery truck"
              width={100}
              height={100}
              className="drop-shadow-lg"
            />
          </div>
        </div>
      </div>

      {/* White Card Section - Overlapping */}
      <div className="relative -mt-20 px-6">
        <div className="bg-white rounded-3xl shadow-xl p-6">
          {/* Quick Actions */}
          <div className="mb-6">
            <h3 className="text-gray-900 font-semibold text-lg mb-4">Quick Actions</h3>
            <div className="flex items-center justify-around">
              <button className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                  <Menu className="w-6 h-6 text-gray-700" />
                </div>
                <span className="text-xs text-gray-600">History</span>
              </button>
              <button className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                  <HelpCircle className="w-6 h-6 text-gray-700" />
                </div>
                <span className="text-xs text-gray-600">Help</span>
              </button>
              <button className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-700" />
                </div>
                <span className="text-xs text-gray-600">Profile</span>
              </button>
            </div>
          </div>

          {/* Active Rides */}
          <div>
            <h3 className="text-gray-900 font-semibold text-lg mb-4">Active Rides</h3>
            {activeOrder ? (
              <button
                onClick={() => router.push(`/driver/ride/${activeOrder.id}`)}
                className="w-full bg-white border border-gray-200 rounded-2xl p-4 hover:border-[#103EF7] transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm text-gray-500">Pickup</p>
                    <p className="text-gray-900 font-medium">{activeOrder.pickupAddress}</p>
                  </div>
                  <span className="text-green-600 text-xs font-medium px-2 py-1 bg-green-50 rounded-full">
                    {(activeOrder.distance / 1000).toFixed(1)} Km Away
                  </span>
                </div>
                <div className="mb-3">
                  <p className="text-sm text-gray-500">Drop Off</p>
                  <p className="text-gray-900 font-medium">{activeOrder.deliveryAddress}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Fare</p>
                    <p className="text-gray-900 font-bold text-lg">£{activeOrder.totalPrice}</p>
                  </div>
                  <span className="px-4 py-2 bg-[#103EF7] text-white text-sm font-medium rounded-full">
                    {activeOrder.status}
                  </span>
                </div>
              </button>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Image
                  src={driverTruckIcon}
                  alt="No active rides"
                  width={120}
                  height={120}
                  className="opacity-50 mb-4"
                />
                <p className="text-gray-500 font-medium">You Have No Active Rides</p>
              </div>
            )}
          </div>

          {/* Referral Card */}
          <div className="mt-6 bg-gradient-to-r from-[#103EF7] to-[#1E4FFF] rounded-2xl p-6 text-white">
            <p className="text-white/90 mb-2">Refer Your Friends and Earn Upto</p>
            <p className="text-2xl font-bold mb-4">£245</p>
            <button className="bg-white text-[#103EF7] px-6 py-2 rounded-full font-semibold text-sm hover:bg-gray-100 transition">
              Refer Now
            </button>
          </div>
        </div>
      </div>

      {/* New Ride Notification Drawer */}
      {showNewRideDrawer && selectedRide && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={handleRejectRide}
          />

          {/* Drawer */}
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Ride Available</h2>
              <span className="px-3 py-1 bg-red-50 border border-red-200 text-red-600 text-sm font-medium rounded-full">
                URGENT
              </span>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Pickup</p>
                  <p className="text-gray-900 font-medium">{selectedRide.pickupAddress}</p>
                </div>
                <span className="text-green-600 text-xs font-medium px-2 py-1 bg-green-50 rounded-full">
                  {(selectedRide.distance / 1000).toFixed(1)} Km Away
                </span>
              </div>

              <div>
                <p className="text-sm text-gray-500">Drop Off</p>
                <p className="text-gray-900 font-medium">{selectedRide.deliveryAddress}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Distance Between Pickup and Drop</p>
                <p className="text-gray-900 font-medium">{selectedRide.distance ? selectedRide.distance.toFixed(0) : '0'} KM</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Parcel Size</p>
                <p className="text-gray-900 font-medium">
                  {selectedRide.packageSize} ({selectedRide.packageWeight} kg)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Number of Package</p>
                  <p className="text-gray-900 font-medium">1</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Drop of Time</p>
                  <p className="text-red-600 font-medium">
                    {new Date(selectedRide.createdAt).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Fare</p>
                <p className="text-gray-900 font-bold text-2xl">£{selectedRide.estimatedPrice || selectedRide.finalPrice || '0'}</p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleAcceptRide(selectedRide.id)}
                className="w-full bg-[#103EF7] text-white py-4 rounded-full font-semibold text-lg hover:bg-[#0D35D1] transition"
              >
                Accept for £{selectedRide.estimatedPrice || selectedRide.finalPrice || '0'}
              </button>
              <button
                onClick={handleRejectRide}
                className="w-full bg-white border border-gray-300 text-gray-700 py-4 rounded-full font-semibold hover:bg-gray-50 transition"
              >
                Reject
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
