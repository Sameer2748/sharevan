'use client'

import { useAuthStore } from '@/lib/store/authStore'
import { useRouter } from 'next/navigation'

export default function Header() {
  const router = useRouter()
  const { logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <header className="h-[60px] bg-white border-b border-[#E4E4E4] flex items-center justify-end px-6 shrink-0">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gray-200"></div>
          <span className="text-xs font-medium text-black">Admin</span>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M3 6L8 11L13 6" stroke="black" strokeWidth="1.5" />
          </svg>
        </div>
      </div>
    </header>
  )
}

