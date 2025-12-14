'use client'

import { useEffect, useState } from 'react'
import { adminAPI } from '@/lib/api'

interface Customer {
  id: string
  shortId: string
  name: string
  email: string
  mobile: string
  bookingsCount: number
  totalSpent: number
  status: string
  isSuspended: boolean
  createdAt: string
}

interface CustomerDetails {
  id: string
  shortId: string
  name: string
  email: string
  mobile: string
  isSuspended: boolean
  note: string | null
  promoCode: string | null
  promoCodeAssignedAt: string | null
  joinedDate: string
  totalBookings: number
  totalSpent: number
  lastBooking: {
    id: string
    orderIdShort: string
    status: string
    statusLabel: string
    fromLocation: string
    toLocation: string
    price: number
    createdAt: string
    driverName: string | null
  } | null
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetails | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const limit = 10

  useEffect(() => {
    fetchCustomers()
  }, [currentPage, searchQuery])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getCustomers(currentPage, limit, searchQuery)
      setCustomers(response.data.customers)
      setTotalPages(response.data.pagination.totalPages)
      setTotal(response.data.pagination.total)
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1) // Reset to first page on search
  }

  const handleRowClick = async (customerId: string) => {
    try {
      setLoadingDetails(true)
      const response = await adminAPI.getCustomerDetails(customerId)
      setSelectedCustomer(response.data)
    } catch (error) {
      console.error('Failed to fetch customer details:', error)
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleSuspendCustomer = async () => {
    if (!selectedCustomer) return

    try {
      const newSuspendedState = !selectedCustomer.isSuspended
      await adminAPI.updateCustomer(selectedCustomer.id, {
        isSuspended: newSuspendedState,
      })
      // Refresh customer details and list
      await handleRowClick(selectedCustomer.id)
      fetchCustomers()
    } catch (error) {
      console.error('Failed to update customer:', error)
    }
  }

  const handleAddNote = async () => {
    if (!selectedCustomer) return
    const note = prompt('Enter note:')
    if (note !== null) {
      try {
        await adminAPI.updateCustomer(selectedCustomer.id, { note })
        await handleRowClick(selectedCustomer.id)
      } catch (error) {
        console.error('Failed to update note:', error)
      }
    }
  }

  const handleIssuePromoCode = async () => {
    if (!selectedCustomer) return
    const promoCode = prompt('Enter promo code:')
    if (promoCode !== null) {
      try {
        await adminAPI.updateCustomer(selectedCustomer.id, { promoCode })
        await handleRowClick(selectedCustomer.id)
      } catch (error) {
        console.error('Failed to issue promo code:', error)
      }
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const getStatusColor = (status: string) => {
    if (status === 'Suspended') {
      return { bg: 'bg-red-100', text: 'text-red-800' }
    }
    return { bg: 'bg-green-100', text: 'text-green-800' }
  }

  return (
    <div className="p-3 h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-0.5 shrink-0 mb-3">
        <h1 className="text-lg font-bold text-[#101828]">Customers</h1>
        <p className="text-xs text-[#4A5565]">Manage your customer base and their accounts.</p>
      </div>

      <div className="flex gap-3 flex-1 min-h-0">
        {/* Main Content */}
        <div className={`flex flex-col gap-3 flex-1 min-w-0`}>
          {/* Search */}
          <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-2 shrink-0">
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

          {/* Table */}
          <div className="bg-white border border-[#E5E7EB] rounded-[8px] overflow-hidden flex-1 min-h-0 flex flex-col">
            {loading ? (
              <div className="p-6 text-center text-gray-600 text-xs">Loading...</div>
            ) : (
              <>
                <div className="overflow-auto flex-1">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-[#364153] uppercase tracking-wide">Customer</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-[#364153] uppercase tracking-wide">Contact</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-[#364153] uppercase tracking-wide">Bookings</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-[#364153] uppercase tracking-wide">Total Spent</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-[#364153] uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map((customer) => {
                        const statusColors = getStatusColor(customer.status)
                        return (
                          <tr
                            key={customer.id}
                            onClick={() => handleRowClick(customer.id)}
                            className="border-b border-[#E5E7EB] hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <td className="px-3 py-2">
                              <div className="flex flex-col gap-0">
                                <span className="text-xs text-[#101828] leading-tight">{customer.name}</span>
                                <span className="text-[10px] text-[#6A7282] leading-tight">{customer.shortId}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col gap-0">
                                <span className="text-xs text-[#364153] leading-tight">{customer.mobile}</span>
                                <span className="text-xs text-[#6A7282] leading-tight">{customer.email}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-xs text-[#364153]">{customer.bookingsCount}</span>
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-xs text-[#364153]">{formatCurrency(customer.totalSpent)}</span>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-normal ${statusColors.bg} ${statusColors.text}`}>
                                {customer.status}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-3 py-2 border-t border-[#E5E7EB] flex items-center justify-between shrink-0">
                    <div className="text-[10px] text-[#364153]">
                      Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, total)} of {total} customers
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-2 py-0.5 border border-[#E5E7EB] rounded text-[10px] text-[#364153] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <span className="text-[10px] text-[#364153]">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-2 py-0.5 border border-[#E5E7EB] rounded text-[10px] text-[#364153] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Customer Details Panel */}
        {selectedCustomer && (
          <div className="w-[280px] bg-white border border-[#E5E7EB] rounded-[8px] p-3 flex flex-col gap-3 overflow-y-auto shrink-0 self-start">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#101828]">Customer Details</h2>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-3.5 h-3.5 flex items-center justify-center hover:bg-gray-100 rounded"
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5L15 15" stroke="#000000" strokeWidth="2" />
                </svg>
              </button>
            </div>

            {loadingDetails ? (
              <div className="text-center text-gray-600 py-8">Loading...</div>
            ) : (
              <>
                {/* Customer Info */}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-0">
                    <span className="text-[10px] text-[#6A7282]">Name</span>
                    <span className="text-xs text-[#101828]">{selectedCustomer.name}</span>
                  </div>
                  <div className="flex flex-col gap-0">
                    <span className="text-[10px] text-[#6A7282]">Customer ID</span>
                    <span className="text-xs text-[#101828]">{selectedCustomer.shortId}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M2.67 2.67C3.55 1.78 4.7 1.33 6 1.33C7.3 1.33 8.45 1.78 9.33 2.67C10.22 3.55 10.67 4.7 10.67 6C10.67 7.3 10.22 8.45 9.33 9.33L6 12.67L2.67 9.33C1.78 8.45 1.33 7.3 1.33 6C1.33 4.7 1.78 3.55 2.67 2.67Z" stroke="#364153" strokeWidth="1.33" />
                    </svg>
                    <span className="text-[10px] text-[#364153]">{selectedCustomer.mobile}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M2.67 2.67H5.33L7.33 9.33L5.33 11.33C5.89 12.22 6.78 13.11 7.67 13.67L9.67 11.67L16.33 14.33V17C16.33 17.89 15.44 18.67 14.67 18.67C6.67 18.67 0.33 12.33 0.33 4.33C0.33 3.56 1.11 2.67 2 2.67H2.67Z" stroke="#364153" strokeWidth="1.33" />
                    </svg>
                    <span className="text-[10px] text-[#364153]">{selectedCustomer.email}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M13.33 2.67H2.67C1.78 2.67 1 3.44 1 4.33V13.67C1 14.56 1.78 15.33 2.67 15.33H13.33C14.22 15.33 15 14.56 15 13.67V4.33C15 3.44 14.22 2.67 13.33 2.67Z" stroke="#364153" strokeWidth="1.33" />
                      <path d="M1 6.33H15" stroke="#364153" strokeWidth="1.33" />
                    </svg>
                    <span className="text-[10px] text-[#364153]">Joined {formatDate(selectedCustomer.joinedDate)}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-1.5">
                  <div className="flex-1 bg-[#F9FAFB] rounded-[8px] p-2">
                    <span className="text-[10px] text-[#6A7282]">Total Bookings</span>
                    <div className="text-base font-bold text-[#101828] mt-0.5">{selectedCustomer.totalBookings}</div>
                  </div>
                  <div className="flex-1 bg-[#F9FAFB] rounded-[8px] p-2">
                    <span className="text-[10px] text-[#6A7282]">Total Spent</span>
                    <div className="text-base font-bold text-[#101828] mt-0.5">{formatCurrency(selectedCustomer.totalSpent)}</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={handleSuspendCustomer}
                    className={`w-full py-1.5 rounded-[8px] text-xs font-normal text-white flex items-center justify-center gap-1 ${
                      selectedCustomer.isSuspended ? 'bg-green-600 hover:bg-green-700' : 'bg-[#CB000A] hover:bg-red-700'
                    } transition-colors`}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M3.29 3.29L12.71 12.71M12.71 3.29L3.29 12.71" stroke="white" strokeWidth="1.33" />
                    </svg>
                    {selectedCustomer.isSuspended ? 'Unsuspend Customer' : 'Suspend Customer'}
                  </button>
                  <button
                    onClick={handleAddNote}
                    className="w-full py-1.5 border border-[#D1D5DC] rounded-[8px] text-xs font-normal text-[#364153] flex items-center justify-center gap-1 hover:bg-gray-50 transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M2.67 2.67H9.33V9.33H2.67V2.67Z" stroke="#364153" strokeWidth="1.33" />
                      <path d="M6.67 6.67H12.67" stroke="#364153" strokeWidth="1.33" />
                      <path d="M9.33 10.67H12.67" stroke="#364153" strokeWidth="1.33" />
                    </svg>
                    Add Note
                  </button>
                  <button
                    onClick={handleIssuePromoCode}
                    className="w-full py-1.5 border border-[#D1D5DC] rounded-[8px] text-xs font-normal text-[#364153] flex items-center justify-center gap-1 hover:bg-gray-50 transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M5.33 2.67H10.67V5.33H5.33V2.67Z" stroke="#364153" strokeWidth="1.33" />
                      <path d="M2.67 5.33H13.33V13.33C13.33 14.22 12.56 15 11.67 15H4.33C3.44 15 2.67 14.22 2.67 13.33V5.33Z" stroke="#364153" strokeWidth="1.33" />
                    </svg>
                    Issue Promo Code
                  </button>
                </div>

                {/* Last Booking */}
                {selectedCustomer.lastBooking && (
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-xs text-[#101828]">Last Booking</h3>
                    <div className="bg-[#F9FAFB] rounded-[8px] p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-[#101828]">ID:{selectedCustomer.lastBooking.orderIdShort}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          selectedCustomer.lastBooking.statusLabel === 'Completed' 
                            ? 'bg-green-100 text-green-800' 
                            : selectedCustomer.lastBooking.statusLabel === 'Cancelled'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedCustomer.lastBooking.statusLabel}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#4A5565] mb-1">
                        {selectedCustomer.lastBooking.fromLocation} → {selectedCustomer.lastBooking.toLocation}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#6A7282]">{formatDate(selectedCustomer.lastBooking.createdAt)}</span>
                        <span className="text-[10px] text-[#101828] font-medium">{formatCurrency(selectedCustomer.lastBooking.price)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

