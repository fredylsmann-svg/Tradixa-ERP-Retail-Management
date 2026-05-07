import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Package, ShoppingCart, DollarSign, Users, Truck, Building2, 
  ArrowRight, GitBranch, CheckCircle2, Clock
} from 'lucide-react';

export default function WorkflowOverview() {
  const workflows = [
    {
      title: 'Inventory Management',
      icon: Package,
      color: 'bg-blue-500',
      steps: ['Product Master', 'Stock In', 'Stock Out', 'Inventory Reports'],
      status: 'active'
    },
    {
      title: 'Sales Process',
      icon: ShoppingCart,
      color: 'bg-emerald-500',
      steps: ['Sales Transaction', 'Invoice Generation', 'Payment', 'Reports'],
      status: 'active'
    },
    {
      title: 'Procurement',
      icon: Truck,
      color: 'bg-violet-500',
      steps: ['Purchase Order', 'Goods Receipt', 'Stock Update', 'Payables'],
      status: 'active'
    },
    {
      title: 'Financial Operations',
      icon: DollarSign,
      color: 'bg-amber-500',
      steps: ['Bank Accounts', 'Transactions', 'Payables', 'Receivables'],
      status: 'active'
    },
    {
      title: 'Agent Management',
      icon: Users,
      color: 'bg-pink-500',
      steps: ['Agent Setup', 'Services', 'Transactions', 'Fee Reports'],
      status: 'active'
    },
    {
      title: 'HR Management',
      icon: Building2,
      color: 'bg-cyan-500',
      steps: ['Employee Data', 'Attendance', 'Payroll', 'Reports'],
      status: 'partial'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Workflow Overview</h1>
        <p className="text-slate-500">Gambaran umum alur kerja sistem retail</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workflows.map((workflow) => {
          const Icon = workflow.icon;
          return (
            <Card key={workflow.title} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${workflow.color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-lg">{workflow.title}</CardTitle>
                  </div>
                  <Badge className={workflow.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                    {workflow.status === 'active' ? (
                      <><CheckCircle2 className="w-3 h-3 mr-1" />Active</>
                    ) : (
                      <><Clock className="w-3 h-3 mr-1" />Partial</>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {workflow.steps.map((step, idx) => (
                    <div key={step} className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        idx === 0 ? workflow.color + ' text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {idx + 1}
                      </div>
                      <span className="text-sm text-slate-600">{step}</span>
                      {idx < workflow.steps.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-slate-300 ml-auto" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            System Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-xl">
              <h3 className="font-semibold text-blue-700 mb-2">Inventory → Sales</h3>
              <p className="text-sm text-blue-600">Stock dikurangi otomatis saat transaksi penjualan</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl">
              <h3 className="font-semibold text-emerald-700 mb-2">PO → Goods Receipt</h3>
              <p className="text-sm text-emerald-600">Penerimaan barang update stock dan payables</p>
            </div>
            <div className="p-4 bg-violet-50 rounded-xl">
              <h3 className="font-semibold text-violet-700 mb-2">Sales → Receivables</h3>
              <p className="text-sm text-violet-600">Penjualan kredit masuk ke piutang usaha</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
