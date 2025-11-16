# 🧪 Sharevan API Testing Guide

Complete guide to test all backend endpoints.

## 📋 Prerequisites

1. Backend running on http://localhost:5000
2. PostgreSQL database connected
3. Prisma migrations completed
4. API testing tool (Postman, Thunder Client, or curl)

---

## 🚀 Quick Start

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

You should see:
```
✅ Database connected
🚀 Server running on: http://localhost:5000
🔌 WebSocket: Enabled
```

---

## 🔥 Test Sequence (Follow This Order)

### 1. Health Check

```bash
curl http://localhost:5000/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "database": "connected",
  "environment": "development"
}
```

---

### 2. User Registration & Login

#### Step 2.1: Send OTP (User)

```bash
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "+919876543210",
    "role": "USER"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "mobile": "+919876543210",
    "otp": "123456"  // Only in development
  }
}
```

**Note:** In development, OTP is also logged to console. Check your terminal!

#### Step 2.2: Verify OTP & Login

```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "+919876543210",
    "otp": "123456",
    "role": "USER"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "clx...",
      "mobile": "+919876543210",
      "name": null,
      "role": "USER"
    }
  }
}
```

**⚠️ SAVE THE TOKEN!** You'll need it for authenticated requests.

---

### 3. Driver Registration

**Note:** Drivers need to be created manually in database first (or via admin panel).

Create a test driver:
```bash
npm run prisma:studio
```

Then create a Driver record with:
- mobile: +918888888888
- name: Test Driver
- vehicleType: BIKE
- vehicleNumber: DL01AB1234
- licenseNumber: DL123456
- status: VERIFIED

#### Step 3.1: Send OTP (Driver)

```bash
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "+918888888888",
    "role": "DRIVER"
  }'
```

#### Step 3.2: Verify OTP & Login (Driver)

```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "+918888888888",
    "otp": "123456",
    "role": "DRIVER"
  }'
```

**⚠️ SAVE THE DRIVER TOKEN!**

---

### 4. User Dashboard

```bash
curl -X GET http://localhost:5000/api/user/dashboard \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "name": null,
      "mobile": "+919876543210"
    },
    "stats": {
      "activeOrders": 0,
      "completedOrders": 0,
      "totalSpent": 0
    },
    "recentOrders": []
  }
}
```

---

### 5. Calculate Price

```bash
curl -X POST http://localhost:5000/api/orders/calculate-price \
  -H "Content-Type: application/json" \
  -d '{
    "pickupLat": 28.7041,
    "pickupLng": 77.1025,
    "deliveryLat": 28.5355,
    "deliveryLng": 77.3910,
    "packageSize": "MEDIUM",
    "bookingType": "URGENT"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "distance": 20.5,
    "estimatedDuration": 35,
    "baseFare": 30,
    "distanceFare": 205,
    "sizeMultiplier": 1.3,
    "urgentMultiplier": 1.5,
    "subtotal": 306,
    "total": 459
  }
}
```

---

### 6. Create Order

```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pickupAddress": "Connaught Place, New Delhi",
    "pickupLat": 28.7041,
    "pickupLng": 77.1025,
    "deliveryAddress": "Gurgaon Cyber City",
    "deliveryLat": 28.5355,
    "deliveryLng": 77.3910,
    "packageSize": "MEDIUM",
    "packageWeight": 2.5,
    "receiverName": "John Doe",
    "receiverMobile": "+919999999999",
    "specialInstructions": "Handle with care",
    "bookingType": "URGENT"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Order created successfully. Searching for drivers...",
  "data": {
    "id": "clx...",
    "orderNumber": "SV240115ABC123",
    "status": "SEARCHING_DRIVER",
    "pickupOtp": "123456",
    "deliveryOtp": "654321",
    "estimatedPrice": 459,
    ...
  }
}
```

**⚠️ SAVE THE ORDER ID, PICKUP OTP, and DELIVERY OTP!**

---

### 7. Driver: Go Online

```bash
curl -X PUT http://localhost:5000/api/driver/online-status \
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isOnline": true
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "You are now online",
  "data": {
    "isOnline": true
  }
}
```

---

### 8. Driver: Get Available Orders

```bash
curl -X GET http://localhost:5000/api/driver/orders/available \
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "clx...",
        "orderNumber": "SV240115ABC123",
        "pickupAddress": "Connaught Place, New Delhi",
        "deliveryAddress": "Gurgaon Cyber City",
        "distance": 20.5,
        "estimatedPrice": 459,
        "potentialEarning": 344,  // 75% of price
        "packageSize": "MEDIUM",
        "bookingType": "URGENT"
      }
    ]
  }
}
```

---

### 9. Driver: Accept Order (RACE CONDITION TEST!)

**⚠️ CRITICAL TEST:** This endpoint handles race conditions!

```bash
curl -X POST http://localhost:5000/api/driver/orders/ORDER_ID/accept \
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Order accepted successfully!",
  "data": {
    "id": "...",
    "orderNumber": "SV240115ABC123",
    "status": "DRIVER_ASSIGNED",
    "driverId": "...",
    "driver": {
      "name": "Test Driver",
      "vehicleNumber": "DL01AB1234",
      "rating": 0
    }
  }
}
```

**To Test Race Condition:**
1. Create another driver account
2. Try accepting the SAME order from 2 drivers simultaneously
3. Only ONE should succeed, the other gets:
```json
{
  "success": false,
  "error": "Sorry, this order has already been accepted by another driver"
}
```

---

### 10. Driver: Update Status to Arrived

```bash
curl -X PUT http://localhost:5000/api/driver/orders/ORDER_ID/status \
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "DRIVER_ARRIVED"
  }'
```

---

### 11. Driver: Verify Pickup OTP

```bash
curl -X POST http://localhost:5000/api/driver/orders/ORDER_ID/verify-pickup \
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "otp": "123456"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Pickup verified successfully",
  "data": {
    "status": "PICKED_UP",
    "pickupOtpVerified": true
  }
}
```

---

### 12. Driver: Update to In Transit

```bash
curl -X PUT http://localhost:5000/api/driver/orders/ORDER_ID/status \
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_TRANSIT"
  }'
```

---

### 13. Driver: Update to Reached Destination

```bash
curl -X PUT http://localhost:5000/api/driver/orders/ORDER_ID/status \
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "REACHED_DESTINATION"
  }'
```

---

### 14. Driver: Verify Delivery OTP & Complete

```bash
curl -X POST http://localhost:5000/api/driver/orders/ORDER_ID/verify-delivery \
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "otp": "654321",
    "deliveryNotes": "Delivered successfully"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Delivery completed! You earned ₹344",
  "data": {
    "order": {
      "status": "DELIVERED",
      "deliveryOtpVerified": true,
      "deliveredAt": "2024-01-15T10:30:00.000Z"
    },
    "earnings": 344
  }
}
```

---

### 15. User: Rate Driver

```bash
curl -X POST http://localhost:5000/api/user/orders/ORDER_ID/rate \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "comment": "Excellent service!",
    "isAnonymous": false
  }'
```

---

### 16. Driver: Check Earnings

```bash
curl -X GET http://localhost:5000/api/driver/earnings \
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "earnings": [
      {
        "id": "...",
        "amount": 459,
        "commission": 115,
        "netEarning": 344,
        "date": "2024-01-15T10:30:00.000Z"
      }
    ],
    "summary": {
      "periodTotal": 344,
      "periodCommission": 115,
      "totalEarnings": 344,
      "totalOrders": 1,
      "rating": 5
    }
  }
}
```

---

## 🧪 Postman Collection

Create a Postman collection with these variables:

```json
{
  "baseUrl": "http://localhost:5000",
  "userToken": "YOUR_USER_TOKEN",
  "driverToken": "YOUR_DRIVER_TOKEN",
  "orderId": "ORDER_ID"
}
```

---

## ✅ Testing Checklist

- [ ] Health check works
- [ ] User OTP send works
- [ ] User OTP verify works (JWT returned)
- [ ] Driver OTP send works
- [ ] Driver OTP verify works
- [ ] User dashboard loads
- [ ] Price calculation works
- [ ] Order creation works
- [ ] Driver can go online
- [ ] Driver sees available orders
- [ ] Driver can accept order
- [ ] **Race condition handled (test with 2 drivers)**
- [ ] Driver status updates work
- [ ] Pickup OTP verification works
- [ ] Delivery OTP verification works
- [ ] Order completes successfully
- [ ] Driver earnings recorded
- [ ] User can rate driver
- [ ] Driver rating updates

---

## 🐛 Common Issues & Solutions

### Issue: "Database connection failed"
**Solution:** Check DATABASE_URL in .env and ensure PostgreSQL is running

### Issue: "Invalid token"
**Solution:** Token expired or wrong. Re-login to get fresh token

### Issue: "Driver account not found"
**Solution:** Create driver manually in Prisma Studio first

### Issue: "Order already assigned"
**Solution:** This is expected! Race condition working correctly

### Issue: "Invalid OTP"
**Solution:** Check console logs for OTP in development mode

---

## 📊 Load Testing (Optional)

Test race condition with multiple simultaneous requests:

```bash
# Install Apache Bench
brew install apache2

# Send 10 concurrent requests to accept order
ab -n 10 -c 10 -T "application/json" -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/driver/orders/ORDER_ID/accept
```

Only 1 should succeed, 9 should fail with "already assigned"!

---

## 🎉 Success!

If all tests pass, your backend is production-ready! 🚀

**Next Steps:**
1. Build frontend with Next.js
2. Integrate WebSocket for real-time updates
3. Add payment gateway
4. Deploy to production

---

**Happy Testing! 🧪**
