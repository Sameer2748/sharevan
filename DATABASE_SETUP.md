# 🗄️ PostgreSQL Database Setup with Docker

## Quick Setup (Recommended)

### Step 1: Start PostgreSQL with Docker

```bash
docker run -d \
  --name sharevan-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=sharevan_db \
  -p 5432:5432 \
  -v sharevan-db-data:/var/lib/postgresql/data \
  postgres:15-alpine
```

### Step 2: Verify Database is Running

```bash
docker ps
```

You should see `sharevan-postgres` in the list.

### Step 3: Test Connection

```bash
docker exec -it sharevan-postgres psql -U postgres -d sharevan_db -c "SELECT version();"
```

---

## Using Docker Compose (Alternative Method)

### Step 1: Start Database

```bash
cd /Users/manmohan/Desktop/chinmap/sharevan/backend
docker-compose up -d
```

### Step 2: Check Status

```bash
docker-compose ps
```

### Step 3: View Logs

```bash
docker-compose logs -f postgres
```

---

## Database Management Commands

### Stop Database
```bash
# Option 1: Docker command
docker stop sharevan-postgres

# Option 2: Docker Compose
docker-compose down
```

### Start Database (if stopped)
```bash
# Option 1: Docker command
docker start sharevan-postgres

# Option 2: Docker Compose
docker-compose start
```

### Restart Database
```bash
# Option 1: Docker command
docker restart sharevan-postgres

# Option 2: Docker Compose
docker-compose restart
```

### Remove Database (WARNING: Deletes all data)
```bash
# Option 1: Docker command
docker stop sharevan-postgres
docker rm sharevan-postgres
docker volume rm sharevan-db-data

# Option 2: Docker Compose
docker-compose down -v
```

---

## Connect to Database

### Option 1: Using Docker Exec (No Installation Required)
```bash
docker exec -it sharevan-postgres psql -U postgres -d sharevan_db
```

### Option 2: Using psql (If Installed Locally)
```bash
psql -h localhost -U postgres -d sharevan_db
```
Password: `password`

### Option 3: Using Database GUI Tools

**Connection Details:**
- Host: `localhost`
- Port: `5432`
- Database: `sharevan_db`
- User: `postgres`
- Password: `password`

**Recommended Tools:**
- TablePlus: https://tableplus.com/
- DBeaver: https://dbeaver.io/
- pgAdmin: https://www.pgadmin.org/

---

## Running Prisma Migrations

After database is running, initialize the schema:

```bash
cd /Users/manmohan/Desktop/chinmap/sharevan/backend

# Generate Prisma Client
npm run prisma:generate

# Run migrations to create tables
npm run prisma:migrate

# Open Prisma Studio (Visual Database Editor)
npm run prisma:studio
```

---

## Useful SQL Commands

### Connect to database
```bash
docker exec -it sharevan-postgres psql -U postgres -d sharevan_db
```

### List all tables
```sql
\dt
```

### View table structure
```sql
\d users
\d orders
\d drivers
```

### Check table counts
```sql
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'drivers', COUNT(*) FROM drivers
UNION ALL
SELECT 'orders', COUNT(*) FROM orders;
```

### View recent orders
```sql
SELECT id, "orderNumber", status, "createdAt"
FROM orders
ORDER BY "createdAt" DESC
LIMIT 10;
```

### View all drivers
```sql
SELECT id, name, mobile, "isOnline", status
FROM drivers;
```

### Clear all data (for testing)
```sql
TRUNCATE TABLE "order_status_history" CASCADE;
TRUNCATE TABLE "earnings" CASCADE;
TRUNCATE TABLE "reviews" CASCADE;
TRUNCATE TABLE "orders" CASCADE;
TRUNCATE TABLE "saved_addresses" CASCADE;
TRUNCATE TABLE "notifications" CASCADE;
TRUNCATE TABLE "otp_attempts" CASCADE;
TRUNCATE TABLE "users" CASCADE;
TRUNCATE TABLE "drivers" CASCADE;
```

### Exit psql
```sql
\q
```

---

## Database Backup & Restore

### Backup Database
```bash
docker exec -t sharevan-postgres pg_dump -U postgres sharevan_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database
```bash
docker exec -i sharevan-postgres psql -U postgres sharevan_db < backup.sql
```

---

## Troubleshooting

### Issue: Port 5432 already in use

Check what's using the port:
```bash
lsof -i :5432
```

Stop the process or use different port:
```bash
# Use port 5433 instead
docker run -d \
  --name sharevan-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=sharevan_db \
  -p 5433:5432 \
  postgres:15-alpine
```

Then update `backend/.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5433/sharevan_db"
```

### Issue: Container won't start

View logs:
```bash
docker logs sharevan-postgres
```

### Issue: Connection refused

Check if container is running:
```bash
docker ps -a | grep sharevan-postgres
```

If stopped, start it:
```bash
docker start sharevan-postgres
```

### Issue: Permission denied

Reset data volume:
```bash
docker stop sharevan-postgres
docker rm sharevan-postgres
docker volume rm sharevan-db-data
# Then run the docker run command again
```

---

## Environment Variables

Your `backend/.env` should have:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/sharevan_db"
```

**Breakdown:**
- Protocol: `postgresql://`
- User: `postgres`
- Password: `password`
- Host: `localhost`
- Port: `5432`
- Database: `sharevan_db`

---

## Complete Startup Sequence

```bash
# 1. Start PostgreSQL
docker run -d --name sharevan-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=sharevan_db \
  -p 5432:5432 \
  postgres:15-alpine

# 2. Wait for database to be ready (5 seconds)
sleep 5

# 3. Install backend dependencies
cd /Users/manmohan/Desktop/chinmap/sharevan/backend
npm install

# 4. Generate Prisma client
npm run prisma:generate

# 5. Run migrations
npm run prisma:migrate

# 6. Start backend server
npm run dev
```

---

## Production Considerations

For production, use:
- Strong passwords
- SSL/TLS connections
- Database backups
- Monitoring
- Proper user permissions

Example production DATABASE_URL:
```env
DATABASE_URL="postgresql://sharevan_user:STRONG_PASSWORD@db.example.com:5432/sharevan_prod?sslmode=require"
```

---

## Docker Compose Full Stack (Optional)

Create `docker-compose.full.yml` to run everything:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: sharevan-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: sharevan_db
    ports:
      - "5432:5432"
    volumes:
      - sharevan-db-data:/var/lib/postgresql/data
    networks:
      - sharevan-network

  backend:
    build: ./backend
    container_name: sharevan-backend
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/sharevan_db
      PORT: 5000
    ports:
      - "5000:5000"
    volumes:
      - ./backend:/app
    networks:
      - sharevan-network

  frontend:
    build: ./frontend
    container_name: sharevan-frontend
    depends_on:
      - backend
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:5000
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
    networks:
      - sharevan-network

volumes:
  sharevan-db-data:

networks:
  sharevan-network:
    driver: bridge
```

---

## Summary

✅ **Start Database**: `docker run -d --name sharevan-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=sharevan_db -p 5432:5432 postgres:15-alpine`

✅ **Check Status**: `docker ps`

✅ **Connect**: `docker exec -it sharevan-postgres psql -U postgres -d sharevan_db`

✅ **Stop**: `docker stop sharevan-postgres`

✅ **Start Again**: `docker start sharevan-postgres`

Now you're ready to run the Sharevan backend! 🚀
