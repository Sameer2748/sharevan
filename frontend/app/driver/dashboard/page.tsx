'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { driverAPI } from '@/lib/api';
import { toast } from 'sonner';
import { formatCurrency, getGreeting } from '@/lib/utils';
import Navbar from '@/components/shared/Navbar';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { onNewOrderAlert, onOrderTaken, driverSetOnlineStatus, initSocket } from '@/lib/socket';
import { TrendingUp, Package, Star, DollarSign, MapPin, Zap, Loader2, Check, X } from 'lucide-react';

export default function DriverDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, updateUser, hasHydrated, token } = useAuthStore();
  const [isOnline, setIsOnline] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated || user?.role !== 'DRIVER') {
      router.replace('/auth/login?role=driver');
      return;
    }

    // Initialize WebSocket connection
    if (token) {
      initSocket(token);
    }

    setIsOnline(user?.isOnline || false);
    fetchData();

    // Setup WebSocket listeners
    const newOrderHandler = (data: any) => {
      toast.success('New order available!');
      fetchAvailableOrders();
    };

    const orderTakenHandler = (data: any) => {
      setAvailableOrders(prev => prev.filter(o => o.id !== data.orderId));
    };

    onNewOrderAlert(newOrderHandler);
    onOrderTaken(orderTakenHandler);
  }, [hasHydrated, isAuthenticated, user?.role, token]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchAvailableOrders(),
        fetchActiveOrder(),
        fetchEarnings(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableOrders = async () => {
    try {
      const response = await driverAPI.getAvailableOrders();
      setAvailableOrders(response.data.data.orders || []);
    } catch (error) {
      console.error('Failed to fetch orders');
    }
  };

  const fetchActiveOrder = async () => {
    try {
      const response = await driverAPI.getActiveOrder();
      setActiveOrder(response.data.data.order);
    } catch (error) {
      console.error('Failed to fetch active order');
    }
  };

  const fetchEarnings = async () => {
    try {
      const response = await driverAPI.getEarnings('today');
      setStats(response.data.data.summary);
    } catch (error) {
      console.error('Failed to fetch earnings');
    }
  };

  const handleToggleOnline = async () => {
    setToggling(true);
    try {
      const newStatus = !isOnline;
      await driverAPI.toggleOnlineStatus(newStatus);

      setIsOnline(newStatus);
      updateUser({ isOnline: newStatus });

      // Update WebSocket
      driverSetOnlineStatus(newStatus);

      toast.success(newStatus ? 'You are now online!' : 'You are now offline');

      if (newStatus) {
        fetchAvailableOrders();
      } else {
        setAvailableOrders([]);
      }
    } catch (error: any) {
      toast.error('Failed to update status');
    } finally {
      setToggling(false);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      await driverAPI.acceptOrder(orderId);
      toast.success('Order accepted!');
      router.push('/driver/active');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to accept order');
      fetchAvailableOrders(); // Refresh list
    }
  };

  if (!hasHydrated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title={`${getGreeting()}!`} showBack={false} />

      <div className="px-4 py-6">
        {/* Online/Offline Toggle */}
        <div className="mb-6 bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-gray-900">
                {isOnline ? 'You are Online' : 'You are Offline'}
              </div>
              <div className="text-sm text-gray-500">
                {isOnline ? 'Ready to accept orders' : 'Go online to receive orders'}
              </div>
            </div>
            <button
              onClick={handleToggleOnline}
              disabled={toggling}
              className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors ${
                isOnline ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform ${
                  isOnline ? 'translate-x-11' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Active Order Alert */}
        {activeOrder && (
          <div className="mb-6 bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-orange-900">You have an active delivery</div>
                <div className="text-sm text-orange-700">Order #{activeOrder.orderNumber}</div>
              </div>
              <button
                onClick={() => router.push('/driver/active')}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg font-medium"
              >
                View
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <DollarSign className="w-5 h-5 text-green-500 mb-2" />
            <div className="text-lg font-bold text-gray-900">
              {formatCurrency(stats?.totalEarnings || 0)}
            </div>
            <div className="text-xs text-gray-600">Total Earned</div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <Package className="w-5 h-5 text-primary mb-2" />
            <div className="text-lg font-bold text-gray-900">
              {stats?.totalOrders || 0}
            </div>
            <div className="text-xs text-gray-600">Deliveries</div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <Star className="w-5 h-5 text-yellow-500 mb-2" />
            <div className="text-lg font-bold text-gray-900">
              {stats?.rating?.toFixed(1) || '0.0'}
            </div>
            <div className="text-xs text-gray-600">Rating</div>
          </div>
        </div>

        {/* Available Orders */}
        {isOnline && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Available Orders ({availableOrders.length})
            </h2>

            {availableOrders.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <Package className="w-16 h-16 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No orders available right now</p>
                <p className="text-sm text-gray-400 mt-2">We'll notify you when new orders arrive</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-xl p-4 shadow-sm border-2 border-primary/20"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-semibold text-gray-900">#{order.orderNumber}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          {order.bookingType === 'URGENT' && (
                            <>
                              <Zap className="w-3 h-3 text-orange-500" />
                              <span className="text-orange-600">Urgent</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          Earn {formatCurrency(order.potentialEarning)}
                        </div>
                        <div className="text-xs text-gray-500">{order.distance?.toFixed(1)} km</div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-start gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                        <div className="flex-1 text-gray-600 line-clamp-1">{order.pickupAddress}</div>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5" />
                        <div className="flex-1 text-gray-600 line-clamp-1">{order.deliveryAddress}</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptOrder(order.id)}
                        className="flex-1 bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition-all flex items-center justify-center gap-2"
                      >
                        <Check className="w-5 h-5" />
                        Accept
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!isOnline && (
          <div className="bg-gray-100 rounded-xl p-8 text-center">
            <div className="w-16 h-16 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-3">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium mb-2">You are offline</p>
            <p className="text-sm text-gray-500">
              Toggle the switch above to start receiving orders
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
