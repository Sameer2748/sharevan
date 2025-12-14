import { create } from 'zustand'

interface AdminUser {
  id: string
  email: string
  name?: string
  role: string
}

interface AuthState {
  user: AdminUser | null
  token: string | null
  isAuthenticated: boolean
  isHydrated: boolean
  login: (user: AdminUser, token: string) => void
  logout: () => void
  hydrate: () => void
}

// Helper function to load auth state from localStorage
const loadAuthFromStorage = (): { user: AdminUser | null; token: string | null } => {
  if (typeof window === 'undefined') {
    return { user: null, token: null }
  }
  
  const token = localStorage.getItem('admin_token')
  const userStr = localStorage.getItem('admin_user')
  
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr)
      return { user, token }
    } catch (error) {
      console.error('Error parsing user data:', error)
      return { user: null, token: null }
    }
  }
  
  return { user: null, token: null }
}

// Initialize state from localStorage if available
const initialState = loadAuthFromStorage()

export const useAuthStore = create<AuthState>((set) => ({
  user: initialState.user,
  token: initialState.token,
  isAuthenticated: !!initialState.token && !!initialState.user,
  isHydrated: typeof window !== 'undefined',
  login: (user, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_token', token)
      localStorage.setItem('admin_user', JSON.stringify(user))
    }
    set({ user, token, isAuthenticated: true })
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
    }
    set({ user: null, token: null, isAuthenticated: false })
  },
  hydrate: () => {
    const { user, token } = loadAuthFromStorage()
    set({ 
      user, 
      token, 
      isAuthenticated: !!token && !!user,
      isHydrated: true 
    })
  },
}))

