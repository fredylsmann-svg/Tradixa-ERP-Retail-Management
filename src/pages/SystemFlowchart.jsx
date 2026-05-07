import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Package, ShoppingCart, DollarSign, Truck, Building2, 
  ArrowDown, ArrowRight, Database, Users, FileText
} from 'lucide-react';

export default function SystemFlowchart() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">System Flowchart</h1>
        <p className="text-slate-500">Diagram alur sistem Tradixa Retail Management</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alur Sistem Utama</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[800px] p-8">
              {/* Top Row - Input */}
              <div className="flex justify-center gap-8 mb-8">
                <div className="w-40 p-4 bg-blue-100 rounded-xl text-center">
                  <Package className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="font-medium text-blue-800">Product Master</p>
                  <p className="text-xs text-blue-600 mt-1">Data Produk</p>
                </div>
                <div className="w-40 p-4 bg-emerald-100 rounded-xl text-center">
                  <Users className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <p className="font-medium text-emerald-800">Supplier/Customer</p>
                  <p className="text-xs text-emerald-600 mt-1">Master Data</p>
                </div>
                <div className="w-40 p-4 bg-violet-100 rounded-xl text-center">
                  <Building2 className="w-8 h-8 text-violet-600 mx-auto mb-2" />
                  <p className="font-medium text-violet-800">Bank Accounts</p>
                  <p className="text-xs text-violet-600 mt-1">Keuangan</p>
                </div>
              </div>

              {/* Arrows Down */}
              <div className="flex justify-center gap-32 mb-4">
                <ArrowDown className="w-6 h-6 text-slate-400" />
                <ArrowDown className="w-6 h-6 text-slate-400" />
                <ArrowDown className="w-6 h-6 text-slate-400" />
              </div>

              {/* Middle Row - Process */}
              <div className="flex justify-center items-center gap-4 mb-4">
                <div className="w-36 p-4 bg-amber-100 rounded-xl text-center">
                  <Truck className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                  <p className="font-medium text-amber-800 text-sm">Purchase Order</p>
                </div>
                <ArrowRight className="w-6 h-6 text-slate-400" />
                <div className="w-36 p-4 bg-amber-100 rounded-xl text-center">
                  <Package className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                  <p className="font-medium text-amber-800 text-sm">Goods Receipt</p>
                </div>
                <ArrowRight className="w-6 h-6 text-slate-400" />
                <div className="w-36 p-4 bg-blue-100 rounded-xl text-center border-2 border-blue-400">
                  <Database className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <p className="font-medium text-blue-800 text-sm">INVENTORY</p>
                </div>
                <ArrowRight className="w-6 h-6 text-slate-400" />
                <div className="w-36 p-4 bg-emerald-100 rounded-xl text-center">
                  <ShoppingCart className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                  <p className="font-medium text-emerald-800 text-sm">Sales Transaction</p>
                </div>
                <ArrowRight className="w-6 h-6 text-slate-400" />
                <div className="w-36 p-4 bg-emerald-100 rounded-xl text-center">
                  <FileText className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                  <p className="font-medium text-emerald-800 text-sm">Invoice</p>
                </div>
              </div>

              {/* Arrows Down from middle */}
              <div className="flex justify-center gap-[340px] mb-4">
                <ArrowDown className="w-6 h-6 text-slate-400" />
                <ArrowDown className="w-6 h-6 text-slate-400" />
              </div>

              {/* Bottom Row - Financial */}
              <div className="flex justify-center gap-[280px]">
                <div className="w-40 p-4 bg-red-100 rounded-xl text-center">
                  <DollarSign className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <p className="font-medium text-red-800">Payables</p>
                  <p className="text-xs text-red-600 mt-1">Hutang Usaha</p>
                </div>
                <div className="w-40 p-4 bg-green-100 rounded-xl text-center">
                  <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="font-medium text-green-800">Receivables</p>
                  <p className="text-xs text-green-600 mt-1">Piutang Usaha</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Alur Pembelian</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['Purchase Order dibuat', 'Supplier mengirim barang', 'Goods Receipt dibuat', 'Stock bertambah', 'Payables dicatat'].map((step, idx) => (
                <div key={step} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-medium">
                    {idx + 1}
                  </div>
                  <span className="text-slate-600">{step}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Alur Penjualan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['Customer memilih produk', 'Transaksi dibuat', 'Stock berkurang', 'Invoice digenerate', 'Payment diterima/Receivable dicatat'].map((step, idx) => (
                <div key={step} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-medium">
                    {idx + 1}
                  </div>
                  <span className="text-slate-600">{step}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
