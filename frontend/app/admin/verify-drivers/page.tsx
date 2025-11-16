'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { TruckIcon, CheckCircle, XCircle, Eye, Loader2, Clock } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Driver {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  vehicleType: string;
  vehicleNumber: string;
  vehicleModel?: string;
  vehicleColor?: string;
  licenseNumber: string;
  licenseImage?: string;
  vehicleRegImage?: string;
  aadharNumber?: string;
  aadharImage?: string;
  panNumber?: string;
  panImage?: string;
  status: string;
  createdAt: string;
}

export default function VerifyDriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingDrivers();
  }, []);

  const fetchPendingDrivers = async () => {
    setLoading(true);
    try {
      // For now, fetch all drivers (we'll filter by status)
      // In production, create a dedicated endpoint for pending drivers
      const response = await axios.get(`${API_URL}/api/driver/pending`);
      setDrivers(response.data.data || []);
    } catch (error: any) {
      console.error('Failed to fetch drivers:', error);
      toast.error('Failed to load pending drivers');
      // Mock data for testing if endpoint doesn't exist
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (driverId: string) => {
    setProcessing(true);
    try {
      await axios.put(`${API_URL}/api/driver/${driverId}/verify`, {
        status: 'VERIFIED',
        verifiedAt: new Date().toISOString(),
        verifiedBy: 'admin'
      });

      toast.success('Driver approved successfully!');
      fetchPendingDrivers();
      setSelectedDriver(null);
    } catch (error: any) {
      console.error('Approval failed:', error);
      toast.error(error.response?.data?.error || 'Failed to approve driver');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (driverId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setProcessing(true);
    try {
      await axios.put(`${API_URL}/api/driver/${driverId}/verify`, {
        status: 'REJECTED',
        rejectionReason: rejectionReason.trim()
      });

      toast.success('Driver rejected');
      fetchPendingDrivers();
      setSelectedDriver(null);
      setRejectionReason('');
    } catch (error: any) {
      console.error('Rejection failed:', error);
      toast.error(error.response?.data?.error || 'Failed to reject driver');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <TruckIcon className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-gray-900">Driver Verification</h1>
          </div>
          <p className="text-gray-600">Review and approve pending driver registrations</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{drivers.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Drivers List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : drivers.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up!</h3>
            <p className="text-gray-600">No pending driver verifications</p>
          </div>
        ) : (
          <div className="space-y-4">
            {drivers.map((driver) => (
              <div key={driver.id} className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{driver.name}</h3>
                    <p className="text-sm text-gray-600">{driver.mobile}</p>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-gray-500">Vehicle</p>
                        <p className="text-sm font-medium text-gray-900">
                          {driver.vehicleType} - {driver.vehicleNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">License</p>
                        <p className="text-sm font-medium text-gray-900">{driver.licenseNumber}</p>
                      </div>
                      {driver.email && (
                        <div>
                          <p className="text-xs text-gray-500">Email</p>
                          <p className="text-sm font-medium text-gray-900">{driver.email}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-500">Registered</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(driver.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedDriver(driver)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                  >
                    <Eye className="w-4 h-4" />
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Review Modal */}
        {selectedDriver && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b sticky top-0 bg-white">
                <h2 className="text-2xl font-bold text-gray-900">Review Driver Application</h2>
                <p className="text-gray-600">{selectedDriver.name}</p>
              </div>

              <div className="p-6 space-y-6">
                {/* Personal Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium text-gray-900">{selectedDriver.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Mobile</p>
                      <p className="font-medium text-gray-900">{selectedDriver.mobile}</p>
                    </div>
                    {selectedDriver.email && (
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium text-gray-900">{selectedDriver.email}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vehicle Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Vehicle Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Type</p>
                      <p className="font-medium text-gray-900">{selectedDriver.vehicleType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Number</p>
                      <p className="font-medium text-gray-900">{selectedDriver.vehicleNumber}</p>
                    </div>
                    {selectedDriver.vehicleModel && (
                      <div>
                        <p className="text-sm text-gray-500">Model</p>
                        <p className="font-medium text-gray-900">{selectedDriver.vehicleModel}</p>
                      </div>
                    )}
                    {selectedDriver.vehicleColor && (
                      <div>
                        <p className="text-sm text-gray-500">Color</p>
                        <p className="font-medium text-gray-900">{selectedDriver.vehicleColor}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* License Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">License & Documents</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">License Number</p>
                      <p className="font-medium text-gray-900">{selectedDriver.licenseNumber}</p>
                    </div>
                    {selectedDriver.aadharNumber && (
                      <div>
                        <p className="text-sm text-gray-500">Aadhar Number</p>
                        <p className="font-medium text-gray-900">{selectedDriver.aadharNumber}</p>
                      </div>
                    )}
                    {selectedDriver.panNumber && (
                      <div>
                        <p className="text-sm text-gray-500">PAN Number</p>
                        <p className="font-medium text-gray-900">{selectedDriver.panNumber}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Document Images */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Uploaded Documents</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedDriver.licenseImage && (
                      <DocumentImage title="Driving License" url={selectedDriver.licenseImage} />
                    )}
                    {selectedDriver.vehicleRegImage && (
                      <DocumentImage title="Vehicle Registration" url={selectedDriver.vehicleRegImage} />
                    )}
                    {selectedDriver.aadharImage && (
                      <DocumentImage title="Aadhar Card" url={selectedDriver.aadharImage} />
                    )}
                    {selectedDriver.panImage && (
                      <DocumentImage title="PAN Card" url={selectedDriver.panImage} />
                    )}
                  </div>
                </div>

                {/* Rejection Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason (if rejecting)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                    rows={3}
                    placeholder="Enter reason for rejection..."
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 border-t bg-gray-50 flex gap-4">
                <button
                  onClick={() => {
                    setSelectedDriver(null);
                    setRejectionReason('');
                  }}
                  disabled={processing}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(selectedDriver.id)}
                  disabled={processing}
                  className="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(selectedDriver.id)}
                  disabled={processing}
                  className="flex-1 px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  Approve
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentImage({ title, url }: { title: string; url: string }) {
  return (
    <div>
      <p className="text-sm text-gray-600 mb-2">{title}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block border-2 border-gray-200 rounded-lg overflow-hidden hover:border-primary transition-colors"
      >
        <img
          src={url}
          alt={title}
          className="w-full h-48 object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-document.png';
          }}
        />
      </a>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-600 hover:underline mt-1 inline-block"
      >
        View Full Size →
      </a>
    </div>
  );
}
