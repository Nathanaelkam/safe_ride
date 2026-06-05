import { Sidebar } from '@/components/layout/Sidebar';
import { TopNavigation } from '@/components/layout/TopNavigation';
import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DashboardContent>{children}</DashboardContent>
    </AuthGuard>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-ink dark:bg-ink light:bg-white text-cream dark:text-cream light:text-ink">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavigation />
        <main className="flex-1 px-4 md:px-5 lg:px-12 py-4 md:py-8 lg:py-12 pb-24 md:pb-8 lg:pb-12 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
      <BottomTabBar />
    </div>
  );
}
