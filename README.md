# 🚚 Sharevan - Delivery Platform

A complete Porter-like delivery platform built with Next.js, Express, Prisma, PostgreSQL, and Socket.io.

## 📁 Project Structure

```
sharevan/
├── backend/          # Express.js + Prisma backend
├── frontend/         # Next.js frontend
├── figma_images/     # Design references
└── README.md
```

## 🎯 Features

### User Features
- ✅ Mobile OTP Authentication
- ✅ Create urgent/scheduled deliveries
- ✅ Real-time order tracking with Google Maps
- ✅ Order history
- ✅ Saved addresses
- ✅ Rate drivers

### Driver Features
- ✅ Mobile OTP Authentication
- ✅ Online/Offline toggle
- ✅ Accept/Reject delivery requests
- ✅ Real-time order updates
- ✅ OTP verification for pickup/delivery
- ✅ Earnings tracking
- ✅ Document verification

### Admin Features
- ✅ Driver verification
- ✅ Pricing configuration
- ✅ Platform analytics

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Real-time**: Socket.io
- **Authentication**: JWT
- **Maps**: Google Maps API

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **Maps**: @react-google-maps/api

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Google Maps API key (optional for development)

### Backend Setup

1. **Install dependencies**:
```bash
cd backend
npm install
```

2. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your database URL and other configs
```

3. **Setup database**:
```bash
npm run prisma:generate
npm run prisma:migrate
```

4. **Start development server**:
```bash
npm run dev
```

Backend will run on http://localhost:5000

### Frontend Setup

1. **Install dependencies**:
```bash
cd frontend
npm install
```

2. **Configure environment**:
```bash
cp .env.local.example .env.local
# Add your API URL and Google Maps key
```

3. **Start development server**:
```bash
npm run dev
```

Frontend will run on http://localhost:3000

## 📊 Database Schema

The schema includes:
- **Users** - Customer accounts
- **Drivers** - Driver accounts with verification
- **Orders** - Delivery orders with full tracking
- **Earnings** - Driver financial records
- **Reviews** - Customer feedback
- **Notifications** - Push notifications
- **OTPAttempts** - Authentication security

See [backend/prisma/schema.prisma](backend/prisma/schema.prisma) for details.

## 🔐 Authentication Flow

1. User enters mobile number
2. OTP sent via SMS
3. User verifies OTP
4. JWT token issued
5. Token used for all subsequent requests

## 💰 Pricing Logic

```
Base Fare: ₹30
+ Distance Fare: ₹10/km (minimum 2km)
× Package Size Multiplier:
  - Small: 1.0x
  - Medium: 1.3x
  - Large: 1.6x
× Booking Type:
  - Urgent: 1.5x
  - Scheduled: 1.0x

Driver Earnings: 75% of total
Platform Commission: 25%
```

## 🎨 Design System

Based on Figma designs:

### Colors
- Primary: `#2E5BFF` (Royal Blue)
- Background: `#F8F9FA`
- Text: `#1F2937`
- Success: `#10B981`
- Error: `#EF4444`

### Typography
- Font: Inter, system-ui
- Headings: 600-700 weight
- Body: 400 weight

### Components
- Border Radius: 12-16px
- Shadows: Subtle, layered
- Buttons: Full-width on mobile

## 🔄 Order Flow

### User Journey
1. **Create Order** → OTP generated
2. **Driver Search** → Broadcast to online drivers
3. **Driver Accepts** → Race condition handled
4. **Driver Arrives** → Status updated
5. **Pickup OTP** → Verify and pickup
6. **In Transit** → Real-time tracking
7. **Delivery OTP** → Verify and complete
8. **Rate Driver** → Feedback

### Driver Journey
1. **Go Online** → Receive order alerts
2. **Accept Order** → Assignment locked
3. **Navigate to Pickup** → Google Maps
4. **Verify Pickup OTP** → Confirm package
5. **Navigate to Drop** → Live tracking
6. **Verify Delivery OTP** → Complete
7. **Earnings Added** → Financial record

## 🏗️ What's Been Built

### ✅ Completed
- Backend structure (Express + TypeScript)
- Prisma schema (complete database design)
- OTP service
- SMS service (console/Twilio)
- Pricing calculator
- Google Maps integration
- Authentication middleware
- Error handling
- Environment configuration

### 🔨 Next Steps

#### Backend
1. Create authentication controller (`src/controllers/authController.ts`)
2. Create order controller with race condition handling
3. Create driver controller
4. Create user controller
5. Setup WebSocket for real-time updates
6. Create API routes
7. Build main server file

#### Frontend
1. Initialize Next.js project
2. Setup Tailwind + shadcn/ui
3. Create auth pages (login/OTP)
4. Build user dashboard
5. Build booking form
6. Integrate Google Maps
7. Create order tracking
8. Build driver dashboard
9. Create active ride screens

## 📝 Key Files to Create

### Backend Controllers
- `src/controllers/authController.ts` - Login, OTP verification
- `src/controllers/orderController.ts` - Order CRUD, race condition logic
- `src/controllers/driverController.ts` - Driver management
- `src/controllers/userController.ts` - User profile, addresses

### Backend Routes
- `src/routes/authRoutes.ts`
- `src/routes/orderRoutes.ts`
- `src/routes/driverRoutes.ts`
- `src/routes/userRoutes.ts`

### WebSocket
- `src/socket/index.ts` - Real-time event handling

### Main Server
- `src/server.ts` - Express app initialization

## 🔥 Critical Implementation: Race Condition

When multiple drivers click "Accept" simultaneously, use database locking:

```typescript
await prisma.$transaction(async (tx) => {
  const order = await tx.$queryRaw`
    SELECT * FROM "Order"
    WHERE id = ${orderId}
    FOR UPDATE
  `;

  if (order.driverId !== null) {
    throw new Error('ORDER_ALREADY_ASSIGNED');
  }

  return await tx.order.update({
    where: { id: orderId },
    data: { driverId, status: 'DRIVER_ASSIGNED' }
  });
}, { isolationLevel: 'Serializable' });
```

## 📲 WebSocket Events

### Server → Client
- `new-order-alert` - New order for drivers
- `driver-assigned` - Driver accepted (to user)
- `order-status-update` - Status changed
- `driver-location-update` - Live tracking
- `order-taken` - Order no longer available

### Client → Server
- `update-location` - Driver location
- `join-room` - Subscribe to order updates

## 🧪 Testing

### Development Mode
- OTP is logged to console
- Google Maps uses Haversine fallback
- SMS not actually sent

### Production Checklist
- [ ] Configure Twilio/MSG91
- [ ] Add Google Maps API key
- [ ] Setup PostgreSQL
- [ ] Configure CORS
- [ ] Enable SSL/HTTPS
- [ ] Setup error monitoring (Sentry)
- [ ] Configure file uploads (Cloudinary)

## 📚 API Endpoints

### Authentication
```
POST   /api/auth/send-otp       - Send OTP
POST   /api/auth/verify-otp     - Verify & Login
POST   /api/auth/logout         - Logout
GET    /api/auth/me             - Current user
```

### Orders
```
POST   /api/orders              - Create order
GET    /api/orders/:id          - Get order
POST   /api/orders/calculate    - Price estimate
PUT    /api/orders/:id/cancel   - Cancel order
```

### Driver
```
PUT    /api/driver/online       - Toggle online status
GET    /api/driver/orders       - Available orders
POST   /api/driver/orders/:id/accept  - Accept order
POST   /api/driver/orders/:id/pickup  - Verify pickup OTP
POST   /api/driver/orders/:id/deliver - Verify delivery OTP
```

## 🎯 Quick Start Commands

```bash
# Backend
cd backend
npm install
npm run prisma:generate
npm run dev

# Frontend (in new terminal)
cd frontend
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
npm run dev
```

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## 📄 License

MIT License - see LICENSE file

## 🆘 Support

For issues or questions:
- Check existing documentation
- Review Figma designs in `figma_images/`
- Examine Prisma schema
- Test with Postman/Thunder Client

---

**Built with ❤️ for efficient logistics**
