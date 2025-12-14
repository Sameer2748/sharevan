import type { Metadata } from 'next'
import './globals.css'
import FontLoader from '@/components/FontLoader'

export const metadata: Metadata = {
  title: 'ShareVan Admin Panel',
  description: 'Admin Panel for ShareVan Logistics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <FontLoader />
        {children}
      </body>
    </html>
  )
}

