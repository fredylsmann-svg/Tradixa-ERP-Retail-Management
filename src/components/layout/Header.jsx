import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { api } from '@/api/client';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/contexts/SettingsContext';
import { Store, MapPin, RefreshCw, User, Settings, LogOut, Menu, MessageSquare, Sun, Moon, Monitor } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import GlobalSearch from './GlobalSearch';
import Notifications from './Notifications';
import ChatDrawer from './ChatDrawer';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast as sonnerToast } from 'sonner';

export default function Header({ store, isSidebarOpen, setIsSidebarOpen, isMobileOpen, setIsMobileOpen }) {
  const { user, logout } = useAuth();
  const { settings, updateSetting } = useSettings();
  const theme = settings.theme || 'light';
  const setTheme = (val) => updateSetting('theme', val);

  const [isSpinning, setIsSpinning] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [totalUnreadChat, setTotalUnreadChat] = useState(0);
  const { toast } = useToast();
  const lastProcessedTimeRef = useRef(null);
  const { playNotificationSound } = useSettings();
  const [onlineUsers, setOnlineUsers] = useState({});

  // Poll for total unread chat messages
  useEffect(() => {
    if (!user || !store) return;

    // 1. Initial Fetch
    const fetchUnread = async () => {
      try {
        const { data, error, count } = await supabase
          .from('internal_messages')
          .select('id, message, sender_id, created_at', { count: 'exact' })
          .eq('store_id', store.id)
          .eq('receiver_id', user.id)
          .eq('is_read', false)
          .order('created_at', { ascending: false });

        if (!error) {
          setTotalUnreadChat(count || 0);
          if (data && data.length > 0) {
            const latestMsg = data[0];
            const msgTime = new Date(latestMsg.created_at).getTime();
            // Record initial latest message time without playing sound
            if (lastProcessedTimeRef.current === null) {
              lastProcessedTimeRef.current = msgTime;
            }
          }
        }
      } catch (e) {}
    };

    fetchUnread();

    // 2. Realtime Subscription (for "1 second" response)
    const channel = supabase
      .channel(`chat_notifications_${user.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'internal_messages',
        filter: `receiver_id=eq.${user.id}` 
      }, async (payload) => {
        const newMsg = payload.new;
        if (newMsg.store_id === store.id) {
          console.log('[Chat Realtime] New message arrived:', newMsg);
          
          // Increment badge immediately
          setTotalUnreadChat(prev => prev + 1);

          // Play sound
          playNotificationSound();

          // Fetch sender info for toast
          const users = await api.entities.User.filter({ id: newMsg.sender_id });
          const sender = users[0] || { full_name: 'Seseorang' };

          sonnerToast(
            <div className="flex items-center gap-3 py-0.5">
              <div className="w-12 h-12 shrink-0 flex items-center justify-center">
                {sender.avatar_url ? (
                  <img src={sender.avatar_url} className="w-full h-full rounded-full object-cover border border-slate-200 shadow-sm" alt="avatar" />
                ) : (
                  <div className="w-full h-full rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                    {(sender.full_name || 'S')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <p className="font-bold text-slate-900 text-sm truncate">{sender.full_name}</p>
                <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{newMsg.message}</p>
              </div>
            </div>,
            { duration: 4000 }
          );
          
          // Update ref
          lastProcessedTimeRef.current = new Date(newMsg.created_at).getTime();
        }
      })
      .subscribe();

    // 3. Fallback Poll REMOVED — Realtime subscription handles this
    //    (was: setInterval(fetchUnread, 15000) — saved ~5,760 queries/day)

    // 4. Presence Tracking (Online/Offline Status)
    const presenceChannel = supabase.channel('online-users', {
      config: { presence: { key: user.id } }
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        setOnlineUsers(state);
        // Dispatch global event for other components (like ChatDrawer)
        window.dispatchEvent(new CustomEvent('presence_sync', { detail: { onlineUsers: state } }));
      })
      .on('presence', { event: 'join', key: user.id }, ({ newPresences }) => {
        // console.log('Joined:', newPresences);
      })
      .on('presence', { event: 'leave', key: user.id }, ({ leftPresences }) => {
        // console.log('Left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(presenceChannel);
    };
  }, [user, store, playNotificationSound]);

  // Load avatar on mount
  useEffect(() => {
    const loadAvatar = async () => {
      try {
        const user = await api.auth.me();
        if (user?.avatar_url || user?.photo_url) {
          setAvatarUrl(user.avatar_url || user.photo_url);
        } else if (store?.owner_avatar_url) {
          setAvatarUrl(store.owner_avatar_url);
        }
      } catch (e) {
        // Silently ignore - fallback to initials
      }
    };
    loadAvatar();
  }, [store]);

  // Listen for avatar updates from ProfileAccount
  useEffect(() => {
    const handleAvatarUpdate = (e) => {
      if (e.detail?.avatarUrl) {
        setAvatarUrl(e.detail.avatarUrl);
      }
    };
    window.addEventListener('avatar_updated', handleAvatarUpdate);
    return () => window.removeEventListener('avatar_updated', handleAvatarUpdate);
  }, []);

  if (!store) return null;

  const handleRefresh = () => {
    setIsSpinning(true);
    window.dispatchEvent(new Event('refresh_data'));
    // Hapus loading state setelah beberapa saat agar icon berhenti berputar
    setTimeout(() => setIsSpinning(false), 800);
  };

  const displayName = user?.full_name || store.owner_name || 'Admin';
  const displayEmail = user?.email || store.owner_email || store.email;
  const displayPosition = user?.position || store.owner_position || (user?.role === 'owner' ? 'Owner / Director' : 'Staff');
  const userInitials = displayName.substring(0, 2).toUpperCase();

  // Reusable avatar component
  const AvatarCircle = ({ size = 'sm' }) => {
    const sizeClasses = size === 'sm'
      ? 'w-8 h-8 md:w-9 md:h-9 text-xs md:text-sm'
      : 'w-10 h-10 text-sm';

    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
          alt={displayName}
          className={`${sizeClasses} rounded-full object-cover shadow ring-2 ring-white`}
        />
      );
    }
    return (
      <div className={`${sizeClasses} bg-gradient-to-br ${user?.role === 'owner' ? 'from-blue-500 to-blue-600' : 'from-[#74EB41] to-[#60D832]'} rounded-full flex items-center justify-center text-white font-bold shadow`}>
        {userInitials}
      </div>
    );
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none z-10 px-4 md:px-6 py-3 flex-shrink-0 w-full">
      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={() => {
            if (window.innerWidth < 1024) {
              setIsMobileOpen(!isMobileOpen);
            } else {
              setIsSidebarOpen(!isSidebarOpen);
            }
          }}
          className="flex p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        {store.logo_url ? (
          <img
            src={store.logo_url}
            alt={store.store_name}
            className="w-10 h-10 md:w-11 md:h-11 rounded-xl object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 md:w-11 md:h-11 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Store className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 truncate">{store.store_name}</h1>
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{store.address}</span>
          </div>
        </div>
        <div className="hidden md:block flex-shrink-0">
          <GlobalSearch store={store} />
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <button onClick={handleRefresh} className="p-2 md:p-2.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Sinkronisasi Data Web">
            <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 ${isSpinning ? 'animate-spin text-blue-600 dark:text-blue-400' : ''}`} />
          </button>
          <button
            onClick={() => setIsChatOpen(true)}
            className="p-2 md:p-2.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative"
            title="Chat Internal"
          >
            <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />
            {totalUnreadChat > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 min-w-[16px] flex items-center justify-center p-0 px-1 text-[9px] bg-red-500 hover:bg-red-600 text-white border-2 border-white dark:border-slate-900 rounded-full">
                {totalUnreadChat > 99 ? '99+' : totalUnreadChat}
              </Badge>
            )}
          </button>
          <Notifications store={store} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 md:p-2.5 ml-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors outline-none ring-offset-2 focus:ring-2 focus:ring-blue-500">
                {theme === 'light' ? <Sun className="w-4 h-4 md:w-5 md:h-5" /> :
                  theme === 'dark' ? <Moon className="w-4 h-4 md:w-5 md:h-5" /> :
                    <Monitor className="w-4 h-4 md:w-5 md:h-5" />}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-xl">
              <DropdownMenuItem onClick={() => setTheme('light')} className={`cursor-pointer rounded-lg ${theme === 'light' ? 'bg-blue-50 text-blue-700' : ''}`}>
                <Sun className="mr-2 h-4 w-4" />
                <span>Terang</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')} className={`cursor-pointer rounded-lg ${theme === 'dark' ? 'bg-blue-50 text-blue-700' : ''}`}>
                <Moon className="mr-2 h-4 w-4" />
                <span>Gelap</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')} className={`cursor-pointer rounded-lg ${theme === 'system' ? 'bg-blue-50 text-blue-700' : ''}`}>
                <Monitor className="mr-2 h-4 w-4" />
                <span>Otomatis (Sistem)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ChatDrawer
            isOpen={isChatOpen}
            onOpenChange={setIsChatOpen}
            store={store}
          />

          <Popover>
            <PopoverTrigger asChild>
              <button className="ml-1 md:ml-2 outline-none ring-offset-2 focus:ring-2 focus:ring-green-500 rounded-full hover:opacity-90 transition-opacity">
                <AvatarCircle size="sm" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={8} collisionPadding={16} className="w-56 p-2 rounded-xl border border-slate-200 z-50">
              <div className="flex items-center gap-3 p-2">
                <div className="flex-shrink-0">
                  <AvatarCircle size="md" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-900 truncate leading-none mb-0.5">{displayName}</p>
                  <p className="text-[11px] text-slate-400 truncate mb-2">{displayEmail}</p>

                  <div className="flex flex-col gap-0.5">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">
                      {displayPosition}
                    </p>
                    <div className={`w-fit h-4 px-1.5 ${user?.role === 'owner' ? 'bg-blue-600' : 'bg-emerald-600'} text-white border-none text-[9px] font-bold uppercase tracking-widest flex items-center justify-center rounded-sm`}>
                      {user?.role === 'owner' ? 'Admin' : 'Staff'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="h-px bg-slate-100 my-1"></div>
              <div className="space-y-1">
                <Link to={createPageUrl('ProfileAccount')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors font-medium">
                  <User className="w-4 h-4" /> Profil & Akun
                </Link>
                <Link to={createPageUrl('CompanySettings')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors">
                  <Settings className="w-4 h-4" /> Pengaturan Akun
                </Link>
              </div>
              <div className="h-px bg-slate-100 my-1"></div>
              <button onClick={() => setIsLogoutDialogOpen(true)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium">
                <LogOut className="w-4 h-4" /> Keluar
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-0 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-slate-900">Konfirmasi Keluar</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              Apakah Anda yakin ingin keluar dari sistem? Anda harus login kembali untuk mengakses data Tradixa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-slate-200">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={logout} className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold">
              Ya, Keluar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
