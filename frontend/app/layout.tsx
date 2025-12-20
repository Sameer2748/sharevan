import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import ClientErrorSuppressor from '@/components/ClientErrorSuppressor'
import FontLoader from '@/components/FontLoader'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ShareVan - Your Logistics Partner',
  description: 'Fast, reliable delivery service for all your logistics needs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <FontLoader />
        <ClientErrorSuppressor />
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
