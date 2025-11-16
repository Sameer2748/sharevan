import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { createServer } from 'http';
import { env } from './config/env';
import { prisma } from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { initializeSocket } from './socket';

// Import routes
import authRoutes from './routes/authRoutes';
import orderRoutes from './routes/orderRoutes';
import driverRoutes from './routes/driverRoutes';
import userRoutes from './routes/userRoutes';
import uploadRoutes from './routes/uploadRoutes';

// Create Express app
const app: Express = express();

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io
const io = initializeSocket(httpServer);

// ============================================================================
// MIDDLEWARE
// ============================================================================

// CORS configuration - MUST be before other middleware
app.use(cors({
  origin: true, // Allow all origins in development (can restrict to env.FRONTEND_URL in production)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Handle preflight requests explicitly
app.options('*', cors());

// Security middleware - after CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  contentSecurityPolicy: false // Disable CSP for development
}));

// Compression middleware
app.use(compression());

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Attach Socket.io instance to request object
app.use((req: Request, res: Response, next) => {
  (req as any).io = io;
  next();
});

// Request logging (development only)
if (env.NODE_ENV === 'development') {
  app.use((req: Request, res: Response, next) => {
    console.log(`📨 ${req.method} ${req.path}`, req.body);
    next();
  });
}

// ============================================================================
// HEALTH CHECK & INFO
// ============================================================================

/**
 * @route   GET /
 * @desc    API info
 * @access  Public
 */
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Sharevan API - Your Logistics Partner',
    version: '1.0.0',
    environment: env.NODE_ENV,
    endpoints: {
      auth: '/api/auth',
      orders: '/api/orders',
      driver: '/api/driver',
      user: '/api/user',
      upload: '/api/upload'
    },
    docs: 'See README.md for API documentation'
  });
});

/**
 * @route   GET /health
 * @desc    Health check endpoint
 * @access  Public
 */
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      environment: env.NODE_ENV
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Database connection failed',
      error: env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

/**
 * @route   GET /api/stats
 * @desc    Platform statistics (for admin dashboard)
 * @access  Public (should be protected in production)
 */
app.get('/api/stats', async (req: Request, res: Response) => {
  try {
    const [totalUsers, totalDrivers, totalOrders, activeOrders] = await Promise.all([
      prisma.user.count(),
      prisma.driver.count(),
      prisma.order.count(),
      prisma.order.count({
        where: {
          status: {
            notIn: ['DELIVERED', 'CANCELLED']
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalDrivers,
        totalOrders,
        activeOrders,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

// ============================================================================
// API ROUTES
// ============================================================================

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/user', userRoutes);
app.use('/api/upload', uploadRoutes);

// ============================================================================
// ERROR HANDLERS
// ============================================================================

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

const gracefulShutdown = async () => {
  console.log('\n🛑 Shutting down gracefully...');

  // Stop accepting new connections
  httpServer.close(() => {
    console.log('✅ HTTP server closed');
  });

  // Close Socket.io
  io.close(() => {
    console.log('✅ Socket.io closed');
  });

  // Disconnect Prisma
  await prisma.$disconnect();
  console.log('✅ Database disconnected');

  console.log('👋 Goodbye!');
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in development
  if (env.NODE_ENV === 'production') {
    gracefulShutdown();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit in development
  if (env.NODE_ENV === 'production') {
    gracefulShutdown();
  }
});

// ============================================================================
// START SERVER
// ============================================================================

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    // Start listening
    httpServer.listen(env.PORT, () => {
      console.log('\n╔═══════════════════════════════════════════════════════════════╗');
      console.log('║                                                               ║');
      console.log('║           🚚 SHAREVAN - YOUR LOGISTICS PARTNER 🚚             ║');
      console.log('║                                                               ║');
      console.log('╚═══════════════════════════════════════════════════════════════╝\n');
      console.log(`🚀 Server running on: http://localhost:${env.PORT}`);
      console.log(`📦 Environment: ${env.NODE_ENV}`);
      console.log(`🔌 WebSocket: Enabled`);
      console.log(`🗄️  Database: Connected`);
      console.log(`🌐 Frontend URL: ${env.FRONTEND_URL}`);
      console.log('\n📚 API Endpoints:');
      console.log(`   - Health Check: http://localhost:${env.PORT}/health`);
      console.log(`   - Auth: http://localhost:${env.PORT}/api/auth`);
      console.log(`   - Orders: http://localhost:${env.PORT}/api/orders`);
      console.log(`   - Driver: http://localhost:${env.PORT}/api/driver`);
      console.log(`   - User: http://localhost:${env.PORT}/api/user`);
      console.log(`   - Upload: http://localhost:${env.PORT}/api/upload`);
      console.log('\n✨ Ready to accept connections!\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Export for testing
export { app, httpServer, io };
