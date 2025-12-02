'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { driverAPI } from '@/lib/api';
import { toast } from 'sonner';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Package, ArrowRight, ArrowLeft } from 'lucide-react';

export default function DriverHistoryPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated, user } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated || user?.role !== 'DRIVER') {
      router.replace('/auth/login?role=driver');
      return;
    }

    fetchOrders();
  }, [hasHydrated, isAuthenticated, user?.role]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await driverAPI.getOrderHistory();
      setOrders(response.data.data.orders || []);
    } catch (error: any) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  if (!hasHydrated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" text="Loading history..." />
      </div>
    );
  }

  const filteredOrders = orders;

  const getStatusInfo = (status: string) => {
    const delayedStatuses = ['DELAYED', 'FAILED', 'CANCELLED'];
    if (delayedStatuses.includes(status)) {
      return {
        label: 'Cancelled',
        badge: 'bg-[#FEECEC] text-[#E04B4B]',
        stripBg: 'bg-[#FEECEC]',
        stripText: 'text-[#DC2626]',
      };
    }

    const arrivedStatuses = ['DELIVERED', 'REACHED_DESTINATION'];
    if (arrivedStatuses.includes(status)) {
      return {
        label: 'Delivered on',
        badge: 'bg-[#E9F6FF] text-[#1C64F2]',
        stripBg: 'bg-[#E7F9E7]',
        stripText: 'text-[#15803D]',
      };
    }

    return {
      label: 'Completed',
      badge: 'bg-[#E7F9E7] text-[#16A34A]',
      stripBg: 'bg-[#E7F9E7]',
      stripText: 'text-[#15803D]',
    };
  };

  const formatRoute = (order: any) => {
    const pickup = order.pickupAddress?.split(',')[0] || 'Pickup';
    const drop = order.deliveryAddress?.split(',')[0] || 'Drop';
    return `${pickup} → ${drop}`;
  };

  const getStatusTime = (order: any) => {
    const ts =
      order.deliveredAt ||
      order.cancelledAt ||
      order.completedAt ||
      order.updatedAt ||
      order.createdAt;
    return ts ? formatDateTime(ts) : '';
  };

  const getEarnings = (order: any) => {
    return order.driverEarnings || order.totalPrice || order.finalPrice || order.estimatedPrice || '0';
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-xl font-semibold text-gray-900">History</h1>
      </div>

      <div className="px-4 pb-8 space-y-5">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center shadow-sm">
            <Package className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No rides yet</h3>
            <p className="text-sm text-gray-500 mb-6">
              Your delivery history will appear here once you complete rides.
            </p>
            <button
              onClick={() => router.push('/driver/dashboard')}
              className="bg-primary text-white px-6 py-3 rounded-full font-semibold hover:bg-primary-600 transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order: any) => {
              const statusInfo = getStatusInfo(order.status);
              return (
                <button
                  key={order.id}
                  onClick={() => router.push(`/driver/ride/${order.id}`)}
                  className="w-full rounded-3xl bg-white pt-5 px-5 pb-0 text-left shadow-sm hover:shadow-md transition-all border border-gray-100"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-2">
                    <span>ID: {order.orderNumber}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <p className="text-lg font-semibold text-gray-900">{formatRoute(order)}</p>
                  <div
                    className={`mt-4 -mx-5 px-5 py-2 rounded-b-3xl text-xs font-semibold flex items-center justify-between ${statusInfo.stripBg} ${statusInfo.stripText}`}
                  >
                    <span>{statusInfo.label}</span>
                    <span>{getStatusTime(order)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
