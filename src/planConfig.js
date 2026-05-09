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
      'SalesInvoices', 'CustomerMaster',
      'ProfileAccount', 'CompanySettings', 'StoreSetup',
      'SystemSettings', 'TradixaAssistant', 'PricingPage',
      'UserManagement'
    ],
    limits: {
      maxProducts: 100,
      maxUsers: 1, // owner only, no user management (wait, they said user management ada 1)
      maxPhotosPerModule: 5,
      maxPhotoSizeMB: 2,
      exportEnabled: false,
      userManagement: true,
    },
    features: [
      'Product Master (max 100 produk)',
      'Location Settings',
      'Stock In / Stock Out',
      'Sales Transaction',
      'Sales Invoices',
      'Customer Master',
      'AI Assistant',
      'User Management (1 User)'
    ],
    notIncluded: [
      'Procurement', 'Reports Lengkap', 'Keuangan',
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
    description: 'Untuk bisnis yang berkembang dengan kebutuhan kontrol penuh',
    modules: ['*'],
    limits: {
      maxProducts: 10000,
      maxUsers: 10, // 10 staff + owner
      maxPhotosPerModule: 10,
      maxPhotoSizeMB: 5,
      exportEnabled: true,
      userManagement: true,
    },
    features: [
      'Semua fitur Free Plan',
      'Akses Seluruh Modul Sistem',
      'Product Master (max 10.000 produk)',
      'Procurement Lengkap (PO, GRN, Supplier)',
      'Keuangan (Bank, Payables, Receivables)',
      'Financial Agent (BRILink) — 7 modul',
      'Design Studio & Audit Log',
      'Customer Segmentation & Marketing',
      'HRIS & User Management (max 10 user)',
      'Export Data (CSV, PDF, Print)',
      'Workflow System',
    ],
    notIncluded: []
  },
 
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    label: 'Enterprise',
    price: 0, // Mark as 0/custom
    yearlyPrice: 0,
    priceLabel: 'Custom',
    yearlyPriceLabel: 'Custom',
    color: 'amber',
    badge: 'bg-amber-100 text-amber-700 border border-amber-200 shadow-sm',
    gradient: 'from-[#FACC15] via-[#F59E0B] to-[#D97706]',
    description: 'Untuk bisnis besar dengan kebutuhan multi-cabang dan agent',
    modules: ['*'], // all modules
    limits: {
      maxProducts: Infinity,
      maxUsers: Infinity,
      maxPhotosPerModule: Infinity,
      maxPhotoSizeMB: 10,
      exportEnabled: true,
      userManagement: true,
    },
    features: [
      'Semua fitur Pro Plan',
      'Unlimited Produk & User',
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
  // Dev/admin emails always have full access
  if (userEmail && DEV_EMAILS.includes(userEmail.toLowerCase())) return true;
  const plan = PLAN_TIERS[planId] || PLAN_TIERS.free;
  if (plan.modules[0] === '*') return true;
  return plan.modules.includes(pageName);
}

/**
 * Get the minimum plan required for a module
 */
export function getRequiredPlan(pageName) {
  for (const tier of ['free', 'pro', 'enterprise']) {
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
