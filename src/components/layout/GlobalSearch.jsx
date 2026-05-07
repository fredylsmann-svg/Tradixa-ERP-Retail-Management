import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/api/client';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Users, Receipt, Truck, Loader2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

export default function GlobalSearch({ store }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState({
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
      setResults({ products: [], customers: [], transactions: [], suppliers: [] });
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsSearching(true);
      const searchQuery = query.toLowerCase();

      const [products, customers, transactions, suppliers] = await Promise.all([
        api.entities.Product.filter({ store_id: store.id }).then(items =>
          items.filter(p => 
            p.name?.toLowerCase().includes(searchQuery) || 
            p.barcode?.includes(searchQuery) ||
            p.sku?.includes(searchQuery)
          ).slice(0, 5)
        ),
        api.entities.Customer.filter({ store_id: store.id }).then(items =>
          items.filter(c => 
            c.name?.toLowerCase().includes(searchQuery) ||
            c.phone?.includes(searchQuery)
          ).slice(0, 5)
        ),
        api.entities.SalesTransaction.filter({ store_id: store.id }).then(items =>
          items.filter(t => 
            t.invoice_number?.toLowerCase().includes(searchQuery) ||
            t.customer_name?.toLowerCase().includes(searchQuery)
          ).slice(0, 5)
        ),
        api.entities.Supplier.filter({ store_id: store.id }).then(items =>
          items.filter(s => 
            s.name?.toLowerCase().includes(searchQuery) ||
            s.phone?.includes(searchQuery)
          ).slice(0, 5)
        )
      ]);

      setResults({ products, customers, transactions, suppliers });
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query, store?.id]);

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value || 0);

  const totalResults = results.products.length + results.customers.length + 
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
        <DialogContent className="max-w-2xl max-h-[80vh] p-0" hideClose={true}>
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
