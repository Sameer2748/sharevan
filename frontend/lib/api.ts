import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear auth and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// AUTH API
// ============================================================================

export const authAPI = {
  // Email-based OTP (for both USER and DRIVER)
  sendEmailOTP: (email: string, role: 'USER' | 'DRIVER') =>
    api.post('/api/auth/send-email-otp', { email, role }),

  verifyEmailOTP: (email: string, otp: string, role: 'USER' | 'DRIVER') =>
    api.post('/api/auth/verify-email-otp', { email, otp, role }),

  // Legacy mobile-based OTP (kept for backward compatibility)
  sendOTP: (mobile: string, role: 'USER' | 'DRIVER') =>
    api.post('/api/auth/send-otp', { mobile, role }),

  verifyOTP: (mobile: string, otp: string, role: 'USER' | 'DRIVER') =>
    api.post('/api/auth/verify-otp', { mobile, otp, role }),

  getCurrentUser: () => api.get('/api/auth/me'),

  logout: () => api.post('/api/auth/logout'),
};

// ============================================================================
// USER API
// ============================================================================

export const userAPI = {
  getDashboard: () => api.get('/api/user/dashboard'),

  getProfile: () => api.get('/api/user/profile'),

  updateProfile: (data: { name?: string; email?: string; profileImage?: string }) =>
    api.put('/api/user/profile', data),

  completeOnboarding: (data: FormData) =>
    api.post('/api/user/complete-onboarding', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getAddresses: () => api.get('/api/user/addresses'),

  addAddress: (data: {
    label: string;
    address: string;
    lat: number;
    lng: number;
    landmark?: string;
    isDefault?: boolean;
  }) => api.post('/api/user/addresses', data),

  updateAddress: (id: string, data: any) =>
    api.put(`/api/user/addresses/${id}`, data),

  deleteAddress: (id: string) => api.delete(`/api/user/addresses/${id}`),

  rateDriver: (orderId: string, rating: number, comment?: string) =>
    api.post(`/api/user/orders/${orderId}/rate`, { rating, comment }),
};

// ============================================================================
// ORDER API
// ============================================================================

export const orderAPI = {
  calculatePrice: (data: {
    pickupLat: number;
    pickupLng: number;
    deliveryLat: number;
    deliveryLng: number;
    packageSize: 'SMALL' | 'MEDIUM' | 'LARGE';
    bookingType: 'URGENT' | 'SCHEDULED';
  }) => api.post('/api/orders/calculate-price', data),

  createOrder: (data: {
    pickupAddress: string;
    pickupLat: number;
    pickupLng: number;
    deliveryAddress: string;
    deliveryLat: number;
    deliveryLng: number;
    packageSize: 'SMALL' | 'MEDIUM' | 'LARGE';
    packageWeight: number;
    receiverName: string;
    receiverMobile: string;
    specialInstructions?: string;
    bookingType: 'URGENT' | 'SCHEDULED';
    scheduledDate?: string;
    scheduledTimeSlot?: string;
  }) => api.post('/api/orders', data),

  getOrders: (params?: { status?: string; limit?: number; offset?: number }) =>
    api.get('/api/orders', { params }),

  getOrderById: (id: string) => api.get(`/api/orders/${id}`),

  cancelOrder: (id: string, reason?: string) =>
    api.put(`/api/orders/${id}/cancel`, { reason }),
};

// ============================================================================
// DRIVER API
// ============================================================================

export const driverAPI = {
  completeOnboarding: (data: FormData) =>
    api.post('/api/driver/complete-onboarding', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getAvailableOrders: () => api.get('/api/driver/orders/available'),
  getActiveOrder: () => api.get('/api/driver/orders/active'),
  acceptOrder: (orderId: string) => api.post(`/api/driver/orders/${orderId}/accept`),
  updateOrderStatus: (orderId: string, status: string) =>
    api.put(`/api/driver/orders/${orderId}/status`, { status }),
  verifyPickupOtp: (orderId: string, otp: string) =>
    api.post(`/api/driver/orders/${orderId}/verify-pickup`, { otp }),
  verifyDeliveryOtp: (
    orderId: string,
    otp: string,
    deliveryNotes?: string,
    proofOfDeliveryUrl?: string
  ) =>
    api.post(`/api/driver/orders/${orderId}/verify-delivery`, {
      otp,
      deliveryNotes,
      proofOfDeliveryUrl,
    }),
  getEarnings: (range: string) => api.get(`/api/driver/earnings?range=${range}`),
  toggleOnlineStatus: (isOnline: boolean) =>
    api.put('/api/driver/online-status', { isOnline }),
  updateProfile: (payload: any) => api.put('/api/driver/profile', payload),
};

// ============================================================================
// UPLOAD API
// ============================================================================

export const uploadAPI = {
  /**
   * Upload profile picture
   */
  uploadProfilePicture: (file: File) => {
    const formData = new FormData();
    formData.append('profilePicture', file);
    return api.post('/api/upload/profile-picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Upload multiple package images
   */
  uploadPackageImages: (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });
    return api.post('/api/upload/package-images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Upload delivery proof image
   */
  uploadDeliveryProof: (file: File) => {
    const formData = new FormData();
    formData.append('deliveryProof', file);
    return api.post('/api/upload/delivery-proof', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Upload driver documents (license, vehicle registration, photo)
   */
  uploadDriverDocuments: (documents: {
    licenseImage?: File;
    vehicleRegistration?: File;
    driverPhoto?: File;
  }) => {
    const formData = new FormData();
    if (documents.licenseImage) {
      formData.append('licenseImage', documents.licenseImage);
    }
    if (documents.vehicleRegistration) {
      formData.append('vehicleRegistration', documents.vehicleRegistration);
    }
    if (documents.driverPhoto) {
      formData.append('driverPhoto', documents.driverPhoto);
    }
    return api.post('/api/upload/driver-documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
