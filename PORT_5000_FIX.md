# Fix: Port 5000 Already in Use

## The Problem

`ts-node-dev` creates child processes that don't get cleaned up properly when you stop the server with `Ctrl+C`. This causes the "EADDRINUSE" error because the old process is still running.

---

## ✅ Solution 1: Use the New Scripts (RECOMMENDED)

I've added helper scripts to [backend/package.json](backend/package.json:7-9):

### Option A: Clean Start (Kills port 5000 automatically)
```bash
cd /Users/manmohan/Desktop/chinmap/sharevan/backend
npm run dev:clean
```

### Option B: Kill port manually, then start
```bash
npm run kill:port
npm run dev
```

### Option C: Use the shell script
```bash
chmod +x start.sh
./start.sh
```

---

## ✅ Solution 2: Manual Commands

### Kill all processes on port 5000
```bash
lsof -ti:5000 | xargs kill -9
```

### Or kill all Node processes (nuclear option)
```bash
pkill -9 node
```

### Then start server
```bash
npm run dev
```

---

## Why This Happens

1. You run `npm run dev`
2. `ts-node-dev` starts a parent process
3. It spawns a child process to run your server
4. You press `Ctrl+C` to stop
5. Parent dies, but **child process keeps running**
6. Port 5000 is still occupied by the zombie child process
7. Next `npm run dev` fails with "EADDRINUSE"

---

## The Fix Explained

I've updated `package.json` to add `--exit-child` flag:

```json
"dev": "ts-node-dev --respawn --transpile-only --exit-child src/server.ts"
```

This tells `ts-node-dev` to kill child processes when parent exits.

---

## Quick Reference Commands

| Command | Description |
|---------|-------------|
| `npm run dev:clean` | Kill port 5000 and start server (ONE command!) |
| `npm run kill:port` | Just kill whatever is on port 5000 |
| `npm run dev` | Normal start (use after killing port) |
| `./start.sh` | Shell script that does it all |

---

## Step-by-Step: Start Server Fresh

```bash
# Navigate to backend
cd /Users/manmohan/Desktop/chinmap/sharevan/backend

# Kill any old processes
lsof -ti:5000 | xargs kill -9

# Start server
npm run dev
```

**OR** just use the new clean command:
```bash
npm run dev:clean
```

---

## Troubleshooting

### Still getting the error?

1. **Check what's using the port:**
   ```bash
   lsof -i :5000
   ```

2. **Kill by PID directly:**
   ```bash
   # From the lsof output, find the PID (e.g., 38424)
   kill -9 38424
   ```

3. **Nuclear option (kills ALL node processes):**
   ```bash
   pkill -9 node
   ```

4. **Change the port** (if you really can't free 5000):

   Edit `backend/.env`:
   ```env
   PORT=5001
   ```

   Then update `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5001
   NEXT_PUBLIC_SOCKET_URL=http://localhost:5001
   ```

---

## Prevention Tips

1. **Always use** `npm run dev:clean` to start
2. **Stop server properly:** `Ctrl+C` once (not multiple times)
3. **Before restarting:** `npm run kill:port` first
4. **Shell script:** Make `start.sh` executable and use it

---

## Example Session

```bash
➜ cd /Users/manmohan/Desktop/chinmap/sharevan/backend

# First time - might have old processes
➜ npm run dev:clean

> sharevan-backend@1.0.0 dev:clean
> lsof -ti:5000 | xargs kill -9 2>/dev/null || true && npm run dev

✅ Killed existing process on port 5000

> sharevan-backend@1.0.0 dev
> ts-node-dev --respawn --transpile-only --exit-child src/server.ts

[INFO] 21:10:00 ts-node-dev ver. 2.0.0
✅ Socket.io initialized
✅ Database connected

╔═══════════════════════════════════════════════════════════════╗
║           🚚 SHAREVAN - YOUR LOGISTICS PARTNER 🚚             ║
╚═══════════════════════════════════════════════════════════════╝

🚀 Server running on: http://localhost:5000
📦 Environment: development
🔌 WebSocket: Enabled
🗄️  Database: Connected

✨ Ready to accept connections!
```

---

## Success! 🎉

Now your server will start cleanly every time without the "EADDRINUSE" error!

Use: **`npm run dev:clean`** and you're good to go!
