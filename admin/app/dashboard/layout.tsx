'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, user, isHydrated, hydrate } = useAuthStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Mark as mounted on client side
    setMounted(true)
    // Ensure hydration is complete (in case state wasn't initialized properly)
    if (!isHydrated) {
      hydrate()
    }
  }, [isHydrated, hydrate])

  useEffect(() => {
    // Check authentication only after component mounts on client
    if (mounted) {
      if (!isAuthenticated || !user) {
        router.push('/login')
      }
    }
  }, [mounted, isAuthenticated, user, router])

  // Show loading only while not mounted (SSR) or not authenticated
  if (!mounted || !isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAFA]">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#FAFAFA] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

