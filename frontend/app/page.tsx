'use client';

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TruckIcon, UserIcon, MapPinIcon, ZapIcon, User } from 'lucide-react'
import { useAuthStore } from '@/lib/store/authStore'

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()

  const handleProfileClick = () => {
    if (isAuthenticated) {
      if (user?.role === 'USER') {
        router.push('/user/profile')
      } else if (user?.role === 'DRIVER') {
        router.push('/driver/profile')
      } else {
        router.push('/auth/login')
      }
    } else {
      router.push('/auth/login')
    }
  }

  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      {/* Header with Profile Icon */}
      <div className="absolute top-0 right-0 p-4">
        <button
          onClick={handleProfileClick}
          className="bg-white/20 backdrop-blur-sm text-white border-2 border-white p-3 rounded-full hover:bg-white/30 transition-all"
          aria-label="Profile"
        >
          <User className="w-6 h-6" />
        </button>
      </div>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-white">
        <div className="text-center space-y-8 max-w-2xl">
          {/* Logo/Brand */}
          <div className="space-y-2">
            <TruckIcon className="w-20 h-20 mx-auto" />
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              sharevan
            </h1>
            <p className="text-xl md:text-2xl text-blue-100">
              Your Logistics Partner
            </p>
          </div>

          {/* Tagline */}
          <p className="text-lg md:text-xl text-blue-50 px-4">
            Fast, reliable delivery service connecting customers with local drivers
          </p>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-2">
              <ZapIcon className="w-8 h-8 mx-auto" />
              <h3 className="font-semibold">Fast Delivery</h3>
              <p className="text-sm text-blue-100">Get your packages delivered within hours</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-2">
              <MapPinIcon className="w-8 h-8 mx-auto" />
              <h3 className="font-semibold">Live Tracking</h3>
              <p className="text-sm text-blue-100">Track your delivery in real-time</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-2">
              <UserIcon className="w-8 h-8 mx-auto" />
              <h3 className="font-semibold">Trusted Drivers</h3>
              <p className="text-sm text-blue-100">Verified and rated delivery partners</p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
            <Link
              href="/auth/login?role=user"
              className="bg-white text-primary px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-50 transition-all shadow-lg"
            >
              Book a Delivery
            </Link>
            <Link
              href="/auth/login?role=driver"
              className="bg-white/20 backdrop-blur-sm text-white border-2 border-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/30 transition-all"
            >
              Drive with Us
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-white/80 text-sm">
        <p>© 2024 Sharevan. All rights reserved.</p>
      </footer>
    </div>
  )
}
