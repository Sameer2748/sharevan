'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { LogOut, User, TruckIcon } from 'lucide-react';
import { toast } from 'sonner';

interface NavbarProps {
  title: string;
  showBack?: boolean;
  showProfile?: boolean;
}

export default function Navbar({ title, showBack = false, showProfile = true }: NavbarProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    router.push('/');
  };

  return (
    <div className="gradient-bg text-white px-4 py-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button onClick={() => router.back()} className="p-1 hover:bg-white/20 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            {user?.name && <p className="text-xs text-blue-100">{user.name}</p>}
          </div>
        </div>

        {showProfile && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(user?.role === 'USER' ? '/user/profile' : '/driver/profile')}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <User className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
