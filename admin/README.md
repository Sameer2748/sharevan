# ShareVan Admin Panel

Admin panel for ShareVan logistics platform built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

- 🔐 Admin authentication with email/password
- 🎨 Modern UI matching Figma design
- 📱 Responsive design
- 🚀 Built with Next.js 14 App Router

## Setup Instructions

### 1. Install Dependencies

```bash
cd admin
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the admin directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 3. Backend Environment Variables

Add admin credentials to your backend `.env` file:

```env
ADMIN_EMAIL=admin@sharevan.com
ADMIN_PASSWORD=Admin@123
```

You can change these values to your preferred admin email and password.

### 4. Run Development Server

```bash
npm run dev
```

The admin panel will be available at `http://localhost:3001`

## Login Credentials

Admin login uses hardcoded credentials configured in the backend environment variables:

- **Email**: Set in `ADMIN_EMAIL` (default: `admin@sharevan.com`)
- **Password**: Set in `ADMIN_PASSWORD` (default: `Admin@123`)

**Note**: Only one admin account is supported. Change the credentials in the backend `.env` file to set your own admin email and password.

## Project Structure

```
admin/
├── app/
│   ├── dashboard/       # Admin dashboard page
│   ├── login/          # Login page
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page (redirects to login)
├── lib/
│   ├── api.ts          # API client
│   └── store/          # State management (Zustand)
│       └── authStore.ts
└── public/
    └── images/         # Images from Figma
```

## API Endpoints

The admin panel connects to these backend endpoints:

- `POST /api/admin/auth/login` - Admin login
- `GET /api/admin/auth/me` - Get admin profile

## Development

- **Port**: 3001 (different from main frontend on 3000)
- **Build**: `npm run build`
- **Start**: `npm start`

## Notes

- The login page design matches the Figma specification with a split-screen layout
- Left side shows ShareVan branding with phone mockups
- Right side contains the login form
- Responsive design for mobile and tablet devices
- Admin authentication uses JWT tokens stored in localStorage

