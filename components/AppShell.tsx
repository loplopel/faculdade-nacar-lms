'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar />

      <div className="min-h-screen min-w-0 flex-1">
        {children}
      </div>
    </div>
  );
}
