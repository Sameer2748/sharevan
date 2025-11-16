'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { orderAPI } from '@/lib/api';
import { toast } from 'sonner';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import Navbar from '@/components/shared/Navbar';
import StatusBadge from '@/components/shared/StatusBadge';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Package, MapPin, Calendar, ArrowRight } from 'lucide-react';

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated, user } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated || user?.role !== 'USER') {
      router.replace('/auth/login?role=user');
      return;
    }

    fetchOrders();
  }, [hasHydrated, isAuthenticated, user?.role, filter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const statusFilter =
        filter === 'active'
          ? 'PENDING,DRIVER_ASSIGNED,DRIVER_ARRIVED,PICKED_UP,IN_TRANSIT,REACHED_DESTINATION'
          : filter === 'completed'
          ? 'DELIVERED'
          : undefined;

      const response = await orderAPI.getOrders({ status: statusFilter });
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
        <LoadingSpinner size="lg" text="Loading orders..." />
      </div>
    );
  }

  const filteredOrders = orders;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title="My Orders" showBack />

      <div className="px-4 py-6">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { key: 'all', label: 'All Orders' },
            { key: 'active', label: 'Active' },
            { key: 'completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filter === tab.key
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
            <p className="text-sm text-gray-500 mb-6">
              {filter === 'active'
                ? 'You have no active deliveries'
                : filter === 'completed'
                ? 'You have no completed deliveries'
                : 'Start booking your first delivery'}
            </p>
            <button
              onClick={() => router.push('/user/booking')}
              className="bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-600 transition-all"
            >
              Book Now
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order: any) => (
              <button
                key={order.id}
                onClick={() => router.push(`/user/orders/${order.id}`)}
                className="w-full bg-white rounded-2xl p-5 text-left shadow-sm hover:shadow-md transition-all"
              >
                {/* Header */}
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

                {/* Addresses */}
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

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-600 capitalize">{order.packageSize}</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-gray-600">
                      {order.distance?.toFixed(1) ?? '0.0'} km
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-primary">
                      {formatCurrency(order.finalPrice || order.estimatedPrice)}
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
