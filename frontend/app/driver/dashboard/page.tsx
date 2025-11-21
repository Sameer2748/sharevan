'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { driverAPI } from '@/lib/api'
import { toast } from 'sonner'
import { MapPin, Menu, Bell, User, History, HelpCircle, Loader2 } from 'lucide-react'
import Image from 'next/image'
import dashboardHero from '@icons/user-dashboard-top.png'
import driverTruckIcon from '@icons/driver-dashboard.png'
import { initSocket, getSocket, onNewOrderAlert, onOrderTaken, onOrderCancelled, offEvent } from '@/lib/socket'

export default function DriverDashboard() {
  const router = useRouter()
  const { user, isAuthenticated, hasHydrated, token } = useAuthStore()
  const [activeOrder, setActiveOrder] = useState<any>(null)
  const [availableOrders, setAvailableOrders] = useState<any[]>([])
  const [showNewRideDrawer, setShowNewRideDrawer] = useState(false)
  const [selectedRide, setSelectedRide] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(false)
  const [rejectedOrderIds, setRejectedOrderIds] = useState<Set<string>>(new Set())
  const [currentLocation, setCurrentLocation] = useState<string>('Oxford, United Kingdom')

  // Load rejected orders from localStorage on mount and clean old ones
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('rejectedOrders')
      const timestamp = localStorage.getItem('rejectedOrdersTimestamp')
      const now = Date.now()
      const oneDay = 24 * 60 * 60 * 1000 // 24 hours

      // Clear rejected orders if older than 24 hours
      if (timestamp && (now - parseInt(timestamp)) > oneDay) {
        localStorage.removeItem('rejectedOrders')
        localStorage.removeItem('rejectedOrdersTimestamp')
      } else if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setRejectedOrderIds(new Set(parsed))
        } catch (error) {
          console.error('Failed to parse rejected orders')
          localStorage.removeItem('rejectedOrders')
        }
      }

      // Set timestamp if not present
      if (!timestamp) {
        localStorage.setItem('rejectedOrdersTimestamp', now.toString())
      }
    }
  }, [])

  // Separate effect for initial data fetch and location (only once)
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
    getCurrentLocation() // Fetch location only once on mount
  }, [hasHydrated, isAuthenticated, user?.role, user?.onboardingCompleted])

  // Separate effect for WebSocket listeners
  useEffect(() => {
    if (!token || !hasHydrated || !isAuthenticated) return

    // Initialize WebSocket connection
    initSocket(token)

    // Listen for new order alerts
    const handleNewOrder = (data: any) => {
      console.log('🔔 New order alert received:', data)
      const order = data.order

      if (!order) {
        console.error('No order data in new-order-alert event')
        return
      }

      // Check if order was rejected by this driver
      if (rejectedOrderIds.has(order.id)) {
        console.log('⛔ Order was rejected by this driver, skipping:', order.orderNumber)
        return
      }

      setAvailableOrders(prev => {
        // Avoid duplicates
        if (prev.find(o => o.id === order.id)) return prev
        console.log('✅ Adding new order to available orders:', order.orderNumber)
        return [order, ...prev]
      })

      // Show drawer if no active order and no drawer is currently showing
      if (!activeOrder && !showNewRideDrawer) {
        setShowNewRideDrawer(true)
        setSelectedRide(order)
        toast.info('New ride available!')
      }
    }

    // Listen for order taken by another driver
    const handleOrderTaken = (data: any) => {
      console.log('Order taken:', data)
      const orderId = data.orderId

      // Remove from available orders
      setAvailableOrders(prev => prev.filter(o => o.id !== orderId))

      // Close drawer if this order was selected
      setSelectedRide(prev => prev?.id === orderId ? null : prev)
      setShowNewRideDrawer(prev => {
        if (prev && selectedRide?.id === orderId) return false
        return prev
      })
    }

    // Listen for order cancelled
    const handleOrderCancelled = (data: any) => {
      console.log('Order cancelled:', data)
      const orderId = data.orderId

      // Remove from available orders
      setAvailableOrders(prev => prev.filter(o => o.id !== orderId))

      // Close drawer if this order was selected
      setSelectedRide(prev => {
        if (prev?.id === orderId) {
          toast.info('Order was cancelled')
          return null
        }
        return prev
      })
      setShowNewRideDrawer(prev => prev && selectedRide?.id === orderId ? false : prev)

      // Refresh active order if it was cancelled
      setActiveOrder(prev => {
        if (prev?.id === orderId) {
          toast.info('Your active order was cancelled')
          return null
        }
        return prev
      })
    }

    onNewOrderAlert(handleNewOrder)
    onOrderTaken(handleOrderTaken)
    onOrderCancelled(handleOrderCancelled)

    // Cleanup listeners on unmount
    return () => {
      offEvent('new-order-alert', handleNewOrder)
      offEvent('order-taken', handleOrderTaken)
      offEvent('order-cancelled', handleOrderCancelled)
    }
  }, [hasHydrated, isAuthenticated, token])

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

      // Filter out rejected orders
      const filteredOrders = orders.filter((order: any) => !rejectedOrderIds.has(order.id))
      setAvailableOrders(filteredOrders)

      // Show drawer for the first available order if not currently showing
      if (filteredOrders.length > 0 && !showNewRideDrawer && !activeOrder) {
        const newOrder = filteredOrders[0]
        setShowNewRideDrawer(true)
        setSelectedRide(newOrder)
      } else if (filteredOrders.length === 0 && showNewRideDrawer) {
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

  const handleRejectRide = async (orderId: string) => {
    try {
      // Call API to reject order
      await driverAPI.rejectOrder(orderId)

      // Add to rejected list
      const newRejectedIds = new Set([...rejectedOrderIds, orderId])
      setRejectedOrderIds(newRejectedIds)

      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('rejectedOrders', JSON.stringify([...newRejectedIds]))
      }

      // Close drawer
      setShowNewRideDrawer(false)
      setSelectedRide(null)

      // Fetch next available order
      await fetchAvailableOrders()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject order')
    }
  }

  const toggleOnlineStatus = async () => {
    try {
      const newStatus = !isOnline
      await driverAPI.toggleOnlineStatus(newStatus)

      // Emit WebSocket event to join/leave online-drivers room
      const socket = getSocket()
      if (socket?.connected) {
        socket.emit('driver:status-change', { isOnline: newStatus })
        console.log(`📡 Emitted driver:status-change - isOnline: ${newStatus}`)
      }

      setIsOnline(newStatus)
      toast.success(newStatus ? 'You are now online' : 'You are now offline')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update status')
    }
  }

  const getLocationFromIP = async () => {
    try {
      const apiKey = '008929b5aada45279a7b475edc67daa4'
      const response = await fetch(`https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}`)
      const data = await response.json()

      if (data.city && data.country_name) {
        setCurrentLocation(`${data.city}, ${data.country_name}`)
      } else if (data.state_prov && data.country_name) {
        setCurrentLocation(`${data.state_prov}, ${data.country_name}`)
      } else if (data.country_name) {
        setCurrentLocation(data.country_name)
      } else {
        setCurrentLocation('United Kingdom')
      }
    } catch (error) {
      console.error('IP geolocation failed:', error)
      setCurrentLocation('United Kingdom')
    }
  }

  const getCurrentLocation = async () => {
    // Check if geolocation is available
    if (!navigator.geolocation) {
      console.log('Geolocation not available, trying IP-based location')
      await getLocationFromIP()
      return
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false, // Set to false for better compatibility
          timeout: 10000,
          maximumAge: 300000 // Cache for 5 minutes
        })
      })

      // Got GPS coordinates, use Google Maps for accurate address
      await getLocationFromCoordinates(position.coords.latitude, position.coords.longitude)
    } catch (error) {
      console.log('GPS failed, trying IP-based location:', error)
      // GPS failed, try IP-based location
      await getLocationFromIP()
    }
  }

  const getLocationFromCoordinates = async (latitude: number, longitude: number) => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
                    'AIzaSyAg1QBIXXbGLiNO26G6GvHQwmdJJ0usUV0'

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
      )

      const data = await response.json()

      if (data.results && data.results.length > 0) {
        const addressComponents = data.results[0].address_components
        let city = ''
        let state = ''
        let country = ''

        for (const component of addressComponents) {
          if (component.types.includes('locality')) {
            city = component.long_name
          }
          if (component.types.includes('administrative_area_level_1')) {
            state = component.long_name
          }
          if (component.types.includes('country')) {
            country = component.long_name
          }
        }

        // Show most specific location available
        if (city && country) {
          setCurrentLocation(`${city}, ${country}`)
        } else if (state && country) {
          setCurrentLocation(`${state}, ${country}`)
        } else if (country) {
          setCurrentLocation(country)
        } else {
          // Fallback to formatted address
          const parts = data.results[0].formatted_address.split(',')
          setCurrentLocation(parts.slice(0, 2).map((p: string) => p.trim()).join(', '))
        }
      }
    } catch (error) {
      console.error('Error geocoding:', error)
      setCurrentLocation('United Kingdom')
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
    <div className="min-h-screen w-full bg-[#EEF2FF] overflow-hidden">
      {/* Full-width Blue Banner */}
      <div className="relative w-full bg-gradient-to-br from-[#0F58FF] via-[#2C7BFF] to-[#62B3FF] pt-6 overflow-hidden">
        <div className="mx-auto w-full max-w-[430px] px-5 relative">
          {/* Location Badge */}
          <div className="flex justify-center">
            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2 text-xs font-semibold text-white">
              <span className="inline-flex h-2 w-2 rounded-full bg-white" />
              {currentLocation}
            </div>
          </div>

          {/* Hero Section with Image on Left and Text on Right */}
          <div className="relative mt-4 flex items-center h-[200px] overflow-visible">
            {/* Hero Image on LEFT - Responsive size and position based on screen width */}
            <div
              className="absolute pointer-events-none z-0 w-[320px] min-[372px]:w-[380px] -left-[90px] min-[372px]:-left-[112px] -bottom-[86px] min-[372px]:-bottom-[110px]"
            >
              <Image
                src={dashboardHero}
                alt="Sharevan Hero"
                className="w-full h-auto object-contain"
                priority
              />
            </div>

            {/* Text Content on RIGHT - Responsive font size */}
            <div className="ml-auto space-y-1 -mt-8 relative z-10">
              <h1 className="text-[14px] sm:text-[16px] md:text-[18px] font-bold leading-[1.2] text-white">
                Earn Upto <span className="text-[18px] sm:text-[20px] md:text-[22px] font-bold text-yellow-300 inline-block leading-[1]">£245</span>{' '}
                <span className="block">with Share Van</span>
              </h1>
              <button
                onClick={toggleOnlineStatus}
                className={`inline-flex items-center justify-center rounded-full px-4 sm:px-5 py-2 mt-2 text-sm sm:text-base font-semibold shadow-md transition ${
                  isOnline
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-white text-[#0F58FF] hover:bg-white/90'
                }`}
              >
                {isOnline ? 'Online' : 'Go Online'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* White Section with Rounded Top */}
      <div className="relative z-10 mx-auto w-full max-w-[430px] -mt-[2rem] rounded-t-[40px] bg-white pb-16 shadow-[0_-8px_20px_rgba(0,0,0,0.08)]">
        <div className="px-5 pt-8 space-y-6">
          {/* Quick Actions */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-3">Quick Actions</h3>
            <div className="flex items-center justify-around">
              <button
                onClick={() => router.push('/driver/history')}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-14 h-14 rounded-full bg-[#F5F7FF] flex items-center justify-center hover:bg-[#E8EDFF] transition">
                  <History className="w-6 h-6 text-[#0F58FF]" />
                </div>
                <span className="text-xs text-gray-600 font-medium">History</span>
              </button>
              <button className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-[#F5F7FF] flex items-center justify-center hover:bg-[#E8EDFF] transition">
                  <HelpCircle className="w-6 h-6 text-[#0F58FF]" />
                </div>
                <span className="text-xs text-gray-600 font-medium">Help</span>
              </button>
              <button
                onClick={() => router.push('/driver/profile')}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-14 h-14 rounded-full bg-[#F5F7FF] flex items-center justify-center hover:bg-[#E8EDFF] transition">
                  <User className="w-6 h-6 text-[#0F58FF]" />
                </div>
                <span className="text-xs text-gray-600 font-medium">Profile</span>
              </button>
            </div>
          </div>

          {/* Active Rides */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-3">Active Rides</h3>
            {activeOrder ? (
              <button
                onClick={() => router.push(`/driver/ride/${activeOrder.id}`)}
                className="w-full bg-white rounded-[24px] border border-gray-200 p-5 text-left shadow-sm transition hover:shadow-md"
              >
                {/* Order ID Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">ID: {activeOrder.orderNumber}</p>
                    <p className="text-base font-bold text-gray-900">
                      {activeOrder.pickupAddress?.split(',')[0] || 'Pickup'} → {activeOrder.deliveryAddress?.split(',')[0] || 'Delivery'}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                {/* Urgent Delivery Badge */}
                {activeOrder.bookingType === 'URGENT' && (
                  <div className="flex items-center justify-between mb-4 bg-red-50 rounded-xl px-4 py-2.5">
                    <span className="text-sm font-semibold text-red-600">Urgent Delivery</span>
                    <span className="text-sm font-medium text-red-600">
                      Drop by {new Date(activeOrder.urgentDeliveryTime || activeOrder.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                )}
              </button>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 rounded-[24px] bg-[#F5F7FF]">
                <Image
                  src={driverTruckIcon}
                  alt="No active rides"
                  width={100}
                  height={100}
                  className="opacity-40 mb-3"
                />
                <p className="text-gray-500 font-medium text-sm">You Have No Active Rides</p>
              </div>
            )}
          </div>

          {/* Referral Card */}
          <div className="bg-gradient-to-br from-[#0F58FF] via-[#2C7BFF] to-[#62B3FF] rounded-[24px] p-6 text-white shadow-lg">
            <p className="text-white/90 text-sm mb-2">Refer Your Friends and Earn Upto</p>
            <p className="text-3xl font-bold mb-4">£245</p>
            <button className="bg-white text-[#0F58FF] px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-white/90 transition shadow-md">
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
                onClick={() => handleRejectRide(selectedRide.id)}
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
