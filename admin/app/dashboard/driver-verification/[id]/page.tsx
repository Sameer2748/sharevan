'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { adminAPI } from '@/lib/api'
import { toast } from 'sonner'
import Image from 'next/image'

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

export default function DriverVerificationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { isAuthenticated, logout } = useAuthStore()
  const [driver, setDriver] = useState<DriverVerificationDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [internalNotes, setInternalNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [documentVerifications, setDocumentVerifications] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    const fetchDriverDetails = async () => {
      try {
        const res = await adminAPI.driverVerifications.getDriverVerificationById(params.id as string)
        setDriver(res.data.data)
        setInternalNotes(res.data.data.rejectionReason || '')
        // Initialize document verifications based on current driver status
        const initialVerifications: Record<string, boolean> = {}
        res.data.data.documents.forEach((doc: any) => {
          initialVerifications[doc.fieldName] = doc.verified
        })
        setDocumentVerifications(initialVerifications)
      } catch (err: any) {
        console.error('Failed to fetch driver verification details:', err)
        toast.error(err.response?.data?.message || 'Failed to load driver verification details')
        if (err.response?.status === 401 || err.response?.status === 403) {
          logout()
          router.push('/login')
        }
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchDriverDetails()
    }
  }, [params.id, isAuthenticated, router, logout])

  const handleDocumentToggle = (fieldName: string) => {
    setDocumentVerifications(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }))
  }

  const handleApprove = async () => {
    if (!driver) return
    
    // Check if both documents are verified
    const licenseVerified = documentVerifications.licenseImage === true
    const aadharVerified = documentVerifications.aadharImage === true
    
    if (!licenseVerified || !aadharVerified) {
      toast.error('Please verify both documents (License and Aadhar) before completing verification')
      return
    }
    
    setSaving(true)
    try {
      await adminAPI.driverVerifications.updateDriverVerification(driver.id, {
        status: 'VERIFIED',
        documentVerifications,
      })
      toast.success('Driver verified successfully!')
      router.push('/dashboard/driver-verification')
    } catch (err: any) {
      console.error('Failed to verify driver:', err)
      toast.error(err.response?.data?.message || 'Failed to verify driver')
    } finally {
      setSaving(false)
    }
  }

  const handleReject = async () => {
    if (!driver || !internalNotes.trim()) {
      toast.error('Please provide a rejection reason.')
      return
    }
    setSaving(true)
    try {
      await adminAPI.driverVerifications.updateDriverVerification(driver.id, {
        status: 'REJECTED',
        rejectionReason: internalNotes.trim(),
      })
      toast.success('Driver verification rejected successfully!')
      router.push('/dashboard/driver-verification')
    } catch (err: any) {
      console.error('Failed to reject driver:', err)
      toast.error(err.response?.data?.message || 'Failed to reject driver')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAndClose = async () => {
    if (!driver) return
    setSaving(true)
    try {
      // Save document verifications and notes without completing verification
      await adminAPI.driverVerifications.updateDriverVerification(driver.id, {
        documentVerifications,
        internalNotes: internalNotes.trim(),
      })
      toast.success('Progress saved successfully!')
      router.push('/dashboard/driver-verification')
    } catch (err: any) {
      console.error('Failed to save:', err)
      toast.error(err.response?.data?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="p-3 h-full flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!driver) {
    return (
      <div className="p-3 h-full flex items-center justify-center">
        <div className="text-red-600">Driver not found</div>
      </div>
    )
  }

  return (
    <div className="p-3 h-full overflow-hidden flex flex-col">
      <div className="flex gap-3 flex-1 min-h-0">
        {/* Left Panel - Details */}
        <div className="w-[320px] bg-white border border-[#E5E7EB] rounded-[8px] overflow-hidden flex flex-col shrink-0">
          <div className="p-4 border-b border-[#E5E7EB] shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium text-[#101828]">Driver Verification - {driver.name}</h2>
              <button
                onClick={() => router.push('/dashboard/driver-verification')}
                className="w-5 h-5 flex items-center justify-center hover:bg-gray-100 rounded"
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5L15 15" stroke="#000000" strokeWidth="2" />
                </svg>
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-4">
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
                    <span className="text-sm text-[#101828]">{driver.name}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M1.33333 4.66667C1.33333 4.29848 1.48452 3.94565 1.75357 3.6766C2.02262 3.40755 2.37545 3.25635 2.74363 3.25635H13.9231C14.2913 3.25635 14.6441 3.40755 14.9132 3.6766C15.1822 3.94565 15.3333 4.29848 15.3333 4.66667V11.3333C15.3333 11.7015 15.1822 12.0543 14.9132 12.3234C14.6441 12.5924 14.2913 12.7436 13.9231 12.7436H2.74363C2.37545 12.7436 2.02262 12.5924 1.75357 12.3234C1.48452 12.0543 1.33333 11.7015 1.33333 11.3333V4.66667Z" stroke="#99A1AF" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M1.33333 4.66667L8.33333 8.66667L15.3333 4.66667" stroke="#99A1AF" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-[#4A5565] uppercase">Phone</span>
                    <span className="text-sm text-[#101828]">{driver.mobile}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M1.33333 4.66667C1.33333 4.29848 1.48452 3.94565 1.75357 3.6766C2.02262 3.40755 2.37545 3.25635 2.74363 3.25635H13.9231C14.2913 3.25635 14.6441 3.40755 14.9132 3.6766C15.1822 3.94565 15.3333 4.29848 15.3333 4.66667V11.3333C15.3333 11.7015 15.1822 12.0543 14.9132 12.3234C14.6441 12.5924 14.2913 12.7436 13.9231 12.7436H2.74363C2.37545 12.7436 2.02262 12.5924 1.75357 12.3234C1.48452 12.0543 1.33333 11.7015 1.33333 11.3333V4.66667Z" stroke="#99A1AF" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M1.33333 4.66667L8.33333 8.66667L15.3333 4.66667" stroke="#99A1AF" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-[#4A5565] uppercase">Email</span>
                    <span className="text-sm text-[#101828]">{driver.email}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M13.33 2.67H2.67C1.78 2.67 1 3.44 1 4.33V13.67C1 14.56 1.78 15.33 2.67 15.33H13.33C14.22 15.33 15 14.56 15 13.67V4.33C15 3.44 14.22 2.67 13.33 2.67Z" stroke="#99A1AF" strokeWidth="1.33" />
                    <path d="M1 6.33H15" stroke="#99A1AF" strokeWidth="1.33" />
                  </svg>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-[#4A5565] uppercase">Vehicle Type</span>
                    <span className="text-sm text-[#101828]">{driver.vehicleType}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M13.33 2.67H2.67C1.78 2.67 1 3.44 1 4.33V13.67C1 14.56 1.78 15.33 2.67 15.33H13.33C14.22 15.33 15 14.56 15 13.67V4.33C15 3.44 14.22 2.67 13.33 2.67Z" stroke="#99A1AF" strokeWidth="1.33" />
                    <path d="M1 6.33H15" stroke="#99A1AF" strokeWidth="1.33" />
                  </svg>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-[#4A5565] uppercase">Applied Date</span>
                    <span className="text-sm text-[#101828]">{formatDate(driver.appliedDate)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="flex flex-col gap-4 mb-6">
              <h3 className="text-base font-normal text-[#101828]">Documents</h3>
              <div className="flex flex-col gap-4">
                {driver.documents.map((doc, index) => {
                  const isVerified = documentVerifications[doc.fieldName] === true
                  return (
                    <div key={index} className="flex flex-col gap-2">
                      <div className={`flex items-center justify-between p-3 rounded-[8px] border ${
                        isVerified
                          ? 'border-[#008236] bg-[#DCFCE7]'
                          : doc.imageUrl
                          ? 'border-[#155DFC] bg-[#EFF6FF]'
                          : 'border-[#E5E7EB] bg-white'
                      }`}>
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
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isVerified}
                            onChange={() => handleDocumentToggle(doc.fieldName)}
                            className="w-5 h-5 rounded border-2 border-[#D1D5DC] text-[#008236] focus:ring-2 focus:ring-[#008236]"
                          />
                        </label>
                      </div>
                      {doc.imageUrl && (
                        <div className="border border-[#E5E7EB] rounded-[8px] overflow-hidden">
                          <a href={doc.imageUrl} target="_blank" rel="noopener noreferrer" className="block">
                            <Image
                              src={doc.imageUrl} 
                              alt={doc.name}
                              className="w-full h-auto max-h-64 object-contain"
                            />
                          </a>
                        </div>
                      )}
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

        {/* Right Panel - Actions */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <div className="text-sm text-[#4A5565]">Review documents and approve or reject application</div>
          
          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              disabled={saving}
              className="px-4 py-2.5 bg-[#D1D5DC] rounded-xl text-sm font-normal text-[#6A7282] hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="#6A7282" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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

          <div className="mt-auto bg-[#F9FAFB] border-t border-[#E5E7EB] p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-[#4A5565]">
                {Object.values(documentVerifications).filter(v => v === true).length} of {driver.totalDocuments} documents verified
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
                  disabled={saving || Object.values(documentVerifications).filter(v => v === true).length !== driver.totalDocuments}
                  className={`px-6 py-2 rounded-[8px] text-sm font-normal flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    Object.values(documentVerifications).filter(v => v === true).length === driver.totalDocuments
                      ? 'bg-[#008236] text-white hover:bg-green-700'
                      : 'bg-[#D1D5DC] text-[#6A7282] hover:bg-gray-300'
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M13.3333 4L6 11.3333L2.66667 8" stroke={Object.values(documentVerifications).filter(v => v === true).length === driver.totalDocuments ? "white" : "#6A7282"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Approve Driver
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

