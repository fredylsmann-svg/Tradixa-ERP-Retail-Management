import { lazy } from 'react';
import __Layout from './Layout.jsx';

// Lazy-loaded pages for automatic code splitting
const AgentPerformance = lazy(() => import('./pages/AgentPerformance'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const BankAccounts = lazy(() => import('./pages/BankAccounts'));
const BankTransactions = lazy(() => import('./pages/BankTransactions'));
const BankReconciliation = lazy(() => import('./pages/BankReconciliation'));
const CashRegister = lazy(() => import('./pages/CashRegister'));
const CompanySettings = lazy(() => import('./pages/CompanySettings'));
const ChartOfAccounts = lazy(() => import('./pages/ChartOfAccounts'));
const CustomerMaster = lazy(() => import('./pages/CustomerMaster'));
const CustomerProfile = lazy(() => import('./pages/CustomerProfile'));
const CustomerSegmentation = lazy(() => import('./pages/CustomerSegmentation'));
const DaftarLayanan = lazy(() => import('./pages/DaftarLayanan'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DashboardAgent = lazy(() => import('./pages/DashboardAgent'));
const DesignStudio = lazy(() => import('./pages/DesignStudio'));
const DiscountManagement = lazy(() => import('./pages/DiscountManagement'));
const Expenses = lazy(() => import('./pages/Expenses'));
const FinancialStatements = lazy(() => import('./pages/FinancialStatements'));
const FinancialAgentWorkflow = lazy(() => import('./pages/FinancialAgentWorkflow'));
const GoodsReceipt = lazy(() => import('./pages/GoodsReceipt'));
const InventoryGRN = lazy(() => import('./pages/InventoryGRN'));
const InventoryGRNDetail = lazy(() => import('./pages/InventoryGRNDetail'));
const InventoryLedger = lazy(() => import('./pages/InventoryLedger'));
const HRISManagement = lazy(() => import('./pages/HRISManagement'));
const InventoryReports = lazy(() => import('./pages/InventoryReports'));
const InventoryWorkflow = lazy(() => import('./pages/InventoryWorkflow'));
const JournalEntries = lazy(() => import('./pages/JournalEntries'));
const JournalDetail = lazy(() => import('./pages/JournalDetail'));
const LaporanFee = lazy(() => import('./pages/LaporanFee'));
const LowStockAlert = lazy(() => import('./pages/LowStockAlert'));
const LoyaltyProgram = lazy(() => import('./pages/LoyaltyProgram'));
const MarketingAutomation = lazy(() => import('./pages/MarketingAutomation'));
const Payments = lazy(() => import('./pages/Payments'));
const ProfileAccount = lazy(() => import('./pages/ProfileAccount'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const ProcurementWorkflow = lazy(() => import('./pages/ProcurementWorkflow'));
const PayableInvoices = lazy(() => import('./pages/PayableInvoices'));
const Payables = lazy(() => import('./pages/Payables'));
const PengaturanAgen = lazy(() => import('./pages/PengaturanAgen'));
const ProductMaster = lazy(() => import('./pages/ProductMaster'));
const PurchaseOrders = lazy(() => import('./pages/PurchaseOrders'));
const PurchaseRequisition = lazy(() => import('./pages/PurchaseRequisition'));
const ReceivableInvoices = lazy(() => import('./pages/ReceivableInvoices'));
const Receivables = lazy(() => import('./pages/Receivables'));
const Reports = lazy(() => import('./pages/Reports'));
const RevenueReports = lazy(() => import('./pages/RevenueReports'));
const SaldoKasAgen = lazy(() => import('./pages/SaldoKasAgen'));
const SalesInvoices = lazy(() => import('./pages/SalesInvoices'));
const SalesReport = lazy(() => import('./pages/SalesReport'));
const SalesPerformance = lazy(() => import('./pages/SalesPerformance'));
const SalesTransaction = lazy(() => import('./pages/SalesTransaction'));
const ProductLocations = lazy(() => import('./pages/ProductLocations'));
const StockIn = lazy(() => import('./pages/StockIn'));
const StockOut = lazy(() => import('./pages/StockOut'));
const StockOpname = lazy(() => import('./pages/StockOpname'));
const StockReport = lazy(() => import('./pages/StockReport'));
const StoreSetup = lazy(() => import('./pages/StoreSetup'));
const TradixaAssistant = lazy(() => import('./pages/TradixaAssistant'));
const TransaksiAgen = lazy(() => import('./pages/TransaksiAgen'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const SupplierReturn = lazy(() => import('./pages/SupplierReturn'));
const WorkflowSystem = lazy(() => import('./pages/WorkflowSystem'));
const PublicPOSign = lazy(() => import('./pages/PublicPOSign'));
const SystemSettings = lazy(() => import('./pages/SystemSettings'));


export const PAGES = {
    "AgentPerformance": AgentPerformance,
    "AuditLog": AuditLog,
    "BankAccounts": BankAccounts,
    "BankTransactions": BankTransactions,
    "BankReconciliation": BankReconciliation,
    "CashRegister": CashRegister,
    "CompanySettings": CompanySettings,
    "ChartOfAccounts": ChartOfAccounts,
    "CustomerMaster": CustomerMaster,
    "CustomerProfile": CustomerProfile,
    "CustomerSegmentation": CustomerSegmentation,
    "DaftarLayanan": DaftarLayanan,
    "Dashboard": Dashboard,
    "DashboardAgent": DashboardAgent,
    "DesignStudio": DesignStudio,
    "DiscountManagement": DiscountManagement,
    "Expenses": Expenses,
    "FinancialStatements": FinancialStatements,
    "FinancialAgentWorkflow": FinancialAgentWorkflow,
    "GoodsReceipt": GoodsReceipt,
    "InventoryGRN": InventoryGRN,
    "InventoryGRNDetail": InventoryGRNDetail,
    "InventoryLedger": InventoryLedger,
    "HRISManagement": HRISManagement,
    "InventoryReports": InventoryReports,
    "InventoryWorkflow": InventoryWorkflow,
    "JournalEntries": JournalEntries,
    "JournalDetail": JournalDetail,
    "LaporanFee": LaporanFee,
    "LowStockAlert": LowStockAlert,
    "LoyaltyProgram": LoyaltyProgram,
    "MarketingAutomation": MarketingAutomation,
    "Payments": Payments,
    "PayableInvoices": PayableInvoices,
    "Payables": Payables,
    "PengaturanAgen": PengaturanAgen,
    "ProductMaster": ProductMaster,
    "PurchaseOrders": PurchaseOrders,
    "PurchaseRequisition": PurchaseRequisition,
    "ReceivableInvoices": ReceivableInvoices,
    "Receivables": Receivables,
    "Reports": Reports,
    "RevenueReports": RevenueReports,
    "SaldoKasAgen": SaldoKasAgen,
    "SalesInvoices": SalesInvoices,
    "SalesReport": SalesReport,
    "SalesPerformance": SalesPerformance,
    "SalesTransaction": SalesTransaction,
    "ProductLocations": ProductLocations,
    "StockIn": StockIn,
    "StockOpname": StockOpname,
    "StockOut": StockOut,
    "StockReport": StockReport,
    "StoreSetup": StoreSetup,
    "TradixaAssistant": TradixaAssistant,
    "TransaksiAgen": TransaksiAgen,
    "UserManagement": UserManagement,
    "ProfileAccount": ProfileAccount,
    "Suppliers": Suppliers,
    "SupplierReturn": SupplierReturn,
    "WorkflowSystem": WorkflowSystem,
    "PublicPOSign": PublicPOSign,
    "ProcurementWorkflow": ProcurementWorkflow,
    "PricingPage": PricingPage,
    "SystemSettings": SystemSettings,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
