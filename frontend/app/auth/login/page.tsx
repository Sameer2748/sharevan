'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { authAPI } from '@/lib/api'
import { useAuthStore } from '@/lib/store/authStore'
import loginIllustration from '@icons/login-person.png'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = (searchParams.get('role') || 'user').toUpperCase() as 'USER' | 'DRIVER'
  const otherRole = role === 'USER' ? 'driver' : 'user'

  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)

  const { login } = useAuthStore()

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSendOTP = async () => {
    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address')
      return
    }

    setLoading(true)
    try {
      await authAPI.sendEmailOTP(email.toLowerCase().trim(), role)

      toast.success('OTP sent to your email')

      setStep('otp')
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to send OTP'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    const otpString = otp.join('')
    if (otpString.length !== 6) {
      toast.error('Please enter the 6-digit OTP')
      return
    }

    setLoading(true)
    try {
      const response = await authAPI.verifyEmailOTP(email.toLowerCase().trim(), otpString, role)
      const { token, user } = response.data.data

      login(user, token)
      toast.success('Login successful!')

      // Check if onboarding is completed
      if (!user.onboardingCompleted) {
        if (role === 'USER') {
          router.push('/user/onboarding')
        } else {
          router.push('/driver/onboarding')
        }
        return
      }

      // Check if user came from booking flow
      const fromBooking = searchParams.get('fromBooking')
      const returnUrl = searchParams.get('returnUrl')

      if (fromBooking === 'true' && returnUrl) {
        // User came from public booking page, redirect back to complete booking
        router.push(returnUrl)
        return
      }

      // Redirect to dashboard based on role
      if (role === 'USER') {
        router.push('/user/dashboard')
      } else {
        router.push('/driver/dashboard')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Invalid OTP')
      setOtp(['', '', '', '', '', ''])
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0]

    const updated = [...otp]
    updated[index] = value
    setOtp(updated)

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  return (
    <div className="h-screen max-h-screen w-full bg-gradient-to-b from-[#0F58FF] via-[#1F6CFF] to-[#469BFF] flex justify-center px-0 sm:px-4 pt-4 overflow-hidden">
      <div className="w-full max-w-[430px] flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-end px-6 text-white flex-shrink-0">
          <Link
            href={`/auth/login?role=${otherRole}`}
            className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide shadow-sm transition hover:bg-white/20"
          >
            {role === 'USER' ? 'Switch to Driver' : 'Switch to Customer'}
          </Link>
        </div>

        {/* Illustration */}
        <div className="relative flex-1 flex items-end justify-center overflow-hidden min-h-0">
          <div className="absolute top-4 left-0 right-0 flex flex-col items-center gap-1 text-white">
            <p className="text-[22px] sm:text-[26px] font-semibold tracking-wide">sharevan</p>
            <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.22em] text-white/75">
              Your Logistics Partner
            </p>
          </div>
          <Image
            src={loginIllustration}
            alt="Sharevan Delivery Partner"
            priority
            className="h-auto w-[420px] sm:w-[520px] max-w-none translate-y-20 sm:translate-y-28 object-contain drop-shadow-2xl"
          />
        </div>

        {/* Card */}
        <div className="relative -mt-12 sm:-mt-16 w-full rounded-t-3xl bg-white px-6 pt-6 pb-4 shadow-[0_-18px_40px_rgba(15,88,255,0.25)] space-y-4 flex-shrink-0 max-h-[50vh] overflow-y-auto">
          <div className="space-y-1 text-center">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
              {step === 'email'
                ? role === 'USER'
                  ? 'Welcome to Share Van'
                  : 'Welcome Driver Partner'
                : 'Enter OTP'}
            </h1>
            <p className="text-sm sm:text-base text-gray-500">
              {step === 'email'
                ? 'Enter your email address to continue'
                : `Code sent to ${email}`}
            </p>
          </div>

          {step === 'email' ? (
            <div className="space-y-2.5">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/20 transition">
                <input
                  type="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && isValidEmail(email)) {
                      handleSendOTP()
                    }
                  }}
                  placeholder="your.email@example.com"
                  className="w-full rounded-2xl bg-transparent px-4 py-4 text-base font-medium text-gray-900 outline-none"
                />
              </div>
              <button
                onClick={handleSendOTP}
                disabled={loading || !isValidEmail(email)}
                className="w-full rounded-full bg-[#0F58FF] py-3 text-base font-semibold text-white shadow-lg shadow-[#0F58FF]/40 transition hover:bg-[#0d4fe0] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Sending OTP...
                  </span>
                ) : (
                  'Send OTP'
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="h-14 w-12 rounded-2xl border border-gray-200 bg-gray-50 text-center text-xl font-semibold text-gray-900 shadow-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                    autoFocus={index === 0}
                    autoComplete="off"
                  />
                ))}
              </div>

              <button
                onClick={handleVerifyOTP}
                disabled={loading || otp.join('').length !== 6}
                className="w-full rounded-full bg-[#0F58FF] py-3 text-base font-semibold text-white shadow-lg shadow-[#0F58FF]/40 transition hover:bg-[#0d4fe0] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  'Verify'
                )}
              </button>

              <div className="text-center space-y-1.5">
                <button
                  onClick={() => {
                    setStep('email')
                    setOtp(['', '', '', '', '', ''])
                  }}
                  className="text-sm font-semibold text-[#0F58FF] hover:underline"
                >
                  Change Email
                </button>
                <button
                  onClick={handleSendOTP}
                  disabled={loading}
                  className="block w-full text-xs font-medium text-gray-500 hover:text-[#0F58FF]"
                >
                  Resend OTP
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1 text-center text-[11px] text-gray-500">
            {role === 'DRIVER' ? (
              <p>
                New to Share Van?{' '}
                <Link href="/auth/register/driver" className="font-semibold text-[#0F58FF] hover:underline">
                  Register as Driver
                </Link>
              </p>
            ) : (
              <p>
                Are you a driver?{' '}
                <Link href="/auth/login?role=driver" className="font-semibold text-[#0F58FF] hover:underline">
                  Login here
                </Link>
              </p>
            )}
            <p>
              By logging in you agree to our{' '}
              <Link href="#" className="font-semibold text-[#0F58FF] hover:underline">
                Terms & Conditions
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
