'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const menuItems = [
    {
      label: 'Home',
      path: '/dashboard',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M3.125 3.125H8.125V8.125H3.125V3.125Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11.875 3.125H16.875V8.125H11.875V3.125Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3.125 11.875H8.125V16.875H3.125V11.875Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11.875 11.875H16.875V16.875H11.875V11.875Z" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
    },
    {
      label: 'Customer',
      path: '/dashboard/customers',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M13.3333 12.5C13.3333 13.3833 13.675 14.2083 14.225 14.8333L16.5583 17.1667L15.8333 17.8917L13.5 15.5583C12.875 16.1083 12.05 16.45 11.1667 16.45C9.15833 16.45 7.51667 14.8083 7.51667 12.8C7.51667 10.7917 9.15833 9.15 11.1667 9.15C13.175 9.15 14.8167 10.7917 14.8167 12.8H13.3333Z" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: 'Driver',
      path: '/dashboard/drivers',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M2.5 12.5L10 17.5L17.5 12.5M2.5 7.5L10 12.5L17.5 7.5L10 2.5L2.5 7.5Z" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
    },
    {
      label: 'Driver Verification',
      path: '/dashboard/driver-verification',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 18.3333C14.6024 18.3333 18.3333 14.6024 18.3333 10C18.3333 5.39763 14.6024 1.66667 10 1.66667C5.39763 1.66667 1.66667 5.39763 1.66667 10C1.66667 14.6024 5.39763 18.3333 10 18.3333Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 6.66667V10L12.5 12.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
    },
    {
      label: 'Bookings',
      path: '/dashboard/bookings',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M6.66667 2.5V5.83333M13.3333 2.5V5.83333M2.91667 9.16667H17.0833M4.16667 5.83333H15.8333C16.7538 5.83333 17.5 6.57953 17.5 7.5V16.6667C17.5 17.5871 16.7538 18.3333 15.8333 18.3333H4.16667C3.24619 18.3333 2.5 17.5871 2.5 16.6667V7.5C2.5 6.57953 3.24619 5.83333 4.16667 5.83333Z" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
    },
  ]

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(path)
  }

  return (
    <div className="w-[180px] bg-white border-r border-[#E4E4E4] flex flex-col shrink-0 h-screen overflow-y-auto">
      {/* Logo */}
      <div className="px-3 py-3">
        <div className="flex flex-col items-center gap-0">
          <h1
            className="text-xl font-semibold text-[#103EF7]"
            style={{
              fontFamily: 'Chillax, sans-serif',
              fontWeight: 600,
              letterSpacing: '0%'
            }}
          >
            sharevan
          </h1>
          <p
            className="text-[9px] text-[#103EF7]"
            style={{
              fontFamily: 'Chillax, sans-serif',
              fontWeight: 400,
              letterSpacing: '0%'
            }}
          >
            Your Logistics Partner
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-2 py-3 flex-1">
        <div className="flex flex-col gap-0.5">
          {menuItems.map((item) => {
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`px-2 py-1.5 rounded flex items-center gap-2 transition-colors ${
                  active
                    ? 'bg-[#103EF7] text-white'
                    : 'text-[#727272] hover:bg-gray-50'
                }`}
              >
                <span className={`${active ? 'text-white' : ''} flex-shrink-0`}>
                  {item.path === '/dashboard' ? (
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <path d="M3.125 3.125H8.125V8.125H3.125V3.125Z" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M11.875 3.125H16.875V8.125H11.875V3.125Z" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M3.125 11.875H8.125V16.875H3.125V11.875Z" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M11.875 11.875H16.875V16.875H11.875V11.875Z" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  ) : item.path === '/dashboard/customers' ? (
                    <Image src="/icons/users.svg" alt="" width={16} height={16} className={active ? 'brightness-0 invert' : ''} />
                  ) : item.path === '/dashboard/drivers' ? (
                    <Image src="/icons/truck.svg" alt="" width={16} height={16} className={active ? 'brightness-0 invert' : ''} />
                  ) : item.path === '/dashboard/driver-verification' ? (
                    <Image src="/icons/checkcircle.svg" alt="" width={16} height={16} className={active ? 'brightness-0 invert' : ''} />
                  ) : item.path === '/dashboard/bookings' ? (
                    <Image src="/icons/Calendar.svg" alt="" width={16} height={16} className={active ? 'brightness-0 invert' : ''} />
                  ) : null}
                </span>
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

