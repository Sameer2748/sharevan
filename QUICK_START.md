# ⚡ Sharevan Quick Start Guide

Follow these steps to get your platform running in minutes!

## 🎯 What's Already Done

### ✅ Backend (70% Complete)
- ✅ Express + TypeScript setup
- ✅ Complete Prisma database schema
- ✅ OTP service
- ✅ SMS service (console mode for development)
- ✅ Pricing calculator
- ✅ Google Maps integration
- ✅ Authentication middleware
- ✅ Error handling
- ✅ Helper utilities
- ✅ Environment configuration

### 📝 What You Need to Complete
- [ ] Auth controller (code provided in IMPLEMENTATION_GUIDE.md)
- [ ] Order controller with race condition handling (code provided)
- [ ] Driver controller
- [ ] User controller
- [ ] Routes
- [ ] WebSocket events
- [ ] Frontend (Next.js)

---

## 🚀 Step 1: Backend Setup (5 minutes)

### 1.1 Install Dependencies

```bash
cd backend
npm install
```

### 1.2 Setup PostgreSQL Database

**Option A: Local PostgreSQL**
```bash
# Install PostgreSQL (Mac)
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb sharevan_db
```

**Option B: Docker**
```bash
docker run --name sharevan-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=sharevan_db -p 5432:5432 -d postgres:15
```

**Option C: Cloud (Recommended)**
- Use [Supabase](https://supabase.com) (free tier)
- Use [Neon](https://neon.tech) (free tier)
- Use [Railway](https://railway.app) (free tier)

### 1.3 Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:password@localhost:5432/sharevan_db"
JWT_SECRET="your_super_secret_jwt_key_change_this"
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
```

### 1.4 Initialize Database

```bash
npm run prisma:generate
npm run prisma:migrate

# Optional: View database
npm run prisma:studio
```

### 1.5 Start Backend

```bash
npm run dev
```

You should see:
```
🚀 Server running on http://localhost:5000
📦 Environment: development
🗄️  Database: Connected
```

---

## 🧪 Step 2: Test Backend (5 minutes)

### Test Health Check

```bash
curl http://localhost:5000/health
```

Expected: `{"success":true,"message":"Server is running"}`

### Test OTP Flow (After implementing auth controller)

**1. Send OTP**
```bash
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"mobile": "+919876543210", "role": "USER"}'
```

**2. Verify OTP (check console for OTP)**
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"mobile": "+919876543210", "otp": "123456", "role": "USER"}'
```

---

## 🎨 Step 3: Frontend Setup (10 minutes)

### 3.1 Initialize Next.js

```bash
cd ../frontend
npx create-next-app@latest . --typescript --tailwind --app --eslint --no-src-dir
```

Answer the prompts:
- ✅ TypeScript: Yes
- ✅ ESLint: Yes
- ✅ Tailwind CSS: Yes
- ✅ `app/` directory: Yes
- ❌ `src/` directory: No
- ✅ Import alias: Yes (@/*)

### 3.2 Install Dependencies

```bash
npm install axios socket.io-client zustand @react-google-maps/api react-hook-form zod @hookform/resolvers lucide-react
```

### 3.3 Install shadcn/ui

```bash
npx shadcn-ui@latest init
```

Choose:
- Style: Default
- Base color: Blue
- CSS variables: Yes

```bash
npx shadcn-ui@latest add button input card form label toast
```

### 3.4 Configure Environment

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
```

### 3.5 Start Frontend

```bash
npm run dev
```

Frontend runs on http://localhost:3000

---

## 📁 File Structure

```
sharevan/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts ✅
│   │   │   └── env.ts ✅
│   │   ├── controllers/
│   │   │   ├── authController.ts ⏳ (code in IMPLEMENTATION_GUIDE.md)
│   │   │   ├── orderController.ts ⏳ (code provided)
│   │   │   ├── driverController.ts ❌ (to create)
│   │   │   └── userController.ts ❌ (to create)
│   │   ├── middleware/
│   │   │   ├── auth.ts ✅
│   │   │   └── errorHandler.ts ✅
│   │   ├── routes/
│   │   │   ├── authRoutes.ts ⏳ (code provided)
│   │   │   ├── orderRoutes.ts ❌
│   │   │   ├── driverRoutes.ts ❌
│   │   │   └── userRoutes.ts ❌
│   │   ├── services/
│   │   │   ├── otpService.ts ✅
│   │   │   ├── smsService.ts ✅
│   │   │   ├── pricingService.ts ✅
│   │   │   └── mapService.ts ✅
│   │   ├── utils/
│   │   │   ├── generateOTP.ts ✅
│   │   │   └── helpers.ts ✅
│   │   └── server.ts ⏳ (code provided)
│   ├── prisma/
│   │   └── schema.prisma ✅
│   ├── package.json ✅
│   └── tsconfig.json ✅
│
└── frontend/
    ├── app/
    │   ├── (auth)/
    │   │   ├── login/page.tsx ❌
    │   │   └── verify-otp/page.tsx ❌
    │   ├── user/
    │   │   ├── dashboard/page.tsx ❌
    │   │   └── booking/page.tsx ❌
    │   └── driver/
    │       └── dashboard/page.tsx ❌
    └── package.json ⏳
```

Legend:
- ✅ Done
- ⏳ Code provided, needs to be created
- ❌ To be built

---

## 🎯 Implementation Order

### Phase 1: Complete Backend (1-2 hours)
1. Copy auth controller code from IMPLEMENTATION_GUIDE.md
2. Copy order controller code
3. Create routes
4. Create server.ts
5. Test with Postman

### Phase 2: Build Frontend Auth (1 hour)
1. Create login page
2. Create OTP verification page
3. Setup Zustand auth store
4. Create API client with Axios

### Phase 3: User Dashboard (2 hours)
1. Create dashboard page
2. Create booking form
3. Integrate Google Maps
4. Order tracking

### Phase 4: Driver Dashboard (2 hours)
1. Driver dashboard
2. Order acceptance
3. Active ride management
4. OTP verification

### Phase 5: Real-time Features (1 hour)
1. WebSocket integration
2. Live tracking
3. Push notifications

---

## 🔥 Critical Features

### 1. Race Condition Handling ⚡
**Location**: `orderController.ts` → `acceptOrder`

The most critical piece - prevents double-booking:

```typescript
await prisma.$transaction(async (tx) => {
  const order: any = await tx.$queryRaw`
    SELECT * FROM "orders"
    WHERE id = ${orderId}
    FOR UPDATE  // Database-level lock
  `;

  if (order[0].driverId !== null) {
    throw new Error('ORDER_ALREADY_ASSIGNED');
  }

  return await tx.order.update({
    where: { id: orderId },
    data: { driverId, status: 'DRIVER_ASSIGNED' }
  });
}, { isolationLevel: 'Serializable' });
```

### 2. OTP Flow 🔐

**Send OTP**:
1. User enters mobile
2. Check if user exists (create if not)
3. Generate 6-digit OTP
4. Store in database with 5-min expiry
5. Send via SMS (console in dev)

**Verify OTP**:
1. User enters OTP
2. Check attempts (max 3)
3. Verify OTP
4. Generate JWT token
5. Return user data

### 3. Pricing Calculator 💰

```typescript
base_fare = 30
distance_fare = distance * 10
size_multiplier = { SMALL: 1.0, MEDIUM: 1.3, LARGE: 1.6 }
urgent_multiplier = 1.5 (if urgent) or 1.0 (if scheduled)

total = (base_fare + distance_fare) * size_multiplier * urgent_multiplier
```

---

## 📱 Design System (From Figma)

### Colors
```css
--primary: #2E5BFF
--primary-dark: #1E3A8A
--background: #F8F9FA
--card: #FFFFFF
--text: #1F2937
--text-light: #6B7280
--success: #10B981
--error: #EF4444
```

### Components
- **Buttons**: Rounded (12px), full-width on mobile
- **Cards**: Shadow, 16px radius
- **Inputs**: 48px height, 12px radius
- **Typography**: Inter font, clean hierarchy

---

## 🧪 Testing Checklist

### Backend
- [ ] Health check works
- [ ] OTP send works
- [ ] OTP verify works
- [ ] JWT authentication works
- [ ] Order creation works
- [ ] Race condition handled (test with multiple simultaneous requests)
- [ ] WebSocket connection works

### Frontend
- [ ] Login page loads
- [ ] OTP received
- [ ] Dashboard displays
- [ ] Booking form works
- [ ] Google Maps loads
- [ ] Real-time tracking works

---

## 🆘 Troubleshooting

### Database connection failed
```bash
# Check PostgreSQL is running
brew services list

# Check connection string in .env
echo $DATABASE_URL

# Reset database
npm run prisma:migrate reset
```

### TypeScript errors
```bash
# Regenerate Prisma client
npm run prisma:generate

# Clear node_modules
rm -rf node_modules package-lock.json
npm install
```

### Port already in use
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9
```

---

## 📚 Resources

- **Prisma Docs**: https://www.prisma.io/docs
- **Next.js Docs**: https://nextjs.org/docs
- **shadcn/ui**: https://ui.shadcn.com
- **Google Maps React**: https://react-google-maps-api-docs.netlify.app

---

## 🎉 Success Criteria

You'll know it's working when:

1. ✅ Backend server starts without errors
2. ✅ Database migrations run successfully
3. ✅ Prisma Studio shows tables
4. ✅ OTP appears in console logs
5. ✅ JWT token returned on verification
6. ✅ Frontend connects to backend
7. ✅ Can create test order
8. ✅ Driver can accept order
9. ✅ Real-time updates work

---

**Ready to build? Start with Step 1! 🚀**

Questions? Check:
1. README.md - Project overview
2. IMPLEMENTATION_GUIDE.md - Detailed code samples
3. Figma designs in `figma_images/`
4. Prisma schema comments
