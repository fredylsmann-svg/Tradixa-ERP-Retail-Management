import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import SidebarTimeDisplay from './SidebarTimeDisplay';
import { api } from '@/api/client';
import { isModuleAccessible } from '@/planConfig';
import tradixaLogo from '@/assets/tradixa-logo-transparent.png';
import {
  LayoutGrid, Package, Download, Upload, FileText, FileCheck, AlertTriangle,
  ShoppingCart, Receipt, FileInput, TrendingUp, Users, ClipboardList, Truck,
  Building2, ArrowLeftRight, CreditCard, FileOutput, Wallet, LayoutDashboard,
  ArrowRightLeft, List, DollarSign, Settings, UserCircle, GitBranch, Network,
  Workflow, ChevronDown, Menu, X, MessageCircle, Award, Layers, Mail, Zap, Megaphone, Banknote, PieChart, Contact, Landmark,
  BookOpen, ReceiptText, LineChart, BarChart, Activity, Warehouse, ClipboardCheck, MapPin, Palette, Boxes, BarChart3, HandCoins, History,
  Lock, CreditCard as CreditCardIcon, Calculator, FileSignature, PackageCheck
} from 'lucide-react';
import WarehouseTransferIcon from '@/components/icons/WarehouseTransferIcon';

const getFilteredMenuGroups = (isOwner) => {
  const allGroups = [
    /* {
      title: 'Workflow System',
      items: [
        { name: 'Workflow System', icon: GitBranch, page: 'WorkflowSystem' }
      ]
    }, */
    {
      title: 'Overview',
      items: [
        { name: 'Dashboard', icon: LayoutGrid, page: 'Dashboard' },
        { name: 'Design Studio', icon: Palette, page: 'DesignStudio' }
      ]
    },
    {
      title: 'Inventory',
      items: [
        { name: 'Inventory Workflow', icon: Workflow, page: 'InventoryWorkflow' },
        { name: 'Product Master', icon: Boxes, page: 'ProductMaster' },
        { name: 'Location Settings', icon: MapPin, page: 'ProductLocations' },
        { name: 'Stock In', icon: Download, page: 'StockIn' },
        { name: 'Stock Out', icon: Upload, page: 'StockOut' },
        { name: 'Inventory Ledger', icon: Activity, page: 'InventoryLedger' },
        { name: 'Inventory Reports', icon: FileText, page: 'InventoryReports' },
        { name: 'Low Stock Alert', icon: AlertTriangle, page: 'LowStockAlert' }
      ]
    },
    {
      title: 'Warehouse (WMS)',
      items: [
        { name: 'WMS Workflow', icon: Workflow, page: 'WMSWorkflow' },
        { name: 'Warehouse Dashboard', icon: LayoutDashboard, page: 'WarehouseDashboard' },
        { name: 'Pick List', icon: ClipboardList, page: 'PickList' },
        { name: 'Outbound Delivery', icon: Truck, page: 'OutboundDelivery' },
        { name: 'Transfer Gudang', icon: WarehouseTransferIcon, page: 'WarehouseTransfer' },
        { name: 'Stock Opname', icon: PackageCheck, page: 'StockOpname' }
      ]
    },
    {
      title: 'Procurement',
      items: [
        { name: 'Procurement Workflow', icon: Workflow, page: 'ProcurementWorkflow' },
        { name: 'Suppliers', icon: Contact, page: 'Suppliers' },
        { name: 'Purchase Requisition', icon: FileInput, page: 'PurchaseRequisition' },
        { name: 'Purchase Orders', icon: ClipboardList, page: 'PurchaseOrders' },
        { name: 'Goods Receipt', icon: ClipboardCheck, page: 'GoodsReceipt' },
        { name: 'Inventory GRN', icon: Warehouse, page: 'InventoryGRN' },
        { name: 'Supplier Return', icon: ArrowRightLeft, page: 'SupplierReturn' }
      ]
    },
    {
      title: 'Customers & Marketing',
      items: [
        { name: 'Customer Master', icon: Users, page: 'CustomerMaster' },
        { name: 'Customer Segmentation', icon: PieChart, page: 'CustomerSegmentation' },
        { name: 'Marketing Automation', icon: Megaphone, page: 'MarketingAutomation' }
      ]
    },
    {
      title: 'Promotions',
      items: [
        { name: 'Discount Management', icon: DollarSign, page: 'DiscountManagement' },
        { name: 'Loyalty Program', icon: Award, page: 'LoyaltyProgram' }
      ]
    },
    {
      title: 'Sales',
      items: [
        { name: 'Sales Transaction', icon: ShoppingCart, page: 'SalesTransaction' },
        { name: 'Sales Invoices', icon: Receipt, page: 'SalesInvoices' },
        { name: 'Revenue Reports', icon: BarChart3, page: 'RevenueReports' }
      ]
    },
    {
      title: 'Financial & Operations',
      items: [
        { name: 'Bank Accounts', icon: Landmark, page: 'BankAccounts' },
        { name: 'Bank Transactions', icon: Banknote, page: 'BankTransactions' },
        { name: 'Cash Register', icon: Calculator, page: 'CashRegister' },
        { name: 'Bank Reconciliation', icon: FileCheck, page: 'BankReconciliation' },
        { name: 'Account Receivables', icon: Wallet, page: 'Receivables' },
        { name: 'Account Receivable Invoices', icon: FileInput, page: 'ReceivableInvoices' },
        { name: 'Account Payables', icon: CreditCard, page: 'Payables' },
        { name: 'Account Payable Invoices', icon: FileOutput, page: 'PayableInvoices' },
        { name: 'Payments', icon: HandCoins, page: 'Payments' },
        { name: 'Operational Expenses', icon: ReceiptText, page: 'Expenses' },
        { name: 'Tax Management', icon: FileSignature, page: 'TaxManagement' },
        { name: 'Journal Entries', icon: BookOpen, page: 'JournalEntries' },
        { name: 'Chart of Accounts', icon: List, page: 'ChartOfAccounts' }
      ]
    },
    {
      title: 'HRIS Management',
      items: [
        { name: 'Employee Management', icon: UserCircle, page: 'HRISManagement' },
        { name: 'Sales Performance', icon: BarChart, page: 'SalesPerformance' },
        { name: 'User Management', icon: Users, page: 'UserManagement' }
      ]
    },
    {
      title: 'Reports',
      items: [
        { name: 'Financial Statements', icon: LineChart, page: 'FinancialStatements' },
        { name: 'Stock Report', icon: Package, page: 'StockReport' },
        { name: 'Sales Report', icon: TrendingUp, page: 'SalesReport' },
        { name: 'Reports', icon: FileText, page: 'Reports' }
      ]
    },
    {
      title: 'Financial Agent',
      items: [
        { name: 'Agent Workflow', icon: Workflow, page: 'FinancialAgentWorkflow' },
        { name: 'Dashboard Agent', icon: LayoutDashboard, page: 'DashboardAgent' },
        { name: 'Transaksi Agen', icon: ArrowRightLeft, page: 'TransaksiAgen' },
        { name: 'Daftar Layanan', icon: List, page: 'DaftarLayanan' },
        { name: 'Saldo & Kas Agen', icon: Wallet, page: 'SaldoKasAgen' },
        { name: 'Laporan Fee', icon: DollarSign, page: 'LaporanFee' },
        { name: 'Agent Performance', icon: Users, page: 'AgentPerformance' },
        { name: 'Pengaturan Agen', icon: Settings, page: 'PengaturanAgen' }
      ]
    },

    {
      title: 'Settings',
      items: [
        { name: 'Audit Log', icon: History, page: 'AuditLog' },
        { name: 'Company Settings', icon: Settings, page: 'CompanySettings' },
        { name: 'User Preferences', icon: Settings, page: 'SystemSettings' }
      ]
    },
    {
      title: 'AI Assistant',
      items: [
        { name: 'Tradixa Assistant', icon: MessageCircle, page: 'TradixaAssistant' }
      ]
    }
  ];

  if (!isOwner) {
    return allGroups.map(group => {
      if (group.title === 'REPORTS & MANAGEMENT') {
        return {
          ...group,
          items: group.items.filter(item => item.page !== 'UserManagement')
        };
      }
      return group;
    }).filter(group => group.items.length > 0);
  }

  return allGroups;
};

export default function Sidebar({ currentPage, isSidebarOpen = true, isMobileOpen, setIsMobileOpen, storePlan, userEmail, store }) {
  const [isOwner, setIsOwner] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [userModules, setUserModules] = React.useState(null);
  const currentStorePlan = storePlan || 'free';
  const [showProductMasterGuide, setShowProductMasterGuide] = useState(false);

  React.useEffect(() => {
    if (!store?.id) return;
    const interval = setInterval(() => {
      const step = localStorage.getItem(`erp_tour_step_${store.id}`);
      if (step === '1.5') {
        setShowProductMasterGuide(true);
      } else {
        setShowProductMasterGuide(false);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [store]);

  React.useEffect(() => {
    const checkOwner = async () => {
      try {
        const user = await api.auth.me();

        // isOwner is strictly the actual store owner
        const isUserOwner = user.role === 'owner';

        if (user.modules && user.modules.length > 0) {
          setUserModules(user.modules);
        }

        if (user.current_store_id) {
          const stores = await api.entities.Store.filter({ id: user.current_store_id });
          const trueOwner = stores.length > 0 && stores[0].owner_user_id === user.id;
          setIsOwner(isUserOwner || trueOwner);
        } else {
          setIsOwner(isUserOwner);
        }
      } catch (error) {
        console.error('Error checking owner:', error);
      }
      setIsLoading(false);
    };
    checkOwner();
  }, []);

  const menuGroups = React.useMemo(() => {
    if (isLoading) return [];
    let groups = getFilteredMenuGroups(isOwner);

    // RBAC: If user is NOT owner and has a modules list, filter sidebar items
    if (!isOwner && userModules && userModules.length > 0) {
      // These are personal user pages, always accessible regardless of permissions
      const alwaysVisible = ['User Preferences'];
      groups = groups.map(group => ({
        ...group,
        items: group.items.filter(item => alwaysVisible.includes(item.name) || userModules.includes(item.name))
      })).filter(group => group.items.length > 0);
    }

    return groups;
  }, [isOwner, isLoading, userModules]);

  const [expandedGroups, setExpandedGroups] = useState({});
  const scrollContainerRef = React.useRef(null);
  const scrollPositionRef = React.useRef(0);

  useEffect(() => {
    const initialExpanded = {};
    menuGroups.forEach(group => {
      initialExpanded[group.title] = true;
    });
    setExpandedGroups(initialExpanded);
  }, [menuGroups]);

  const toggleGroup = (e, title) => {
    e.preventDefault();
    e.stopPropagation();

    setExpandedGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const renderContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none z-10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <img src="/assets/logo-tradixa-CUEsu2DJ.png" alt="Tradixa" className="w-14 h-14 rounded-2xl object-cover shadow-sm mix-blend-multiply dark:bg-white dark:p-1 dark:mix-blend-normal" />
          <div>
            <h1 className="font-black text-xl text-slate-900 dark:text-slate-100 leading-none tracking-tighter">Tradixa</h1>
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1 tracking-tight">Management Retail System</p>
          </div>
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto py-4 min-h-0">
        {menuGroups.map((group) => (
          <div key={group.title} className="mb-2">
            <button
              onClick={(e) => toggleGroup(e, group.title)}
              className="w-full flex items-center justify-between px-4 py-3 text-base font-black text-slate-900 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors tracking-tight text-left"
            >
              <span>{group.title}</span>
              <ChevronDown
                strokeWidth={3}
                className={cn(
                  "w-4 h-4 transition-transform flex-shrink-0 text-slate-900 dark:text-slate-200",
                  expandedGroups[group.title] ? "transform rotate-180" : ""
                )}
              />
            </button>

            {expandedGroups[group.title] && (
              <div className="relative space-y-1 px-2 pl-4 group/list">
                <div className={cn(
                  "absolute left-3 top-0 bottom-0 w-[2px] transition-colors duration-300",
                  "bg-slate-200 dark:bg-slate-700 group-hover/list:bg-blue-400/50 dark:group-hover/list:bg-blue-500/50"
                )} />

                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.page;
                  const isLocked = !isModuleAccessible(currentStorePlan, item.page, userEmail);

                  return (
                    <div key={item.name} className={`relative ${showProductMasterGuide && item.name === 'Product Master' ? 'z-[60]' : ''}`}>
                      {showProductMasterGuide && item.name === 'Product Master' && (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[55] animate-in fade-in duration-300" style={{ margin: 0 }} />
                      )}
                      <Link
                        to={createPageUrl(item.page)}
                        onClick={() => {
                          setIsMobileOpen(false);
                          if (showProductMasterGuide && item.name === 'Product Master') {
                            setShowProductMasterGuide(false);
                            if (store?.id) {
                              localStorage.setItem(`erp_tour_step_${store.id}`, '2');
                            }
                          }
                        }}
                        className={cn(
                          "group relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14.5px] font-medium transition-all tracking-tight",
                          showProductMasterGuide && item.name === 'Product Master' 
                            ? "z-[60] bg-blue-600 text-white shadow-xl ring-4 ring-white/20"
                            : isActive
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                              : isLocked
                                ? "text-slate-400 hover:bg-slate-50 dark:text-slate-500 dark:hover:bg-slate-800/30"
                                : "text-slate-800 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-blue-300"
                        )}
                      >
                        <Icon className={cn(
                          "w-5 h-5 transition-all duration-200",
                          showProductMasterGuide && item.name === 'Product Master' ? "text-white" : isActive ? "text-blue-600 dark:text-blue-400" : isLocked ? "text-slate-300 dark:text-slate-600" : "text-slate-800 group-hover:text-slate-950 dark:text-slate-400 dark:group-hover:text-blue-400 group-hover:scale-110 group-hover:-translate-y-0.5"
                        )} />
                        <span className={isLocked ? 'opacity-60' : ''}>{item.name}</span>
                        {isLocked && (
                          <Lock className="w-3.5 h-3.5 text-slate-300 ml-auto flex-shrink-0" />
                        )}
                      </Link>
                      
                      {/* Tooltip for Sidebar Link */}
                      {showProductMasterGuide && item.name === 'Product Master' && (
                        <>
                          <div className="absolute top-1/2 left-full ml-4 -translate-y-1/2 w-[280px] bg-slate-900 text-white p-4 rounded-xl shadow-2xl z-[60] cursor-default border border-slate-700/50 animate-in fade-in zoom-in-95 duration-300 hidden lg:block">
                            <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-slate-900 border-b border-l border-slate-700/50 rotate-45" />
                            <h4 className="text-xs font-black text-white tracking-wider uppercase mb-2">Modul Product Master</h4>
                            <p className="text-[12px] text-slate-300 leading-relaxed font-medium">
                              Klik menu ini untuk masuk ke modul pengelolaan data produk Anda.
                            </p>
                          </div>
                          
                          <div className="absolute top-full left-0 mt-2 w-full min-w-[240px] bg-slate-900 text-white p-4 rounded-xl shadow-2xl z-[60] cursor-default border border-slate-700/50 animate-in fade-in zoom-in-95 duration-300 lg:hidden">
                            <div className="absolute -top-1.5 left-[20px] w-3 h-3 bg-slate-900 border-t border-l border-slate-700/50 rotate-45" />
                            <h4 className="text-xs font-black text-white tracking-wider uppercase mb-2">Modul Product Master</h4>
                            <p className="text-[12px] text-slate-300 leading-relaxed font-medium">
                              Klik menu ini untuk masuk ke modul pengelolaan data produk Anda.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <SidebarTimeDisplay />
    </div>
  );

  return (
    <>
      {/* Redundant mobile toggle removed to avoid double buttons */}

      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className={cn(
        "lg:hidden fixed inset-y-0 left-0 z-[60] w-72 bg-white dark:bg-slate-900 transform transition-transform duration-300 flex flex-col",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* X Close button removed as per user request */}
        {renderContent()}
      </aside>

      <aside className={`hidden lg:flex lg:flex-col w-72 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 h-screen fixed top-0 left-0 transition-transform duration-300 z-40 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {renderContent()}
      </aside>
    </>
  );
}
