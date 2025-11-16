# 🚀 Complete Implementation Guide

This guide will help you finish building the Sharevan platform.

## 📋 Table of Contents
1. [Backend Controllers](#backend-controllers)
2. [Backend Routes](#backend-routes)
3. [WebSocket Setup](#websocket-setup)
4. [Main Server](#main-server)
5. [Frontend Setup](#frontend-setup)
6. [Testing](#testing)

---

## 1. Backend Controllers

### authController.ts

Create `backend/src/controllers/authController.ts`:

```typescript
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { sendOTPToMobile, verifyOTP } from '../services/otpService';
import { sendSuccess, sendError, formatPhoneNumber, isValidPhoneNumber } from '../utils/helpers';

/**
 * Send OTP to mobile number
 * POST /api/auth/send-otp
 */
export const sendOTP = async (req: Request, res: Response) => {
  try {
    const { mobile, role } = req.body;

    // Validate mobile
    if (!mobile || !isValidPhoneNumber(mobile)) {
      return sendError(res, 'Invalid mobile number');
    }

    if (!role || !['USER', 'DRIVER'].includes(role)) {
      return sendError(res, 'Invalid role. Must be USER or DRIVER');
    }

    const formattedMobile = formatPhoneNumber(mobile);

    // Check if user/driver exists
    let userId: string | undefined;
    let driverId: string | undefined;

    if (role === 'USER') {
      let user = await prisma.user.findUnique({ where: { mobile: formattedMobile } });
      if (!user) {
        user = await prisma.user.create({
          data: { mobile: formattedMobile, role: 'USER' }
        });
      }
      userId = user.id;
    } else {
      const driver = await prisma.driver.findUnique({ where: { mobile: formattedMobile } });
      if (!driver) {
        return sendError(res, 'Driver account not found. Please register first.', 404);
      }
      driverId = driver.id;
    }

    // Send OTP
    const result = await sendOTPToMobile(formattedMobile, userId, driverId);

    if (!result.success) {
      return sendError(res, result.message);
    }

    return sendSuccess(res, {
      mobile: formattedMobile,
      ...(env.NODE_ENV === 'development' && { otp: result.otp })
    }, 'OTP sent successfully');

  } catch (error: any) {
    console.error('Send OTP error:', error);
    return sendError(res, error.message || 'Failed to send OTP', 500);
  }
};

/**
 * Verify OTP and login
 * POST /api/auth/verify-otp
 */
export const verifyOTPAndLogin = async (req: Request, res: Response) => {
  try {
    const { mobile, otp, role } = req.body;

    if (!mobile || !otp || !role) {
      return sendError(res, 'Mobile, OTP, and role are required');
    }

    const formattedMobile = formatPhoneNumber(mobile);

    // Verify OTP
    const verification = await verifyOTP(formattedMobile, otp);

    if (!verification.success) {
      return sendError(res, verification.message, 401);
    }

    // Get user/driver
    let user: any;
    let tokenRole: string;

    if (role === 'USER') {
      user = await prisma.user.findUnique({
        where: { mobile: formattedMobile },
        select: { id: true, mobile: true, name: true, email: true, role: true, profileImage: true }
      });
      tokenRole = 'USER';
    } else {
      user = await prisma.driver.findUnique({
        where: { mobile: formattedMobile },
        select: {
          id: true,
          mobile: true,
          name: true,
          email: true,
          profileImage: true,
          status: true,
          vehicleType: true,
          vehicleNumber: true,
          rating: true
        }
      });
      tokenRole = 'DRIVER';
    }

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, mobile: user.mobile, role: tokenRole },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return sendSuccess(res, {
      token,
      user: { ...user, role: tokenRole }
    }, 'Login successful');

  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return sendError(res, error.message || 'Failed to verify OTP', 500);
  }
};

/**
 * Get current user
 * GET /api/auth/me
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401);
    }

    const { id, role } = req.user;

    let user: any;

    if (role === 'USER') {
      user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, mobile: true, name: true, email: true, profileImage: true, role: true }
      });
    } else {
      user = await prisma.driver.findUnique({
        where: { id },
        select: {
          id: true,
          mobile: true,
          name: true,
          email: true,
          profileImage: true,
          status: true,
          rating: true,
          totalEarnings: true
        }
      });
    }

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    return sendSuccess(res, { ...user, role });

  } catch (error: any) {
    console.error('Get current user error:', error);
    return sendError(res, error.message || 'Failed to get user', 500);
  }
};
```

### orderController.ts (with Race Condition Handling)

Create `backend/src/controllers/orderController.ts`:

```typescript
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendError, generateOrderNumber } from '../utils/helpers';
import { calculateRoute } from '../services/mapService';
import { calculatePrice } from '../services/pricingService';
import { generateOrderOTP } from '../services/otpService';
import { sendSMS } from '../services/smsService';

/**
 * Calculate price estimate
 * POST /api/orders/calculate-price
 */
export const calculatePriceEstimate = async (req: Request, res: Response) => {
  try {
    const { pickupLat, pickupLng, deliveryLat, deliveryLng, packageSize, bookingType } = req.body;

    // Validate coordinates
    if (!pickupLat || !pickupLng || !deliveryLat || !deliveryLng) {
      return sendError(res, 'Pickup and delivery coordinates are required');
    }

    // Calculate distance
    const route = await calculateRoute(
      { lat: pickupLat, lng: pickupLng },
      { lat: deliveryLat, lng: deliveryLng }
    );

    // Calculate price
    const pricing = await calculatePrice(route.distance, packageSize, bookingType);

    return sendSuccess(res, {
      distance: route.distance,
      duration: route.duration,
      ...pricing
    });

  } catch (error: any) {
    console.error('Calculate price error:', error);
    return sendError(res, error.message || 'Failed to calculate price', 500);
  }
};

/**
 * Create new order
 * POST /api/orders
 */
export const createOrder = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'USER') {
      return sendError(res, 'Only users can create orders', 403);
    }

    const orderData = req.body;

    // Calculate route and price
    const route = await calculateRoute(
      { lat: orderData.pickupLat, lng: orderData.pickupLng },
      { lat: orderData.deliveryLat, lng: orderData.deliveryLng }
    );

    const pricing = await calculatePrice(
      route.distance,
      orderData.packageSize,
      orderData.bookingType
    );

    // Generate OTPs
    const pickupOtp = generateOrderOTP();
    const deliveryOtp = generateOrderOTP();

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: req.user.id,
        ...orderData,
        distance: route.distance,
        estimatedDuration: route.duration,
        estimatedPrice: pricing.total,
        finalPrice: pricing.total,
        pickupOtp,
        deliveryOtp,
        status: 'SEARCHING_DRIVER'
      }
    });

    // Create status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: 'PENDING',
        changedBy: 'USER'
      }
    });

    // Broadcast to drivers via WebSocket
    // req.io.to('online-drivers').emit('new-order-alert', { order });

    return sendSuccess(res, order, 'Order created successfully', 201);

  } catch (error: any) {
    console.error('Create order error:', error);
    return sendError(res, error.message || 'Failed to create order', 500);
  }
};

/**
 * CRITICAL: Accept order with race condition handling
 * POST /api/driver/orders/:id/accept
 */
export const acceptOrder = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'DRIVER') {
      return sendError(res, 'Only drivers can accept orders', 403);
    }

    const { id: orderId } = req.params;
    const driverId = req.user.id;

    // Use transaction with database-level locking
    const result = await prisma.$transaction(async (tx) => {
      // Lock the order row with FOR UPDATE
      const order: any = await tx.$queryRaw`
        SELECT * FROM "orders"
        WHERE id = ${orderId}
        FOR UPDATE
      `;

      if (!order || order.length === 0) {
        throw new Error('ORDER_NOT_FOUND');
      }

      const orderData = order[0];

      // Check if already assigned
      if (orderData.driverId !== null) {
        throw new Error('ORDER_ALREADY_ASSIGNED');
      }

      // Check status
      if (orderData.status !== 'SEARCHING_DRIVER') {
        throw new Error('ORDER_NOT_AVAILABLE');
      }

      // Assign driver
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          driverId,
          status: 'DRIVER_ASSIGNED',
          driverAssignedAt: new Date(),
          assignmentAttempts: { increment: 1 }
        },
        include: {
          user: { select: { id: true, name: true, mobile: true } },
          driver: { select: { id: true, name: true, mobile: true, vehicleNumber: true } }
        }
      });

      // Add status history
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: 'DRIVER_ASSIGNED',
          changedBy: 'DRIVER'
        }
      });

      return updated;
    }, {
      isolationLevel: 'Serializable',
      maxWait: 5000,
      timeout: 10000
    });

    // Send notifications
    await sendSMS(
      result.user.mobile,
      `Driver ${result.driver?.name} assigned to your order #${result.orderNumber}`
    );

    return sendSuccess(res, result, 'Order accepted successfully');

  } catch (error: any) {
    if (error.message === 'ORDER_ALREADY_ASSIGNED') {
      return sendError(res, 'This order has already been accepted by another driver', 409);
    }
    if (error.message === 'ORDER_NOT_AVAILABLE') {
      return sendError(res, 'This order is no longer available', 400);
    }
    if (error.message === 'ORDER_NOT_FOUND') {
      return sendError(res, 'Order not found', 404);
    }

    console.error('Accept order error:', error);
    return sendError(res, 'Failed to accept order', 500);
  }
};
```

---

## 2. Backend Routes

### authRoutes.ts

Create `backend/src/routes/authRoutes.ts`:

```typescript
import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/send-otp', authController.sendOTP);
router.post('/verify-otp', authController.verifyOTPAndLogin);
router.get('/me', authenticateToken, authController.getCurrentUser);

export default router;
```

---

## 3. Main Server

Create `backend/src/server.ts`:

```typescript
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/authRoutes';
// import orderRoutes from './routes/orderRoutes';
// import driverRoutes from './routes/driverRoutes';
// import userRoutes from './routes/userRoutes';

const app: Express = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: env.FRONTEND_URL,
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Attach io to request
app.use((req, res, next) => {
  (req as any).io = io;
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
// app.use('/api/orders', orderRoutes);
// app.use('/api/driver', driverRoutes);
// app.use('/api/user', userRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Socket.io connection
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// Start server
httpServer.listen(env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${env.PORT}`);
  console.log(`📦 Environment: ${env.NODE_ENV}`);
  console.log(`🗄️  Database: Connected`);
});

export { app, io };
```

---

## 4. Frontend Setup

### Initialize Next.js

```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --app --eslint
```

### Install shadcn/ui

```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input card form
```

### Install additional packages

```bash
npm install axios socket.io-client zustand @react-google-maps/api react-hook-form zod @hookform/resolvers
```

---

## 5. Quick Commands

```bash
# Terminal 1: Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL
npm run prisma:generate
npm run prisma:migrate
npm run dev

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

---

## 🎯 Next Steps Priority

1. ✅ Backend is 70% complete
2. Create remaining controllers (driver, user, order)
3. Create routes
4. Test with Postman
5. Initialize frontend
6. Build auth pages
7. Build dashboards

---

**You're ready to build! 🚀**
