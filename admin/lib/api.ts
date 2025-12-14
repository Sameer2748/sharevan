import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export const adminAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/api/admin/auth/login', { email, password })
    return response.data
  },
  
  getProfile: async () => {
    const response = await api.get('/api/admin/auth/me')
    return response.data
  },

  getDashboardStats: async () => {
    const response = await api.get('/api/admin/dashboard/stats')
    return response.data
  },

  getRecentBookings: async () => {
    const response = await api.get('/api/admin/dashboard/recent-bookings')
    return response.data
  },

  getAlerts: async () => {
    const response = await api.get('/api/admin/dashboard/alerts')
    return response.data
  },

  getWeeklyRevenue: async () => {
    const response = await api.get('/api/admin/dashboard/weekly-revenue')
    return response.data
  },

  getCustomers: async (page: number = 1, limit: number = 10, search: string = '') => {
    const response = await api.get(`/api/admin/customers?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`)
    return response.data
  },

  getCustomerDetails: async (id: string) => {
    const response = await api.get(`/api/admin/customers/${id}`)
    return response.data
  },

  updateCustomer: async (id: string, data: { isSuspended?: boolean; note?: string; promoCode?: string }) => {
    const response = await api.put(`/api/admin/customers/${id}`, data)
    return response.data
  },

  drivers: {
    getDrivers: (page: number = 1, limit: number = 10, search: string = '') =>
      api.get(`/api/admin/drivers?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`),
    getDriverById: (id: string) => api.get(`/api/admin/drivers/${id}`),
    updateDriver: (id: string, data: { isSuspended?: boolean }) =>
      api.put(`/api/admin/drivers/${id}`, data),
  },

  driverVerifications: {
    getDriverVerifications: (page: number = 1, limit: number = 10, search: string = '', status: string = 'PENDING_VERIFICATION') =>
      api.get(`/api/admin/driver-verifications?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&status=${status}`),
    getDriverVerificationById: (id: string) => api.get(`/api/admin/driver-verifications/${id}`),
    updateDriverVerification: (id: string, data: { status?: string; rejectionReason?: string; documentVerifications?: any; internalNotes?: string }) =>
      api.put(`/api/admin/driver-verifications/${id}`, data),
  },

  bookings: {
    getBookings: (page: number = 1, limit: number = 50, search: string = '', status: string = '') =>
      api.get(`/api/admin/bookings?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}${status ? `&status=${encodeURIComponent(status)}` : ''}`),
    getBookingById: (id: string) => api.get(`/api/admin/bookings/${id}`),
  },
}

export default api

