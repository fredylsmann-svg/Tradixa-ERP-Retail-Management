import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/api/client';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Users, Receipt, Truck, Loader2, X, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

const AVAILABLE_MODULES = [
  { name: 'Dashboard', page: 'Dashboard' },
  { name: 'Design Studio', page: 'DesignStudio' },
  { name: 'Inventory Workflow', page: 'InventoryWorkflow' },
  { name: 'Product Master', page: 'ProductMaster' },
  { name: 'Location Settings', page: 'ProductLocations' },
  { name: 'Stock In', page: 'StockIn' },
  { name: 'Stock Out', page: 'StockOut' },
  { name: 'Inventory Ledger', page: 'InventoryLedger' },
  { name: 'Inventory Reports', page: 'InventoryReports' },
  { name: 'Low Stock Alert', page: 'LowStockAlert' },
  { name: 'WMS Workflow', page: 'WMSWorkflow' },
  { name: 'Warehouse Dashboard', page: 'WarehouseDashboard' },
  { name: 'Pick List', page: 'PickList' },
  { name: 'Outbound Delivery', page: 'OutboundDelivery' },
  { name: 'Transfer Gudang', page: 'WarehouseTransfer' },
  { name: 'Stock Opname', page: 'StockOpname' },
  { name: 'Procurement Workflow', page: 'ProcurementWorkflow' },
  { name: 'Suppliers', page: 'Suppliers' },
  { name: 'Purchase Requisition', page: 'PurchaseRequisition' },
  { name: 'Purchase Orders', page: 'PurchaseOrders' },
  { name: 'Goods Receipt', page: 'GoodsReceipt' },
  { name: 'Inventory GRN', page: 'InventoryGRN' },
  { name: 'Supplier Return', page: 'SupplierReturn' },
  { name: 'Customer Master', page: 'CustomerMaster' },
  { name: 'Customer Segmentation', page: 'CustomerSegmentation' },
  { name: 'Marketing Automation', page: 'MarketingAutomation' },
  { name: 'Discount Management', page: 'DiscountManagement' },
  { name: 'Loyalty Program', page: 'LoyaltyProgram' },
  { name: 'Sales Workflow', page: 'SalesWorkflow' },
  { name: 'Sales Transaction', page: 'SalesTransaction' },
  { name: 'Sales Return', page: 'SalesReturn' },
  { name: 'Sales Invoices', page: 'SalesInvoices' },
  { name: 'Revenue Reports', page: 'RevenueReports' },
  { name: 'Bank Accounts', page: 'BankAccounts' },
  { name: 'Bank Transactions', page: 'BankTransactions' },
  { name: 'Fund Transfer', page: 'FundTransfers' },
  { name: 'Cash Register', page: 'CashRegister' },
  { name: 'Bank Reconciliation', page: 'BankReconciliation' },
  { name: 'Account Receivables', page: 'Receivables' },
  { name: 'Account Receivable Invoices', page: 'ReceivableInvoices' },
  { name: 'Account Payables', page: 'Payables' },
  { name: 'Account Payable Invoices', page: 'PayableInvoices' },
  { name: 'Payments', page: 'Payments' },
  { name: 'Operational Expenses', page: 'Expenses' },
  { name: 'Tax Management', page: 'TaxManagement' },
  { name: 'Journal Entries', page: 'JournalEntries' },
  { name: 'Chart of Accounts', page: 'ChartOfAccounts' },
  { name: 'Employee Management', page: 'HRISManagement' },
  { name: 'Sales Performance', page: 'SalesPerformance' },
  { name: 'User Management', page: 'UserManagement' },
  { name: 'Financial Statements', page: 'FinancialStatements' },
  { name: 'Stock Report', page: 'StockReport' },
  { name: 'Sales Report', page: 'SalesReport' },
  { name: 'Reports', page: 'Reports' },
  { name: 'Agent Workflow', page: 'FinancialAgentWorkflow' },
  { name: 'Agent Dashboard', page: 'DashboardAgent' },
  { name: 'Agent Transactions', page: 'TransaksiAgen' },
  { name: 'Service Catalog', page: 'DaftarLayanan' },
  { name: 'Agent Balance & Cash', page: 'SaldoKasAgen' },
  { name: 'Commission Reports', page: 'LaporanFee' },
  { name: 'Agent Performance', page: 'AgentPerformance' },
  { name: 'Agent Settings', page: 'PengaturanAgen' },
  { name: 'Audit Log', page: 'AuditLog' },
  { name: 'Company Settings', page: 'CompanySettings' },
  { name: 'User Preferences', page: 'SystemSettings' },
  { name: 'Tradixa Assistant', page: 'TradixaAssistant' }
];

export default function GlobalSearch({ store }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState({
    modules: [],
    products: [],
    customers: [],
    transactions: [],
    suppliers: []
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!query.trim() || !store?.id) {
      setResults({ modules: [], products: [], customers: [], transactions: [], suppliers: [] });
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsSearching(true);
      const searchQuery = query.toLowerCase();

      // Client-side module filtering
      const filteredModules = AVAILABLE_MODULES.filter(m => 
        m.name.toLowerCase().includes(searchQuery)
      ).slice(0, 4);

      const [products, customers, transactions, suppliers] = await Promise.all([
        api.entities.Product.filter(
          { store_id: store.id },
          null,
          { search: searchQuery, searchColumns: ['name', 'barcode', 'sku'], page: 1, pageSize: 5 }
        ).then(res => res.data || []),
        
        api.entities.Customer.filter(
          { store_id: store.id },
          null,
          { search: searchQuery, searchColumns: ['name', 'phone'], page: 1, pageSize: 5 }
        ).then(res => res.data || []),
        
        api.entities.SalesTransaction.filter(
          { store_id: store.id },
          null,
          { search: searchQuery, searchColumns: ['invoice_number', 'customer_name'], page: 1, pageSize: 5 }
        ).then(res => res.data || []),
        
        api.entities.Supplier.filter(
          { store_id: store.id },
          null,
          { search: searchQuery, searchColumns: ['name', 'phone'], page: 1, pageSize: 5 }
        ).then(res => res.data || [])
      ]);

      setResults({ modules: filteredModules, products, customers, transactions, suppliers });
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query, store?.id]);

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value || 0);

  const totalResults = results.modules.length + results.products.length + results.customers.length + 
                      results.transactions.length + results.suppliers.length;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors w-full md:w-64"
      >
        <Search className="w-4 h-4" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="hidden md:inline-flex px-1.5 py-0.5 text-xs font-semibold text-slate-500 bg-white border border-slate-300 rounded">
          ⌘K
        </kbd>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] p-0" hideClose={true} hideFullscreen={true}>
          <div className="sticky top-0 bg-white border-b border-slate-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products, customers, transactions..."
                className="pl-10 pr-10 h-12 text-base"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto max-h-[calc(80vh-5rem)] p-4">
            {isSearching ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : !query ? (
              <div className="text-center py-12 text-slate-500">
                <Search className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">Type to search products, customers, transactions...</p>
              </div>
            ) : totalResults === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p className="text-sm">No results found for "{query}"</p>
              </div>
            ) : (
              <div className="space-y-6">
                {results.modules.length > 0 && (
                  <div>
                    <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-3">
                      <LayoutGrid className="w-4 h-4" />
                      MODULES & PAGES
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {results.modules.map(module => (
                        <Link
                          key={module.page}
                          to={createPageUrl(module.page)}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl transition-all"
                        >
                          <div className="w-8 h-8 rounded-lg bg-white shadow-sm border border-slate-200 flex items-center justify-center">
                            <LayoutGrid className="w-4 h-4 text-slate-600" />
                          </div>
                          <span className="font-bold text-sm text-slate-900">{module.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {results.products.length > 0 && (
                  <div>
                    <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-3">
                      <Package className="w-4 h-4" />
                      PRODUCTS ({results.products.length})
                    </h3>
                    <div className="space-y-2">
                      {results.products.map(product => (
                        <Link
                          key={product.id}
                          to={createPageUrl('ProductMaster')}
                          onClick={() => setIsOpen(false)}
                          className="block p-3 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 truncate">{product.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {product.barcode && (
                                  <Badge variant="outline" className="text-xs">{product.barcode}</Badge>
                                )}
                                <Badge className={cn(
                                  "text-xs",
                                  product.status === 'In Stock' ? 'bg-green-100 text-green-700' :
                                  product.status === 'Low Stock' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                )}>{product.status}</Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-blue-600">Rp {formatCurrency(product.sell_price)}</p>
                              <p className="text-xs text-slate-500">Stock: {product.stock || 0}</p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {results.customers.length > 0 && (
                  <div>
                    <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-3">
                      <Users className="w-4 h-4" />
                      CUSTOMERS ({results.customers.length})
                    </h3>
                    <div className="space-y-2">
                      {results.customers.map(customer => (
                        <Link
                          key={customer.id}
                          to={createPageUrl('CustomerMaster')}
                          onClick={() => setIsOpen(false)}
                          className="block p-3 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                          <p className="font-medium text-slate-900">{customer.name}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            {customer.phone && <span>{customer.phone}</span>}
                            {customer.email && <span>{customer.email}</span>}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {results.transactions.length > 0 && (
                  <div>
                    <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-3">
                      <Receipt className="w-4 h-4" />
                      TRANSACTIONS ({results.transactions.length})
                    </h3>
                    <div className="space-y-2">
                      {results.transactions.map(transaction => (
                        <Link
                          key={transaction.id}
                          to={createPageUrl('SalesInvoices')}
                          onClick={() => setIsOpen(false)}
                          className="block p-3 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-slate-900">{transaction.invoice_number}</p>
                              <p className="text-xs text-slate-500 mt-1">{transaction.customer_name}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-blue-600">Rp {formatCurrency(transaction.total)}</p>
                              <Badge className="text-xs mt-1">{transaction.payment_status}</Badge>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {results.suppliers.length > 0 && (
                  <div>
                    <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-3">
                      <Truck className="w-4 h-4" />
                      SUPPLIERS ({results.suppliers.length})
                    </h3>
                    <div className="space-y-2">
                      {results.suppliers.map(supplier => (
                        <Link
                          key={supplier.id}
                          to={createPageUrl('Suppliers')}
                          onClick={() => setIsOpen(false)}
                          className="block p-3 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                          <p className="font-medium text-slate-900">{supplier.name}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            {supplier.phone && <span>{supplier.phone}</span>}
                            {supplier.contact_person && <span>Contact: {supplier.contact_person}</span>}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
