'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { adminAPI } from '@/lib/api'
import { useAuthStore } from '@/lib/store/authStore'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await adminAPI.login(data.email, data.password)
      const { token, user } = response.data

      login(user, token)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid email or password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Side - ShareVan Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-b from-[#103EF7] to-[#091649] relative overflow-hidden rounded-r-3xl">
        <div className="flex flex-col justify-start items-start px-12 xl:px-[70px] pt-[100px] pb-10 w-full">
          {/* Text Content */}
          <div className="flex flex-col gap-[6px] mb-[19px] max-w-[500px]">
            <h1 className="text-white text-3xl xl:text-[40px] leading-tight xl:leading-[48px] font-medium font-inter">
              Move Smarter with ShareVan
            </h1>
            <p className="text-[#F6F6F6] text-sm xl:text-base leading-relaxed xl:leading-[24px] font-normal font-inter">
              Choose your van, match with a trusted driver, track live, and get safe, same-day delivery across the UK.
            </p>
          </div>

          {/* Phone Mockups - Positioned at bottom */}
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-start gap-6 px-12 xl:px-[70px] pb-0">
            {/* First Phone (Left) - Touching bottom */}
            <div className="relative">
              <Image
                src="/icons/image1.png"
                alt="ShareVan App Screenshot 1"
                width={260}
                height={538}
                className="object-contain"
                priority
              />
            </div>

            {/* Second Phone (Right) - Touching bottom */}
            <div className="relative">
              <Image
                src="/icons/image2.png"
                alt="ShareVan App Screenshot 2"
                width={260}
                height={538}
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-[#FAFAFA] px-6 sm:px-8 md:px-12 lg:px-20 py-10">
        <div className="w-full max-w-[420px]">
          <div className="flex flex-col gap-6 md:gap-8">
            {/* Title */}
            <h2 className="text-black text-xl md:text-2xl leading-tight font-semibold font-manrope">
              Login to Admin Panel
            </h2>

            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 md:gap-[25px]">
              {/* Form Fields */}
              <div className="flex flex-col gap-5 md:gap-[21px]">
                {/* Email Field */}
                <div className="flex flex-col gap-2">
                  <label className="text-black text-xs leading-[16px] font-medium font-manrope">
                    Email Id
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="Enter Email Id"
                    className="w-full px-3 py-3 border border-[#C6C6C6] rounded text-base leading-[22px] font-medium font-manrope text-gray-900 placeholder:text-[#818181] focus:outline-none focus:border-primary transition-colors"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm">{errors.email.message}</p>
                  )}
                </div>

                {/* Password Field */}
                <div className="flex flex-col gap-2">
                  <label className="text-black text-xs leading-[16px] font-medium font-manrope">
                    Password
                  </label>
                  <input
                    {...register('password')}
                    type="password"
                    placeholder="Enter Password"
                    className="w-full px-3 py-3 border border-[#C6C6C6] rounded text-base leading-[22px] font-medium font-manrope text-gray-900 placeholder:text-[#818181] focus:outline-none focus:border-primary transition-colors"
                  />
                  {errors.password && (
                    <p className="text-red-500 text-sm">{errors.password.message}</p>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-3 bg-[#103EF7] text-white text-base leading-[22px] font-medium font-manrope rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Logging in...' : 'Log In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

