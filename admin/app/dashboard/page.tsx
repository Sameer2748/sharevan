'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { adminAPI } from '@/lib/api'

interface DashboardStats {
  todayBookings: number
  ongoingTrips: number
  revenueToday: number
  availableDrivers: number
}

interface Booking {
  id: string
  orderIdShort: string
  status: string
  statusLabel: string
  userName: string
  fromLocation: string
  toLocation: string
  price: number
  time: string
  driverName: string | null
}

interface Alerts {
  driverVerification: number
  failedPayments: number
  atRiskJobs: number
}

interface WeeklyRevenue {
  daily: {
    Mon: number
    Tue: number
    Wed: number
    Thu: number
    Fri: number
    Sat: number
    Sun: number
  }
  total: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [alerts, setAlerts] = useState<Alerts | null>(null)
  const [weeklyRevenue, setWeeklyRevenue] = useState<WeeklyRevenue | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [statsRes, bookingsRes, alertsRes, revenueRes] = await Promise.all([
        adminAPI.getDashboardStats(),
        adminAPI.getRecentBookings(),
        adminAPI.getAlerts(),
        adminAPI.getWeeklyRevenue(),
      ])

      setStats(statsRes.data)
      setBookings(bookingsRes.data)
      setAlerts(alertsRes.data)
      setWeeklyRevenue(revenueRes.data)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    if (status === 'Ongoing' || status.includes('TRANSIT') || status.includes('ASSIGNED')) {
      return { bg: 'bg-yellow-100', text: 'text-yellow-800' }
    }
    if (status === 'Completed' || status === 'DELIVERED') {
      return { bg: 'bg-green-100', text: 'text-green-800' }
    }
    return { bg: 'bg-gray-100', text: 'text-gray-800' }
  }

  const getMaxRevenue = (revenue: WeeklyRevenue | null) => {
    if (!revenue) return 100
    return Math.max(...Object.values(revenue.daily), 100)
  }

  const getBarHeight = (value: number, max: number) => {
    if (max === 0) return 0
    return Math.round((value / max) * 100)
  }

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  const maxRevenue = getMaxRevenue(weeklyRevenue)

  return (
    <div className="p-3">
      <div className="max-w-[1142px] mx-auto flex flex-col gap-3">
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-3">
              {/* Today's Bookings */}
              <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-[#2B7FFF] rounded-[6px] flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 15 15" fill="none">
                      <path d="M5 1.25V3.75M10 1.25V3.75M1.875 7.5H13.125M2.5 5H12.5C13.1904 5 13.75 5.55964 13.75 6.25V12.5C13.75 13.1904 13.1904 13.75 12.5 13.75H2.5C1.80964 13.75 1.25 13.1904 1.25 12.5V6.25C1.25 5.55964 1.80964 5 2.5 5Z" stroke="white" strokeWidth="1.25" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-black">Today's Bookings</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-[#101828]">{stats.todayBookings}</span>
                </div>
              </div>

              {/* Ongoing Trips */}
              <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-[#00C950] rounded-[6px] flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 15 15" fill="none">
                      <path d="M1.25 7.5L3.75 10L8.75 5M13.75 7.5L11.25 10M8.75 7.5L13.75 2.5" stroke="white" strokeWidth="1.25" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-black">Ongoing Trips</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-[#101828]">{stats.ongoingTrips}</span>
                </div>
              </div>

              {/* Revenue Today */}
              <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-[#F0B100] rounded-[6px] flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 15 15" fill="none">
                      <path d="M7.5 1.25V13.75M1.25 7.5H13.75" stroke="white" strokeWidth="1.25" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-black">Revenue Today</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-[#101828]">{formatCurrency(stats.revenueToday)}</span>
                </div>
              </div>

              {/* Live Drivers */}
              <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-[#AD46FF] rounded-[6px] flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 15 15" fill="none">
                      <path d="M7.5 1.875C9.57107 1.875 11.25 3.55393 11.25 5.625C11.25 7.69607 9.57107 9.375 7.5 9.375C5.42893 9.375 3.75 7.69607 3.75 5.625C3.75 3.55393 5.42893 1.875 7.5 1.875Z" stroke="white" strokeWidth="1.25" />
                      <path d="M2.5 13.125C2.5 10.9289 4.67893 9.375 7.5 9.375C10.3211 9.375 12.5 10.9289 12.5 13.125" stroke="white" strokeWidth="1.25" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-black">Live Drivers</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-[#101828]">{stats.availableDrivers}</span>
                </div>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="flex gap-3">
              {/* Recent Bookings */}
              <div className="flex-1 bg-white border border-[#E5E7EB] rounded-lg p-3 flex flex-col gap-2">
                <h2 className="text-sm font-bold text-[#101828]">Recent Bookings</h2>
                <div className="flex flex-col gap-2">
                  {bookings.map((booking) => {
                    const statusColors = getStatusColor(booking.statusLabel)
                    return (
                      <div key={booking.id} className="border border-[#E5E7EB] rounded-[8px] p-2.5">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[#101828]">ID:{booking.orderIdShort}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusColors.bg} ${statusColors.text}`}>
                              {booking.statusLabel}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-[#4A5565]">{booking.userName}</span>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[#6A7282]">
                              {booking.fromLocation} → {booking.toLocation}
                            </span>
                            <span className="text-xs text-[#6A7282]">{formatCurrency(booking.price)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[#6A7282]">{booking.time}</span>
                            {booking.driverName && (
                              <span className="text-xs text-[#364153]">Driver: {booking.driverName}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Right Column */}
              <div className="w-[569px] flex flex-col gap-3">
                {/* Alerts & Notifications */}
                <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 flex flex-col gap-2">
                  <h2 className="text-sm font-bold text-[#101828]">Alerts & Notifications</h2>
                  <div className="flex flex-col gap-2">
                    {/* Driver Verification */}
                    <div className="bg-[#F9FAFB] rounded-[8px] p-2.5 flex gap-2">
                      <div className="w-8 h-8 bg-[#DBEAFE] rounded-[8px] flex items-center justify-center shrink-0">
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                          <path d="M10 18.3333C14.6024 18.3333 18.3333 14.6024 18.3333 10C18.3333 5.39763 14.6024 1.66667 10 1.66667C5.39763 1.66667 1.66667 5.39763 1.66667 10C1.66667 14.6024 5.39763 18.3333 10 18.3333Z" stroke="#1447E6" strokeWidth="1.67" />
                          <path d="M10 6.66667V10L12.5 12.5" stroke="#1447E6" strokeWidth="1.67" />
                        </svg>
                      </div>
                      <div className="flex-1 flex flex-col gap-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#101828]">Driver Verification</span>
                          <span className="bg-white px-1.5 py-0.5 rounded text-[10px] text-[#364153]">{alerts?.driverVerification || 0}</span>
                        </div>
                        <span className="text-[10px] text-[#4A5565]">
                          {alerts?.driverVerification || 0} new driver verification requests pending
                        </span>
                      </div>
                    </div>

                    {/* Failed Payments */}
                    <div className="bg-[#F9FAFB] rounded-[8px] p-2.5 flex gap-2">
                      <div className="w-8 h-8 bg-[#FFE2E2] rounded-[8px] flex items-center justify-center shrink-0">
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                          <path d="M15 5L5 15M5 5L15 15" stroke="#C10007" strokeWidth="1.67" />
                        </svg>
                      </div>
                      <div className="flex-1 flex flex-col gap-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#101828]">Failed Payments</span>
                          <span className="bg-white px-1.5 py-0.5 rounded text-[10px] text-[#364153]">{alerts?.failedPayments || 0}</span>
                        </div>
                        <span className="text-[10px] text-[#4A5565]">
                          {alerts?.failedPayments || 0} payments failed and need attention
                        </span>
                      </div>
                    </div>

                    {/* At-Risk Jobs */}
                    <div className="bg-[#F9FAFB] rounded-[8px] p-2.5 flex gap-2">
                      <div className="w-8 h-8 bg-[#FFEDD4] rounded-[8px] flex items-center justify-center shrink-0">
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                          <path d="M10 18.3333C14.6024 18.3333 18.3333 14.6024 18.3333 10C18.3333 5.39763 14.6024 1.66667 10 1.66667C5.39763 1.66667 1.66667 5.39763 1.66667 10C1.66667 14.6024 5.39763 18.3333 10 18.3333Z" stroke="#CA3500" strokeWidth="1.67" />
                          <path d="M10 6.66667V10L13.3333 13.3333" stroke="#CA3500" strokeWidth="1.67" />
                        </svg>
                      </div>
                      <div className="flex-1 flex flex-col gap-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#101828]">At-Risk Jobs</span>
                          <span className="bg-white px-1.5 py-0.5 rounded text-[10px] text-[#364153]">{alerts?.atRiskJobs || 0}</span>
                        </div>
                        <span className="text-[10px] text-[#4A5565]">
                          {alerts?.atRiskJobs || 0} job at risk of being late
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Revenue This Week */}
                <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 flex flex-col gap-2">
                  <h2 className="text-sm font-bold text-[#101828]">Revenue This Week</h2>
                  <div className="bg-[#F3F5FF] rounded-lg px-2 py-2 flex items-center justify-between">
                    <span className="text-xs text-[#232323]">Total This Week</span>
                    <span className="text-base font-bold text-[#101828]">{formatCurrency(weeklyRevenue?.total || 0)}</span>
                  </div>
                  {weeklyRevenue && (
                    <div className="relative pt-5 pb-5">
                      <div className="flex items-end justify-between gap-2 h-[120px]">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                          const value = weeklyRevenue.daily[day as keyof typeof weeklyRevenue.daily] || 0
                          const height = getBarHeight(value, maxRevenue)
                          return (
                            <div key={day} className="flex-1 flex flex-col items-center gap-1 h-full">
                              <div className="relative w-full h-full flex items-end justify-center">
                                {value > 0 && (
                                  <span className="absolute -top-5 text-[10px] font-semibold text-[#101828] whitespace-nowrap">
                                    {formatCurrency(value)}
                                  </span>
                                )}
                                {height > 0 && (
                                  <div
                                    className="w-full bg-[#103EF7] rounded-t-sm"
                                    style={{ height: `${height}%`, minHeight: height > 0 ? '8px' : '0' }}
                                  ></div>
                                )}
                              </div>
                              <span className="text-[10px] text-[#4A5565] mt-1">{day}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
    </div>
  )
}
