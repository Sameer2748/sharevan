'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { driverAPI, uploadAPI } from '@/lib/api';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import Navbar from '@/components/shared/Navbar';
import StatusBadge from '@/components/shared/StatusBadge';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ImageUpload from '@/components/ImageUpload';
import { onOrderStatusUpdate } from '@/lib/socket';
import { MapPin, User, Phone, Package, CheckCircle, Loader2, Camera } from 'lucide-react';

export default function ActiveRidePage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [deliveryProofFile, setDeliveryProofFile] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.replace('/auth/login?role=driver');
      return;
    }

    fetchActiveOrder();

    // Listen to status updates
    const statusHandler = (data: any) => {
      fetchActiveOrder();
    };

    onOrderStatusUpdate(statusHandler);
  }, [hasHydrated, isAuthenticated]);

  const fetchActiveOrder = async () => {
    try {
      const response = await driverAPI.getActiveOrder();
      if (!response.data.data.order) {
        router.push('/driver/dashboard');
        return;
      }
      setOrder(response.data.data.order);
    } catch (error: any) {
      toast.error('Failed to load active order');
      router.push('/driver/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    setActionLoading(true);
    try {
      await driverAPI.updateOrderStatus(order.id, status);
      toast.success('Status updated');
      fetchActiveOrder();
    } catch (error: any) {
      toast.error('Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyPickup = async () => {
    if (otpInput.length !== 6) {
      toast.error('Please enter 6-digit OTP');
      return;
    }

    setActionLoading(true);
    try {
      await driverAPI.verifyPickupOTP(order.id, otpInput);
      toast.success('Package picked up!');
      setOtpInput('');
      fetchActiveOrder();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Invalid OTP');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyDelivery = async () => {
    if (otpInput.length !== 6) {
      toast.error('Please enter 6-digit OTP');
      return;
    }

    setActionLoading(true);
    try {
      let proofUrl = '';

      // Upload delivery proof if provided
      if (deliveryProofFile) {
        setUploadingProof(true);
        const uploadResponse = await uploadAPI.uploadDeliveryProof(deliveryProofFile);
        proofUrl = uploadResponse.data.data.url;
        setUploadingProof(false);
      }

      const response = await driverAPI.verifyDeliveryOTP(
        order.id,
        otpInput,
        'Delivered successfully',
        proofUrl
      );
      const earnings = response.data.data.earnings;
      toast.success(`Delivery completed! You earned ${formatCurrency(earnings)}`);
      router.push('/driver/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Invalid OTP');
    } finally {
      setActionLoading(false);
      setUploadingProof(false);
    }
  };

  const renderActionButton = () => {
    switch (order.status) {
      case 'DRIVER_ASSIGNED':
        return (
          <button
            onClick={() => handleStatusUpdate('DRIVER_ARRIVED')}
            disabled={actionLoading}
            className="w-full bg-primary text-white py-4 rounded-xl font-semibold hover:bg-primary-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
            I've Reached Pickup Location
          </button>
        );

      case 'DRIVER_ARRIVED':
        return (
          <div className="space-y-3">
            <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
              <div className="text-sm text-blue-900 font-medium text-center">
                Ask the sender for their 6-digit Pickup OTP
              </div>
              {order.pickupOtp && (
                <div className="mt-3 text-center text-xs text-blue-500">
                  Pickup OTP (from user app): <span className="font-semibold tracking-widest">{order.pickupOtp}</span>
                </div>
              )}
            </div>
            <input
              type="text"
              maxLength={6}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter OTP from sender"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-center text-xl font-bold focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={handleVerifyPickup}
              disabled={actionLoading || otpInput.length !== 6}
              className="w-full bg-primary text-white py-4 rounded-xl font-semibold hover:bg-primary-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              Verify & Pickup
            </button>
          </div>
        );

      case 'PICKED_UP':
        return (
          <button
            onClick={() => handleStatusUpdate('IN_TRANSIT')}
            disabled={actionLoading}
            className="w-full bg-primary text-white py-4 rounded-xl font-semibold hover:bg-primary-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
            Start Delivery
          </button>
        );

      case 'IN_TRANSIT':
        return (
          <button
            onClick={() => handleStatusUpdate('REACHED_DESTINATION')}
            disabled={actionLoading}
            className="w-full bg-primary text-white py-4 rounded-xl font-semibold hover:bg-primary-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
            I've Reached Delivery Location
          </button>
        );

      case 'REACHED_DESTINATION':
        return (
          <div className="space-y-3">
            <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
              <div className="text-sm text-green-900 font-medium text-center">
                Ask the receiver for their 6-digit Delivery OTP
              </div>
              {order.deliveryOtp && (
                <div className="mt-3 text-center text-xs text-green-600">
                  Delivery OTP (from receiver): <span className="font-semibold tracking-widest">{order.deliveryOtp}</span>
                </div>
              )}
            </div>

            {/* Delivery Proof Image Upload */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Camera className="w-5 h-5 text-gray-600" />
                <label className="text-sm font-medium text-gray-700">
                  Delivery Proof (Optional)
                </label>
              </div>
              <ImageUpload
                maxFiles={1}
                maxSizeMB={5}
                onFilesSelected={(files) => setDeliveryProofFile(files[0])}
                disabled={uploadingProof || actionLoading}
              />
              {uploadingProof && (
                <div className="text-sm text-primary flex items-center gap-2 mt-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading proof...
                </div>
              )}
            </div>

            <input
              type="text"
              maxLength={6}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter OTP from receiver"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-center text-xl font-bold focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={handleVerifyDelivery}
              disabled={actionLoading || otpInput.length !== 6 || uploadingProof}
              className="w-full bg-green-500 text-white py-4 rounded-xl font-semibold hover:bg-green-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {actionLoading || uploadingProof ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              Complete Delivery
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  if (!hasHydrated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" text="Loading active ride..." />
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title="Active Delivery" showBack />

      <div className="px-4 py-6 space-y-4">
        {/* Status */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Order</div>
              <div className="font-semibold text-gray-900">#{order.orderNumber}</div>
            </div>
            <StatusBadge status={order.status} />
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3">Customer</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">{order.user?.name || 'Customer'}</div>
                <div className="text-sm text-gray-500">{order.user?.mobile}</div>
              </div>
            </div>
            <a
              href={`tel:${order.user?.mobile}`}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Call
            </a>
          </div>
        </div>

        {/* Addresses */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 mt-1.5" />
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1">Pickup</div>
              <div className="text-gray-900">{order.pickupAddress}</div>
            </div>
          </div>
          <div className="border-l-2 border-dashed border-gray-300 ml-1.5 h-6" />
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 mt-1.5" />
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1">Delivery</div>
              <div className="text-gray-900">{order.deliveryAddress}</div>
            </div>
          </div>
        </div>

        {/* Package Info */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3">Package Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Size</div>
              <div className="font-medium">{order.packageSize}</div>
            </div>
            <div>
              <div className="text-gray-500">Weight</div>
              <div className="font-medium">{order.packageWeight} kg</div>
            </div>
            <div>
              <div className="text-gray-500">Receiver</div>
              <div className="font-medium">{order.receiverName}</div>
            </div>
            <div>
              <div className="text-gray-500">Contact</div>
              <div className="font-medium">{order.receiverMobile}</div>
            </div>
          </div>
        </div>

        {/* Earnings */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-sm">
          <div className="text-sm opacity-90">You will earn</div>
          <div className="text-3xl font-bold mt-1">
            {formatCurrency((order.finalPrice || order.estimatedPrice) * 0.75)}
          </div>
        </div>

        {/* Action Button */}
        <div>
          {renderActionButton()}
        </div>
      </div>
    </div>
  );
}
