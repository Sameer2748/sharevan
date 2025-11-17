'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Clock,
  Loader2,
  MapPin,
  Truck,
  X,
  Phone,
  Map,
} from 'lucide-react';
import Navbar from '@/components/shared/Navbar';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import GooglePlacesAutocomplete from '@/components/GooglePlacesAutocomplete';
import { useAuthStore } from '@/lib/store/authStore';
import { orderAPI } from '@/lib/api';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import loginIllustration from '@icons/login-person.png';
import parcelIcon1 from '@icons/parcel-select-icon-1.jpg';
import parcelIcon2 from '@icons/parcel-select-icon-2.jpg';
import parcelIcon3 from '@icons/parcel-select-icon-3.jpg';
import { initSocket, onDriverAssigned, offEvent } from '@/lib/socket';
import { loadGoogleMapsScript } from '@/lib/googleMapsLoader';

interface LocationSuggestion {
  label: string;
  lat: number;
  lng: number;
}

const locationSuggestions: LocationSuggestion[] = [
  { label: 'London, United Kingdom', lat: 51.5074, lng: -0.1278 },
  { label: 'Manchester, United Kingdom', lat: 53.4808, lng: -2.2426 },
  { label: 'Edinburgh, United Kingdom', lat: 55.9533, lng: -3.1883 },
];

type BookingType = 'PICK_NOW' | 'SCHEDULED' | 'URGENT';
type Step =
  | 'locations'
  | 'confirmPickup'
  | 'confirmDrop'
  | 'recipientDetails'
  | 'parcelSelection'
  | 'priceReview'
  | 'searchingDriver'
  | 'driverAssigned';

type ScheduleDetails = { date: string; time: string };

const driverFallback = {
  eta: 'few minutes',
};

export default function BookingPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated, token } = useAuthStore();

  const [authChecking, setAuthChecking] = useState(true);
  const [currentStep, setCurrentStep] = useState<Step>('locations');
  const [bookingType, setBookingType] = useState<BookingType>('PICK_NOW');
  const [scheduleDetails, setScheduleDetails] = useState<ScheduleDetails>({ date: '', time: '' });
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const [showMapSelection, setShowMapSelection] = useState(false);
  const [mapSelectionType, setMapSelectionType] = useState<'pickup' | 'drop'>('pickup');

  const [formData, setFormData] = useState({
    pickupAddress: '',
    pickupLat: 51.752,
    pickupLng: -1.2577,
    deliveryAddress: '',
    deliveryLat: 53.4084,
    deliveryLng: -2.9916,
    packageSize: 'MEDIUM' as 'SMALL' | 'MEDIUM' | 'LARGE',
    packageWeight: '1',
    receiverName: '',
    receiverPhone: '',
    receiverAddressLine1: '',
    receiverAddressLine2: '',
    receiverPostalCode: '',
    specialInstructions: '',
    scheduledDate: '',
    scheduledTimeSlot: '',
  });

  const [activeLocationField, setActiveLocationField] = useState<'pickup' | 'drop'>('pickup');
  const [priceEstimate, setPriceEstimate] = useState<any>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [driverSearchProgress, setDriverSearchProgress] = useState(0);
  const [orderSummary, setOrderSummary] = useState<any>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.replace('/auth/login?role=user');
    } else {
      setAuthChecking(false);
      if (token) {
        initSocket(token);
      }
    }
  }, [hasHydrated, isAuthenticated, router, token]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      scheduledDate: scheduleDetails.date,
      scheduledTimeSlot: scheduleDetails.time,
    }));
  }, [scheduleDetails]);

  useEffect(() => {
    if (currentStep === 'searchingDriver') {
      setDriverSearchProgress(10);
      const interval = setInterval(() => {
        setDriverSearchProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 4;
        });
      }, 200);
      return () => clearInterval(interval);
    }
  }, [currentStep]);

  useEffect(() => {
    if (!orderId || !token) return;
 
     const handleDriverAssigned = (payload: any) => {
       if (payload.orderId !== orderId) return;
 
      setDriverSearchProgress(100);
      const etaMinutesRaw = payload.etaMinutes ? Number(payload.etaMinutes) : null;
      let etaText = orderSummary?.eta || driverFallback.eta;
      if (etaMinutesRaw && !Number.isNaN(etaMinutesRaw)) {
        const minutes = Math.max(1, Math.round(etaMinutesRaw));
        if (minutes >= 60) {
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          etaText = `${hours}h ${mins.toString().padStart(2, '0')}m`;
        } else {
          etaText = `${minutes} mins`;
        }
      }
      setOrderSummary((prev: any) => ({
        ...(prev || {}),
        status: payload.status,
        pickupOtp: payload.pickupOtp,
        deliveryOtp: payload.deliveryOtp,
        eta: etaText,
        driver: payload.driver,
        orderNumber: payload.orderNumber,
      }));
      setCurrentStep('driverAssigned');
    };
 
    onDriverAssigned(handleDriverAssigned);
 
    return () => {
      offEvent('driver-assigned', handleDriverAssigned);
    };
  }, [orderId, token]);

  useEffect(() => {
    if (currentStep === 'priceReview') {
      fetchPriceEstimate();
    }
  }, [currentStep, formData.packageSize, formData.pickupLat, formData.pickupLng, formData.deliveryLat, formData.deliveryLng, bookingType, scheduleDetails]);

  const formattedSchedule = useMemo(() => {
    if (!scheduleDetails.date || !scheduleDetails.time) return '';
    const date = new Date(`${scheduleDetails.date}T${scheduleDetails.time}`);
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [scheduleDetails]);

  const handleLocationChange = (
    field: 'pickup' | 'delivery',
    address: string,
    lat: number,
    lng: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [`${field}Address`]: address,
      [`${field === 'pickup' ? 'pickupLat' : 'deliveryLat'}`]: lat,
      [`${field === 'pickup' ? 'pickupLng' : 'deliveryLng'}`]: lng,
    }));
  };

  const handleSuggestionSelect = async (suggestion: LocationSuggestion) => {
    const field = activeLocationField === 'pickup' ? 'pickup' : 'delivery';
    handleLocationChange(field, suggestion.label, suggestion.lat, suggestion.lng);
  };

  const handleOpenMapSelection = (type: 'pickup' | 'drop') => {
    setMapSelectionType(type);
    setShowMapSelection(true);
  };

  const handleMapLocationConfirm = (address: string, lat: number, lng: number) => {
    const field = mapSelectionType === 'pickup' ? 'pickup' : 'delivery';
    handleLocationChange(field, address, lat, lng);
  };

  const fetchPriceEstimate = async () => {
    if (!formData.pickupAddress || !formData.deliveryAddress) return;
    setPriceLoading(true);
    try {
      const response = await orderAPI.calculatePrice({
        pickupLat: formData.pickupLat,
        pickupLng: formData.pickupLng,
        deliveryLat: formData.deliveryLat,
        deliveryLng: formData.deliveryLng,
        packageSize: formData.packageSize,
        bookingType: bookingType === 'PICK_NOW' ? 'URGENT' : bookingType,
        scheduledDate: scheduleDetails.date,
        scheduledTimeSlot: scheduleDetails.time,
      });
      setPriceEstimate(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch price estimate');
    } finally {
      setPriceLoading(false);
    }
  };

  const handleBookNow = async () => {
    if (!priceEstimate) {
      toast.error('Price not ready yet');
      return;
    }

    setBookingLoading(true);
    try {
      const payload = {
        pickupAddress: formData.pickupAddress,
        pickupLat: formData.pickupLat,
        pickupLng: formData.pickupLng,
        deliveryAddress: formData.deliveryAddress,
        deliveryLat: formData.deliveryLat,
        deliveryLng: formData.deliveryLng,
        packageSize: formData.packageSize,
        packageWeight: Number(formData.packageWeight) || 1,
        receiverName: formData.receiverName,
        receiverMobile: formData.receiverPhone,
        receiverAddressLine1: formData.receiverAddressLine1,
        receiverAddressLine2: formData.receiverAddressLine2,
        receiverPostalCode: formData.receiverPostalCode,
        specialInstructions: formData.specialInstructions,
        bookingType: bookingType === 'PICK_NOW' ? 'URGENT' : bookingType,
        scheduledDate: scheduleDetails.date,
        scheduledTimeSlot: scheduleDetails.time,
      };

      const response = await orderAPI.createOrder(payload as any);
      setOrderSummary(response.data.data);
      setOrderId(response.data.data.id);
      setCurrentStep('searchingDriver');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create order');
    } finally {
      setBookingLoading(false);
    }
  };

  const ensureLocationsSelected = () => {
    if (!formData.pickupAddress || !formData.deliveryAddress) {
      toast.error('Please choose both pickup and drop locations');
      return false;
    }
    if (bookingType === 'SCHEDULED' && (!scheduleDetails.date || !scheduleDetails.time)) {
      toast.error('Select a pickup slot for scheduled deliveries');
      setShowScheduleModal(true);
      return false;
    }
    return true;
  };

  if (authChecking || !hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text="Preparing booking experience..." />
      </div>
    );
  }

  const handleBack = () => {
    switch (currentStep) {
      case 'locations':
        router.push('/user/dashboard');
        break;
      case 'confirmPickup':
        setCurrentStep('locations');
        break;
      case 'confirmDrop':
        setCurrentStep('confirmPickup');
        break;
      case 'recipientDetails':
        setCurrentStep('confirmDrop');
        break;
      case 'parcelSelection':
        setCurrentStep('recipientDetails');
        break;
      case 'priceReview':
        setCurrentStep('parcelSelection');
        break;
      case 'searchingDriver':
        setCurrentStep('priceReview');
        break;
      case 'driverAssigned':
        router.push('/user/dashboard');
        break;
      default:
        router.push('/user/dashboard');
        break;
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FF]">
      {currentStep !== 'driverAssigned' && (
        <div className="relative z-30">
          <Navbar title="Book Delivery" showBack onBack={handleBack} />
        </div>
      )}

      {currentStep === 'locations' && (
        <div className="px-5 py-6 space-y-6">
          <div className="grid grid-cols-3 rounded-full bg-[#EFF2FF] p-1 text-sm font-medium">
            {(
              [
                { key: 'PICK_NOW', label: 'Pick Now' },
                { key: 'SCHEDULED', label: 'Schedule' },
                { key: 'URGENT', label: 'Urgent' },
              ] as { key: BookingType; label: string }[]
            ).map((option) => {
              const active = bookingType === option.key;
              return (
                <button
                  key={option.key}
                  onClick={() => setBookingType(option.key)}
                  className={`rounded-full px-4 py-2 transition ${
                    active ? 'bg-[#0F58FF] text-white shadow-md' : 'text-gray-500'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {bookingType === 'SCHEDULED' && (
            <button
              onClick={() => setShowScheduleModal(true)}
              className="flex w-full items-center justify-between rounded-2xl border border-[#E4E8F7] bg-white px-4 py-4 text-left shadow-sm"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-gray-400">Pickup Slot</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formattedSchedule || 'Select pickup date & time'}
                </p>
              </div>
              <CalendarDays className="h-5 w-5 text-[#0F58FF]" />
            </button>
          )}

          <div className="space-y-4">
            <LocationField
              label="Pickup"
              value={formData.pickupAddress}
              placeholder="Oxford, United Kingdom"
              onFocus={() => setActiveLocationField('pickup')}
              onClear={() =>
                setFormData((prev) => ({ ...prev, pickupAddress: '', pickupLat: 0, pickupLng: 0 }))
              }
              onChange={(address, lat, lng) => handleLocationChange('pickup', address, lat, lng)}
              onMapSelect={() => handleOpenMapSelection('pickup')}
            />
            <LocationField
              label="Drop"
              value={formData.deliveryAddress}
              placeholder="Enter drop location"
              onFocus={() => setActiveLocationField('drop')}
              onClear={() =>
                setFormData((prev) => ({ ...prev, deliveryAddress: '', deliveryLat: 0, deliveryLng: 0 }))
              }
              onChange={(address, lat, lng) => handleLocationChange('delivery', address, lat, lng)}
              onMapSelect={() => handleOpenMapSelection('drop')}
            />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Suggestions</p>
            <div className="mt-3 divide-y divide-[#EEF1FB] overflow-hidden rounded-2xl border border-[#EEF1FB] bg-white shadow-sm">
              {locationSuggestions.map((suggestion) => (
                <button
                  key={suggestion.label}
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 transition hover:bg-[#F5F7FF]"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              if (!ensureLocationsSelected()) return;
              setCurrentStep('confirmPickup');
            }}
            className="mt-6 w-full rounded-full bg-[#0F58FF] py-3 text-sm font-semibold text-white shadow-lg shadow-[#0F58FF]/40 transition hover:bg-[#0d4fe0]"
          >
            Continue
          </button>
        </div>
      )}

      {currentStep === 'confirmPickup' && (
        <MapSection pickup={formData.pickupAddress}>
          <div className="pb-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Confirm Pickup</h2>
            <div className="rounded-xl border border-[#E4E8F7] bg-[#F8F9FF] px-3 py-2.5 mb-3">
              <p className="text-xs text-gray-700 leading-relaxed">
                {formData.pickupAddress || 'Select your pickup location'}
              </p>
            </div>
            <button
              onClick={() => setCurrentStep('confirmDrop')}
              className="w-full rounded-full bg-[#0F58FF] py-3 text-sm font-semibold text-white shadow-lg shadow-[#0F58FF]/30"
            >
              Confirm Location
            </button>
          </div>
        </MapSection>
      )}

      {currentStep === 'confirmDrop' && (
        <MapSection pickup={formData.deliveryAddress}>
          <div className="pb-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Confirm Drop</h2>
            <div className="rounded-xl border border-[#E4E8F7] bg-[#F8F9FF] px-3 py-2.5 mb-3">
              <p className="text-xs text-gray-700 leading-relaxed">
                {formData.deliveryAddress || 'Select your drop location'}
              </p>
            </div>
            <button
              onClick={() => setCurrentStep('recipientDetails')}
              className="w-full rounded-full bg-[#0F58FF] py-3 text-sm font-semibold text-white shadow-lg shadow-[#0F58FF]/30"
            >
              Confirm Location
            </button>
          </div>
        </MapSection>
      )}

      {currentStep === 'recipientDetails' && (
        <MapSection pickup={formData.deliveryAddress}>
          <div className="pb-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Recipient Details</h2>
            <div className="space-y-2">
              <input
                value={formData.receiverName}
                onChange={(e) => setFormData((prev) => ({ ...prev, receiverName: e.target.value }))}
                className="w-full rounded-xl border border-[#E3E7F6] bg-[#F8F9FF] px-3 py-2 text-xs font-medium text-gray-700 focus:border-[#0F58FF] focus:bg-white focus:outline-none"
                placeholder="Name"
              />
              <input
                value={formData.receiverPhone}
                onChange={(e) => setFormData((prev) => ({ ...prev, receiverPhone: e.target.value }))}
                className="w-full rounded-xl border border-[#E3E7F6] bg-[#F8F9FF] px-3 py-2 text-xs font-medium text-gray-700 focus:border-[#0F58FF] focus:bg-white focus:outline-none"
                placeholder="Contact Number"
              />
              <input
                value={formData.receiverAddressLine1}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, receiverAddressLine1: e.target.value }))
                }
                className="w-full rounded-xl border border-[#E3E7F6] bg-[#F8F9FF] px-3 py-2 text-xs font-medium text-gray-700 focus:border-[#0F58FF] focus:bg-white focus:outline-none"
                placeholder="Address Line 1"
              />
              <input
                value={formData.receiverAddressLine2}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, receiverAddressLine2: e.target.value }))
                }
                className="w-full rounded-xl border border-[#E3E7F6] bg-[#F8F9FF] px-3 py-2 text-xs font-medium text-gray-700 focus:border-[#0F58FF] focus:bg-white focus:outline-none"
                placeholder="Address Line 2 (Optional)"
              />
              <input
                value={formData.receiverPostalCode}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, receiverPostalCode: e.target.value }))
                }
                className="w-full rounded-xl border border-[#E3E7F6] bg-[#F8F9FF] px-3 py-2 text-xs font-medium text-gray-700 focus:border-[#0F58FF] focus:bg-white focus:outline-none"
                placeholder="Pin Code"
              />
            </div>
            <button
              onClick={() => {
                if (!formData.receiverName || !formData.receiverAddressLine1) {
                  toast.error('Please enter recipient details');
                  return;
                }
                setCurrentStep('parcelSelection');
              }}
              className="mt-3 w-full rounded-full bg-[#0F58FF] py-3 text-sm font-semibold text-white shadow-lg shadow-[#0F58FF]/30"
            >
              Continue
            </button>
          </div>
        </MapSection>
      )}

      {currentStep === 'parcelSelection' && (
        <MapSection pickup={formData.deliveryAddress}>
          <div className="pb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Select Your Parcel Size</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { key: 'SMALL', title: 'Small Shipment', subtitle: '2 Boxes', image: parcelIcon1 },
                { key: 'LARGE', title: 'Large Shipment', subtitle: '>10 Boxes', image: parcelIcon3 },
                { key: 'MEDIUM', title: 'Medium Shipment', subtitle: '4 Boxes', image: parcelIcon2 },
              ].map((option) => {
                const active = formData.packageSize === option.key;
                return (
                  <button
                    key={option.key}
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, packageSize: option.key as any }));
                    }}
                    className={`group flex flex-col justify-between overflow-hidden rounded-[26px] p-4 text-left transition-all ${
                      active
                        ? 'border-2 border-[#0F58FF] bg-[#EEF3FF] shadow-lg shadow-[#0F58FF]/20'
                        : 'border border-[#E9EEFF] bg-white hover:border-[#0F58FF]/30 hover:shadow-md'
                    } h-[150px]`}
                  >
                    <div>
                      <p className={`text-sm font-semibold ${active ? 'text-[#0F58FF]' : 'text-gray-900'}`}>
                        {option.title}
                      </p>
                      <p className="mt-1 text-xs font-medium text-gray-500">{option.subtitle}</p>
                    </div>
                    <div className="flex justify-end">
                      <Image
                        src={option.image}
                        alt={option.title}
                        className="h-20 w-auto object-contain"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => {
                if (!formData.packageSize) {
                  toast.error('Please select a parcel size');
                  return;
                }
                setCurrentStep('priceReview');
              }}
              className="w-full rounded-full bg-[#0F58FF] py-3 text-sm font-semibold text-white shadow-lg shadow-[#0F58FF]/30"
            >
              Continue
            </button>
          </div>
        </MapSection>
      )}

      {currentStep === 'priceReview' && (
        <MapSection pickup={formData.pickupAddress} drop={formData.deliveryAddress}>
          <div className="pb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Confirm</h2>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Pickup Point</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formData.pickupAddress.split(',')[0]}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Charges*</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {priceLoading ? '...' : `£${priceEstimate?.total || 0}`}
                  </p>
                  <button
                    onClick={() => setShowPriceBreakdown(true)}
                    className="text-xs text-[#0F58FF] hover:underline mt-1"
                  >
                    View Price Breakup
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Package Size</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">
                    {formData.packageSize?.toLowerCase() || 'Medium'}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleBookNow}
              disabled={bookingLoading || priceLoading}
              className="w-full rounded-full bg-[#0F58FF] py-4 text-base font-bold text-white shadow-lg shadow-[#0F58FF]/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bookingLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Booking...
                </span>
              ) : (
                'Book Now'
              )}
            </button>
          </div>
        </MapSection>
      )}

      {currentStep === 'searchingDriver' && (
        <DriverSearchMapSection
          pickup={formData.pickupAddress}
          drop={formData.deliveryAddress}
          pickupLat={formData.pickupLat}
          pickupLng={formData.pickupLng}
          deliveryLat={formData.deliveryLat}
          deliveryLng={formData.deliveryLng}
          onCancel={async () => {
            try {
              if (orderId) {
                await orderAPI.cancelOrder(orderId);
                toast.success('Order cancelled successfully');
              }
            } catch (error) {
              console.error('Failed to cancel order:', error);
            } finally {
              setCurrentStep('priceReview');
              setDriverSearchProgress(0);
              setOrderId(null);
              setOrderSummary(null);
            }
          }}
        />
      )}

      {currentStep === 'driverAssigned' && (
        <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#2563EB] via-[#3B82F6] to-[#60A5FA] text-white">
          <div className="px-6 pt-12 text-center">
            <p className="text-[32px] font-bold tracking-wide">sharevan</p>
            <p className="text-xs uppercase tracking-[0.3em] text-white/80 mt-1">Your Logistics Partner</p>
          </div>

          <div className="relative mt-8 flex flex-1 flex-col items-center justify-center">
            <Image
              src={loginIllustration}
              alt="Driver"
              priority
              className="w-[280px] max-w-none drop-shadow-[0_25px_35px_rgba(0,0,0,0.25)]"
            />

            <div className="absolute bottom-0 w-full px-5 pb-8">
              <div className="mx-auto w-full max-w-[370px] rounded-[32px] bg-white px-6 py-6 text-gray-900 shadow-[0_25px_55px_rgba(15,88,255,0.35)]">
                <h2 className="text-center text-base font-bold text-gray-900 mb-5">
                  Your Driver is Arriving in {orderSummary?.eta || '10 Minutes'}
                </h2>

                <div className="flex items-center gap-4 mb-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 overflow-hidden">
                    {orderSummary?.driver?.profileImage ? (
                      <img
                        src={orderSummary.driver.profileImage}
                        alt={orderSummary.driver.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-bold text-gray-600">
                        {orderSummary?.driver?.name?.charAt(0) || 'D'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-bold text-gray-900">
                      {orderSummary?.driver?.name || 'Albert Johnson'}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {orderSummary?.driver?.vehicleType || 'Ford Pickup'}
                    </p>
                  </div>
                  <a
                    href={orderSummary?.driver?.mobile ? `tel:${orderSummary.driver.mobile}` : 'tel:'}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white border-2 border-gray-200 hover:border-[#0F58FF] transition-colors"
                  >
                    <Phone className="h-5 w-5 text-gray-700" />
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="rounded-2xl bg-[#F0F4FF] px-4 py-3">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Vehicle Number</p>
                    <p className="text-sm font-bold text-gray-900">
                      {orderSummary?.driver?.vehicleNumber || 'UK 23 JG245'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#F0F4FF] px-4 py-3">
                    <p className="text-xs font-semibold text-gray-500 mb-1">OTP</p>
                    <p className="text-sm font-bold text-gray-900">
                      {orderSummary?.pickupOtp || '3566'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => router.push('/user/dashboard')}
                  className="w-full rounded-full border-2 border-[#0F58FF] bg-white py-3.5 text-sm font-bold text-[#0F58FF] hover:bg-[#0F58FF] hover:text-white transition-colors"
                >
                  Back to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ScheduleSlotModal
        open={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onConfirm={(details) => {
          setScheduleDetails(details);
          setShowScheduleModal(false);
        }}
        value={scheduleDetails}
      />

      <PriceBreakdownModal
        open={showPriceBreakdown}
        onClose={() => setShowPriceBreakdown(false)}
        price={priceEstimate}
      />

      <MapSelectionModal
        open={showMapSelection}
        onClose={() => setShowMapSelection(false)}
        onConfirm={handleMapLocationConfirm}
        title={mapSelectionType === 'pickup' ? 'Select Pickup Location' : 'Select Drop Location'}
        initialLat={mapSelectionType === 'pickup' ? formData.pickupLat : formData.deliveryLat}
        initialLng={mapSelectionType === 'pickup' ? formData.pickupLng : formData.deliveryLng}
      />
    </div>
  );
}

function DriverSearchMapSection({
  pickup,
  drop,
  pickupLat,
  pickupLng,
  deliveryLat,
  deliveryLng,
  onCancel,
}: {
  pickup?: string;
  drop?: string;
  pickupLat: number;
  pickupLng: number;
  deliveryLat: number;
  deliveryLng: number;
  onCancel: () => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const routePolylineRef = useRef<any>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [nearbyDrivers, setNearbyDrivers] = useState<any[]>([]);
  const { token } = useAuthStore();

  // Fetch nearby drivers via WebSocket
  useEffect(() => {
    // Initialize socket if not already connected
    if (token) {
      initSocket(token);
    }

    // Request nearby drivers
    const { requestNearbyDrivers, onNearbyDrivers, offEvent } = require('@/lib/socket');

    // Listen for nearby drivers updates
    const handleNearbyDrivers = (data: any) => {
      console.log('Nearby drivers:', data);
      if (data.drivers && Array.isArray(data.drivers)) {
        setNearbyDrivers(data.drivers);
      }
    };

    onNearbyDrivers(handleNearbyDrivers);

    // Request nearby drivers every 3 seconds
    requestNearbyDrivers(pickupLat, pickupLng, 5000);
    const interval = setInterval(() => {
      requestNearbyDrivers(pickupLat, pickupLng, 5000);
    }, 3000);

    // Fallback mock data if no real drivers found after 2 seconds
    const fallbackTimer = setTimeout(() => {
      if (nearbyDrivers.length === 0) {
        const mockDrivers = [
          { id: 1, lat: pickupLat + 0.01, lng: pickupLng + 0.01, vehicleType: 'CAR', name: 'Driver 1' },
          { id: 2, lat: pickupLat - 0.015, lng: pickupLng + 0.02, vehicleType: 'VAN', name: 'Driver 2' },
          { id: 3, lat: pickupLat + 0.02, lng: pickupLng - 0.01, vehicleType: 'BIKE', name: 'Driver 3' },
        ];
        setNearbyDrivers(mockDrivers);
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(fallbackTimer);
      offEvent('nearby-drivers', handleNearbyDrivers);
    };
  }, [pickupLat, pickupLng, token]);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyAg1QBIXXbGLiNO26G6GvHQwmdJJ0usUV0';

    loadGoogleMapsScript(apiKey).then(() => {
      if (mapContainerRef.current && !mapInstanceRef.current) {
        initMap();
      }
      setMapLoading(false);
    }).catch(error => {
      console.error('Failed to load Google Maps:', error);
      setMapLoading(false);
    });
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && nearbyDrivers.length > 0) {
      updateDriverMarkers();
    }
  }, [nearbyDrivers]);

  const initMap = () => {
    if (!mapContainerRef.current || !window.google) return;

    const center = { lat: pickupLat, lng: pickupLng };
    const mapInstance = new window.google.maps.Map(mapContainerRef.current, {
      center,
      zoom: 14,
      disableDefaultUI: true,
      zoomControl: false,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
      ],
    });

    // Add pickup marker (blue)
    new window.google.maps.Marker({
      position: { lat: pickupLat, lng: pickupLng },
      map: mapInstance,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#0F58FF',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 3,
      },
    });

    // Add delivery marker (green)
    new window.google.maps.Marker({
      position: { lat: deliveryLat, lng: deliveryLng },
      map: mapInstance,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#10B981',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 3,
      },
    });

    // Draw route
    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: { lat: pickupLat, lng: pickupLng },
        destination: { lat: deliveryLat, lng: deliveryLng },
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result: any, status: any) => {
        if (status === 'OK') {
          const routePolyline = new window.google.maps.Polyline({
            path: result.routes[0].overview_path,
            geodesic: true,
            strokeColor: '#0F58FF',
            strokeOpacity: 0.7,
            strokeWeight: 4,
            map: mapInstance,
          });
          routePolylineRef.current = routePolyline;
        }
      }
    );

    mapInstanceRef.current = mapInstance;
  };

  const updateDriverMarkers = () => {
    if (!mapInstanceRef.current || !window.google) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add new driver markers with vehicle icons
    nearbyDrivers.forEach(driver => {
      const vehicleType = (driver.vehicleType || driver.type || 'CAR').toUpperCase();
      const vehicleEmoji = vehicleType === 'CAR' ? '🚗' :
                          vehicleType === 'VAN' ? '🚐' :
                          vehicleType === 'BIKE' || vehicleType === 'MOTORCYCLE' ? '🏍️' : '🚚';

      const marker = new window.google.maps.Marker({
        position: { lat: driver.lat || driver.latitude, lng: driver.lng || driver.longitude },
        map: mapInstanceRef.current,
        title: driver.name || `Driver ${driver.id}`,
        label: {
          text: vehicleEmoji,
          fontSize: '28px',
        },
        animation: window.google.maps.Animation.DROP,
      });

      markersRef.current.push(marker);
    });
  };

  return (
    <div className="fixed inset-0 z-10">
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />
      {mapLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 z-20 rounded-t-[32px] bg-white px-6 pt-5 pb-6 shadow-[0_-16px_35px_rgba(15,88,255,0.12)]">
        <div className="flex items-center justify-center mb-4">
          <div className="text-5xl animate-bounce">🚚</div>
        </div>
        <h2 className="text-center text-base font-bold text-gray-900 mb-2">
          We are looking for Drivers Near You
        </h2>
        <div className="h-2 w-full rounded-full bg-gray-200 mb-4 overflow-hidden">
          <div className="h-full bg-[#0F58FF] animate-pulse" style={{ width: '40%' }} />
        </div>
        <button
          onClick={onCancel}
          className="w-full rounded-full border-2 border-[#0F58FF] py-3 text-sm font-semibold text-[#0F58FF] hover:bg-[#0F58FF] hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function MapSection({
  pickup,
  drop,
  children,
}: {
  pickup?: string;
  drop?: string;
  children: React.ReactNode;
}) {
  const src = drop
    ? `https://maps.google.com/maps?saddr=${encodeURIComponent(pickup || '')}&daddr=${encodeURIComponent(drop)}&output=embed`
    : pickup
    ? `https://maps.google.com/maps?q=${encodeURIComponent(pickup)}&z=13&output=embed`
    : 'https://maps.google.com/maps?q=Oxford%20United%20Kingdom&z=13&output=embed';

  return (
    <div className="fixed inset-0 z-10">
      <iframe
        title="map"
        src={src}
        className="pointer-events-none absolute inset-0 w-full h-full border-0 z-0"
        loading="lazy"
        allowFullScreen
      />
      <div className="absolute bottom-0 left-0 right-0 z-20 rounded-t-[32px] bg-white px-5 pt-4 pb-6 shadow-[0_-16px_35px_rgba(15,88,255,0.12)]">
        {children}
      </div>
    </div>
  );
}

function LocationField({
  label,
  value,
  placeholder,
  onChange,
  onFocus,
  onClear,
  onMapSelect,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (address: string, lat: number, lng: number) => void;
  onFocus?: () => void;
  onClear?: () => void;
  onMapSelect?: () => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
        {label}
      </p>
      <div className="flex gap-2">
        <div className="flex-1">
          <GooglePlacesAutocomplete
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            onFocus={onFocus}
            onClear={onClear}
            clearable
            className="rounded-2xl"
          />
        </div>
        {onMapSelect && (
          <button
            type="button"
            onClick={onMapSelect}
            className="flex-shrink-0 flex items-center justify-center w-14 h-14 bg-primary/10 hover:bg-primary/20 rounded-2xl transition-colors"
            title="Select from map"
          >
            <Map className="w-5 h-5 text-primary" />
          </button>
        )}
      </div>
    </div>
  );
}

function ScheduleSlotModal({
  open,
  onClose,
  onConfirm,
  value,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (details: ScheduleDetails) => void;
  value: ScheduleDetails;
}) {
  const [date, setDate] = useState(value.date);
  const [time, setTime] = useState(value.time);

  useEffect(() => {
    if (open) {
      setDate(value.date);
      setTime(value.time);
    }
  }, [open, value]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0">
      <div className="w-full max-w-[430px] rounded-t-[32px] bg-white px-6 pt-6 pb-8 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Select Pickup Slot</h3>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
            Date
          </label>
          <div className="flex items-center gap-3 rounded-2xl border border-[#E4E8F7] bg-[#F8F9FF] px-4 py-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-gray-700 outline-none"
            />
            <CalendarDays className="h-5 w-5 text-[#0F58FF]" />
          </div>

          <label className="block text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
            Time
          </label>
          <div className="flex items-center gap-3 rounded-2xl border border-[#E4E8F7] bg-[#F8F9FF] px-4 py-3">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-gray-700 outline-none"
            />
            <Clock className="h-5 w-5 text-[#0F58FF]" />
          </div>
        </div>

        {date && time && (
          <div className="mt-4 rounded-2xl border border-[#E4E8F7] bg-[#F5F7FF] px-4 py-3 text-xs font-semibold text-[#0F58FF]">
            Estimated Drop Off Time 45 mins after pickup
          </div>
        )}

        <button
          onClick={() => {
            if (!date || !time) {
              toast.error('Select both date and time');
              return;
            }
            onConfirm({ date, time });
          }}
          className="mt-6 w-full rounded-full bg-[#0F58FF] py-3 text-sm font-semibold text-white"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

function PriceBreakdownModal({
  open,
  onClose,
  price,
}: {
  open: boolean;
  onClose: () => void;
  price: any;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-[380px] rounded-3xl bg-white px-6 py-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Price Breakup</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-700">Package Charges (M)</span>
            <span className="text-sm font-bold text-gray-900">£{price?.baseFare || 200}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-700">Driver Charges</span>
            <span className="text-sm font-bold text-gray-900">£{price?.distanceFare || 2}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-700">VAT</span>
            <span className="text-sm font-bold text-gray-900">£{Math.round((price?.total || 0) * 0.2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MapSelectionModal({
  open,
  onClose,
  onConfirm,
  title,
  initialLat,
  initialLng,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (address: string, lat: number, lng: number) => void;
  title: string;
  initialLat: number;
  initialLng: number;
}) {
  const [selectedLat, setSelectedLat] = useState(initialLat);
  const [selectedLng, setSelectedLng] = useState(initialLng);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const isInitializingRef = useRef(false);

  useEffect(() => {
    if (open && !isInitializingRef.current) {
      // Wait a bit for the DOM to be ready
      const timer = setTimeout(() => {
        if (mapContainerRef.current && !mapInstanceRef.current) {
          isInitializingRef.current = true;
          setMapLoading(true);
          const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyAg1QBIXXbGLiNO26G6GvHQwmdJJ0usUV0';
          loadGoogleMapsScript(apiKey).then(() => {
            // Double check the ref is still valid before initializing
            if (mapContainerRef.current && !mapInstanceRef.current) {
              initMap();
            }
            setMapLoading(false);
            isInitializingRef.current = false;
          }).catch(error => {
            console.error('Failed to load Google Maps:', error);
            toast.error('Failed to load map. Please try again.');
            setMapLoading(false);
            isInitializingRef.current = false;
          });
        } else if (mapInstanceRef.current) {
          // Map already exists, just hide loading
          setMapLoading(false);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setSelectedLat(initialLat);
      setSelectedLng(initialLng);
      fetchAddress(initialLat, initialLng);

      if (mapInstanceRef.current && markerInstanceRef.current) {
        mapInstanceRef.current.setCenter({ lat: initialLat, lng: initialLng });
        markerInstanceRef.current.setPosition({ lat: initialLat, lng: initialLng });
      }
    }
  }, [open, initialLat, initialLng]);

  const initMap = () => {
    if (!mapContainerRef.current) {
      console.error('Map container ref is null');
      return;
    }

    if (!window.google) {
      console.error('Google Maps not loaded');
      return;
    }

    try {
      const mapInstance = new window.google.maps.Map(mapContainerRef.current, {
        center: { lat: initialLat, lng: initialLng },
        zoom: 15,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      const markerInstance = new window.google.maps.Marker({
        position: { lat: initialLat, lng: initialLng },
        map: mapInstance,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
      });

      markerInstance.addListener('dragend', () => {
        const position = markerInstance.getPosition();
        if (position) {
          const lat = position.lat();
          const lng = position.lng();
          handleLocationChange(lat, lng);
        }
      });

      mapInstance.addListener('click', (e: any) => {
        if (e.latLng) {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          markerInstance.setPosition(e.latLng);
          handleLocationChange(lat, lng);
        }
      });

      mapInstanceRef.current = mapInstance;
      markerInstanceRef.current = markerInstance;
    } catch (error) {
      console.error('Error initializing map:', error);
      toast.error('Failed to initialize map');
    }
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    fetchAddress(lat, lng);
  };

  const fetchAddress = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.results && data.results[0]) {
        setSelectedAddress(data.results[0].formatted_address);
      }
    } catch (error) {
      console.error('Failed to fetch address:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedAddress) {
      toast.error('Please select a location on the map');
      return;
    }
    onConfirm(selectedAddress, selectedLat, selectedLng);
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 ${!open ? 'hidden' : ''}`}>
      <div className="w-full max-w-[430px] rounded-3xl bg-white overflow-hidden shadow-xl">
        <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="w-full h-[400px] relative bg-gray-100">
          <div
            ref={mapContainerRef}
            className="absolute inset-0"
            suppressHydrationWarning
          />
          {mapLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          )}
        </div>

        <div className="px-5 py-4">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400 mb-2">
              Selected Location
            </p>
            <div className="rounded-2xl border border-[#E4E8F7] bg-[#F8F9FF] px-4 py-3">
              <p className="text-sm text-gray-700">
                {loading ? 'Loading address...' : selectedAddress || 'Click on the map to select'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}
              </p>
            </div>
          </div>

          <div className="text-xs text-gray-500 mb-3 text-center bg-blue-50 p-2 rounded-lg">
            💡 Click on the map or drag the marker to select location
          </div>

          <button
            onClick={handleConfirm}
            disabled={!selectedAddress || loading}
            className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-600 transition-colors"
          >
            {loading ? 'Loading...' : 'Confirm Location'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#EEF1FF] bg-[#F8F9FF] px-4 py-3">
      <span>{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#EEF1FF] bg-[#F8F9FF] px-4 py-3 text-left">
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}
