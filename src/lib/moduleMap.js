/**
 * Tradixa RBAC — Page-to-Module Name Mapping
 * 
 * Maps route/page names (used in App.jsx routing) to human-readable module names
 * (used in user.modules[] from User Management).
 * 
 * This mapping is necessary because sidebar menu items use display names like
 * "Product Master" while routes use PascalCase like "ProductMaster".
 */

export const PAGE_TO_MODULE = {
  // Overview
  'Dashboard': 'Dashboard',
  'DesignStudio': 'Design Studio',

  // Workflow
  'WorkflowSystem': 'Workflow System',

  // Settings & Tools
  'AuditLog': 'Audit Log',
  'CompanySettings': 'Company Settings',
  'TradixaAssistant': 'Tradixa Assistant',

  // Inventory
  'ProductMaster': 'Product Master',
  'ProductLocations': 'Location Settings',
  'StockIn': 'Stock In',
  'StockOut': 'Stock Out',
  'InventoryLedger': 'Inventory Ledger',
  'InventoryReports': 'Inventory Reports',
  'LowStockAlert': 'Low Stock Alert',
  'StockOpname': 'Stock Opname',

  // Procurement
  'ProcurementWorkflow': 'Procurement Workflow',
  'Suppliers': 'Suppliers',
  'PurchaseRequisition': 'Purchase Requisition',
  'PurchaseOrders': 'Purchase Orders',
  'GoodsReceipt': 'Goods Receipt',
  'InventoryGRN': 'Inventory GRN',
  'InventoryGRNDetail': 'Inventory GRN',
  'SupplierReturn': 'Supplier Return',

  // Customers & Marketing
  'CustomerMaster': 'Customer Master',
  'CustomerProfile': 'Customer Master',
  'CustomerSegmentation': 'Customer Segmentation',
  'MarketingAutomation': 'Marketing Automation',

  // Promotions
  'DiscountManagement': 'Discount Management',
  'LoyaltyProgram': 'Loyalty Program',

  // Sales
  'SalesWorkflow': 'Sales Workflow',
  'SalesTransaction': 'Sales Transaction',
  'SalesInvoices': 'Sales Invoices',
  'RevenueReports': 'Revenue Reports',

  // Financial & Operations
  'BankAccounts': 'Bank Accounts',
  'BankTransactions': 'Bank Transactions',
  'CashRegister': 'Cash Register',
  'BankReconciliation': 'Bank Reconciliation',
  'Receivables': 'Account Receivables',
  'ReceivableInvoices': 'Account Receivable Invoices',
  'Payables': 'Account Payables',
  'PayableInvoices': 'Account Payable Invoices',
  'Payments': 'Payments',
  'Expenses': 'Operational Expenses',
  'JournalEntries': 'Journal Entries',
  'JournalDetail': 'Journal Entries',
  'ChartOfAccounts': 'Chart of Accounts',

  // HRIS
  'HRISManagement': 'Employee Management',
  'SalesPerformance': 'Sales Performance',
  'UserManagement': 'User Management',

  // Reports
  'FinancialStatements': 'Financial Statements',
  'StockReport': 'Stock Report',
  'SalesReport': 'Sales Report',
  'Reports': 'Reports',

  // Financial Agent
  'FinancialAgentWorkflow': 'Agent Workflow',
  'DashboardAgent': 'Dashboard Agent',
  'TransaksiAgen': 'Transaksi Agen',
  'DaftarLayanan': 'Daftar Layanan',
  'SaldoKasAgen': 'Saldo & Kas Agen',
  'LaporanFee': 'Laporan Fee',
  'AgentPerformance': 'Agent Performance',
  'PengaturanAgen': 'Pengaturan Agen',
};

/**
 * Pages that are always accessible regardless of user modules.
 * These are system pages, not business modules.
 */
export const ALWAYS_ACCESSIBLE_PAGES = [
  'SystemSettings',    // User Preferences (personal settings)
  'ProfileAccount',    // Personal profile page
  'StoreSetup',        // Initial setup flow
  'PricingPage',       // Pricing info
];

/**
 * Check if a user has access to a specific page based on their modules list.
 * 
 * @param {string} pageName - The route/page name (e.g., 'ProductMaster')
 * @param {string[]} userModules - The user's allowed modules list
 * @param {boolean} isOwner - Whether the user is the store owner
 * @returns {boolean} Whether access is allowed
 */
export function isModuleAllowed(pageName, userModules, isOwner = false) {
  // Owners always have full access
  if (isOwner) return true;

  // System pages are always accessible
  if (ALWAYS_ACCESSIBLE_PAGES.includes(pageName)) return true;

  // If user has no modules restriction, allow all (edge case / legacy)
  if (!userModules || userModules.length === 0) return true;

  // Map page name to module name and check
  const moduleName = PAGE_TO_MODULE[pageName];
  if (!moduleName) return true; // Unknown page, allow by default

  return userModules.includes(moduleName);
}
