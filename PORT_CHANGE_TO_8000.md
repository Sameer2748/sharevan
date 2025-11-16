# ✅ Port Changed from 5000 → 8000

## Why the Change?

Port 5000 is commonly used by macOS **AirPlay Receiver** and **Control Center** services, causing constant "EADDRINUSE" errors even after killing processes.

**Solution**: Changed backend to use **port 8000** instead.

---

## Changes Made

### 1. Backend Port
**File**: `backend/.env`
```env
PORT=8000  # Changed from 5000
```

### 2. Frontend API URLs
**File**: `frontend/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SOCKET_URL=http://localhost:8000
```

### 3. Package Scripts
**File**: `backend/package.json`
```json
"dev:clean": "lsof -ti:8000 | xargs kill -9 ...",
"kill:port": "lsof -ti:8000 | xargs kill -9 ..."
```

---

## 🚀 How to Start Now

### Terminal 1 - Backend (Port 8000)
```bash
cd /Users/manmohan/Desktop/chinmap/sharevan/backend
npm run dev:clean
```

You'll see:
```
🚀 Server running on: http://localhost:8000
```

### Terminal 2 - Frontend (Port 3000)
```bash
cd /Users/manmohan/Desktop/chinmap/sharevan/frontend
npm run dev
```

Frontend will connect to backend at `http://localhost:8000`

---

## New URLs

| Service | Old URL | New URL |
|---------|---------|---------|
| Backend API | http://localhost:5000 | **http://localhost:8000** |
| Frontend | http://localhost:3000 | http://localhost:3000 (unchanged) |
| Health Check | http://localhost:5000/health | **http://localhost:8000/health** |
| Upload API | http://localhost:5000/api/upload | **http://localhost:8000/api/upload** |

---

## Testing

1. Start backend: `npm run dev:clean`
2. Check health: http://localhost:8000/health
3. You should see:
   ```json
   {
     "success": true,
     "message": "Server is running",
     "database": "connected"
   }
   ```

4. Start frontend and test login - no more CORS or port errors! ✅

---

## Why Port 8000?

- ✅ Not used by macOS system services
- ✅ Common alternative for development
- ✅ No conflicts with AirPlay/Control Center
- ✅ Port 5000 → 8000 is a common migration path

---

## Disabling AirPlay on Port 5000 (Optional)

If you really want to use port 5000, you can disable AirPlay:

**System Settings** → **General** → **AirDrop & Handoff** → Turn off **"AirPlay Receiver"**

But using port 8000 is easier and safer! 🚀

---

## Success! 🎉

Your backend now runs on **port 8000** without any conflicts!

Use: **`npm run dev:clean`** to start the backend anytime.
