import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { calculateRoute } from '../services/mapService';

/**
 * Initialize Socket.io for real-time updates
 */
export const initializeSocket = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
  });

  // Authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify JWT token
      const decoded: any = jwt.verify(token, env.JWT_SECRET);

      // Attach user data to socket
      socket.data.userId = decoded.id;
      socket.data.userRole = decoded.role;
      socket.data.mobile = decoded.mobile;

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket: Socket) => {
    const { userId, userRole } = socket.data;

    console.log(`✅ ${userRole} connected: ${userId} (Socket: ${socket.id})`);

    // Join appropriate rooms based on role
    if (userRole === 'USER') {
      // User joins their personal room
      socket.join(`user-${userId}`);
      console.log(`👤 User ${userId} joined room: user-${userId}`);

    } else if (userRole === 'DRIVER') {
      // Driver joins their personal room
      socket.join(`driver-${userId}`);

      // Check if driver is online and join online-drivers room
      checkDriverOnlineStatus(userId, socket);

      console.log(`🚗 Driver ${userId} joined room: driver-${userId}`);
    }

    // Handle driver going online/offline
    socket.on('driver:status-change', async (data: { isOnline: boolean }) => {
      if (userRole !== 'DRIVER') return;

      try {
        await prisma.driver.update({
          where: { id: userId },
          data: { isOnline: data.isOnline }
        });

        if (data.isOnline) {
          socket.join('online-drivers');
          console.log(`🟢 Driver ${userId} is now ONLINE`);

          // Send all current available orders to this driver
          await sendAvailableOrdersToDriver(socket, userId);
        } else {
          socket.leave('online-drivers');
          console.log(`🔴 Driver ${userId} is now OFFLINE`);
        }

        socket.emit('driver:status-updated', { isOnline: data.isOnline });
      } catch (error) {
        console.error('Error updating driver status:', error);
        socket.emit('error', { message: 'Failed to update status' });
      }
    });

    // Handle driver location updates (for real-time tracking)
    socket.on('driver:location-update', async (data: { lat: number; lng: number; orderId?: string }) => {
      if (userRole !== 'DRIVER') return;

      try {
        const { lat, lng, orderId } = data;

        // Update driver location in database
        await prisma.driver.update({
          where: { id: userId },
          data: {
            currentLat: lat,
            currentLng: lng,
            lastLocationUpdate: new Date()
          }
        });

        // If orderId provided, calculate ETA and broadcast to user
        if (orderId) {
          const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: {
              userId: true,
              driverId: true,
              status: true,
              pickupLat: true,
              pickupLng: true,
              deliveryLat: true,
              deliveryLng: true,
              estimatedDuration: true
            }
          });

          if (order && order.driverId === userId) {
            let etaMinutes = 0;
            let etaType: 'pickup' | 'delivery' = 'pickup';

            // Calculate ETA based on order status
            if (order.status === 'DRIVER_ASSIGNED' || order.status === 'DRIVER_ARRIVED') {
              // Driver going to pickup - calculate time from current location to pickup
              try {
                const route = await calculateRoute(
                  { lat, lng },
                  { lat: order.pickupLat, lng: order.pickupLng }
                );
                etaMinutes = Math.ceil(route.duration + 2); // Add 2 min buffer
                etaType = 'pickup';
              } catch (err) {
                console.error('Error calculating pickup ETA:', err);
                etaMinutes = order.estimatedDuration || 30;
              }
            } else if (order.status === 'PICKED_UP' || order.status === 'IN_TRANSIT' || order.status === 'REACHED_DESTINATION') {
              // Driver going to delivery - calculate time from current location to delivery
              try {
                const route = await calculateRoute(
                  { lat, lng },
                  { lat: order.deliveryLat, lng: order.deliveryLng }
                );
                etaMinutes = Math.ceil(route.duration + 3); // Add 3 min buffer
                etaType = 'delivery';
              } catch (err) {
                console.error('Error calculating delivery ETA:', err);
                etaMinutes = order.estimatedDuration || 30;
              }
            }

            // Calculate estimated arrival time (current time + ETA)
            const estimatedArrivalTime = new Date(Date.now() + etaMinutes * 60 * 1000);

            // Broadcast to user with location and ETA
            io.to(`user-${order.userId}`).emit('driver:location', {
              orderId,
              location: { lat, lng },
              eta: {
                minutes: etaMinutes,
                type: etaType,
                estimatedArrivalTime: estimatedArrivalTime.toISOString()
              },
              timestamp: new Date()
            });

            // Also send ETA to driver
            socket.emit('eta:updated', {
              orderId,
              eta: {
                minutes: etaMinutes,
                type: etaType,
                estimatedArrivalTime: estimatedArrivalTime.toISOString()
              }
            });
          }
        }
      } catch (error) {
        console.error('Error updating driver location:', error);
      }
    });

    // Handle user joining order tracking room
    socket.on('order:track', async (data: { orderId: string }) => {
      try {
        const order = await prisma.order.findUnique({
          where: { id: data.orderId },
          include: {
            driver: {
              select: { currentLat: true, currentLng: true }
            }
          }
        });

        if (!order) {
          socket.emit('error', { message: 'Order not found' });
          return;
        }

        // Verify user owns this order
        if (userRole === 'USER' && order.userId !== userId) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Join order-specific room
        socket.join(`order-${data.orderId}`);

        // Send initial driver location if available
        if (order.driver?.currentLat && order.driver?.currentLng) {
          socket.emit('driver:location', {
            orderId: data.orderId,
            location: {
              lat: order.driver.currentLat,
              lng: order.driver.currentLng
            }
          });
        }

        console.log(`📍 ${userRole} ${userId} tracking order: ${data.orderId}`);
      } catch (error) {
        console.error('Error joining order tracking:', error);
        socket.emit('error', { message: 'Failed to track order' });
      }
    });

    // Handle user leaving order tracking
    socket.on('order:untrack', (data: { orderId: string }) => {
      socket.leave(`order-${data.orderId}`);
      console.log(`📍 ${userRole} ${userId} stopped tracking order: ${data.orderId}`);
    });

    // Chat message
    socket.on('chat:message', async (data: { orderId: string; message: string }) => {
      try {
        const { orderId, message } = data;

        // Verify order exists and user has access
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          select: { userId: true, driverId: true }
        });

        if (!order) {
          socket.emit('error', { message: 'Order not found' });
          return;
        }

        // Verify user is part of this order
        if (userRole === 'USER' && order.userId !== userId) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        if (userRole === 'DRIVER' && order.driverId !== userId) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Save message to database
        const chatMessage = await prisma.chatMessage.create({
          data: {
            orderId,
            senderId: userId,
            senderRole: userRole,
            message
          }
        });

        // Broadcast to order room (both user and driver)
        io.to(`order-${orderId}`).emit('chat:message', {
          id: chatMessage.id,
          orderId,
          senderId: userId,
          senderRole: userRole,
          message,
          createdAt: chatMessage.createdAt,
          isRead: false
        });

        console.log(`💬 ${userRole} ${userId} sent message in order ${orderId}`);
      } catch (error) {
        console.error('Error sending chat message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Mark messages as read
    socket.on('chat:mark-read', async (data: { orderId: string }) => {
      try {
        const { orderId } = data;

        // Update all unread messages for this order where user is NOT the sender
        await prisma.chatMessage.updateMany({
          where: {
            orderId,
            senderId: { not: userId },
            isRead: false
          },
          data: { isRead: true }
        });

        // Notify the other party
        socket.to(`order-${orderId}`).emit('chat:messages-read', {
          orderId,
          readBy: userRole
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Typing indicators
    socket.on('typing:start', (data: { orderId: string }) => {
      socket.to(`order-${data.orderId}`).emit('typing:user', {
        userId,
        userRole
      });
    });

    socket.on('typing:stop', (data: { orderId: string }) => {
      socket.to(`order-${data.orderId}`).emit('typing:stop', {
        userId,
        userRole
      });
    });

    // Disconnect handler
    socket.on('disconnect', async (reason) => {
      console.log(`❌ ${userRole} disconnected: ${userId} (${reason})`);

      // If driver, mark as offline
      if (userRole === 'DRIVER') {
        try {
          await prisma.driver.update({
            where: { id: userId },
            data: { isOnline: false }
          });
          console.log(`🔴 Driver ${userId} auto-marked OFFLINE`);
        } catch (error) {
          console.error('Error auto-marking driver offline:', error);
        }
      }
    });

    // Error handler
    socket.on('error', (error) => {
      console.error(`Socket error for ${userRole} ${userId}:`, error);
    });

    // Ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong');
    });
  });

  // Broadcast helper for controllers
  (io as any).broadcastToUser = (userId: string, event: string, data: any) => {
    io.to(`user-${userId}`).emit(event, data);
  };

  (io as any).broadcastToDriver = (driverId: string, event: string, data: any) => {
    io.to(`driver-${driverId}`).emit(event, data);
  };

  (io as any).broadcastToOnlineDrivers = (event: string, data: any) => {
    io.to('online-drivers').emit(event, data);
  };

  console.log('✅ Socket.io initialized');

  return io;
};

/**
 * Check if driver is online and join appropriate room
 */
const checkDriverOnlineStatus = async (driverId: string, socket: Socket) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { isOnline: true }
    });

    if (driver?.isOnline) {
      socket.join('online-drivers');
      console.log(`🟢 Driver ${driverId} joined online-drivers room`);

      // Send available orders to driver on reconnect if already online
      await sendAvailableOrdersToDriver(socket, driverId);
    }
  } catch (error) {
    console.error('Error checking driver status:', error);
  }
};

/**
 * Send all current available orders to a specific driver
 */
const sendAvailableOrdersToDriver = async (socket: Socket, driverId: string) => {
  try {
    // Fetch all pending orders (waiting for driver assignment)
    const availableOrders = await prisma.order.findMany({
      where: {
        status: { in: ['PENDING', 'SEARCHING_DRIVER'] },
        driverId: null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            mobile: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Send each order as a new-order-alert to maintain consistency with real-time flow
    for (const order of availableOrders) {
      socket.emit('new-order-alert', { order });
    }

    console.log(`📦 Sent ${availableOrders.length} available orders to driver ${driverId}`);
  } catch (error) {
    console.error('Error sending available orders to driver:', error);
  }
};

export default initializeSocket;
