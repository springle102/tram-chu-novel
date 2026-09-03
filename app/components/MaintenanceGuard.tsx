'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface PublicSiteSetting {
  key: string;
  value: string;
}

interface MaintenanceGuardProps {
  enabled: boolean;
  children: React.ReactNode;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function isMaintenanceEnabled(settings: PublicSiteSetting[]) {
  const setting = settings.find((item) => item.key === 'maintenance_mode');
  return setting?.value?.trim().toLowerCase() === 'true';
}

export default function MaintenanceGuard({ enabled, children }: MaintenanceGuardProps) {
  const pathname = usePathname();
  const [maintenanceMode, setMaintenanceMode] = useState(enabled);
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');

  useEffect(() => {
    let active = true;

    const refreshMaintenanceStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/settings`, {
          cache: 'no-store',
        });
        if (!response.ok) return;

        const data = await response.json();
        if (active && data.success && Array.isArray(data.data)) {
          setMaintenanceMode(isMaintenanceEnabled(data.data));
        }
      } catch {
        // Keep the last known state when the settings service is temporarily unavailable.
      }
    };

    refreshMaintenanceStatus();
    const refreshTimer = window.setInterval(refreshMaintenanceStatus, 30000);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  if (!isAdminRoute && maintenanceMode) {
    return (
      <main className="min-h-screen bg-[#0f0c1b] flex items-center justify-center px-6 text-center text-white">
        <div className="max-w-lg">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-purple-600/20 text-purple-300">
            <svg className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376L10.5 3.75a1.732 1.732 0 013 0l7.803 12.376A1.732 1.732 0 0119.803 18H4.197a1.732 1.732 0 01-1.5-2.874z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5h.008v.008H12V16.5z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold">Website đang bảo trì</h1>
          <p className="mt-4 text-base leading-7 text-purple-200/80">
            Hệ thống đang được nâng cấp để mang đến trải nghiệm tốt hơn. Vui lòng quay lại sau nhé!
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
