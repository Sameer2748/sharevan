# Driver Verification Guide

## Overview

After a driver registers, they have status `PENDING_VERIFICATION`. You need to verify their documents and approve them before they can accept orders.

---

## Method 1: Using Prisma Studio (Quick & Easy) ✅

### Step 1: Start Prisma Studio

Open a new terminal in the backend directory:

```bash
cd /Users/manmohan/Desktop/chinmap/sharevan/backend
npm run prisma:studio
```

This will open Prisma Studio in your browser at: **http://localhost:5555**

### Step 2: Navigate to Drivers Table

1. In Prisma Studio, click on **"Driver"** in the left sidebar
2. You'll see all registered drivers

### Step 3: Find Pending Drivers

Look for drivers with:
- **status**: `PENDING_VERIFICATION`
- Review their details:
  - name
  - mobile
  - vehicleType
  - vehicleNumber
  - licenseNumber
  - licenseImage (click to view S3 URL)
  - vehicleRegImage (click to view)
  - aadharImage (click to view)

### Step 4: View Documents

Copy the image URLs and open them in a browser to verify:
- Driving license is valid
- Vehicle registration matches vehicle number
- Aadhar card is clear and readable
- All details match

### Step 5: Approve Driver

If documents are valid:

1. Click on the driver row to edit
2. Change **status** from `PENDING_VERIFICATION` to `VERIFIED`
3. Set **verifiedAt** to current timestamp (click calendar icon)
4. Optionally set **verifiedBy** to your admin ID or name
5. Click **"Save 1 change"** button

### Step 6: Reject Driver (if needed)

If documents are invalid:

1. Click on the driver row to edit
2. Change **status** to `REJECTED`
3. Set **rejectionReason** to explain why:
   - "Invalid license number"
   - "Documents not clear"
   - "Vehicle registration expired"
   - etc.
4. Click **"Save 1 change"**

### Step 7: Test Login

1. Driver can now login at: http://localhost:3000/auth/login?role=driver
2. Enter their mobile number
3. Verify OTP
4. Should redirect to driver dashboard
5. Driver can now go online and accept orders!

---

## Method 2: Using Admin Dashboard (Recommended for Production)

I'll create a simple admin page for you to manage driver verifications.

### Creating Admin Verification Page

Let me create this for you...

---

## Driver Status Flow

```
PENDING_VERIFICATION  →  (Admin reviews documents)
                     ↓
              ┌──────┴──────┐
              ↓             ↓
          VERIFIED      REJECTED
              ↓
      (Can accept orders)
```

---

## Database Fields for Verification

### Driver Model - Verification Fields

```prisma
status          DriverStatus  // PENDING_VERIFICATION, VERIFIED, REJECTED, SUSPENDED
verifiedAt      DateTime?     // When admin verified
verifiedBy      String?       // Admin ID who verified
rejectionReason String?       // Why rejected (if status is REJECTED)
```

### Status Meanings

- **PENDING_VERIFICATION**: Just registered, waiting for admin approval
- **VERIFIED**: Approved by admin, can accept orders
- **REJECTED**: Documents invalid, cannot login
- **SUSPENDED**: Was verified but now blocked (for policy violations)

---

## Quick Verification Commands (SQL)

If you prefer using PostgreSQL directly:

### View All Pending Drivers

```sql
SELECT
  id,
  name,
  mobile,
  vehicleType,
  vehicleNumber,
  licenseNumber,
  status,
  "createdAt"
FROM drivers
WHERE status = 'PENDING_VERIFICATION'
ORDER BY "createdAt" DESC;
```

### Approve a Driver

```sql
UPDATE drivers
SET
  status = 'VERIFIED',
  "verifiedAt" = NOW(),
  "verifiedBy" = 'admin'
WHERE id = 'driver_id_here';
```

### Reject a Driver

```sql
UPDATE drivers
SET
  status = 'REJECTED',
  "rejectionReason" = 'Invalid documents'
WHERE id = 'driver_id_here';
```

### View Document URLs

```sql
SELECT
  name,
  "licenseImage",
  "vehicleRegImage",
  "aadharImage",
  "panImage"
FROM drivers
WHERE id = 'driver_id_here';
```

---

## Testing the Verification Flow

### 1. Register a Test Driver

1. Go to: http://localhost:3000/auth/register/driver
2. Fill all details:
   - Mobile: `9999999999`
   - Name: `Test Driver`
   - Vehicle: `BIKE`, `DL01TEST01`
   - License: `DL-TEST123456789`
3. Upload documents (any images for testing)
4. Submit registration

### 2. Check Status in Prisma Studio

```bash
npm run prisma:studio
```

- Navigate to Driver table
- Find driver with mobile `+919999999999`
- Status should be `PENDING_VERIFICATION`
- View uploaded document URLs

### 3. Verify the Driver

In Prisma Studio:
- Click the driver row
- Change status to `VERIFIED`
- Set verifiedAt to now
- Save changes

### 4. Test Driver Login

1. Go to: http://localhost:3000/auth/login?role=driver
2. Mobile: `9999999999`
3. Enter OTP (check backend console)
4. Should login successfully
5. Redirect to driver dashboard

### 5. Check Driver Dashboard

- Should show "Status: Verified"
- Can toggle "Go Online"
- Can accept orders

---

## Common Scenarios

### Scenario 1: Driver Registered but Can't Login

**Problem**: "Driver account not found"

**Solution**:
- Check if driver exists in database
- If status is `REJECTED`, they can't login
- Tell driver to register again with correct documents

### Scenario 2: Driver Logged In but Can't Accept Orders

**Problem**: Status is `PENDING_VERIFICATION`

**Solution**:
- Admin needs to verify driver in Prisma Studio
- Change status to `VERIFIED`
- Driver needs to logout and login again

### Scenario 3: Need to Suspend a Verified Driver

**Problem**: Driver violated policies

**Solution**:
- In Prisma Studio, find the driver
- Change status from `VERIFIED` to `SUSPENDED`
- Optionally add reason in `rejectionReason`
- Driver will be unable to go online

### Scenario 4: Re-verify a Rejected Driver

**Problem**: Driver uploaded correct documents

**Solution**:
- Driver cannot re-register (mobile already exists)
- Option 1: Delete driver record, let them register again
- Option 2: Update status to `VERIFIED` manually

---

## Document Verification Checklist

### Driving License
- [ ] License number matches input
- [ ] License is not expired
- [ ] Name matches driver name
- [ ] Photo is clear
- [ ] Valid license type for vehicle

### Vehicle Registration (RC)
- [ ] Vehicle number matches input
- [ ] Registration not expired
- [ ] Vehicle type matches
- [ ] Owner name matches or transfer proof available

### Aadhar Card
- [ ] Number matches input (if provided)
- [ ] Name matches driver name
- [ ] Photo is clear and matches
- [ ] Not blurred or tampered

### PAN Card (Optional)
- [ ] Number matches input
- [ ] Name matches driver name
- [ ] Valid format

---

## Notification System (Future Enhancement)

When you verify/reject a driver, you should notify them:

### SMS Notification
```
Dear [Name], your Sharevan driver account has been VERIFIED!
Login now and start accepting orders.
- Team Sharevan
```

### Push Notification
```
{
  "title": "Account Verified! 🎉",
  "body": "You can now start accepting delivery orders",
  "action": "open_app"
}
```

### Email Notification
```
Subject: Your Sharevan Driver Application - Approved

Dear [Name],

Congratulations! Your driver application has been approved.

Your Details:
- Name: [Name]
- Mobile: [Mobile]
- Vehicle: [Type] - [Number]
- License: [Number]

You can now login and start accepting delivery orders.

Download the app: [link]
Login here: [link]

Thank you for joining Sharevan!
```

---

## Admin Dashboard Features (Coming Soon)

I'll create a simple admin dashboard with:

- [ ] View all pending drivers
- [ ] View driver documents in modal
- [ ] Approve/Reject with one click
- [ ] Add rejection reason
- [ ] View driver statistics
- [ ] Suspend verified drivers
- [ ] View driver earnings
- [ ] Export driver list

---

## Quick Start Commands

### Start Backend
```bash
cd backend
npm run dev:clean
```

### Start Prisma Studio
```bash
cd backend
npm run prisma:studio
```

### Start Frontend
```bash
cd frontend
npm run dev
```

### Register Test Driver
```
http://localhost:3000/auth/register/driver
```

### Verify in Prisma Studio
```
http://localhost:5555
→ Driver table
→ Find driver
→ Change status to VERIFIED
→ Save
```

### Driver Login
```
http://localhost:3000/auth/login?role=driver
```

---

## Summary

**For Now (Development):**
1. ✅ Use **Prisma Studio** (`npm run prisma:studio`)
2. ✅ Navigate to Driver table
3. ✅ Find pending driver
4. ✅ View document URLs in browser
5. ✅ Change status to `VERIFIED`
6. ✅ Save changes
7. ✅ Driver can now login!

**For Production:**
- Build admin dashboard
- Add email/SMS notifications
- Add document viewer
- Add approval workflow
- Add audit logs

Let me know if you want me to create the admin dashboard now! 🚀
