'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { adminAPI } from '@/lib/api'
import { toast } from 'sonner'

interface DriverVerification {
  id: string
  shortId: string
  name: string
  email: string
  mobile: string
  vehicleType: string
  status: string
  statusLabel: string
  appliedDate: string
}

interface DriverVerificationDetails {
  id: string
  shortId: string
  name: string
  email: string
  mobile: string
  vehicleType: string
  appliedDate: string
  status: string
  documents: Array<{
    name: string
    imageUrl: string | null
    required: boolean
    verified: boolean
    fieldName: string
  }>
  verifiedCount: number
  totalDocuments: number
  rejectionReason: string | null
  verifiedAt: string | null
  verifiedBy: string | null
}

export default function DriverVerificationPage() {
  const router = useRouter()
  const { isAuthenticated, logout } = useAuthStore()
  const [drivers, setDrivers] = useState<DriverVerification[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null)
  const [driverDetails, setDriverDetails] = useState<DriverVerificationDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [internalNotes, setInternalNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [documentVerifications, setDocumentVerifications] = useState<Record<string, boolean>>({})
  const [selectedDocumentIndex, setSelectedDocumentIndex] = useState<number>(0)

  const ITEMS_PER_PAGE = 10

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const getStatusColor = (status: string) => {
    if (status === 'Rejected' || status === 'REJECTED') {
      return { bg: 'bg-red-100', text: 'text-red-800' }
    }
    if (status === 'Verified' || status === 'VERIFIED') {
      return { bg: 'bg-green-100', text: 'text-green-800' }
    }
    return { bg: 'bg-yellow-100', text: 'text-yellow-800' }
  }

  const fetchDriverVerifications = useCallback(async () => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    setLoading(true)
    try {
      const res = await adminAPI.driverVerifications.getDriverVerifications(currentPage, ITEMS_PER_PAGE, searchQuery, 'PENDING_VERIFICATION')
      setDrivers(res.data.data.drivers)
      setTotalPages(res.data.data.pagination.totalPages)
      setTotal(res.data.data.pagination.total)
    } catch (err: any) {
      console.error('Failed to fetch driver verifications:', err)
      setError(err.response?.data?.message || 'Failed to load driver verifications')
      toast.error(err.response?.data?.message || 'Failed to load driver verifications')
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout()
        router.push('/login')
      }
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, currentPage, searchQuery, router, logout])

  useEffect(() => {
    fetchDriverVerifications()
  }, [fetchDriverVerifications])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1)
  }

  const handleViewDetails = async (driverId: string) => {
    setSelectedDriverId(driverId)
    setLoadingDetails(true)
    try {
      const res = await adminAPI.driverVerifications.getDriverVerificationById(driverId)
      setDriverDetails(res.data.data)
      setInternalNotes(res.data.data.rejectionReason || '')
      // Initialize document verifications
      const initialVerifications: Record<string, boolean> = {}
      res.data.data.documents.forEach((doc: any) => {
        initialVerifications[doc.fieldName] = doc.verified
      })
      setDocumentVerifications(initialVerifications)
      // Select first document with image
      const firstDocWithImage = res.data.data.documents.findIndex((doc: any) => doc.imageUrl)
      setSelectedDocumentIndex(firstDocWithImage >= 0 ? firstDocWithImage : 0)
    } catch (err: any) {
      console.error('Failed to fetch driver verification details:', err)
      toast.error(err.response?.data?.message || 'Failed to load driver verification details')
      setSelectedDriverId(null)
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleCloseModal = () => {
    setSelectedDriverId(null)
    setDriverDetails(null)
    setDocumentVerifications({})
    setInternalNotes('')
    setSelectedDocumentIndex(0)
  }

  const handleDocumentToggle = (fieldName: string) => {
    setDocumentVerifications(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }))
  }

  const handleSelectDocument = (index: number) => {
    setSelectedDocumentIndex(index)
  }

  const handleNextDocument = () => {
    if (!driverDetails) return
    const nextIndex = (selectedDocumentIndex + 1) % driverDetails.documents.length
    setSelectedDocumentIndex(nextIndex)
  }

  const handlePreviousDocument = () => {
    if (!driverDetails) return
    const prevIndex = selectedDocumentIndex === 0 ? driverDetails.documents.length - 1 : selectedDocumentIndex - 1
    setSelectedDocumentIndex(prevIndex)
  }

  const handleMarkCurrentDocumentVerified = () => {
    if (!driverDetails) return
    const currentDoc = driverDetails.documents[selectedDocumentIndex]
    if (currentDoc) {
      handleDocumentToggle(currentDoc.fieldName)
    }
  }

  const handleApprove = async () => {
    if (!driverDetails) return
    
    const licenseVerified = documentVerifications.licenseImage === true
    const aadharVerified = documentVerifications.aadharImage === true
    
    if (!licenseVerified || !aadharVerified) {
      toast.error('Please verify both documents (License and Aadhar) before completing verification')
      return
    }
    
    setSaving(true)
    try {
      await adminAPI.driverVerifications.updateDriverVerification(driverDetails.id, {
        status: 'VERIFIED',
        documentVerifications,
      })
      toast.success('Driver verified successfully!')
      handleCloseModal()
      fetchDriverVerifications()
    } catch (err: any) {
      console.error('Failed to verify driver:', err)
      toast.error(err.response?.data?.message || 'Failed to verify driver')
    } finally {
      setSaving(false)
    }
  }

  const handleReject = async () => {
    if (!driverDetails || !internalNotes.trim()) {
      toast.error('Please provide a rejection reason.')
      return
    }
    setSaving(true)
    try {
      await adminAPI.driverVerifications.updateDriverVerification(driverDetails.id, {
        status: 'REJECTED',
        rejectionReason: internalNotes.trim(),
      })
      toast.success('Driver verification rejected successfully!')
      handleCloseModal()
      fetchDriverVerifications()
    } catch (err: any) {
      console.error('Failed to reject driver:', err)
      toast.error(err.response?.data?.message || 'Failed to reject driver')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAndClose = async () => {
    if (!driverDetails) return
    setSaving(true)
    try {
      await adminAPI.driverVerifications.updateDriverVerification(driverDetails.id, {
        documentVerifications,
        internalNotes: internalNotes.trim(),
      })
      toast.success('Progress saved successfully!')
      handleCloseModal()
    } catch (err: any) {
      console.error('Failed to save:', err)
      toast.error(err.response?.data?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (error) {
    return <div className="p-3 text-center text-red-600">{error}</div>
  }

  return (
    <div className="p-3 h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-0.5 shrink-0">
        <h1 className="text-lg font-bold text-[#101828]">Drivers Verification</h1>
        <p className="text-xs text-[#4A5565]">Manage your customer base and their accounts.</p>
      </div>

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
          <div className="p-3 text-center text-gray-600 text-xs">Loading...</div>
        ) : (
          <>
            <div className="overflow-auto flex-1">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-[#364153] uppercase tracking-wide">Driver</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-[#364153] uppercase tracking-wide">Vehicle</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-[#364153] uppercase tracking-wide">Contact</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-[#364153] uppercase tracking-wide">Applied Date</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-[#364153] uppercase tracking-wide">Status</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-[#364153] uppercase tracking-wide">Actions</th>
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
                          <div className="flex flex-col gap-0">
                            <span className="text-xs text-[#101828] leading-tight">{driver.name}</span>
                            <span className="text-[10px] text-[#6A7282] leading-tight">DR-{driver.shortId}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-[#364153] leading-tight">{driver.vehicleType}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-0">
                            <span className="text-xs text-[#364153] leading-tight">{driver.mobile}</span>
                            <span className="text-[10px] text-[#6A7282] leading-tight">{driver.email}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-[#364153] leading-tight">{formatDate(driver.appliedDate)}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-normal ${statusColors.bg} ${statusColors.text}`}>
                            {driver.statusLabel}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => handleViewDetails(driver.id)}
                            className="text-xs text-[#103EF7] hover:underline"
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
            {totalPages > 1 && (
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
            )}
          </>
        )}
      </div>

      {/* Verification Modal */}
      {selectedDriverId && driverDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[10px] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#E5E7EB] shrink-0">
              <div>
                <h2 className="text-base font-medium text-[#101828]">Driver Verification - {driverDetails.name}</h2>
                <p className="text-xs text-[#4A5565] mt-0.5">Review documents and approve or reject application</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded"
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5L15 15" stroke="#000000" strokeWidth="2" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Left Panel - Details */}
              <div className="w-[320px] border-r border-[#E5E7EB] overflow-y-auto flex flex-col shrink-0">
                <div className="p-4">
                  {/* Applicant Information */}
                  <div className="flex flex-col gap-4 mb-6">
                    <h3 className="text-base font-normal text-[#101828]">Applicant Information</h3>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M8 8C9.65685 8 11 6.65685 11 5C11 3.34315 9.65685 2 8 2C6.34315 2 5 3.34315 5 5C5 6.65685 6.34315 8 8 8Z" stroke="#99A1AF" strokeWidth="1.33" />
                          <path d="M2.66667 14C2.66667 11.4227 4.756 9.33333 7.33333 9.33333C9.91067 9.33333 12 11.4227 12 14" stroke="#99A1AF" strokeWidth="1.33" strokeLinecap="round" />
                        </svg>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-[#4A5565] uppercase">Name</span>
                          <span className="text-sm text-[#101828]">{driverDetails.name}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M1.33333 4.66667C1.33333 4.29848 1.48452 3.94565 1.75357 3.6766C2.02262 3.40755 2.37545 3.25635 2.74363 3.25635H13.9231C14.2913 3.25635 14.6441 3.40755 14.9132 3.6766C15.1822 3.94565 15.3333 4.29848 15.3333 4.66667V11.3333C15.3333 11.7015 15.1822 12.0543 14.9132 12.3234C14.6441 12.5924 14.2913 12.7436 13.9231 12.7436H2.74363C2.37545 12.7436 2.02262 12.5924 1.75357 12.3234C1.48452 12.0543 1.33333 11.7015 1.33333 11.3333V4.66667Z" stroke="#99A1AF" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M1.33333 4.66667L8.33333 8.66667L15.3333 4.66667" stroke="#99A1AF" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-[#4A5565] uppercase">Phone</span>
                          <span className="text-sm text-[#101828]">{driverDetails.mobile}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M1.33333 4.66667C1.33333 4.29848 1.48452 3.94565 1.75357 3.6766C2.02262 3.40755 2.37545 3.25635 2.74363 3.25635H13.9231C14.2913 3.25635 14.6441 3.40755 14.9132 3.6766C15.1822 3.94565 15.3333 4.29848 15.3333 4.66667V11.3333C15.3333 11.7015 15.1822 12.0543 14.9132 12.3234C14.6441 12.5924 14.2913 12.7436 13.9231 12.7436H2.74363C2.37545 12.7436 2.02262 12.5924 1.75357 12.3234C1.48452 12.0543 1.33333 11.7015 1.33333 11.3333V4.66667Z" stroke="#99A1AF" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M1.33333 4.66667L8.33333 8.66667L15.3333 4.66667" stroke="#99A1AF" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-[#4A5565] uppercase">Email</span>
                          <span className="text-sm text-[#101828]">{driverDetails.email}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M13.33 2.67H2.67C1.78 2.67 1 3.44 1 4.33V13.67C1 14.56 1.78 15.33 2.67 15.33H13.33C14.22 15.33 15 14.56 15 13.67V4.33C15 3.44 14.22 2.67 13.33 2.67Z" stroke="#99A1AF" strokeWidth="1.33" />
                          <path d="M1 6.33H15" stroke="#99A1AF" strokeWidth="1.33" />
                        </svg>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-[#4A5565] uppercase">Vehicle Type</span>
                          <span className="text-sm text-[#101828]">{driverDetails.vehicleType}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M13.33 2.67H2.67C1.78 2.67 1 3.44 1 4.33V13.67C1 14.56 1.78 15.33 2.67 15.33H13.33C14.22 15.33 15 14.56 15 13.67V4.33C15 3.44 14.22 2.67 13.33 2.67Z" stroke="#99A1AF" strokeWidth="1.33" />
                          <path d="M1 6.33H15" stroke="#99A1AF" strokeWidth="1.33" />
                        </svg>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-[#4A5565] uppercase">Applied Date</span>
                          <span className="text-sm text-[#101828]">{formatDate(driverDetails.appliedDate)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Documents */}
                  <div className="flex flex-col gap-4 mb-6">
                    <h3 className="text-base font-normal text-[#101828]">Documents</h3>
                    <div className="flex flex-col gap-2">
                      {driverDetails.documents.map((doc, index) => {
                        const isVerified = documentVerifications[doc.fieldName] === true
                        const isSelected = index === selectedDocumentIndex
                        return (
                          <div
                            key={index}
                            onClick={() => handleSelectDocument(index)}
                            className={`flex items-center justify-between p-3 rounded-[8px] border cursor-pointer transition-colors ${
                              isSelected
                                ? 'border-[#155DFC] bg-[#EFF6FF]'
                                : isVerified
                                ? 'border-[#008236] bg-[#DCFCE7]'
                                : doc.imageUrl
                                ? 'border-[#D1D5DC] bg-white hover:bg-gray-50'
                                : 'border-[#E5E7EB] bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M2.66667 1.33333H13.3333C14.0697 1.33333 14.6667 1.9303 14.6667 2.66667V13.3333C14.6667 14.0697 14.0697 14.6667 13.3333 14.6667H2.66667C1.9303 14.6667 1.33333 14.0697 1.33333 13.3333V2.66667C1.33333 1.9303 1.9303 1.33333 2.66667 1.33333Z" stroke="#364153" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M1.33333 4.66667H14.6667" stroke="#364153" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              <div className="flex flex-col gap-0.5 flex-1">
                                <span className="text-sm text-[#101828]">{doc.name}</span>
                                {doc.required && (
                                  <span className="text-[10px] text-[#6A7282] uppercase">Required</span>
                                )}
                              </div>
                            </div>
                            <label className="flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isVerified}
                                onChange={() => handleDocumentToggle(doc.fieldName)}
                                className="w-5 h-5 rounded border-2 border-[#D1D5DC] text-[#008236] focus:ring-2 focus:ring-[#008236] cursor-pointer"
                              />
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Internal Notes */}
                  <div className="flex flex-col gap-4">
                    <h3 className="text-lg font-medium text-[#101828]">Internal Notes</h3>
                    <textarea
                      className="w-full p-2 border border-[#D1D5DC] rounded-[8px] text-sm text-black placeholder:text-gray-500 focus:outline-none focus:border-[#103EF7] min-h-[80px] resize-none"
                      placeholder="Add verification notes..."
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Right Panel - Document Preview */}
              <div className="flex-1 flex flex-col min-w-0">
                {loadingDetails ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-gray-600">Loading...</div>
                  </div>
                ) : (
                  <>
                    {driverDetails.documents[selectedDocumentIndex]?.imageUrl ? (
                      <div className="flex flex-col h-full">
                        {/* Document Preview */}
                        <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-gray-50">
                          <div className="border border-[#DADADA] rounded-xl p-3 bg-white w-full h-full flex flex-col items-center justify-center relative">
                            {(() => {
                              const docUrl = driverDetails.documents[selectedDocumentIndex].imageUrl!
                              const docName = driverDetails.documents[selectedDocumentIndex].name
                              // Check if it's a PDF - check extension or content type in URL
                              const isPdf = docUrl.toLowerCase().endsWith('.pdf') || 
                                          docUrl.toLowerCase().includes('.pdf') ||
                                          docUrl.includes('content-type=application/pdf')
                              
                              return (
                                <div className="w-full h-full flex flex-col">
                                  {isPdf ? (
                                    <iframe
                                      src={docUrl}
                                      className="w-full h-full min-h-[500px] border-0 rounded flex-1"
                                      title={docName}
                                    />
                                  ) : (
                                    <div className="flex flex-col items-center justify-center flex-1 w-full">
                                      <img
                                        src={docUrl}
                                        alt={docName}
                                        className="max-w-full max-h-[calc(90vh-350px)] object-contain"
                                        onError={(e) => {
                                          console.error('Image load error for URL:', docUrl)
                                          // Try to show as PDF if image fails
                                          const container = e.currentTarget.parentElement
                                          if (container) {
                                            container.innerHTML = `
                                              <iframe
                                                src="${docUrl}"
                                                class="w-full h-full min-h-[500px] border-0 rounded"
                                                title="${docName}"
                                              ></iframe>
                                            `
                                          }
                                        }}
                                      />
                                    </div>
                                  )}
                                  <a
                                    href={docUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-4 px-4 py-2 bg-[#103EF7] text-white rounded-[8px] text-sm hover:bg-blue-700 flex items-center gap-2 shrink-0"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                      <path d="M8 2V8M8 8L5 5M8 8L11 5M3 10V13C3 13.5304 3.21071 14.0391 3.58579 14.4142C3.96086 14.7893 4.46957 15 5 15H11C11.5304 15 12.0391 14.7893 12.4142 14.4142C12.7893 14.0391 13 13.5304 13 13V10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    Open in new tab
                                  </a>
                                </div>
                              )
                            })()}
                          </div>
                        </div>

                        {/* Document Actions */}
                        <div className="p-4 border-t border-[#E5E7EB] flex items-center justify-between gap-3 shrink-0">
                          <button
                            onClick={handlePreviousDocument}
                            className="px-4 py-2 border border-[#D1D5DC] rounded-[8px] text-sm font-normal text-[#0A0A0A] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleMarkCurrentDocumentVerified}
                              disabled={documentVerifications[driverDetails.documents[selectedDocumentIndex].fieldName] === true}
                              className="px-4 py-2.5 bg-[#008236] rounded-xl text-sm font-normal text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Mark as Verified
                            </button>
                            <button
                              onClick={handleReject}
                              disabled={saving}
                              className="px-4 py-2.5 bg-[#CB000A] rounded-xl text-sm font-normal text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Reject
                            </button>
                          </div>
                          <button
                            onClick={handleNextDocument}
                            className="px-4 py-2 border border-[#D1D5DC] rounded-[8px] text-sm font-normal text-[#0A0A0A] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gray-50">
                        <div className="text-center">
                          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-gray-600">No document available</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-[#F9FAFB] border-t border-[#E5E7EB] p-4 shrink-0">
              <div className="flex items-center justify-between">
                <div className="text-sm text-[#4A5565]">
                  {Object.values(documentVerifications).filter(v => v === true).length} of {driverDetails.totalDocuments} documents verified
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveAndClose}
                    disabled={saving}
                    className="px-6 py-2 border border-[#D1D5DC] rounded-[8px] text-sm font-normal text-[#0A0A0A] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save & Close
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={saving}
                    className="px-6 py-2 bg-[#E7000B] rounded-[8px] text-sm font-normal text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M12.6667 5.33333L10.6667 3.33333L8 6L5.33333 3.33333L3.33333 5.33333L6 8L3.33333 10.6667L5.33333 12.6667L8 10L10.6667 12.6667L12.6667 10.6667L10 8L12.6667 5.33333Z" fill="white"/>
                    </svg>
                    Reject Application
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={saving || Object.values(documentVerifications).filter(v => v === true).length !== driverDetails.totalDocuments}
                    className={`px-6 py-2 rounded-[8px] text-sm font-normal flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      Object.values(documentVerifications).filter(v => v === true).length === driverDetails.totalDocuments
                        ? 'bg-[#008236] text-white hover:bg-green-700'
                        : 'bg-[#D1D5DC] text-[#6A7282] hover:bg-gray-300'
                    }`}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M13.3333 4L6 11.3333L2.66667 8" stroke={Object.values(documentVerifications).filter(v => v === true).length === driverDetails.totalDocuments ? "white" : "#6A7282"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Approve Driver
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

