'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { adminAPI } from '@/lib/api'
import { toast } from 'sonner'

interface Driver {
  id: string
  shortId: string
  name: string
  email: string
  mobile: string
  vehicleType: string
  vehicleNumber: string
  rating: number
  totalOrders: number
  status: string
  statusLabel: string
  joinedDate: string
}

interface DriverDetails {
  id: string
  shortId: string
  name: string
  email: string
  mobile: string
  vehicleType: string
  vehicleNumber: string
  vehicleModel: string
  vehicleColor: string
  rating: number
  totalRatings: number
  totalOrders: number
  totalEarnings: number
  acceptanceRate: number
  status: string
  statusLabel: string
  licenseNumber: string | null
  licenseImage: string | null
  vehicleRegImage: string | null
  aadharNumber: string | null
  aadharImage: string | null
  panNumber: string | null
  panImage: string | null
  joinedDate: string
}

export default function DriversPage() {
  const router = useRouter()
  const { isAuthenticated, logout } = useAuthStore()
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [selectedDriver, setSelectedDriver] = useState<DriverDetails | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ITEMS_PER_PAGE = 10

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getStatusColor = (status: string) => {
    if (status === 'Suspended' || status === 'REJECTED') {
      return { bg: 'bg-red-100', text: 'text-red-800' }
    }
    if (status === 'Pending' || status === 'PENDING_VERIFICATION') {
      return { bg: 'bg-yellow-100', text: 'text-yellow-800' }
    }
    return { bg: 'bg-green-100', text: 'text-green-800' }
  }

  const fetchDrivers = useCallback(async () => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    setLoading(true)
    try {
      const res = await adminAPI.drivers.getDrivers(currentPage, ITEMS_PER_PAGE, searchQuery)
      setDrivers(res.data.data.drivers)
      setTotalPages(res.data.data.pagination.totalPages)
      setTotal(res.data.data.pagination.total)
    } catch (err: any) {
      console.error('Failed to fetch drivers:', err)
      setError(err.response?.data?.message || 'Failed to load drivers')
      toast.error(err.response?.data?.message || 'Failed to load drivers')
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout()
        router.push('/login')
      }
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, currentPage, searchQuery, router, logout])

  useEffect(() => {
    fetchDrivers()
  }, [fetchDrivers])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1)
  }

  const handleViewClick = async (driverId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setLoadingDetails(true)
    try {
      const res = await adminAPI.drivers.getDriverById(driverId)
      setSelectedDriver(res.data.data)
    } catch (err: any) {
      console.error('Failed to fetch driver details:', err)
      toast.error(err.response?.data?.message || 'Failed to load driver details')
      setSelectedDriver(null)
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleSuspendDriver = async () => {
    if (!selectedDriver) return
    try {
      const newStatus = selectedDriver.status === 'SUSPENDED'
      await adminAPI.drivers.updateDriver(selectedDriver.id, { isSuspended: !newStatus })
      toast.success('Driver updated successfully!')
      const res = await adminAPI.drivers.getDriverById(selectedDriver.id)
      setSelectedDriver(res.data.data)
      fetchDrivers()
    } catch (err: any) {
      console.error('Failed to update driver:', err)
      toast.error(err.response?.data?.message || 'Failed to update driver')
    }
  }

  if (error) {
    return <div className="p-3 text-center text-red-600">{error}</div>
  }

  return (
    <div className="p-3 h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-0.5 shrink-0 mb-3">
        <h1 className="text-lg font-bold text-[#101828]">Drivers</h1>
        <p className="text-xs text-[#4A5565]">Manage your customer base and their accounts.</p>
      </div>

      {/* Search - Full Width */}
      <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-2 shrink-0 mb-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-8 pr-2 py-1 border border-[#D1D5DC] rounded-[8px] text-xs text-black placeholder:text-gray-500 focus:outline-none focus:border-[#103EF7]"
          />
          <svg
            className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="flex gap-3 flex-1 min-h-0">
        {/* Main Content */}
        <div className={`flex flex-col gap-0 ${selectedDriver ? 'flex-1 min-w-0' : 'w-full'}`}>

          {/* Table - Starts below search */}
          <div className="bg-white border border-[#E5E7EB] rounded-[8px] overflow-hidden flex-1 min-h-0 flex flex-col">
            {loading ? (
              <div className="p-3 text-center text-gray-600">Loading...</div>
            ) : (
              <>
                <div className="overflow-auto flex-1">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-[#364153] uppercase">Driver</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-[#364153] uppercase">Vehicle</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-[#364153] uppercase">Contact</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-[#364153] uppercase">Performance</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-[#364153] uppercase">Status</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-[#364153] uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drivers.map((driver) => {
                        const statusColors = getStatusColor(driver.statusLabel)
                        return (
                          <tr
                            key={driver.id}
                            className="border-b border-[#E5E7EB] hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-3 py-2">
                              <div className="flex flex-col">
                                <span className="text-xs text-[#101828] leading-tight">{driver.name}</span>
                                <span className="text-[10px] text-[#6A7282] leading-tight">{driver.shortId}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col gap-0">
                                <span className="text-xs text-[#364153] leading-tight">{driver.vehicleType}</span>
                                <span className="text-[10px] text-[#6A7282] leading-tight">{driver.vehicleNumber}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col gap-0">
                                <span className="text-xs text-[#364153] leading-tight">{driver.mobile}</span>
                                <span className="text-[10px] text-[#6A7282] leading-tight">{driver.email}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1">
                                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                                    <path d="M10 15L4 18L5 11L1 7L8 6L10 1L12 6L19 7L15 11L16 18L10 15Z" fill="#F0B100" stroke="#F0B100" strokeWidth="1.5"/>
                                  </svg>
                                  <span className="text-xs text-[#364153]">{driver.rating.toFixed(1)}</span>
                                </div>
                                <span className="text-[10px] text-[#6A7282] leading-tight">{driver.totalOrders} trips</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusColors.bg} ${statusColors.text}`}>
                                {driver.statusLabel}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <button
                                onClick={(e) => handleViewClick(driver.id, e)}
                                className="text-xs text-[#155DFC] hover:underline"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center p-3 border-t border-[#E5E7EB] shrink-0">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-0.5 border border-[#E5E7EB] rounded text-xs text-[#364153] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-[#6A7282]">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-0.5 border border-[#E5E7EB] rounded text-xs text-[#364153] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Driver Details Panel */}
        {selectedDriver && (
          <div className="w-[280px] bg-white border border-[#E5E7EB] rounded-[8px] p-3 flex flex-col gap-2 overflow-y-auto shrink-0" style={{ height: 'calc(100vh - 140px)' }}>
            {loadingDetails ? (
              <div className="text-center text-gray-600 py-4 text-xs">Loading...</div>
            ) : (
              <>
                {/* Header with Avatar */}
                <div className="flex items-center justify-between shrink-0 pb-2 border-b border-[#E5E7EB]">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-[#E5E7EB] flex items-center justify-center shrink-0">
                      <span className="text-xs font-medium text-[#6A7282]">{selectedDriver.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex flex-col">
                      <h2 className="text-sm font-medium text-[#101828] leading-tight">{selectedDriver.name}</h2>
                      <p className="text-[10px] text-[#6A7282] leading-tight">{selectedDriver.shortId}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDriver(null)}
                    className="w-4 h-4 flex items-center justify-center hover:bg-gray-100 rounded shrink-0"
                  >
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                      <path d="M15 5L5 15M5 5L15 15" stroke="#000000" strokeWidth="2" />
                    </svg>
                  </button>
                </div>

                {/* Contact Section */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <p className="text-[10px] text-[#6A7282] uppercase">Contact</p>
                  <p className="text-xs text-[#364153] leading-tight">{selectedDriver.mobile}</p>
                  <p className="text-[10px] text-[#6A7282] leading-tight">{selectedDriver.email}</p>
                </div>

                {/* Vehicle Details */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <p className="text-[10px] text-[#6A7282] uppercase">Vehicle</p>
                  <p className="text-xs text-[#101828] leading-tight">{selectedDriver.vehicleType}</p>
                  {selectedDriver.vehicleNumber && (
                    <p className="text-[10px] text-[#6A7282] leading-tight">#{selectedDriver.vehicleNumber}</p>
                  )}
                  {(selectedDriver.vehicleModel || selectedDriver.vehicleColor) && (
                    <p className="text-[10px] text-[#6A7282] leading-tight">
                      {selectedDriver.vehicleModel && selectedDriver.vehicleColor 
                        ? `${selectedDriver.vehicleModel} • ${selectedDriver.vehicleColor}`
                        : selectedDriver.vehicleModel || selectedDriver.vehicleColor}
                    </p>
                  )}
                </div>

                {/* Join Date */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <p className="text-[10px] text-[#6A7282] uppercase">Join Date</p>
                  <p className="text-xs text-[#101828] leading-tight">{formatDate(selectedDriver.joinedDate)}</p>
                </div>

                {/* Document Verification */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  <p className="text-[10px] text-[#6A7282] uppercase">Document Verification</p>
                  <div className="flex flex-col gap-1">
                    {/* License */}
                    <div className="flex items-center justify-between py-1">
                      <div className="flex flex-col">
                        <p className="text-xs text-[#364153] leading-tight">License</p>
                        {selectedDriver.licenseNumber && (
                          <p className="text-[10px] text-[#6A7282] leading-tight">{selectedDriver.licenseNumber}</p>
                        )}
                      </div>
                      {selectedDriver.status === 'VERIFIED' && selectedDriver.licenseImage && (
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                          <circle cx="10" cy="10" r="8.33" stroke="#00C950" strokeWidth="1.67"/>
                          <path d="M6.67 10L9.17 12.5L13.33 7.5" stroke="#00C950" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    {/* Resident ID (Aadhar) */}
                    <div className="flex items-center justify-between py-1">
                      <div className="flex flex-col">
                        <p className="text-xs text-[#364153] leading-tight">Resident ID</p>
                        {selectedDriver.aadharNumber && (
                          <p className="text-[10px] text-[#6A7282] leading-tight">{selectedDriver.aadharNumber}</p>
                        )}
                      </div>
                      {selectedDriver.status === 'VERIFIED' && selectedDriver.aadharImage && (
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                          <circle cx="10" cy="10" r="8.33" stroke="#00C950" strokeWidth="1.67"/>
                          <path d="M6.67 10L9.17 12.5L13.33 7.5" stroke="#00C950" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    {/* PAN (if available) */}
                    {selectedDriver.panNumber && (
                      <div className="flex items-center justify-between py-1">
                        <div className="flex flex-col">
                          <p className="text-xs text-[#364153] leading-tight">PAN</p>
                          <p className="text-[10px] text-[#6A7282] leading-tight">{selectedDriver.panNumber}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Performance Cards */}
                <div className="flex flex-col gap-2 shrink-0">
                  {/* Rating, Trips, Earnings Row */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="bg-[#F9FAFB] rounded-[8px] p-2 flex flex-col gap-0.5">
                      <p className="text-[10px] text-[#6A7282] uppercase">Rating</p>
                      <div className="flex items-center gap-0.5">
                        <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                          <path d="M10 15L4 18L5 11L1 7L8 6L10 1L12 6L19 7L15 11L16 18L10 15Z" fill="#F0B100" stroke="#F0B100" strokeWidth="1.5"/>
                        </svg>
                        <p className="text-xs font-bold text-[#101828] leading-tight">{selectedDriver.rating.toFixed(1)}</p>
                      </div>
                      {selectedDriver.totalRatings > 0 && (
                        <p className="text-[9px] text-[#6A7282] leading-tight">({selectedDriver.totalRatings})</p>
                      )}
                    </div>
                    <div className="bg-[#F9FAFB] rounded-[8px] p-2 flex flex-col gap-0.5">
                      <p className="text-[10px] text-[#6A7282] uppercase">Trips</p>
                      <p className="text-xs font-bold text-[#101828] leading-tight">{selectedDriver.totalOrders}</p>
                    </div>
                    <div className="bg-[#F9FAFB] rounded-[8px] p-2 flex flex-col gap-0.5">
                      <p className="text-[10px] text-[#6A7282] uppercase">Earnings</p>
                      <p className="text-xs font-bold text-[#101828] leading-tight">{formatCurrency(selectedDriver.totalEarnings)}</p>
                    </div>
                  </div>

                  {/* Acceptance Rate */}
                  <div className="bg-[#F9FAFB] rounded-[8px] p-2 flex flex-col gap-1">
                    <p className="text-[10px] text-[#6A7282] uppercase">Acceptance Rate</p>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 bg-white rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-[#00C950] h-1.5 rounded-full"
                          style={{ width: `${selectedDriver.acceptanceRate}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-[#101828] leading-tight">{selectedDriver.acceptanceRate}%</p>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2 shrink-0 pt-1 border-t border-[#E5E7EB]">
                  <p className="text-[10px] text-[#6A7282] uppercase">Status</p>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(selectedDriver.statusLabel).bg} ${getStatusColor(selectedDriver.statusLabel).text}`}>
                    {selectedDriver.statusLabel}
                  </span>
                </div>

                {/* Suspend Driver Button */}
                <button
                  onClick={handleSuspendDriver}
                  className={`w-full h-8 rounded-[8px] text-xs font-normal text-white flex items-center justify-center gap-1.5 shrink-0 ${
                    selectedDriver.status === 'SUSPENDED' ? 'bg-green-600 hover:bg-green-700' : 'bg-[#CB000A] hover:bg-red-700'
                  } transition-colors`}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M12.6667 5.33333L10.6667 3.33333L8 6L5.33333 3.33333L3.33333 5.33333L6 8L3.33333 10.6667L5.33333 12.6667L8 10L10.6667 12.6667L12.6667 10.6667L10 8L12.6667 5.33333Z" fill="white"/>
                  </svg>
                  {selectedDriver.status === 'SUSPENDED' ? 'Activate Driver' : 'Suspend Driver'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

