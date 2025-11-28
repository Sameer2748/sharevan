'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { driverAPI } from '@/lib/api';
import { toast } from 'sonner';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import StatusBadge from '@/components/shared/StatusBadge';
import { Package, Calendar, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';

export default function DriverHistoryPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated, user } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated || user?.role !== 'DRIVER') {
      router.replace('/auth/login?role=driver');
      return;
    }

    fetchOrders();
  }, [hasHydrated, isAuthenticated, user?.role, filter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await driverAPI.getOrderHistory(filter === 'all' ? undefined : filter);
      const allOrders = response.data.data.orders || [];

      setOrders(allOrders);
    } catch (error: any) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  if (!hasHydrated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#103EF7]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EEF2FF]">
      <div className="bg-gradient-to-br from-[#0F58FF] via-[#2C7BFF] to-[#62B3FF] px-5 pt-12 pb-20">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="text-white hover:bg-white/10 p-2 rounded-full transition"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-white">Ride History</h1>
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {[
            { key: 'all', label: 'All Rides' },
            { key: 'completed', label: 'Completed' },
            { key: 'cancelled', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filter === tab.key
                  ? 'bg-white text-[#0F58FF] shadow-md'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative -mt-12 mx-auto max-w-[430px] px-5 pb-6">
        {orders.length === 0 ? (
          <div className="bg-white rounded-[28px] p-12 text-center shadow-lg">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No rides yet</h3>
            <p className="text-sm text-gray-500">
              {filter === 'completed'
                ? 'You have no completed rides'
                : filter === 'cancelled'
                ? 'You have no cancelled rides'
                : 'Your ride history will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order: any) => (
              <button
                key={order.id}
                onClick={() => router.push(`/driver/ride/${order.id}`)}
                className="w-full bg-white rounded-[24px] p-5 text-left shadow-md hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-base font-bold text-gray-900">#{order.orderNumber}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {formatDateTime(order.createdAt)}
                    </div>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-0.5">Pickup</p>
                      <p className="text-sm text-gray-900 line-clamp-1">{order.pickupAddress}</p>
                    </div>
                  </div>
                  <div className="border-l-2 border-dashed border-gray-300 ml-1 h-4" />
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-0.5">Delivery</p>
                      <p className="text-sm text-gray-900 line-clamp-1">{order.deliveryAddress}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-600 capitalize">{order.packageSize}</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-gray-600">
                      {order.distance ? order.distance.toFixed(1) : '0.0'} miles
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-[#0F58FF]">
                      £{order.totalPrice || order.finalPrice || order.estimatedPrice || '0'}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
