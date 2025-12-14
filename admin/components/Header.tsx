'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/lib/store/authStore'
import { useRouter } from 'next/navigation'

export default function Header() {
  const router = useRouter()
  const { logout } = useAuthStore()
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLogoutModal(false)
      }
    }

    if (showLogoutModal) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showLogoutModal])

  return (
    <header className="h-[60px] bg-white border-b border-[#E4E4E4] flex items-center justify-end px-6 shrink-0">
      <div className="flex items-center gap-6">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowLogoutModal(!showLogoutModal)}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          >
            <div className="w-6 h-6 rounded-full bg-gray-200"></div>
            <span className="text-xs font-medium text-black">Admin</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              className={`transition-transform ${showLogoutModal ? 'rotate-180' : ''}`}
            >
              <path d="M3 6L8 11L13 6" stroke="black" strokeWidth="1.5" />
            </svg>
          </button>

          {/* Logout Dropdown Modal */}
          {showLogoutModal && (
            <div className="absolute right-0 mt-2 w-40 bg-white border border-[#E4E4E4] rounded-lg shadow-lg overflow-hidden z-50">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M6 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V3.33333C2 2.97971 2.14048 2.64057 2.39052 2.39052C2.64057 2.14048 2.97971 2 3.33333 2H6M10.6667 11.3333L14 8M14 8L10.6667 4.66667M14 8H6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

