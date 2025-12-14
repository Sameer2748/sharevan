'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { adminAPI } from '@/lib/api'
import { toast } from 'sonner'

interface Booking {
  id: string
  shortId: string
  orderNumber: string
  customer: {
    name: string
  }
  driver: {
    id: string
    name: string
    shortId: string
    vehicleType: string
    contact: {
      mobile: string
      email: string
    }
    performance: {
      rating: number
      trips: number
    }
  } | null
  route: {
    from: string
    to: string
  }
  dateTime: string
  price: number
  status: string
  statusLabel: string
  createdAt: string
  scheduledDate: string | null
}

interface BookingDetails {
  id: string
  orderNumber: string
  shortId: string
  customer: {
    name: string
    email: string
    mobile: string
  }
  driver: {
    name: string
    email: string
    mobile: string
  } | null
  tripDetails: {
    dateTime: string
    itemsVolume: string
    volume: string
  }
  route: {
    pickup: {
      address: string
      contactName: string
      contactMobile: string
      scheduledTime: string | null
    }
    dropoff: {
      address: string
      receiverName: string
      receiverMobile: string
      scheduledTime: string | null
    }
  }
  priceBreakdown: {
    baseFare: number
    distance: {
      miles: number
      charge: number
    }
    helperCharge: number
    total: number
  }
  status: string
  createdAt: string
  acceptedAt: string | null
  inTransitAt: string | null
  deliveredAt: string | null
}

export default function BookingsPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedBooking, setSelectedBooking] = useState<BookingDetails | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const ITEMS_PER_PAGE = 50

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusColor = (status: string) => {
    if (status === 'Pending') {
      return { bg: 'bg-[#FFF7E1]', text: 'text-[#8A6600]' }
    }
    if (status === 'Cancelled') {
      return { bg: 'bg-[#FCDCDC]', text: 'text-[#820000]' }
    }
    if (status === 'Completed') {
      return { bg: 'bg-[#DCFCE7]', text: 'text-[#008236]' }
    }
    if (status === 'Ongoing') {
      return { bg: 'bg-[#FCF8DC]', text: 'text-[#823000]' }
    }
    if (status === 'Scheduled') {
      return { bg: 'bg-[#DCF8FC]', text: 'text-[#001A82]' }
    }
    return { bg: 'bg-gray-100', text: 'text-gray-800' }
  }

  const fetchBookings = useCallback(async () => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    setLoading(true)
    try {
      const res = await adminAPI.bookings.getBookings(currentPage, ITEMS_PER_PAGE, searchQuery, statusFilter)
      setBookings(res.data.data.bookings)
      setTotalPages(res.data.data.pagination.totalPages)
      setTotal(res.data.data.pagination.total)
    } catch (err: any) {
      console.error('Failed to fetch bookings:', err)
      toast.error(err.response?.data?.message || 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, currentPage, searchQuery, statusFilter, router])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1)
  }

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status)
    setCurrentPage(1)
  }

  const handleViewClick = async (bookingId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setLoadingDetails(true)
    setIsModalOpen(true)
    try {
      const res = await adminAPI.bookings.getBookingById(bookingId)
      setSelectedBooking(res.data.data)
    } catch (err: any) {
      console.error('Failed to fetch booking details:', err)
      toast.error(err.response?.data?.message || 'Failed to load booking details')
      setIsModalOpen(false)
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedBooking(null)
  }

  const getStatusProgress = (status: string) => {
    const statuses = ['PENDING', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED']
    const currentIndex = statuses.indexOf(status)
    return {
      created: true,
      driverAssigned: currentIndex >= 1,
      ongoing: currentIndex >= 2,
      completed: currentIndex >= 3,
    }
  }

  return (
    <div className="p-3 h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-0.5 shrink-0 mb-3">
        <h1 className="text-lg font-bold text-[#101828]">Bookings</h1>
        <p className="text-xs text-[#4A5565]">Manage your customer base and their accounts.</p>
      </div>

      {/* Search and Filter Container */}
      <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-2 shrink-0 mb-2">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by booking ID, customer, or location..."
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.67} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-1.5">
            {['All', 'Pending', 'Scheduled', 'Ongoing', 'Completed', 'Cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => handleStatusFilter(status)}
                className={`px-2.5 py-1 rounded-[8px] text-xs font-normal transition-colors ${
                  statusFilter === status
                    ? 'bg-[#103EF7] text-white'
                    : 'bg-[#F3F4F6] text-[#364153] hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-[8px] overflow-hidden flex-1 min-h-0 flex flex-col">
        {loading ? (
          <div className="p-3 text-center text-gray-600">Loading...</div>
        ) : (
          <>
            <div className="overflow-auto flex-1">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-[#364153] uppercase">Booking ID</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-[#364153] uppercase">Customer</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-[#364153] uppercase">Date & Time</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-[#364153] uppercase">Route</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-[#364153] uppercase">Driver</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-[#364153] uppercase">Price</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-[#364153] uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => {
                    const statusColors = getStatusColor(booking.statusLabel)
                    return (
                      <tr
                        key={booking.id}
                        onClick={() => handleViewClick(booking.id)}
                        className="border-b border-[#E5E7EB] hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <td className="px-3 py-2">
                          <span className="text-xs text-[#101828] leading-tight">#{booking.shortId}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs text-[#364153] leading-tight">{booking.customer.name}</span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                              <path d="M13.3333 2H14C14.1768 2 14.3464 2.07024 14.4714 2.19526C14.5964 2.32029 14.6667 2.48986 14.6667 2.66667V14C14.6667 14.1768 14.5964 14.3464 14.4714 14.4714C14.3464 14.5964 14.1768 14.6667 14 14.6667H2C1.82319 14.6667 1.65362 14.5964 1.5286 14.4714C1.40357 14.3464 1.33333 14.1768 1.33333 14V2.66667C1.33333 2.48986 1.40357 2.32029 1.5286 2.19526C1.65362 2.07024 1.82319 2 2 2H2.66667V0.666667H4V2H12V0.666667H13.3333V2ZM2.66667 6.66667H13.3333V14H2.66667V6.66667Z" fill="#6A7282"/>
                            </svg>
                            <div className="flex flex-col gap-0">
                              <span className="text-xs text-[#364153] leading-tight">{formatDate(booking.dateTime)}</span>
                              <span className="text-[10px] text-[#6A7282] leading-tight">{formatTime(booking.dateTime)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs text-[#364153] leading-tight">{booking.route.from} → {booking.route.to}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-xs leading-tight ${booking.driver ? 'text-[#364153]' : 'text-[#F00000]'}`}>
                            {booking.driver ? booking.driver.name : 'Unassigned'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs text-[#364153] leading-tight">{formatCurrency(booking.price)}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-normal ${statusColors.bg} ${statusColors.text}`}>
                            {booking.statusLabel}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center px-3 py-2 border-t border-[#E5E7EB] shrink-0">
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

      {/* Booking Details Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={handleCloseModal}>
          <div className="bg-white rounded-[10px] w-full max-w-[742px] max-h-[90vh] overflow-y-auto flex flex-col" onClick={(e) => e.stopPropagation()}>
            {loadingDetails ? (
              <div className="p-8 text-center text-gray-600">Loading...</div>
            ) : selectedBooking ? (
              <>
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-6 border-b border-[#E5E7EB] shrink-0">
                  <h2 className="text-xl font-medium text-[#101828]">Booking Details - #{selectedBooking.shortId}</h2>
                  <button
                    onClick={handleCloseModal}
                    className="w-5 h-5 flex items-center justify-center hover:bg-gray-100 rounded"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M15 5L5 15M5 5L15 15" stroke="#000000" strokeWidth="2" />
                    </svg>
                  </button>
                </div>

                {/* Modal Content */}
                <div className="px-6 py-6 space-y-6 flex-1 overflow-y-auto">
                  {/* Customer & Driver */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-base text-[#101828] mb-4">Customer & Driver</h3>
                      <div className="space-y-3">
                        {/* Customer */}
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 flex items-center justify-center shrink-0">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M15.8332 17.5V15.8333C15.8332 14.9493 15.482 14.1014 14.8569 13.4763C14.2317 12.8512 13.3839 12.5 12.4998 12.5H7.49984C6.61578 12.5 5.76794 12.8512 5.14281 13.4763C4.51769 14.1014 4.1665 14.9493 4.1665 15.8333V17.5" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M9.99984 9.16667C11.8408 9.16667 13.3332 7.67428 13.3332 5.83333C13.3332 3.99238 11.8408 2.5 9.99984 2.5C8.15889 2.5 6.6665 3.99238 6.6665 5.83333C6.6665 7.67428 8.15889 9.16667 9.99984 9.16667Z" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                          <div>
                            <p className="text-base text-[#4A5565]">Customer</p>
                            <p className="text-base text-[#101828]">{selectedBooking.customer.name}</p>
                          </div>
                        </div>
                        {/* Driver */}
                        {selectedBooking.driver ? (
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 flex items-center justify-center shrink-0">
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15.8337 14.1663H17.5003C18.0003 14.1663 18.3337 13.833 18.3337 13.333V10.833C18.3337 10.083 17.7503 9.41634 17.0837 9.24967C15.5837 8.83301 13.3337 8.33301 13.3337 8.33301C13.3337 8.33301 12.2503 7.16634 11.5003 6.41634C11.0837 6.08301 10.5837 5.83301 10.0003 5.83301H4.16699C3.66699 5.83301 3.25033 6.16634 3.00033 6.58301L1.83366 8.99967C1.72331 9.32153 1.66699 9.65943 1.66699 9.99967V13.333C1.66699 13.833 2.00033 14.1663 2.50033 14.1663H4.16699" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M5.83317 15.8333C6.75365 15.8333 7.49984 15.0871 7.49984 14.1667C7.49984 13.2462 6.75365 12.5 5.83317 12.5C4.9127 12.5 4.1665 13.2462 4.1665 14.1667C4.1665 15.0871 4.9127 15.8333 5.83317 15.8333Z" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M7.5 14.167H12.5" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M14.1667 15.8333C15.0871 15.8333 15.8333 15.0871 15.8333 14.1667C15.8333 13.2462 15.0871 12.5 14.1667 12.5C13.2462 12.5 12.5 13.2462 12.5 14.1667C12.5 15.0871 13.2462 15.8333 14.1667 15.8333Z" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                            <div>
                              <p className="text-base text-[#4A5565]">Driver</p>
                              <p className="text-base text-[#101828]">{selectedBooking.driver.name}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 flex items-center justify-center shrink-0">
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15.8337 14.1663H17.5003C18.0003 14.1663 18.3337 13.833 18.3337 13.333V10.833C18.3337 10.083 17.7503 9.41634 17.0837 9.24967C15.5837 8.83301 13.3337 8.33301 13.3337 8.33301C13.3337 8.33301 12.2503 7.16634 11.5003 6.41634C11.0837 6.08301 10.5837 5.83301 10.0003 5.83301H4.16699C3.66699 5.83301 3.25033 6.16634 3.00033 6.58301L1.83366 8.99967C1.72331 9.32153 1.66699 9.65943 1.66699 9.99967V13.333C1.66699 13.833 2.00033 14.1663 2.50033 14.1663H4.16699" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M5.83317 15.8333C6.75365 15.8333 7.49984 15.0871 7.49984 14.1667C7.49984 13.2462 6.75365 12.5 5.83317 12.5C4.9127 12.5 4.1665 13.2462 4.1665 14.1667C4.1665 15.0871 4.9127 15.8333 5.83317 15.8333Z" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M7.5 14.167H12.5" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M14.1667 15.8333C15.0871 15.8333 15.8333 15.0871 15.8333 14.1667C15.8333 13.2462 15.0871 12.5 14.1667 12.5C13.2462 12.5 12.5 13.2462 12.5 14.1667C12.5 15.0871 13.2462 15.8333 14.1667 15.8333Z" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                            <div>
                              <p className="text-base text-[#4A5565]">Driver</p>
                              <p className="text-base text-[#F00000]">Unassigned</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Trip Details */}
                    <div>
                      <h3 className="text-base text-[#101828] mb-4">Trip Details</h3>
                      <div className="space-y-3">
                        {/* Date & Time */}
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 flex items-center justify-center shrink-0">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                              <path d="M17.5 2.5H15V1.25C15 0.5625 14.4375 0 13.75 0C13.0625 0 12.5 0.5625 12.5 1.25V2.5H7.5V1.25C7.5 0.5625 6.9375 0 6.25 0C5.5625 0 5 0.5625 5 1.25V2.5H2.5C1.125 2.5 0 3.625 0 5V17.5C0 18.875 1.125 20 2.5 20H17.5C18.875 20 20 18.875 20 17.5V5C20 3.625 18.875 2.5 17.5 2.5ZM17.5 17.5H2.5V8.75H17.5V17.5Z" fill="#99A1AF"/>
                              <path d="M10 5V10L13 13" stroke="#99A1AF" strokeWidth="1.67" strokeLinecap="round"/>
                            </svg>
                          </div>
                          <div>
                            <p className="text-base text-[#4A5565]">Date & Time</p>
                            <p className="text-base text-[#101828]">{formatDateTime(selectedBooking.tripDetails.dateTime)}</p>
                          </div>
                        </div>
                        {/* Items / Volume */}
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 flex items-center justify-center shrink-0">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                              <path d="M10 0C4.47715 0 0 4.47715 0 10C0 15.5228 4.47715 20 10 20C15.5228 20 20 15.5228 20 10C20 4.47715 15.5228 0 10 0ZM10 18C5.58172 18 2 14.4183 2 10C2 5.58172 5.58172 2 10 2C14.4183 2 18 5.58172 18 10C18 14.4183 14.4183 18 10 18Z" fill="#99A1AF"/>
                              <path d="M10 5V10L13 13" stroke="#99A1AF" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                          </div>
                          <div>
                            <p className="text-base text-[#4A5565]">Items / Volume</p>
                            <p className="text-base text-[#101828]">{selectedBooking.tripDetails.itemsVolume} ({selectedBooking.tripDetails.volume})</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Route */}
                  <div>
                    <h3 className="text-base text-[#101828] mb-4">Route</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Pickup */}
                      <div className="bg-[#F0FDF4] border border-[#00A63E] rounded-[10px] p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M16.6663 8.33366C16.6663 12.4945 12.0505 16.8278 10.5005 18.1662C10.3561 18.2747 10.1803 18.3335 9.99967 18.3335C9.81901 18.3335 9.64324 18.2747 9.49884 18.1662C7.94884 16.8278 3.33301 12.4945 3.33301 8.33366C3.33301 6.56555 4.03539 4.86986 5.28563 3.61961C6.53587 2.36937 8.23156 1.66699 9.99967 1.66699C11.7678 1.66699 13.4635 2.36937 14.7137 3.61961C15.964 4.86986 16.6663 6.56555 16.6663 8.33366Z" stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M10 10.833C11.3807 10.833 12.5 9.71372 12.5 8.33301C12.5 6.9523 11.3807 5.83301 10 5.83301C8.61929 5.83301 7.5 6.9523 7.5 8.33301C7.5 9.71372 8.61929 10.833 10 10.833Z" stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-base text-[#4A5565] mb-1">Pickup</p>
                            <p className="text-base text-[#101828] mb-1">{selectedBooking.route.pickup.address}</p>
                            {selectedBooking.route.pickup.scheduledTime && (
                              <p className="text-base text-[#4A5565]">{selectedBooking.route.pickup.scheduledTime}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Drop-off */}
                      <div className="bg-[#EFF6FF] border border-[#155DFC] rounded-[10px] p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M16.6663 8.33366C16.6663 12.4945 12.0505 16.8278 10.5005 18.1662C10.3561 18.2747 10.1803 18.3335 9.99967 18.3335C9.81901 18.3335 9.64324 18.2747 9.49884 18.1662C7.94884 16.8278 3.33301 12.4945 3.33301 8.33366C3.33301 6.56555 4.03539 4.86986 5.28563 3.61961C6.53587 2.36937 8.23156 1.66699 9.99967 1.66699C11.7678 1.66699 13.4635 2.36937 14.7137 3.61961C15.964 4.86986 16.6663 6.56555 16.6663 8.33366Z" stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M10 10.833C11.3807 10.833 12.5 9.71372 12.5 8.33301C12.5 6.9523 11.3807 5.83301 10 5.83301C8.61929 5.83301 7.5 6.9523 7.5 8.33301C7.5 9.71372 8.61929 10.833 10 10.833Z" stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-base text-[#4A5565] mb-1">Drop-off</p>
                            <p className="text-base text-[#101828] mb-1">{selectedBooking.route.dropoff.address}</p>
                            {selectedBooking.route.dropoff.scheduledTime && (
                              <p className="text-base text-[#4A5565]">{selectedBooking.route.dropoff.scheduledTime}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Price Breakdown */}
                  <div>
                    <h3 className="text-lg font-medium text-[#101828] mb-4">Price Breakdown</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-base text-[#4A5565]">Base fare</span>
                        <span className="text-base text-[#101828]">{formatCurrency(selectedBooking.priceBreakdown.baseFare)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-base text-[#4A5565]">Distance ({selectedBooking.priceBreakdown.distance.miles} miles)</span>
                        <span className="text-base text-[#101828]">{formatCurrency(selectedBooking.priceBreakdown.distance.charge)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-base text-[#4A5565]">Helper charge</span>
                        <span className="text-base text-[#101828]">{formatCurrency(selectedBooking.priceBreakdown.helperCharge)}</span>
                      </div>
                      <div className="border-t border-[#E5E7EB] pt-2 flex justify-between items-center">
                        <span className="text-base text-[#101828]">Total</span>
                        <span className="text-base text-[#101828]">{formatCurrency(selectedBooking.priceBreakdown.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Timeline */}
                  <div className="flex gap-2 flex-wrap">
                    <div className={`px-6 py-2.5 rounded-xl text-center shrink-0 ${getStatusProgress(selectedBooking.status).created ? 'bg-[#DCFCE7]' : 'bg-[#DCFCE7]'} ${!getStatusProgress(selectedBooking.status).created ? 'border border-[#C0C0C0]' : ''}`}>
                      <span className="text-sm text-black whitespace-nowrap">Created</span>
                    </div>
                    <div className={`px-6 py-2.5 rounded-xl text-center shrink-0 ${getStatusProgress(selectedBooking.status).driverAssigned ? 'bg-[#DCFCE7]' : 'bg-[#DCFCE7]'} ${!getStatusProgress(selectedBooking.status).driverAssigned ? 'border border-[#C0C0C0]' : ''}`}>
                      <span className="text-sm text-black whitespace-nowrap">Driver Assigned</span>
                    </div>
                    <div className={`px-6 py-2.5 rounded-xl text-center shrink-0 ${getStatusProgress(selectedBooking.status).ongoing ? 'bg-[#FFF1C9]' : 'bg-[#DCFCE7]'} ${!getStatusProgress(selectedBooking.status).ongoing ? 'border border-[#C0C0C0]' : ''}`}>
                      <span className="text-sm text-black whitespace-nowrap">Ongoing</span>
                    </div>
                    <div className={`px-6 py-2.5 rounded-xl text-center shrink-0 ${getStatusProgress(selectedBooking.status).completed ? 'bg-[#DCFCE7]' : 'bg-[#DCFCE7] border border-[#C0C0C0]'}`}>
                      <span className="text-sm text-black whitespace-nowrap">Completed</span>
                    </div>
                  </div>

                  {/* Cancel Booking Button */}
                  <button
                    className="w-full py-3.5 bg-[#CB000A] text-white rounded-xl text-xl font-normal hover:bg-red-700 transition-colors shrink-0"
                  >
                    Cancel Booking
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
