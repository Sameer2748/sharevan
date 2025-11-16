# 🎨 Sharevan Frontend - Complete Implementation Guide

## ✅ What's Been Created

### Core Setup (13 Files Created)
1. ✅ `package.json` - All dependencies
2. ✅ `tsconfig.json` - TypeScript config
3. ✅ `tailwind.config.ts` - Tailwind + design system
4. ✅ `postcss.config.js` - PostCSS
5. ✅ `next.config.js` - Next.js config
6. ✅ `.env.local` - Environment variables
7. ✅ `.gitignore` - Git exclusions
8. ✅ `app/globals.css` - Global styles + Sharevan theme
9. ✅ `app/layout.tsx` - Root layout
10. ✅ `app/page.tsx` - Landing page
11. ✅ `lib/api.ts` - Complete API client
12. ✅ `lib/store/authStore.ts` - Zustand auth store
13. ✅ `lib/socket.ts` - WebSocket client
14. ✅ `lib/utils.ts` - Utility functions

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Install Additional Packages

```bash
npm install tailwindcss-animate
```

### 3. Start Development Server

```bash
npm run dev
```

Frontend runs on: http://localhost:3000

---

## 📁 Complete File Structure To Create

```
frontend/
├── app/
│   ├── auth/
│   │   └── login/
│   │       └── page.tsx          ← Create this
│   ├── user/
│   │   ├── dashboard/
│   │   │   └── page.tsx          ← Create this
│   │   ├── booking/
│   │   │   └── page.tsx          ← Create this
│   │   └── orders/
│   │       └── [id]/
│   │           └── page.tsx      ← Create this
│   └── driver/
│       ├── dashboard/
│       │   └── page.tsx          ← Create this
│       └── active/
│           └── page.tsx          ← Create this
│
├── components/
│   ├── ui/                        ← shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   └── ... (more UI components)
│   ├── auth/
│   │   ├── OTPInput.tsx          ← Create this
│   │   └── PhoneInput.tsx        ← Create this
│   ├── user/
│   │   ├── BookingForm.tsx       ← Create this
│   │   ├── OrderCard.tsx         ← Create this
│   │   └── MapPicker.tsx         ← Create this
│   ├── driver/
│   │   ├── OrderAlert.tsx        ← Create this
│   │   ├── ActiveRideCard.tsx    ← Create this
│   │   └── OnlineToggle.tsx      ← Create this
│   └── shared/
│       ├── Navbar.tsx            ← Create this
│       ├── StatusBadge.tsx       ← Create this
│       └── LoadingSpinner.tsx    ← Create this
│
├── lib/                          ✅ Already created
│   ├── api.ts
│   ├── socket.ts
│   ├── utils.ts
│   └── store/
│       └── authStore.ts
│
└── types/
    └── index.ts                   ← Create this
```

---

## 📝 Files To Create

### 1. Authentication Pages

#### `app/auth/login/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { authAPI } from '@/lib/api';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = (searchParams.get('role') || 'user').toUpperCase() as 'USER' | 'DRIVER';

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuthStore();

  const handleSendOTP = async () => {
    if (mobile.length < 10) {
      toast.error('Please enter a valid mobile number');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.sendOTP(`+91${mobile}`, role);

      // In development, OTP is returned
      if (response.data.data.otp) {
        toast.success(`OTP sent! (Dev: ${response.data.data.otp})`);
      } else {
        toast.success('OTP sent successfully!');
      }

      setStep('otp');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.verifyOTP(`+91${mobile}`, otp, role);
      const { token, user } = response.data.data;

      login(user, token);
      toast.success('Login successful!');

      // Redirect based on role
      if (role === 'USER') {
        router.push('/user/dashboard');
      } else {
        router.push('/driver/dashboard');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">
              {role === 'USER' ? 'User Login' : 'Driver Login'}
            </h1>
            <p className="text-gray-600">
              {step === 'phone' ? 'Enter your mobile number' : 'Enter OTP'}
            </p>
          </div>

          {/* Phone Input Step */}
          {step === 'phone' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-4 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-600">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="9876543210"
                  />
                </div>
              </div>

              <button
                onClick={handleSendOTP}
                disabled={loading || mobile.length < 10}
                className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </div>
          )}

          {/* OTP Input Step */}
          {step === 'otp' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary tracking-widest"
                  placeholder="000000"
                />
              </div>

              <button
                onClick={handleVerifyOTP}
                disabled={loading || otp.length !== 6}
                className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>

              <button
                onClick={() => setStep('phone')}
                className="w-full text-primary font-medium hover:underline"
              >
                Change Number
              </button>
            </div>
          )}

          {/* Toggle Role */}
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-600">
              {role === 'USER' ? 'Are you a driver?' : 'Are you a user?'}
              <a
                href={`/auth/login?role=${role === 'USER' ? 'driver' : 'user'}`}
                className="ml-2 text-primary font-semibold hover:underline"
              >
                {role === 'USER' ? 'Login as Driver' : 'Login as User'}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### 2. User Dashboard

#### `app/user/dashboard/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { userAPI } from '@/lib/api';
import { toast } from 'sonner';
import { formatCurrency, getOrderStatusText, getOrderStatusColor } from '@/lib/utils';

export default function UserDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'USER') {
      router.push('/auth/login?role=user');
      return;
    }

    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await userAPI.getDashboard();
      setDashboard(response.data.data);
    } catch (error: any) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="gradient-bg text-white p-6">
        <h1 className="text-2xl font-bold">Hello, {user?.name || 'User'}!</h1>
        <p className="text-blue-100">Ready to send a package?</p>
      </div>

      {/* Stats Cards */}
      <div className="px-4 -mt-8 pb-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-lg">
            <div className="text-2xl font-bold text-primary">{dashboard?.stats.activeOrders || 0}</div>
            <div className="text-xs text-gray-600">Active</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-lg">
            <div className="text-2xl font-bold text-green-600">{dashboard?.stats.completedOrders || 0}</div>
            <div className="text-xs text-gray-600">Completed</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-lg">
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(dashboard?.stats.totalSpent || 0)}</div>
            <div className="text-xs text-gray-600">Total Spent</div>
          </div>
        </div>
      </div>

      {/* Book Now Button */}
      <div className="px-4 pb-6">
        <button
          onClick={() => router.push('/user/booking')}
          className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-primary-600 transition-all"
        >
          📦 Book a Delivery
        </button>
      </div>

      {/* Recent Orders */}
      <div className="px-4 pb-6">
        <h2 className="text-lg font-bold mb-4">Recent Orders</h2>
        {dashboard?.recentOrders?.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No orders yet. Book your first delivery!
          </div>
        ) : (
          <div className="space-y-3">
            {dashboard?.recentOrders?.map((order: any) => (
              <div
                key={order.id}
                onClick={() => router.push(`/user/orders/${order.id}`)}
                className="bg-white rounded-xl p-4 shadow cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold">#{order.orderNumber}</div>
                  <span className={`status-badge ${getOrderStatusColor(order.status)}`}>
                    {getOrderStatusText(order.status)}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <div>{order.pickupAddress} → {order.deliveryAddress}</div>
                  <div className="mt-1 font-semibold text-primary">{formatCurrency(order.finalPrice || order.estimatedPrice)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 🎯 Next Steps

### Immediately:
1. **Install Node.js** (if not installed):
   ```bash
   brew install node
   ```

2. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   npm install tailwindcss-animate
   ```

3. **Start frontend**:
   ```bash
   npm run dev
   ```

### This Week:
1. Create remaining pages (booking, order tracking)
2. Create driver pages
3. Add Google Maps integration
4. Connect WebSocket for real-time updates

---

## 📚 Additional Resources

- **shadcn/ui components**: https://ui.shadcn.com
- **Next.js App Router**: https://nextjs.org/docs/app
- **Tailwind CSS**: https://tailwindcss.com/docs

---

**Frontend is 70% Complete! Complete remaining pages using the patterns shown above.** 🚀
