import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

/**
 * Initialize Socket.io connection
 */
export const initSocket = (token: string): Socket => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  return socket;
};

/**
 * Get current socket instance
 */
export const getSocket = (): Socket | null => socket;

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Emit event to server
 */
export const emitEvent = (event: string, data: any) => {
  if (socket?.connected) {
    socket.emit(event, data);
  } else {
    console.warn('Socket not connected. Cannot emit event:', event);
  }
};

/**
 * Listen to event from server
 */
export const onEvent = (event: string, callback: (data: any) => void) => {
  if (socket) {
    socket.on(event, callback);
  }
};

/**
 * Remove event listener
 */
export const offEvent = (event: string, callback?: (data: any) => void) => {
  if (socket) {
    if (callback) {
      socket.off(event, callback);
    } else {
      socket.off(event);
    }
  }
};

// ============================================================================
// DRIVER SPECIFIC EVENTS
// ============================================================================

/**
 * Driver: Toggle online/offline status
 */
export const driverSetOnlineStatus = (isOnline: boolean) => {
  emitEvent('driver:status-change', { isOnline });
};

/**
 * Driver: Update location
 */
export const driverUpdateLocation = (lat: number, lng: number, orderId?: string) => {
  emitEvent('driver:location-update', { lat, lng, orderId });
};

// ============================================================================
// USER SPECIFIC EVENTS
// ============================================================================

/**
 * User: Track order
 */
export const trackOrder = (orderId: string) => {
  emitEvent('order:track', { orderId });
};

/**
 * User: Stop tracking order
 */
export const untrackOrder = (orderId: string) => {
  emitEvent('order:untrack', { orderId });
};

/**
 * User: Request nearby drivers
 */
export const requestNearbyDrivers = (lat: number, lng: number, radius: number = 5000) => {
  emitEvent('user:request-nearby-drivers', { lat, lng, radius });
};

/**
 * Listen to nearby drivers update
 */
export const onNearbyDrivers = (callback: (data: any) => void) => {
  onEvent('nearby-drivers', callback);
};

// ============================================================================
// LISTEN TO EVENTS
// ============================================================================

/**
 * Listen to new order alert (Driver)
 */
export const onNewOrderAlert = (callback: (data: any) => void) => {
  onEvent('new-order-alert', callback);
};

/**
 * Listen to driver assigned (User)
 */
export const onDriverAssigned = (callback: (data: any) => void) => {
  onEvent('driver-assigned', callback);
};

/**
 * Listen to order status update
 */
export const onOrderStatusUpdate = (callback: (data: any) => void) => {
  onEvent('order-status-update', callback);
};

/**
 * Listen to driver location updates
 */
export const onDriverLocation = (callback: (data: any) => void) => {
  onEvent('driver:location', callback);
};

/**
 * Listen to order taken (removed from available orders)
 */
export const onOrderTaken = (callback: (data: any) => void) => {
  onEvent('order-taken', callback);
};

/**
 * Listen to order cancelled
 */
export const onOrderCancelled = (callback: (data: any) => void) => {
  onEvent('order-cancelled', callback);
};

export default {
  initSocket,
  getSocket,
  disconnectSocket,
  emitEvent,
  onEvent,
  offEvent,
  driverSetOnlineStatus,
  driverUpdateLocation,
  trackOrder,
  untrackOrder,
  requestNearbyDrivers,
  onNearbyDrivers,
  onNewOrderAlert,
  onDriverAssigned,
  onOrderStatusUpdate,
  onDriverLocation,
  onOrderTaken,
  onOrderCancelled,
};
