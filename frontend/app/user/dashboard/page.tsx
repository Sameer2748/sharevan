'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Package, Clock, History, HelpCircle, User as UserIcon, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/store/authStore'
import { userAPI } from '@/lib/api'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import StatusBadge from '@/components/shared/StatusBadge'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import dashboardHero from '@icons/user-dashboard-top.png'
import parcelIcon1 from '@icons/parcel-select-icon-1.jpg'
import parcelIcon2 from '@icons/parcel-select-icon-2.jpg'
import parcelIcon3 from '@icons/parcel-select-icon-3.jpg'

export default function UserDashboard() {
  const router = useRouter()
  const { user, isAuthenticated, hasHydrated } = useAuthStore()
  const [dashboard, setDashboard] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentLocation, setCurrentLocation] = useState<string>('Oxford, United Kingdom')

  useEffect(() => {
    if (!hasHydrated) return

    if (!isAuthenticated || user?.role !== 'USER') {
      router.replace('/auth/login?role=user')
      return
    }

    fetchDashboard()
    getCurrentLocation()
  }, [hasHydrated, isAuthenticated, user?.role])

  const getCurrentLocation = async () => {
    // First try GPS for exact location
    if (!navigator.geolocation) {
      // GPS not available, fallback to IP
      await getLocationFromIP()
      return
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        })
      })

      // Got GPS coordinates, use Google Maps for accurate address
      await getLocationFromCoordinates(position.coords.latitude, position.coords.longitude)
    } catch (error) {
      // GPS failed, silently fallback to IP
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
        let sublocality = ''

        for (const component of addressComponents) {
          if (component.types.includes('sublocality') || component.types.includes('sublocality_level_1')) {
            sublocality = component.long_name
          }
          if (component.types.includes('locality')) {
            city = component.long_name
          }
          if (component.types.includes('administrative_area_level_1')) {
            state = component.long_name
          }
        }

        // Show most specific location available
        if (sublocality && state) {
          setCurrentLocation(`${sublocality}, ${state}`)
        } else if (city && state) {
          setCurrentLocation(`${city}, ${state}`)
        } else if (state) {
          setCurrentLocation(state)
        } else {
          // Fallback to first 2 parts of formatted address
          const parts = data.results[0].formatted_address.split(',')
          setCurrentLocation(parts.slice(0, 2).map((p: string) => p.trim()).join(', '))
        }
      }
    } catch (error) {
      console.error('Error geocoding:', error)
      // Fallback to IP
      await getLocationFromIP()
    }
  }

  const getLocationFromIP = async () => {
    try {
      // Use a free IP geolocation service to get approximate coordinates
      const response = await fetch('https://ipapi.co/json/')
      const data = await response.json()
      
      // If we have latitude and longitude, use Google Maps API for accurate location
      if (data.latitude && data.longitude) {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 
                      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_FALLBACK || 
                      'AIzaSyAg1QBIXXbGLiNO26G6GvHQwmdJJ0usUV0'
        
        const geocodeResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${data.latitude},${data.longitude}&key=${apiKey}&result_type=locality|administrative_area_level_1|administrative_area_level_2`
        )
        
        const geocodeData = await geocodeResponse.json()
        
        if (geocodeData.results && geocodeData.results.length > 0) {
          // Extract city, state, and country from address components
          const addressComponents = geocodeData.results[0].address_components
          let city = ''
          let state = ''
          let country = ''
          
          for (const component of addressComponents) {
            // Get city (locality or sublocality)
            if (!city && (component.types.includes('locality') || component.types.includes('sublocality') || component.types.includes('sublocality_level_1'))) {
              city = component.long_name
            }
            // Get state/province (administrative_area_level_1)
            if (!state && component.types.includes('administrative_area_level_1')) {
              state = component.long_name
            }
            // Get country
            if (!country && component.types.includes('country')) {
              country = component.long_name
            }
          }
          
          // Format location string based on what we have
          if (city && state && country) {
            // Show city and state for better accuracy (e.g., "Gurgaon, Haryana")
            setCurrentLocation(`${city}, ${state}`)
            return
          } else if (city && country) {
            setCurrentLocation(`${city}, ${country}`)
            return
          } else if (state && country) {
            setCurrentLocation(`${state}, ${country}`)
            return
          }
        }
      }
      
      // Fallback to IP service data if Google Maps API fails
      if (data.city && data.region && data.country_name) {
        // For India, show city and state
        if (data.country_name === 'India') {
          setCurrentLocation(`${data.city}, ${data.region}`)
        } else {
          setCurrentLocation(`${data.city}, ${data.country_name}`)
        }
      } else if (data.city && data.country_name) {
        setCurrentLocation(`${data.city}, ${data.country_name}`)
      } else if (data.region && data.country_name) {
        setCurrentLocation(`${data.region}, ${data.country_name}`)
      }
    } catch (error) {
      console.warn('Failed to get location from IP:', error)
      // Keep default location
    }
  }

  const fetchDashboard = async () => {
    try {
      const response = await userAPI.getDashboard()
      setDashboard(response.data.data)
    } catch (error: any) {
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const totalOrders = useMemo(() => {
    const active = dashboard?.stats?.activeOrders || 0
    const completed = dashboard?.stats?.completedOrders || 0
    return active + completed
  }, [dashboard])

  if (!hasHydrated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F5FF]">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    )
  }

  const locationLabel = currentLocation

  return (
    <div className="min-h-screen w-full bg-[#EEF2FF] overflow-hidden">
      {/* Full-width Blue Banner */}
      <div className="relative w-full bg-gradient-to-br from-[#0F58FF] via-[#2C7BFF] to-[#62B3FF] pt-6 overflow-hidden">
        <div className="mx-auto w-full max-w-[430px] px-5 relative">
          <div className="flex justify-center">
            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2 text-xs font-semibold text-white">
              <span className="inline-flex h-2 w-2 rounded-full bg-white" />
              {locationLabel}
            </div>
          </div>

          <div className="relative mt-4 flex items-center h-[200px]">
            {/* Hero Image on LEFT - Half hidden under white section */}
            <Image
              src={dashboardHero}
              alt="Sharevan Hero"
              className="absolute left-[-112px] bottom-[-110px] w-[380px] h-auto object-contain z-0"
              priority
            />

            {/* Text Content on RIGHT - Fixed position */}
            <div className="ml-auto  space-y-1 -mt-8 relative z-10">
              <h1 className="text-[18px] font-bold leading-[1.2] text-white">
                Get Upto <span className="text-[22px] font-bold text-yellow-300 inline-block leading-[1]">50% </span>{' '}Off with
                <span className="block"> Share Van</span>
              </h1>
              <button
                onClick={() => router.push('/user/booking')}
                className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2 mt-2 text-base font-semibold text-[#0F58FF] shadow-md transition hover:bg-white/90"
              >
                Book Now
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* White Section with Rounded Top */}
      <div className="relative z-10 mx-auto w-full max-w-[430px] -mt-[2rem] rounded-t-[40px] bg-white pb-16 shadow-[0_-8px_20px_rgba(0,0,0,0.08)]">
        <div className="px-5 pt-8 space-y-6">
          {/* Search Card */}
          <button
            onClick={() => router.push('/user/booking')}
            className="w-full rounded-[24px] border border-[#E0E6FF] bg-[#F5F7FF] px-4 py-4 text-left text-base font-medium text-gray-500 transition hover:border-[#0F58FF] hover:bg-white"
          >
            Where do you want to send your Parcel
          </button>
          {/* Your Bookings Section */}
          {dashboard?.activeOrders && dashboard.activeOrders.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-3">Your Bookings</h3>
              {dashboard.activeOrders.map((order: any) => (
                <button
                  key={order.id}
                  onClick={() => router.push(`/user/orders/${order.id}`)}
                  className="w-full rounded-[28px] bg-gradient-to-br from-[#0F58FF] via-[#2C7BFF] to-[#62B3FF] p-5 text-left text-white shadow-lg transition hover:shadow-xl"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white/90 mb-1">
                        Your Driver is Arriving in {order.eta || '10 Minutes'}
                      </p>
                      <p className="text-base font-semibold">
                        {order.pickupCity || 'Oxford'} → {order.deliveryCity || 'Liverpool'}
                      </p>
                    </div>
                    <div className="ml-4">
                      <Image
                        src={parcelIcon3}
                        alt="Delivery Truck"
                        className="h-16 w-auto object-contain opacity-90"
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Shipment Categories */}
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                title: 'Small Shipment',
                subtitle: '2 Boxes',
                image: parcelIcon1,
                className: 'h-[150px]',
              },
              {
                title: 'Large Shipment',
                subtitle: '>10 Boxes',
                image: parcelIcon3,
                className: 'h-[150px]',
              },
              {
                title: 'Medium Shipment',
                subtitle: '4 Boxes',
                image: parcelIcon2,
                className: 'h-[150px]',
              },
              {
                title: 'van ai',
                subtitle: 'Use AI to Determine your Package Size',
                image: null,
                className: 'h-[150px]',
                isAI: true,
              },
            ].map((item) => (
              <button
                key={item.title}
                onClick={() => router.push('/user/booking')}
                className={`group flex flex-col justify-between overflow-hidden rounded-[26px] border bg-white p-4 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md ${item.className} ${item.isAI ? 'border-2 border-[#0F58FF]' : 'border border-[#E9EEFF]'}`}
              >
                <div>
                  <p className={`text-sm font-semibold ${item.isAI ? 'text-[#0F58FF]' : 'text-gray-900'}`}>
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs font-medium text-gray-500">{item.subtitle}</p>
                </div>
                {item.image && (
                  <div className="flex justify-end">
                    <Image
                      src={item.image}
                      alt={item.title}
                      className="h-20 w-auto object-contain"
                    />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Driver Promo */}
          <div className="overflow-hidden rounded-[30px] bg-gradient-to-br from-[#0F58FF] to-[#1544CE] p-6 text-white shadow-lg">
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.35em] text-white/60">
                Earn with Share Van
              </p>
              <h2 className="text-lg font-semibold leading-snug">
                Join Share Van Driver Fleet and Earn Upto{' '}
                <span className="text-yellow-300">
                  €{Math.max(234, Math.round(totalOrders * 12 + 234))}/ Month
                </span>
              </h2>
            </div>
            <button
              onClick={() => router.push('/auth/login?role=driver')}
              className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#0F58FF] shadow-md transition hover:bg-white/90"
            >
              Book Now
            </button>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
            <div className="mt-4 grid grid-cols-4 gap-3">
              {[
                {
                  title: 'Track',
                  icon: Package,
                  action: () => router.push('/user/orders'),
                },
                {
                  title: 'History',
                  icon: History,
                  action: () => router.push('/user/orders'),
                },
                {
                  title: 'Help',
                  icon: HelpCircle,
                  action: () => toast.info('Support is coming soon!'),
                },
                {
                  title: 'Profile',
                  icon: UserIcon,
                  action: () => router.push('/user/profile'),
                },
              ].map(({ title, icon: Icon, action }) => (
                <button
                  key={title}
                  onClick={action}
                  className="flex flex-col items-center gap-2 rounded-[22px] border border-transparent bg-white px-3 py-4 text-sm font-medium text-gray-600 shadow-sm transition hover:-translate-y-1 hover:border-[#0F58FF]/40 hover:text-[#0F58FF] hover:shadow-md"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF3FF] text-[#0F58FF]">
                    <Icon className="h-5 w-5" />
                  </span>
                  {title}
                </button>
              ))}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="pb-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Recent Orders</h3>
              {dashboard?.recentOrders?.length > 0 && (
                <button
                  onClick={() => router.push('/user/orders')}
                  className="flex items-center gap-1 text-sm font-semibold text-[#0F58FF]"
                >
                  View All
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>

            {!dashboard?.recentOrders || dashboard?.recentOrders.length === 0 ? (
              <div className="rounded-[30px] bg-white p-10 text-center shadow-sm">
                <Package className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-3 text-sm text-gray-500">No orders yet</p>
                <button
                  onClick={() => router.push('/user/booking')}
                  className="mt-3 text-sm font-semibold text-[#0F58FF] hover:underline"
                >
                  Book your first delivery →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboard?.recentOrders?.map((order: any) => (
                  <button
                    key={order.id}
                    onClick={() => router.push(`/user/orders/${order.id}`)}
                    className="w-full rounded-[28px] bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">#{order.orderNumber}</p>
                        <p className="mt-1 text-xs text-gray-400">
                          {formatDateTime(order.createdAt)}
                        </p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                      <div className="flex gap-2">
                        <span className="mt-1 h-2 w-2 rounded-full bg-green-500" />
                        <span className="line-clamp-1">{order.pickupAddress}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="mt-1 h-2 w-2 rounded-full bg-red-500" />
                        <span className="line-clamp-1">{order.deliveryAddress}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm font-semibold text-[#0F58FF]">
                      <span>
                        {order.packageSize} • {order.distance?.toFixed(1) ?? '0.0'} km
                      </span>
                      <span>{formatCurrency(order.finalPrice || order.estimatedPrice)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
