'use client';

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuthStore } from '@/lib/store/authStore'
import { useEffect, useState } from 'react'
import { ArrowLeft, Facebook, Instagram, Twitter, Linkedin, Menu, X } from 'lucide-react'

// Import images
import hero1 from '@icons/hero-1.png'
import hero2 from '@icons/hero-2.png'
import hero3 from '@icons/hero-3.png'
import step1 from '@icons/step-1.png'
import step2 from '@icons/step-2.png'
import step3 from '@icons/step-3.png'
import whySharevanImage from '@icons/why-sharevan-section.png'
import aboutUsImage from '@icons/about-us-image.jpg'
import iphoneFrame from '@icons/iphone-outer-new.webp'

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, user, hasHydrated } = useAuthStore()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log('Form submitted:', formData)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <header className="absolute top-4 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 shadow-lg">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <div className="bg-white/10 backdrop-blur-sm px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg">
                <span className="text-white font-semibold text-base sm:text-lg">sharevan</span>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link href="#about" className="text-white hover:text-blue-200 transition-colors">About</Link>
              <Link href="#how-it-works" className="text-white hover:text-blue-200 transition-colors">How It Works?</Link>
              <Link href="#why-sharevan" className="text-white hover:text-blue-200 transition-colors">Why Choose Us</Link>
              <Link href="/auth/login" className="text-white hover:text-blue-200 transition-colors">Download</Link>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden bg-white/10 backdrop-blur-sm p-2 rounded-lg hover:bg-white/20 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-white" />
              ) : (
                <Menu className="w-5 h-5 text-white" />
              )}
            </button>
          </div>

          {/* Mobile Dropdown Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pt-4 border-t border-white/20">
              <nav className="flex flex-col gap-4 pb-2">
                <Link 
                  href="#about" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-white hover:text-blue-200 transition-colors py-2"
                >
                  About
                </Link>
                <Link 
                  href="#how-it-works" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-white hover:text-blue-200 transition-colors py-2"
                >
                  How It Works?
                </Link>
                <Link 
                  href="#why-sharevan" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-white hover:text-blue-200 transition-colors py-2"
                >
                  Why Choose Us
                </Link>
                <Link 
                  href="/auth/login" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-white hover:text-blue-200 transition-colors py-2"
                >
                  Download
                </Link>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 px-4 sm:px-6 lg:px-8 overflow-hidden" style={{ background: 'linear-gradient(to bottom, #103EF7, #092491)', height: '100vh', maxHeight: '100vh' }}>
        <div className="max-w-6xl mx-auto w-full h-full flex flex-col justify-between">
          {/* Text Content - Top Section */}
          <div className="text-white space-y-2 pt-4 pb-4 md:pt-6 lg:pt-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Move Smarter with ShareVan
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl">
              Choose your van, match with a trusted driver, track live, and get safe, same-day delivery across the UK.
            </p>
            <div className="flex gap-4 pt-3">
              <Link
                href="/booking"
                className="bg-white text-[#103EF7] px-6 py-2.5 rounded-full font-semibold text-base hover:bg-blue-50 transition-all shadow-lg"
              >
                Book a Van
              </Link>
              <Link
                href="/driver/login"
                className="bg-transparent text-white px-6 py-2.5 rounded-full font-semibold text-base hover:bg-white/10 transition-all border-2 border-white"
              >
                Driver Login
              </Link>
            </div>
          </div>

          {/* Phone Images - Bottom Section */}
          <div className="relative flex items-end justify-center pb-0">
            {/* Mobile: Single Phone with iPhone Frame */}
            <div className="md:hidden relative w-full max-w-[280px] sm:max-w-[320px] mx-auto" style={{ aspectRatio: '9/19' }}>
              {/* iPhone Frame Background */}
              <Image
                src={iphoneFrame}
                alt="iPhone Frame"
                fill
                className="object-contain object-top drop-shadow-2xl z-10"
              />
              {/* App Screenshot */}
              <div className="absolute top-[12px] left-[2.5%] right-[2.5%] bottom-[12px] z-0 rounded-[8%] overflow-hidden">
                <Image
                  src={hero3}
                  alt="ShareVan App"
                  fill
                  className="object-cover object-top"
                />
              </div>
            </div>

            {/* Desktop & Medium: Three Phones - Full Width Distribution */}
            <div className="hidden md:flex relative w-full items-end justify-between">
              {/* First Phone - Left (Lowest) */}
              <div className="translate-y-[40px] lg:translate-y-[50px] xl:translate-y-[60px]">
                <div className="relative w-[200px] lg:w-[280px] xl:w-[330px] animate-slide-up-1" style={{ aspectRatio: '9/19' }}>
                  {/* iPhone Frame Background */}
                  <Image
                    src={iphoneFrame}
                    alt="iPhone Frame"
                    fill
                    className="object-contain object-top drop-shadow-2xl z-10"
                  />
                  {/* App Screenshot */}
                  <div className="absolute top-[12px] left-[2.5%] right-[2.5%] bottom-[12px] z-0 rounded-[8%] overflow-hidden">
                    <Image
                      src={hero1}
                      alt="ShareVan App"
                      fill
                      className="object-cover object-top"
                    />
                  </div>
                </div>
              </div>

              {/* Second Phone - Center (Middle) */}
              <div className="translate-y-[20px] lg:translate-y-[25px] xl:translate-y-[30px]">
                <div className="relative w-[240px] lg:w-[320px] xl:w-[370px] animate-slide-up-2" style={{ aspectRatio: '9/19' }}>
                  {/* iPhone Frame Background */}
                  <Image
                    src={iphoneFrame}
                    alt="iPhone Frame"
                    fill
                    className="object-contain object-top drop-shadow-2xl z-10"
                  />
                  {/* App Screenshot */}
                  <div className="absolute top-[12px] left-[2.5%] right-[2.5%] bottom-[12px] z-0 rounded-[8%] overflow-hidden">
                    <Image
                      src={hero2}
                      alt="ShareVan App"
                      fill
                      className="object-cover object-top"
                    />
                  </div>
                </div>
              </div>

              {/* Third Phone - Right (Highest) - Taller */}
              <div className="translate-y-[0px]">
                <div className="relative w-[260px] lg:w-[340px] xl:w-[390px] animate-slide-up-3" style={{ aspectRatio: '9/19' }}>
                  {/* iPhone Frame Background */}
                  <Image
                    src={iphoneFrame}
                    alt="iPhone Frame"
                    fill
                    className="object-contain object-top drop-shadow-2xl z-10"
                  />
                  {/* App Screenshot */}
                  <div className="absolute top-[12px] left-[2.5%] right-[2.5%] bottom-[12px] z-0 rounded-[8%] overflow-hidden">
                    <Image
                      src={hero3}
                      alt="ShareVan App"
                      fill
                      className="object-cover object-top"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-10 md:py-12 lg:py-10 px-4 sm:px-6 lg:px-8 bg-gray-50 lg:h-screen lg:flex lg:items-center lg:overflow-hidden">
        <div className="max-w-6xl mx-auto w-full">
          <div className="text-center mb-6 md:mb-8 lg:mb-8">
            <h2 className="text-2xl md:text-3xl lg:text-3xl font-bold text-gray-900 mb-2">
              How Does this Work?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-5 lg:gap-6">
            {/* Step 1 */}
            <div className="text-left">
              <div className="mb-2 lg:mb-3">
                <div className="rounded-3xl p-2 w-full" style={{ backgroundColor: '#F3F7FF', border: '1px solid #D4E2FF' }}>
                  <div className="relative w-full overflow-hidden rounded-2xl h-[300px] md:h-[320px] lg:h-[350px]">
                    <Image
                      src={step1}
                      alt="Book in Minutes"
                      fill
                      className="object-contain object-top drop-shadow-2xl"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm md:text-base lg:text-lg font-semibold text-gray-900">Step 1</h3>
                <p className="text-xs md:text-xs lg:text-sm text-gray-700 font-medium line-clamp-3">
                  Book in Minutes - Tell us what you need to move, choose the van size, and select your pickup time.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="text-left">
              <div className="mb-2 lg:mb-3">
                <div className="rounded-3xl p-2 w-full" style={{ backgroundColor: '#F3F7FF', border: '1px solid #D4E2FF' }}>
                  <div className="relative w-full overflow-hidden rounded-2xl h-[300px] md:h-[320px] lg:h-[350px]">
                    <Image
                      src={step2}
                      alt="Instant Driver Match"
                      fill
                      className="object-contain object-top drop-shadow-2xl"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm md:text-base lg:text-lg font-semibold text-gray-900">Step 2</h3>
                <p className="text-xs md:text-xs lg:text-sm text-gray-700 font-medium line-clamp-3">
                  Instant Driver Match - We connect you with a trusted local driver closest to your location.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="text-left">
              <div className="mb-2 lg:mb-3">
                <div className="rounded-3xl p-2 w-full" style={{ backgroundColor: '#F3F7FF', border: '1px solid #D4E2FF' }}>
                  <div className="relative w-full overflow-hidden rounded-2xl h-[300px] md:h-[320px] lg:h-[350px]">
                    <Image
                      src={step3}
                      alt="Delivered On Time"
                      fill
                      className="object-contain object-top drop-shadow-2xl"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm md:text-base lg:text-lg font-semibold text-gray-900">Step 3</h3>
                <p className="text-xs md:text-xs lg:text-sm text-gray-700 font-medium line-clamp-3">
                  Delivered On Time - Get your items moved swiftly and professionally, anywhere in the UK.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Sharevan Section */}
      <section id="why-sharevan" className="min-h-screen lg:h-screen lg:overflow-hidden flex items-center py-8 lg:py-8 px-4 sm:px-6 lg:px-0" style={{ background: 'linear-gradient(to bottom, #103EF7, #092491)' }}>
        <div className="w-full max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[40%_60%] gap-6 lg:gap-6 items-center">
            {/* Phone Image - Stick to left on all screens */}
            <div className="flex justify-start order-2 lg:order-1 pl-0">
              <div className="relative w-56 md:w-64 lg:w-72 xl:w-80 2xl:w-96" style={{ aspectRatio: '9/19' }}>
                <Image
                  src={whySharevanImage}
                  alt="ShareVan App"
                  fill
                  className="object-contain drop-shadow-2xl"
                  priority
                />
              </div>
            </div>

            {/* Right Side - Heading + Cards */}
            <div className="order-1 lg:order-2 px-4 lg:pr-16">
              {/* Heading Section */}
              <div className="mb-4 lg:mb-5">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2">Why Sharevan?</h2>
                <p className="text-sm md:text-base text-white/90">
                  Choose ShareVan and experience the UK's most dependable van-with-driver service
                </p>
              </div>

              {/* Benefits Cards */}
              <div className="space-y-3 lg:space-y-3">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 lg:p-4 border border-white/20">
                  <h3 className="text-base lg:text-lg font-bold text-white mb-1">Always Available</h3>
                  <p className="text-white/90 text-xs lg:text-sm leading-snug">
                    Need it now? Need it later? ShareVan offers round-the-clock availability, ensuring a van is always ready when you are.
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 lg:p-4 border border-white/20">
                  <h3 className="text-base lg:text-lg font-bold text-white mb-1">Exceptional Service Quality</h3>
                  <p className="text-white/90 text-xs lg:text-sm leading-snug">
                    Our experienced drivers handle every job with care, professionalism, and efficiency every time.
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 lg:p-4 border border-white/20">
                  <h3 className="text-base lg:text-lg font-bold text-white mb-1">Transparent & Fair Pricing</h3>
                  <p className="text-white/90 text-xs lg:text-sm leading-snug">
                    No surprises. No guesswork. You see the price upfront before you book.
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 lg:p-4 border border-white/20">
                  <h3 className="text-base lg:text-lg font-bold text-white mb-1">Real-Time Tracking & Support</h3>
                  <p className="text-white/90 text-xs lg:text-sm leading-snug">
                    Stay updated with live GPS tracking and responsive customer support throughout your move.
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 lg:p-4 border border-white/20">
                  <h3 className="text-base lg:text-lg font-bold text-white mb-1">For Every Kind of Move</h3>
                  <p className="text-white/90 text-xs lg:text-sm leading-snug">
                    When reliability, speed, and professionalism matter ShareVan delivers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="h-screen overflow-hidden flex items-center py-8 lg:py-12 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto w-full">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 lg:mb-6">About Us</h2>

          <div className="space-y-3 lg:space-y-4 text-gray-700 text-sm lg:text-base mb-6 lg:mb-8">
            <p>ShareVan is the UK's modern solution for fast, affordable and reliable van-with-driver services.</p>
            <p>
              Built with a mission to simplify moving and logistics, ShareVan combines smart technology with a trusted driver network to help individuals and businesses transport goods without stress.
            </p>
            <p>
              Whether it's a last-minute store pickup, a home relocation, furniture delivery, or business logistics, ShareVan ensures safe handling, transparent pricing and timely delivery. Our platform is designed to take the complexity out of moving—giving you a seamless, on-demand experience from start to finish.
            </p>
            <p className="font-semibold text-gray-900">Move smarter. Move easier. Move with ShareVan.</p>
          </div>

          {/* About Image */}
          <div className="w-full h-48 md:h-64 lg:h-72 rounded-2xl shadow-lg overflow-hidden">
            <Image
              src={aboutUsImage}
              alt="ShareVan Delivery Service"
              width={1200}
              height={600}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Get in Touch Section */}
      <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 md:mb-12">
            Get in Touch
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#103EF7] focus:border-transparent"
                placeholder="Rachel Joe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#103EF7] focus:border-transparent"
                placeholder="Rachel@domain.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#103EF7] focus:border-transparent"
                placeholder="+971...."
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#103EF7] focus:border-transparent"
                placeholder="Subject"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={1}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#103EF7] focus:border-transparent resize-none"
                placeholder="Enter Query"
              />
            </div>
            <div className="md:col-span-3">
              <button
                type="submit"
                className="bg-[#103EF7] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#092491] transition-colors shadow-lg"
              >
                Send my message
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#F7F7FD] text-gray-700 py-12 md:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 md:gap-12 mb-8">
            <div>
              <h3 className="text-[#103EF7] font-bold text-xl mb-4">sharevan</h3>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4 text-sm">SELL A HOME</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-gray-900 transition-colors">Request an offer</Link></li>
                <li><Link href="#" className="hover:text-gray-900 transition-colors">Pricing</Link></li>
                <li><Link href="#" className="hover:text-gray-900 transition-colors">Reviews</Link></li>
                <li><Link href="#" className="hover:text-gray-900 transition-colors">Stories</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4 text-sm">BUY A HOME</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-gray-900 transition-colors">Buy</Link></li>
                <li><Link href="#" className="hover:text-gray-900 transition-colors">Finance</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4 text-sm">BUY, RENT AND SELL</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-gray-900 transition-colors">Buy and sell properties</Link></li>
                <li><Link href="#" className="hover:text-gray-900 transition-colors">Rent home</Link></li>
                <li><Link href="#" className="hover:text-gray-900 transition-colors">Builder trade-up</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4 text-sm">ABOUT</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#about" className="hover:text-gray-900 transition-colors">Company</Link></li>
                <li><Link href="#how-it-works" className="hover:text-gray-900 transition-colors">How it works</Link></li>
                <li><Link href="#" className="hover:text-gray-900 transition-colors">Contact</Link></li>
                <li><Link href="#" className="hover:text-gray-900 transition-colors">Investors</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4 text-sm">TERMS & PRIVACY</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-gray-900 transition-colors">Trust & Safety</Link></li>
                <li><Link href="#" className="hover:text-gray-900 transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-gray-900 transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4 text-sm">RESOURCES</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-gray-900 transition-colors">Blog</Link></li>
                <li><Link href="#" className="hover:text-gray-900 transition-colors">Guides</Link></li>
                <li><Link href="#" className="hover:text-gray-900 transition-colors">FAQ</Link></li>
                <li><Link href="#" className="hover:text-gray-900 transition-colors">Help Center</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-300 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-600">©2021 Estatery. All rights reserved</p>
            <div className="flex items-center gap-4">
              <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                <Facebook className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                <Instagram className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                <Twitter className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                <Linkedin className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
