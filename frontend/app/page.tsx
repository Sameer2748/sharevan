'use client';

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TruckIcon, Package, MapPin, Clock, Shield, Star, ChevronDown, MessageCircle, Zap } from 'lucide-react'
import { useAuthStore } from '@/lib/store/authStore'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, user, hasHydrated } = useAuthStore()
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    if (!hasHydrated) return

    // Redirect authenticated users to their dashboard
    if (isAuthenticated && user) {
      if (user.role === 'USER') {
        router.replace('/user/dashboard')
      } else if (user.role === 'DRIVER') {
        router.replace('/driver/dashboard')
      }
    }
  }, [isAuthenticated, user, hasHydrated, router])

  // Don't show anything while checking auth
  if (!hasHydrated || isAuthenticated) {
    return null
  }

  const faqs = [
    {
      question: "How do I book a delivery?",
      answer: "Simply sign up as a user, enter your pickup and delivery addresses, select your package size, and confirm. A nearby driver will accept your request within minutes."
    },
    {
      question: "How much does delivery cost?",
      answer: "Pricing is based on distance, package size, and delivery type (standard or urgent). You'll see the exact price before confirming your booking."
    },
    {
      question: "Can I track my delivery in real-time?",
      answer: "Yes! Once a driver accepts your order, you can track their location in real-time on the map and receive live updates on your delivery status."
    },
    {
      question: "How do I become a driver?",
      answer: "Sign up as a driver, complete the verification process by uploading your documents (license, insurance, vehicle details), and start accepting delivery requests once approved."
    },
    {
      question: "What payment methods are accepted?",
      answer: "We accept all major payment methods including credit/debit cards, digital wallets, and cash on delivery for select areas."
    },
    {
      question: "How long does delivery take?",
      answer: "Standard deliveries typically take 2-4 hours, while urgent deliveries are completed within 1-2 hours depending on distance and traffic conditions."
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#0F58FF] via-[#2C7BFF] to-[#62B3FF] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="text-center text-white space-y-8">
            {/* Logo */}
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-4">
              <TruckIcon className="w-10 h-10" />
            </div>

            {/* Heading */}
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              ShareVan
            </h1>
            <p className="text-xl md:text-2xl text-blue-50 max-w-3xl mx-auto">
              Your Logistics Partner - Fast, Reliable Delivery Service
            </p>
            <p className="text-lg text-blue-100 max-w-2xl mx-auto">
              Connect with local drivers for quick and secure package delivery across the UK
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
              <Link
                href="/booking"
                className="bg-white text-[#0F58FF] px-10 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-all shadow-xl hover:shadow-2xl transform hover:scale-105"
              >
                Book a Delivery
              </Link>
              <Link
                href="/auth/login?role=driver"
                className="bg-transparent border-2 border-white text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-white/10 transition-all"
              >
                Become a Driver
              </Link>
            </div>
          </div>
        </div>

        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose ShareVan?
            </h2>
            <p className="text-lg text-gray-600">
              Experience the best in delivery services
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-3xl border border-blue-100 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-gradient-to-br from-[#0F58FF] to-[#62B3FF] rounded-2xl flex items-center justify-center mb-6">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Fast Delivery</h3>
              <p className="text-gray-600">
                Get your packages delivered within hours with our urgent delivery option
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-3xl border border-blue-100 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-gradient-to-br from-[#0F58FF] to-[#62B3FF] rounded-2xl flex items-center justify-center mb-6">
                <MapPin className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Live Tracking</h3>
              <p className="text-gray-600">
                Track your delivery in real-time with GPS and get instant updates
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-3xl border border-blue-100 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-gradient-to-br from-[#0F58FF] to-[#62B3FF] rounded-2xl flex items-center justify-center mb-6">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Secure & Safe</h3>
              <p className="text-gray-600">
                All drivers are verified with background checks and insurance coverage
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-3xl border border-blue-100 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-gradient-to-br from-[#0F58FF] to-[#62B3FF] rounded-2xl flex items-center justify-center mb-6">
                <MessageCircle className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">In-App Chat</h3>
              <p className="text-gray-600">
                Communicate with your driver in real-time through our chat feature
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-3xl border border-blue-100 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-gradient-to-br from-[#0F58FF] to-[#62B3FF] rounded-2xl flex items-center justify-center mb-6">
                <Star className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Rated Drivers</h3>
              <p className="text-gray-600">
                Choose from highly-rated drivers with customer reviews and ratings
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-3xl border border-blue-100 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-gradient-to-br from-[#0F58FF] to-[#62B3FF] rounded-2xl flex items-center justify-center mb-6">
                <Clock className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">24/7 Service</h3>
              <p className="text-gray-600">
                Book deliveries anytime, anywhere with our round-the-clock availability
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600">
              Simple, fast, and reliable delivery in 3 easy steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Step 1 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#0F58FF] to-[#62B3FF] rounded-full text-white text-2xl font-bold mb-6">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Book Your Delivery</h3>
              <p className="text-gray-600">
                Enter pickup and delivery addresses, select package size, and confirm booking
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#0F58FF] to-[#62B3FF] rounded-full text-white text-2xl font-bold mb-6">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Driver Accepts</h3>
              <p className="text-gray-600">
                A nearby verified driver accepts your request and heads to pickup location
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#0F58FF] to-[#62B3FF] rounded-full text-white text-2xl font-bold mb-6">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Track & Receive</h3>
              <p className="text-gray-600">
                Track your delivery in real-time and receive your package safely
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-gray-600">
              Everything you need to know about ShareVan
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-2xl overflow-hidden hover:border-[#0F58FF] transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left bg-white hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#0F58FF] flex-shrink-0 transition-transform ${
                      openFaq === index ? 'transform rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-6 py-4 bg-blue-50 border-t border-gray-200">
                    <p className="text-gray-700">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#0F58FF] via-[#2C7BFF] to-[#62B3FF]">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-50 mb-10">
            Join thousands of satisfied customers using ShareVan for their delivery needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/booking"
              className="bg-white text-[#0F58FF] px-10 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-all shadow-xl"
            >
              Start Sending Packages
            </Link>
            <Link
              href="/auth/login?role=driver"
              className="bg-transparent border-2 border-white text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-white/10 transition-all"
            >
              Start Earning as Driver
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
