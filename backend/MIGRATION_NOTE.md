# Database Migration Required

## Add Password Field to User Model

The admin authentication system requires a password field on the User model. The schema has been updated, but you need to run a migration.

### Steps:

1. **Generate Migration**:
   ```bash
   cd backend
   npx prisma migrate dev --name add_password_to_user
   ```

2. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

3. **Create Admin User** (using Prisma Studio or direct SQL):
   ```bash
   npx prisma studio
   ```

   Or via SQL:
   ```sql
   INSERT INTO users (email, role, "createdAt", "updatedAt")
   VALUES ('admin@sharevan.com', 'ADMIN', NOW(), NOW());
   ```

4. **First Login**: 
   - Email: admin@sharevan.com (or your admin email)
   - Password: `admin123` (will be hashed on first login)

### Note:
The admin auth controller will automatically hash and save the password on first login with the default password. For production, you should set a secure password manually or use a seed script.

