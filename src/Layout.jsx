import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import TrialNotificationBanner from '@/components/layout/TrialNotificationBanner';
import SubscriptionBanner from '@/components/ui/SubscriptionBanner';
import StoreSetup from '@/pages/StoreSetup';
import UpgradeGate from '@/components/layout/UpgradeGate';
import RBACBlockedPage from '@/components/RBACBlockedPage';
import { isModuleAccessible } from '@/planConfig';
import { isModuleAllowed } from '@/lib/moduleMap';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import tradixaLogo from '@/assets/tradixa-logo-transparent.png';

export default function Layout({ children, currentPageName }) {
  const [store, setStore] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [userModules, setUserModules] = useState(null);
  const [isOwner, setIsOwner] = useState(true);

  const { user } = useAuth();

  useEffect(() => {
    if (user) loadStore();
  }, [user]);

  const loadStore = async () => {
    if (!user) return;
    setUserEmail(user.email || null);

    // Load user access data (modules + owner check)
    try {
      const me = await api.auth.me();
      if (me) {
        const userIsOwner = me.role === 'owner';
        setIsOwner(userIsOwner);
        if (me.modules && me.modules.length > 0) {
          setUserModules(me.modules);
        }
      }
    } catch (e) {
      console.error('[Tradixa Layout] Error loading user access:', e);
    }

    // Check if setup is already completed
    if (user.is_store_setup_completed === true && user.current_store_id) {
      const stores = await api.entities.Store.filter({ id: user.current_store_id });
      if (stores.length > 0) {
        const currentStore = stores[0];
        setStore(currentStore);
        
        // Auto-fix: If user is the store owner but role is still 'staff' (due to setup bug)
        const userIsOwner = currentStore.owner_user_id === user.id;
        if (userIsOwner && user.role === 'staff') {
          console.log('[Tradixa Layout] Auto-correcting owner role...');
          await api.auth.updateMe({ role: 'owner' });
          // Force context update would be better, but re-load works too
          window.location.reload(); 
          return;
        }

        // Verify ownership against store data
        setIsOwner(prev => prev || userIsOwner);
        setNeedsSetup(false);
        setIsLoading(false);
        return;
      }
    }

    // If not completed, check for existing stores
    if (user.current_store_id) {
      const stores = await api.entities.Store.filter({ id: user.current_store_id });
      if (stores.length > 0) {
        setStore(stores[0]);
        setIsOwner(prev => prev || stores[0].owner_user_id === user.id);
        await api.auth.updateMe({ is_store_setup_completed: true });
        setNeedsSetup(false);
      } else {
        setNeedsSetup(true);
      }
    } else {
      const userStores = await api.entities.Store.filter({ owner_user_id: user.id || user.auth_id });
      if (userStores.length > 0) {
        setStore(userStores[0]);
        setIsOwner(true);
        await api.auth.updateMe({
          current_store_id: userStores[0].id,
          is_store_setup_completed: true
        });
        setNeedsSetup(false);
      } else {
        setNeedsSetup(true);
      }
    }

    setIsLoading(false);
  };

  useEffect(() => {
    const handleRefresh = () => {
      loadStore();
    };
    window.addEventListener('refresh_data', handleRefresh);
    return () => window.removeEventListener('refresh_data', handleRefresh);
  }, []);

  const handleSetupComplete = async (newStore) => {
    await api.auth.updateMe({
      current_store_id: newStore.id,
      is_store_setup_completed: true
    });
    setStore(newStore);
    setNeedsSetup(false);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        <div className="text-center animate-in fade-in zoom-in duration-500 flex flex-col items-center -mt-32">
          <img src={tradixaLogo} alt="Tradixa" className="h-48 md:h-60 mx-auto animate-pulse" />
          <div className="flex items-center gap-1.5 -mt-16">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce"></div>
          </div>
        </div>
      </div>
    );
  }

  if (needsSetup) {
    return <StoreSetup onComplete={handleSetupComplete} />;
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row">
      <div className="print:hidden">
        <Sidebar
          currentPage={currentPageName}
          isSidebarOpen={isSidebarOpen}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
          storePlan={store?.plan || 'free'}
          userEmail={userEmail}
          store={store}
        />
      </div>
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 print:ml-0 
        ${isSidebarOpen ? 'lg:pl-72' : 'lg:pl-0'}`}>
        <div className={`fixed top-0 right-0 z-40 print:hidden transition-all duration-300 
          ${isSidebarOpen ? 'lg:left-72' : 'lg:left-0'} 
          ${isMobileOpen ? 'left-72' : 'left-0'}`}>
          <Header
            store={store}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            isMobileOpen={isMobileOpen}
            setIsMobileOpen={setIsMobileOpen}
          />
        </div>
        <main className="flex-1 p-4 md:p-6 bg-slate-50 dark:bg-slate-950 mt-16 print:p-0 print:bg-white flex flex-col">
          <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-6 print:hidden">
            <TrialNotificationBanner store={store} />
            <SubscriptionBanner store={store} />
          </div>
          <div className="flex-1">
            {(() => {
              // 1. Plan-based gating (free/pro/enterprise)
              const storePlan = store?.plan || 'free';
              const isLocked = !isModuleAccessible(storePlan, currentPageName, userEmail);
              if (isLocked) {
                return <UpgradeGate pageName={currentPageName} pageTitle={currentPageName} currentPlan={storePlan} />;
              }

              // 2. RBAC: User module-based gating (staff permissions)
              if (!isModuleAllowed(currentPageName, userModules, isOwner)) {
                return <RBACBlockedPage pageName={currentPageName} />;
              }

              return React.cloneElement(children, { store });
            })()}
          </div>
          <div className="mt-10 pb-4 text-center text-[10px] text-slate-400 font-medium print:hidden">
            © 2026 Tradixa Management Retail System. All rights reserved
          </div>
        </main>
      </div>
      <Toaster />
      <SonnerToaster position="top-center" />
    </div>
  );
}
