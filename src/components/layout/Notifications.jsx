import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api, supabase } from '@/api/client';
import { Bell, AlertTriangle, FileText, ShoppingCart, Loader2, Receipt, CreditCard } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/lib/AuthContext';

export default function Notifications({ store }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { playSound } = useSettings();

  const knownNotificationIds = useRef(new Set());
  const initialLoadDone = useRef(false);
  const isPollingRef = useRef(false); // Guard: cegah polling overlap
  const intervalRef = useRef(null);

  useEffect(() => {
    // Request Native Browser Notification Permission
    if ("Notification" in window) {
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    }
  }, []);

  // Stable loadNotifications wrapped in useCallback
  const loadNotifications = useCallback(async () => {
    if (!store?.id) return;

    // Guard: jangan jalankan jika sedang polling atau tab hidden
    if (isPollingRef.current) return;
    if (document.visibilityState === 'hidden') return;

    isPollingRef.current = true;

    if (!initialLoadDone.current) setIsLoading(true);

    try {
      const todayString = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // OPTIMIZED: 1 RPC call replaces 6 separate queries (saves ~83% round-trips)
      let products, receivables, payables, purchaseOrders, purchaseReqs, sales;

      try {
        const { data: rpcResult, error: rpcError } = await supabase.rpc('get_notification_summary', {
          p_store_id: store.id,
          p_today_date: todayString
        });

        if (!rpcError && rpcResult) {
          // RPC succeeded — use aggregated data
          products = rpcResult.low_stock_products || [];
          // Merge expiring products into products array for expiry checks
          const expiringProducts = rpcResult.expiring_products || [];
          products = [...products, ...expiringProducts.filter(ep => !products.find(p => p.id === ep.id))];
          receivables = rpcResult.unpaid_receivables || [];
          payables = rpcResult.unpaid_payables || [];
          purchaseOrders = rpcResult.active_purchase_orders || [];
          purchaseReqs = rpcResult.pending_requisitions || [];
          sales = rpcResult.today_sales || [];
        } else {
          throw new Error(rpcError?.message || 'RPC unavailable');
        }
      } catch (rpcFallback) {
        // Fallback: direct queries if RPC not yet deployed
        console.log('[Notifications] RPC fallback — using direct queries:', rpcFallback.message);
        const results = await Promise.all([
          supabase.from('products').select('id, name, stock, reorder_level, expired_date').eq('store_id', store.id).limit(200),
          supabase.from('receivables').select('id, status, customer_name, amount, due_date, created_at').eq('store_id', store.id).eq('status', 'Belum Lunas').limit(100),
          supabase.from('payables').select('id, status, supplier_name, amount, due_date, created_at').eq('store_id', store.id).eq('status', 'Belum Lunas').limit(100),
          supabase.from('purchase_orders').select('id, status, po_number, supplier_name, supplier_signature, admin_signature, created_at, updated_date').eq('store_id', store.id).in('status', ['Negotiation', 'Approved', 'Sent']).limit(50),
          supabase.from('purchase_requisitions').select('id, status, pr_number, timestamp_wib, created_at, updated_date').eq('store_id', store.id).in('status', ['Diajukan', 'Menunggu Level 2', 'Pending', 'Approved', 'Disetujui']).limit(50),
          supabase.from('sales_transactions').select('id, customer_name, total, timestamp_wib, created_at, payment_status, payment_method').eq('store_id', store.id).eq('created_date', todayString).limit(50)
        ]);
        products = results[0].data || [];
        receivables = results[1].data || [];
        payables = results[2].data || [];
        purchaseOrders = results[3].data || [];
        purchaseReqs = results[4].data || [];
        sales = results[5].data || [];
      }

      let alerts = [];

      // 1. Low Stock & Expired Checks
      const minStockThreshold = 5;
      const today = new Date();
      const startOfDay = new Date().setHours(0, 0, 0, 0); // Use start of day for static alerts

      products?.forEach(p => {
        const threshold = Number(p.reorder_level) || minStockThreshold;
        if (Number(p.stock) <= threshold) {
          alerts.push({
            id: `stock-${p.id}`,
            type: 'low_stock',
            icon: AlertTriangle,
            iconClass: 'text-amber-500 bg-amber-50',
            title: 'Stok Menipis',
            message: `${p.name} sisa ${p.stock} (Batas: ${threshold})`,
            time: 'Perlu restock',
            timestamp: startOfDay - 1000 // Fixed older timestamp
          });
        }

        if (p.expired_date) {
          const expDate = new Date(p.expired_date);
          const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

          if (diffDays <= 0) {
            alerts.push({
              id: `exp-${p.id}`,
              type: 'expired',
              icon: AlertTriangle,
              iconClass: 'text-red-500 bg-red-50',
              title: 'Produk Kadaluarsa',
              message: `${p.name} telah kadaluarsa sejak ${p.expired_date}`,
              time: 'Tarik / retur',
              timestamp: startOfDay - 2000
            });
          } else if (diffDays <= 30) {
            alerts.push({
              id: `exp-${p.id}`,
              type: 'expiring',
              icon: AlertTriangle,
              iconClass: 'text-orange-500 bg-orange-50',
              title: 'Mendekati Kadaluarsa',
              message: `${p.name} kadaluarsa dalam ${diffDays} hari`,
              time: p.expired_date,
              timestamp: startOfDay - 3000
            });
          }
        }
      });

      // 2. AR / AP Jatuh Tempo
      receivables?.forEach(ar => {
        if (ar.status?.toLowerCase() === 'belum lunas') {
          alerts.push({
            id: `ar-${ar.id}`,
            type: 'ar_due',
            icon: FileText,
            iconClass: 'text-blue-500 bg-blue-50',
            title: 'Piutang Belum Lunas',
            message: `${ar.customer_name || 'Customer'} - Rp ${Number(ar.amount || 0).toLocaleString('id-ID')}`,
            time: ar.due_date ? `Jatuh tempo: ${ar.due_date}` : 'AR Baru',
            timestamp: ar.created_at ? new Date(ar.created_at).getTime() : startOfDay - 4000
          });
        }
      });

      payables?.forEach(ap => {
        if (ap.status?.toLowerCase() === 'belum lunas') {
          alerts.push({
            id: `ap-${ap.id}`,
            type: 'ap_due',
            icon: FileText,
            iconClass: 'text-red-500 bg-red-50',
            title: 'Utang Belum Lunas',
            message: `${ap.supplier_name || 'Supplier'} - Rp ${Number(ap.amount || 0).toLocaleString('id-ID')}`,
            time: ap.due_date ? `Jatuh tempo: ${ap.due_date}` : 'AP Baru',
            timestamp: ap.created_at ? new Date(ap.created_at).getTime() : startOfDay - 5000
          });
        }
      });

      // 3. Procurement Alerts (PR & PO)
      purchaseReqs?.forEach(pr => {
        if (pr.status === 'Diajukan' || pr.status === 'Menunggu Level 2' || pr.status === 'Pending') {
          alerts.push({
            id: `pr-${pr.id}`,
            type: 'pr_pending',
            icon: FileText,
            iconClass: 'text-violet-500 bg-violet-50',
            title: 'Pengajuan PR Baru',
            message: `PR #${pr.pr_number} - Perlu persetujuan`,
            time: pr.timestamp_wib?.split(' ')[0] || 'Diajukan',
            timestamp: pr.created_at ? new Date(pr.created_at).getTime() : startOfDay - 6000
          });
        } else if ((pr.status === 'Approved' || pr.status === 'Disetujui') && pr.updated_date === todayString) {
          alerts.push({
            id: `pr-app-${pr.id}`,
            type: 'pr_approved',
            icon: FileText,
            iconClass: 'text-emerald-600 bg-emerald-50',
            title: 'PR Disetujui',
            message: `PR #${pr.pr_number} telah disetujui hari ini`,
            time: 'Disetujui',
            timestamp: pr.created_at ? new Date(pr.created_at).getTime() : startOfDay - 6000
          });
        }
      });

      purchaseOrders?.forEach(po => {
        if (po.status === 'Negotiation') {
          alerts.push({
            id: `po-neg-${po.id}`,
            type: 'po_neg',
            icon: ShoppingCart,
            iconClass: 'text-amber-600 bg-amber-50',
            title: 'Negosiasi Supplier',
            message: `PO #${po.po_number} - Supplier mengajukan revisi`,
            time: 'Review',
            timestamp: po.created_at ? new Date(po.created_at).getTime() : startOfDay - 7000
          });
        } else if (po.status === 'Approved' && po.supplier_signature && !po.admin_signature) {
          // Supplier telah menyetujui PO — perlu tanda tangan admin
          alerts.push({
            id: `po-supplier-approved-${po.id}`,
            type: 'po_supplier_approved',
            icon: ShoppingCart,
            iconClass: 'text-emerald-600 bg-emerald-50',
            title: 'Supplier Menyetujui PO',
            message: `PO #${po.po_number} — ${po.supplier_name || 'Supplier'} telah menandatangani. Segera tanda tangani!`,
            time: 'TTD Segera',
            timestamp: po.created_at ? new Date(po.created_at).getTime() : startOfDay - 7500
          });
        } else if (po.status === 'Approved' && !po.admin_signature) {
          alerts.push({
            id: `po-sign-${po.id}`,
            type: 'po_sign',
            icon: ShoppingCart,
            iconClass: 'text-blue-600 bg-blue-50',
            title: 'PO Perlu TTD',
            message: `PO #${po.po_number} - Supplier sudah setuju`,
            time: 'TTD Segera',
            timestamp: po.created_at ? new Date(po.created_at).getTime() : startOfDay - 8000
          });
        } else if (po.status === 'Approved' && po.admin_signature && po.updated_date === todayString) {
          alerts.push({
            id: `po-app-${po.id}`,
            type: 'po_approved',
            icon: ShoppingCart,
            iconClass: 'text-emerald-600 bg-emerald-50',
            title: 'PO Disetujui',
            message: `PO #${po.po_number} telah resmi disetujui`,
            time: 'Selesai',
            timestamp: po.created_at ? new Date(po.created_at).getTime() : startOfDay - 8000
          });
        }
      });

      // 4. Sales Transactions Today
      sales?.forEach(sale => {
        const saleTimestamp = sale.created_at ? new Date(sale.created_at).getTime() : new Date().getTime();
        const isPending = sale.payment_status === 'Pending';
        const isQRIS = sale.payment_method === 'QRIS' || sale.payment_method === 'QRIS / E-Wallet';
        
        alerts.push({
          id: `sale-${sale.id}`,
          type: isPending ? 'sale_pending' : 'new_sale',
          icon: isPending ? CreditCard : Receipt,
          iconClass: isPending ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50',
          title: isPending ? '⏳ Menunggu Pembayaran' : 'Transaksi Penjualan Baru',
          message: `${sale.customer_name || 'Walk-in Customer'} — Rp ${Number(sale.total || 0).toLocaleString('id-ID')}${isPending && isQRIS ? ' (QRIS)' : ''}`,
          time: sale.timestamp_wib?.split(' ')[1] || 'Hari ini',
          timestamp: saleTimestamp
        });
      });

      // Filter alerts based on user modules if not owner
      if (user && user.role !== 'owner') {
        const modules = user.modules || [];
        alerts = alerts.filter(alert => {
          switch (alert.type) {
            case 'low_stock':
            case 'expired':
            case 'expiring':
              return modules.includes('Inventory Workflow') || modules.includes('Product Master') || modules.includes('Stock Opname');
            case 'ar_due':
              return modules.includes('Account Receivables') || modules.includes('Bank Accounts') || modules.includes('Receivables');
            case 'ap_due':
              return modules.includes('Account Payables') || modules.includes('Bank Accounts') || modules.includes('Payables');
            case 'pr_pending':
            case 'pr_approved':
            case 'po_neg':
            case 'po_supplier_approved':
            case 'po_sign':
            case 'po_approved':
              return modules.includes('Procurement Workflow') || modules.includes('Purchase Orders') || modules.includes('Purchase Requisition');
            case 'sale_pending':
            case 'new_sale':
              return modules.includes('Sales Transaction') || modules.includes('Sales Report');
            default:
              return true;
          }
        });
      }

      // Sort alerts descending (newest first)
      alerts.sort((a, b) => b.timestamp - a.timestamp);

      // Check for new notifications
      const newAlertIds = new Set(alerts.map(a => a.id));

      // We only alert if it's NOT the initial load AND tab is visible
      if (initialLoadDone.current && document.visibilityState === 'visible') {
        alerts.forEach(alert => {
          if (!knownNotificationIds.current.has(alert.id)) {
            // 1. Toast
            toast({
              title: alert.title,
              description: alert.message,
              duration: 5000,
            });

            // 2. Sound
            try {
              playSound('success');
            } catch (e) {
              console.log("Audio play blocked by browser policy");
            }

            // 3. Native Notification
            if ("Notification" in window && Notification.permission === "granted") {
              try {
                new Notification(alert.title, {
                  body: alert.message
                });
              } catch (e) { }
            }
          }
        });
      }

      knownNotificationIds.current = newAlertIds;
      initialLoadDone.current = true;
      setNotifications(alerts);

    } catch (error) {
      console.error("Error loading notifications:", error);
    }
    setIsLoading(false);
    isPollingRef.current = false;
  }, [store, toast, playSound, user]);

  // Setup polling with Page Visibility API guard
  useEffect(() => {
    if (!store?.id) return;

    // Initial load
    loadNotifications();

    // Start interval (60 detik)
    intervalRef.current = setInterval(loadNotifications, 180000); // 3 menit — hemat egress

    // Visibility change handler: pause saat hidden, resume saat visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab kembali aktif — tunggu sebentar agar auth token stabil, lalu reload
        setTimeout(() => {
          loadNotifications();
        }, 1500);

        // Restart interval (yang lama mungkin sudah throttled oleh browser)
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(loadNotifications, 180000); // 3 menit — hemat egress
      } else {
        // Tab hidden — stop polling agar tidak ada request sia-sia
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    // REALTIME: Instant notifications for sales & PO changes
    // This supplements the 3-minute polling for instant critical updates
    const salesChannel = supabase
      .channel(`notif_sales_${store.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'sales_transactions',
        filter: `store_id=eq.${store.id}`
      }, () => {
        // New sale — refresh notifications immediately
        setTimeout(() => loadNotifications(), 500);
      })
      .subscribe();

    const poChannel = supabase
      .channel(`notif_po_${store.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'purchase_orders',
        filter: `store_id=eq.${store.id}`
      }, (payload) => {
        // PO status changed (e.g. supplier signed) — refresh immediately
        const newStatus = payload.new?.status;
        if (['Approved', 'Negotiation', 'Sent'].includes(newStatus)) {
          setTimeout(() => loadNotifications(), 500);
        }
      })
      .subscribe();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(poChannel);
    };
  }, [store, loadNotifications]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative group hover:bg-slate-100">
          <Bell className="w-5 h-5 text-slate-600 transition-colors group-hover:text-blue-600" />
          {notifications.length > 0 && (
            <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[420px] p-0 border-slate-200 shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-semibold text-slate-800">Notifikasi Integrasi</h3>
          {notifications.length > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              {notifications.length} Baru
            </Badge>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center p-6">
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300 opacity-50" />
              <p className="text-sm">Tidak ada notifikasi aktif saat ini.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map(notif => (
                <div key={notif.id} className="p-4 hover:bg-slate-50 transition-colors cursor-default group flex gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${notif.iconClass}`}>
                    <notif.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-800 flex items-center justify-between gap-2">
                      {notif.title}
                      <span className="text-[10px] whitespace-nowrap text-slate-400 font-normal">{notif.time}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed break-words">{notif.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
