'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { orderAPI } from '@/lib/api';
import { toast } from 'sonner';
import { formatCurrency, formatDateTime, getOrderStatusText } from '@/lib/utils';
import Navbar from '@/components/shared/Navbar';
import StatusBadge from '@/components/shared/StatusBadge';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { onOrderStatusUpdate, trackOrder, untrackOrder, onDriverLocation, initSocket } from '@/lib/socket';
import { MapPin, Package, User, Phone, Clock, DollarSign, TruckIcon, Star, X, Loader2, Camera } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const { token, hasHydrated, isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated || user?.role !== 'USER') {
      router.replace('/auth/login?role=user');
      return;
    }

    if (token) {
      initSocket(token);
    }

    fetchOrder();

    // Setup WebSocket listeners
    trackOrder(orderId);

    const statusUpdateHandler = (data: any) => {
      if (data.orderId === orderId) {
        fetchOrder();
      }
    };

    const locationHandler = (data: any) => {
      if (data.orderId === orderId && data.lat && data.lng) {
        setDriverLocation(data.location);
        updateDriverMarker(data.lat, data.lng);
      }
    };

    onOrderStatusUpdate(statusUpdateHandler);
    onDriverLocation(locationHandler);

    return () => {
      untrackOrder(orderId);
    };
  }, [orderId, token, hasHydrated, isAuthenticated, user?.role]);

  const fetchOrder = async () => {
    try {
      const response = await orderAPI.getOrderById(orderId);
      const orderData = response.data.data.order || response.data.data;
      setOrder(orderData);

      // Initialize map if driver is assigned and we have coordinates
      if (
        orderData.driver &&
        orderData.pickupLat &&
        orderData.pickupLng &&
        !mapInstanceRef.current
      ) {
        setTimeout(() => initMap(orderData), 100);
      }
    } catch (error: any) {
      toast.error('Failed to load order');
      router.push('/user/orders');
    } finally {
      setLoading(false);
    }
  };

  const initMap = (orderData: any) => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    try {
      const google = (window as any).google;
      if (!google) return;

      const mapOptions = {
        zoom: 13,
        center: { lat: orderData.pickupLat, lng: orderData.pickupLng },
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
      };

      mapInstanceRef.current = new google.maps.Map(mapContainerRef.current, mapOptions);

      // Add pickup marker
      new google.maps.Marker({
        position: { lat: orderData.pickupLat, lng: orderData.pickupLng },
        map: mapInstanceRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#10B981',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
      });

      // Add delivery marker
      new google.maps.Marker({
        position: { lat: orderData.deliveryLat, lng: orderData.deliveryLng },
        map: mapInstanceRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#EF4444',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
      });

      // Add driver marker if available
      if (orderData.driver?.currentLat && orderData.driver?.currentLng) {
        const vehicleEmoji = getVehicleEmoji(orderData.driver.vehicleType);
        driverMarkerRef.current = new google.maps.Marker({
          position: { lat: orderData.driver.currentLat, lng: orderData.driver.currentLng },
          map: mapInstanceRef.current,
          label: {
            text: vehicleEmoji,
            fontSize: '32px',
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 0,
          },
        });
      }

      // Draw route
      drawRoute(orderData);

      // Fit bounds to show all markers
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: orderData.pickupLat, lng: orderData.pickupLng });
      bounds.extend({ lat: orderData.deliveryLat, lng: orderData.deliveryLng });
      if (orderData.driver?.currentLat && orderData.driver?.currentLng) {
        bounds.extend({ lat: orderData.driver.currentLat, lng: orderData.driver.currentLng });
      }
      mapInstanceRef.current.fitBounds(bounds);
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  };

  const drawRoute = (orderData: any) => {
    const google = (window as any).google;
    if (!google || !mapInstanceRef.current) return;

    const directionsService = new google.maps.DirectionsService();

    directionsService.route(
      {
        origin: { lat: orderData.pickupLat, lng: orderData.pickupLng },
        destination: { lat: orderData.deliveryLat, lng: orderData.deliveryLng },
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result: any, status: any) => {
        if (status === google.maps.DirectionsStatus.OK) {
          if (polylineRef.current) {
            polylineRef.current.setMap(null);
          }

          polylineRef.current = new google.maps.Polyline({
            path: result.routes[0].overview_path,
            strokeColor: '#0F58FF',
            strokeOpacity: 0.7,
            strokeWeight: 4,
            map: mapInstanceRef.current,
          });
        }
      }
    );
  };

  const updateDriverMarker = (lat: number, lng: number) => {
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setPosition({ lat, lng });
    }
  };

  const getVehicleEmoji = (vehicleType?: string) => {
    const type = (vehicleType || 'CAR').toUpperCase();
    if (type === 'BIKE') return '🏍️';
    if (type === 'VAN') return '🚐';
    if (type === 'TRUCK') return '🚚';
    return '🚗';
  };

  const handleCancelOrder = async () => {
    if (!order) return;

    // Check if order can be cancelled
    const canCancel = ['PENDING', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED'].includes(order.status);

    if (!canCancel) {
      toast.error('Order cannot be cancelled at this stage');
      return;
    }

    if (!confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    setCancelling(true);
    try {
      await orderAPI.cancelOrder(orderId, 'User cancelled');
      toast.success('Order cancelled successfully');
      router.push('/user/orders');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusSteps = () => {
    const steps = [
      { key: 'PENDING', label: 'Order Placed', time: order?.createdAt },
      { key: 'SEARCHING_DRIVER', label: 'Searching Driver', time: order?.createdAt },
      { key: 'DRIVER_ASSIGNED', label: 'Driver Assigned', time: order?.driverAssignedAt },
      { key: 'DRIVER_ARRIVED', label: 'Driver Arrived', time: order?.driverArrivedAt },
      { key: 'PICKED_UP', label: 'Picked Up', time: order?.pickedUpAt },
      { key: 'IN_TRANSIT', label: 'In Transit', time: order?.inTransitAt },
      { key: 'REACHED_DESTINATION', label: 'Reached Destination', time: order?.reachedDestinationAt },
      { key: 'DELIVERED', label: 'Delivered', time: order?.deliveredAt },
    ];

    const currentIndex = steps.findIndex(s => s.key === order?.status);

    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex,
      active: index === currentIndex,
    }));
  };

  if (loading || !hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" text="Loading order..." />
      </div>
    );
  }

  if (!order) return null;

  const canCancel = ['PENDING', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED'].includes(order.status);
  const showMap = order.driver && order.pickupLat && order.pickupLng;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title={`Order #${order.orderNumber}`} showBack />

      {/* Map Section */}
      {showMap && (
        <div className="relative h-64 bg-gray-200">
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
          <script
            src={`https://maps.googleapis.com/maps/api/js?key=${
              process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyAg1QBIXXbGLiNO26G6GvHQwmdJJ0usUV0'
            }&libraries=places`}
            async
            defer
          />
        </div>
      )}

      <div className="px-4 py-6 space-y-4">
        {/* Status Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Order Status</h2>
            <StatusBadge status={order.status} />
          </div>

          {/* Status Timeline */}
          <div className="relative">
            {getStatusSteps().filter(step => step.completed || step.active).map((step, index, arr) => (
              <div key={step.key} className="flex gap-3 relative">
                {/* Vertical Line */}
                {index < arr.length - 1 && (
                  <div className="absolute left-[5px] top-3 bottom-0 w-[2px] bg-primary" />
                )}

                {/* Circle */}
                <div className="relative z-10 flex-shrink-0">
                  <div className={`w-3 h-3 rounded-full ${
                    step.completed ? 'bg-primary' : 'bg-gray-300'
                  }`} />
                </div>

                {/* Content */}
                <div className="flex-1 pb-6">
                  <div className={`font-medium ${step.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                    {step.label}
                  </div>
                  {step.time && (
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDateTime(step.time)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Driver Info */}
        {order.driver && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Driver Details</h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <TruckIcon className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{order.driver.name}</div>
                <div className="text-sm text-gray-500">{order.driver.vehicleNumber}</div>
                <div className="flex items-center gap-1 text-xs text-yellow-600">
                  <Star className="w-3 h-3 fill-current" />
                  {order.driver.rating.toFixed(1)}
                </div>
              </div>
              <a
                href={`tel:${order.driver.mobile}`}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Call
              </a>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-semibold text-gray-600">
              <div className="rounded-xl border border-[#EEF1FF] bg-[#F8F9FF] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400">Pickup OTP</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{order.pickupOtp}</p>
              </div>
              <div className="rounded-xl border border-[#EEF1FF] bg-[#F8F9FF] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400">Drop OTP</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{order.deliveryOtp}</p>
              </div>
            </div>
          </div>
        )}

        {/* Pickup & Delivery */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <div>
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500 mt-1.5" />
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">Pickup</div>
                <div className="text-gray-900">{order.pickupAddress}</div>
              </div>
            </div>
          </div>
          <div className="border-l-2 border-dashed border-gray-300 ml-1.5 h-6" />
          <div>
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500 mt-1.5" />
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">Delivery</div>
                <div className="text-gray-900">{order.deliveryAddress}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Package Details */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3">Package Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Size</span>
              <span className="font-medium">{order.packageSize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Weight</span>
              <span className="font-medium">{order.packageWeight} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Distance</span>
              <span className="font-medium">{order.distance?.toFixed(1)} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Type</span>
              <span className="font-medium">{order.bookingType}</span>
            </div>
          </div>
        </div>

        {/* Receiver Details */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3">Receiver Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span>{order.receiverName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{order.receiverMobile}</span>
            </div>
          </div>
        </div>

        {/* Delivery Proof */}
        {order.proofOfDeliveryUrl && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Delivery Proof
            </h3>
            <img
              src={order.proofOfDeliveryUrl}
              alt="Delivery Proof"
              className="w-full rounded-lg"
            />
            {order.deliveryNotes && (
              <p className="mt-3 text-sm text-gray-600">{order.deliveryNotes}</p>
            )}
          </div>
        )}

        {/* Special Instructions */}
        {order.specialInstructions && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">Special Instructions</h3>
            <p className="text-sm text-gray-600">{order.specialInstructions}</p>
          </div>
        )}

        {/* Price Details */}
        <div className="bg-gradient-to-br from-primary to-blue-600 rounded-xl p-4 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-90">Total Amount</div>
              <div className="text-2xl font-bold mt-1">
                {formatCurrency(order.finalPrice || order.estimatedPrice)}
              </div>
            </div>
            <DollarSign className="w-8 h-8 opacity-50" />
          </div>
        </div>

        {/* Cancel Button */}
        {canCancel && (
          <button
            onClick={handleCancelOrder}
            disabled={cancelling}
            className="w-full bg-red-500 text-white py-4 rounded-xl font-semibold hover:bg-red-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {cancelling ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Cancelling Order...
              </>
            ) : (
              <>
                <X className="w-5 h-5" />
                Cancel Order
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
