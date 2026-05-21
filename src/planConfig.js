/**
 * Tradixa SaaS Plan Configuration
 * Central configuration for module access control per subscription plan.
 */

export const PLAN_TIERS = {
  free: {
    id: 'free',
    name: 'Free',
    label: 'Starter',
    price: 0,
    priceLabel: 'Gratis',
    color: 'slate',
    badge: 'bg-slate-100 text-slate-700',
    gradient: 'from-slate-500 to-slate-600',
    description: 'Untuk toko kecil yang baru memulai bisnis retail',
    modules: [
      'Dashboard', 'ProductMaster', 'ProductLocations',
      'StockIn', 'StockOut', 'SalesTransaction',
      'CustomerMaster',
      'ProfileAccount', 'CompanySettings', 'StoreSetup',
      'SystemSettings', 'PricingPage',
      'UserManagement', 'UsageStats'
    ],
    limits: {
      maxProducts: 25,
      maxCustomers: 25,
      maxSuppliers: 25,
      maxPayables: 5,
      maxReceivables: 5,
      maxPayments: 5,
      maxExpenses: 5,
      maxEmployees: 5,
      maxStockIn: 5,
      maxStockOut: 5,
      maxReconciliationUploads: 50,
      maxUsers: 1,
      maxPhotosPerProduct: 1,
      maxPhotoSizeMB: 2,
      maxProductPhotos: 10,
      emailCredits: 0,
      emailCreditsPerMonth: 0,
      maxPR: 0,
      maxPO: 0,
      maxGRN: 0,
      maxInventoryGRN: 0,
      maxSupplierReturn: 0,
      maxSalesPerMonth: 50,
      maxOutboundDeliveries: 5,
      exportEnabled: false,
      userManagement: true,
    },
    features: [
      'Product Master (max 25 produk)',
      'Customer Master (max 25 customer)',
      'Supplier Management (max 25 supplier)',
      'Transaksi Jual (max 50 transaksi)',
      'Location Settings',
      'Stock In / Stock Out',
      'User Management (1 User)'
    ],
    notIncluded: [
      'AI Assistant', 'Procurement', 'Reports Lengkap', 'Keuangan',
      'Diskon & Loyalty', 'Export Data',
      'Financial Agent', 'Design Studio'
    ]
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    label: 'Professional',
    price: 149000,
    yearlyPrice: 1490000,
    priceLabel: 'Rp 149.000',
    yearlyPriceLabel: 'Rp 1.490.000',
    savingsLabel: 'Hemat Rp 298.000',
    color: 'blue',
    badge: 'bg-blue-100 text-blue-700',
    gradient: 'from-blue-500 to-blue-600',
    description: 'Untuk bisnis retail mandiri dengan kebutuhan kontrol penuh',
    modules: ['*'],
    limits: {
      maxProducts: 1000,
      maxCustomers: Infinity,
      maxSuppliers: Infinity,
      maxPayables: Infinity,
      maxReceivables: Infinity,
      maxPayments: Infinity,
      maxExpenses: Infinity,
      maxEmployees: Infinity,
      maxStockIn: Infinity,
      maxStockOut: Infinity,
      maxReconciliationUploads: Infinity,
      maxUsers: 3,
      maxPhotosPerProduct: 1,
      maxPhotoSizeMB: 2,
      maxProductPhotos: 500,
      emailCredits: Infinity,
      emailCreditsPerMonth: 50,
      maxPR: Infinity,
      maxPO: Infinity,
      maxGRN: Infinity,
      maxInventoryGRN: Infinity,
      maxSupplierReturn: Infinity,
      maxSalesPerMonth: Infinity,
      maxOutboundDeliveries: Infinity,
      exportEnabled: true,
      userManagement: true,
    },
    // Batasan khusus saat Pro Trial (14 hari)
    trialLimits: {
      maxProducts: 25,
      maxCustomers: 25,
      maxSuppliers: 25,
      maxPayables: 5,
      maxReceivables: 5,
      maxPayments: 5,
      maxExpenses: 5,
      maxEmployees: 5,
      maxStockIn: 5,
      maxStockOut: 5,
      maxReconciliationUploads: 50,
      emailCredits: 5,
      maxProductPhotos: 10,
      maxUsers: 1,
      maxPR: 5,
      maxPO: 5,
      maxGRN: 5,
      maxInventoryGRN: 5,
      maxSupplierReturn: 5,
      maxSalesPerMonth: 50,
      maxOutboundDeliveries: 5,
    },
    features: [
      'Semua fitur Free Plan',
      'Akses Seluruh Modul Sistem',
      'Product Master (max 1.000 produk)',
      'Upload Foto Produk (max 500 foto)',
      'Procurement Lengkap (PO, GRN, Supplier)',
      'Keuangan (Bank, Payables, Receivables)',
      'Financial Agent (BRILink) — 7 modul',
      'Design Studio & Audit Log',
      'Analisa Segmen (RFM) & Marketing',
      'HRIS & User Management (max 3 user)',
      'Export Data (CSV, PDF, Print)',
      'Workflow System',
      'Payment Gateway (QRIS Dinamis)',
      'Email & Notifikasi (50/bulan)',
      '1x Sesi Bimbingan & Konsultasi Sistem Untuk Tim Anda',
    ],
    notIncluded: ['AI Assistant', 'Chat Internal Toko', 'Integrasi EDC Lokal']
  },

  premium: {
    id: 'premium',
    name: 'Premium',
    label: 'Premium',
    price: 349000,
    yearlyPrice: 3490000,
    priceLabel: 'Rp 349.000',
    yearlyPriceLabel: 'Rp 3.490.000',
    savingsLabel: 'Hemat Rp 698.000',
    color: 'indigo',
    badge: 'bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm',
    gradient: 'from-indigo-500 to-indigo-600',
    description: 'Bisnis retail berkembang / multi-kasir dengan kebutuhan lengkap',
    modules: ['*'],
    limits: {
      maxProducts: 10000,
      maxCustomers: Infinity,
      maxSuppliers: Infinity,
      maxPayables: Infinity,
      maxReceivables: Infinity,
      maxPayments: Infinity,
      maxExpenses: Infinity,
      maxEmployees: Infinity,
      maxStockIn: Infinity,
      maxStockOut: Infinity,
      maxReconciliationUploads: Infinity,
      maxUsers: 10,
      maxPhotosPerProduct: 1,
      maxPhotoSizeMB: 2,
      maxProductPhotos: 5000,
      emailCredits: Infinity,
      emailCreditsPerMonth: 300,
      maxPR: Infinity,
      maxPO: Infinity,
      maxGRN: Infinity,
      maxInventoryGRN: Infinity,
      maxSupplierReturn: Infinity,
      maxSalesPerMonth: Infinity,
      maxOutboundDeliveries: Infinity,
      exportEnabled: true,
      userManagement: true,
    },
    features: [
      'Semua fitur Pro Plan',
      'Product Master (max 10.000 produk)',
      'Kapasitas Foto Produk (max 5.000 foto)',
      'HRIS & User Management (max 10 user)',
      'Integrasi EDC Lokal (Debit / Kredit)',
      'Email & Notifikasi (300/bulan)',
      'AI Assistant (Batas Fair-Use)',
      'Chat Internal Toko (Komunikasi Tim)',
      '2x Sesi Bimbingan & Konsultasi Sistem Untuk Tim Anda',
    ],
    notIncluded: []
  },

  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    label: 'Enterprise',
    price: 0,
    yearlyPrice: 0,
    priceLabel: 'Custom',
    yearlyPriceLabel: 'Custom',
    color: 'amber',
    badge: 'bg-amber-100 text-amber-700 border border-amber-200 shadow-sm',
    gradient: 'from-[#FACC15] via-[#F59E0B] to-[#D97706]',
    description: 'Untuk bisnis besar dengan kebutuhan multi-cabang dan agent',
    modules: ['*'],
    limits: {
      maxProducts: Infinity,
      maxCustomers: Infinity,
      maxSuppliers: Infinity,
      maxPayables: Infinity,
      maxReceivables: Infinity,
      maxPayments: Infinity,
      maxExpenses: Infinity,
      maxEmployees: Infinity,
      maxStockIn: Infinity,
      maxStockOut: Infinity,
      maxUsers: Infinity,
      maxPhotosPerProduct: 1,
      maxPhotoSizeMB: 10,
      maxProductPhotos: Infinity,
      emailCredits: Infinity,
      emailCreditsPerMonth: Infinity,
      maxPR: Infinity,
      maxPO: Infinity,
      maxGRN: Infinity,
      maxInventoryGRN: Infinity,
      maxSupplierReturn: Infinity,
      maxSalesPerMonth: Infinity,
      maxOutboundDeliveries: Infinity,
      exportEnabled: true,
      userManagement: true,
    },
    features: [
      'Semua fitur Premium Plan',
      'Unlimited Produk & User',
      'Warehouse Management System (WMS)',
      'Financial Agent (BRILink) — 7 modul',
      'Design Studio',
      'Bank Reconciliation',
      'Audit Log',
      'Dedicated Support',
    ],
    notIncluded: []
  }
};

/**
 * Developer / Admin emails that always get full enterprise access
 */
export const DEV_EMAILS = [
  'dev@tradixa.com',
  'ferdiarmond@gmail.com',
  'admin@tradixa.com',
  'tradixasystems@gmail.com',
];

/**
 * Check if a module/page is accessible on a given plan
 */
export function isModuleAccessible(planId, pageName, userEmail = null) {
  if (userEmail && DEV_EMAILS.includes(userEmail.toLowerCase())) return true;
  const plan = PLAN_TIERS[planId] || PLAN_TIERS.free;
  if (plan.modules[0] === '*') return true;
  return plan.modules.includes(pageName);
}

/**
 * Get the minimum plan required for a module
 */
export function getRequiredPlan(pageName) {
  for (const tier of ['free', 'pro', 'premium', 'enterprise']) {
    const plan = PLAN_TIERS[tier];
    if (plan.modules[0] === '*' || plan.modules.includes(pageName)) {
      return tier;
    }
  }
  return 'enterprise';
}

/**
 * Get plan limits for a given plan
 */
export function getPlanLimits(planId) {
  return (PLAN_TIERS[planId] || PLAN_TIERS.free).limits;
}

/**
 * Get effective limits based on store's current state (trial vs paid)
 * - Pro Trial: uses trialLimits (100 produk, 100 customer, 5 email, 5 PO, dll)
 * - Pro Paid: uses full pro limits (1.000 produk, 50 email/bulan, unlimited procurement)
 * - Premium: uses premium limits (10.000 produk, 300 email/bulan)
 * - Free: uses free limits
 */
export function getEffectiveLimits(store) {
  if (!store) return PLAN_TIERS.free.limits;

  const plan = store.plan || 'free';
  const planConfig = PLAN_TIERS[plan] || PLAN_TIERS.free;

  // Jika Pro Trial (has_used_trial = true berarti sedang/sudah trial)
  const isTrial = plan === 'pro' && store.has_used_trial;

  if (isTrial && planConfig.trialLimits) {
    return {
      ...planConfig.limits,
      ...planConfig.trialLimits,
    };
  }

  return planConfig.limits;
}
