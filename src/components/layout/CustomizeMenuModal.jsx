import React from 'react';
import { useTranslation } from 'react-i18next';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Search, Settings2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

const MODULE_GROUPS = [
  {
    group: 'General',
    modules: ['Dashboard', 'Design Studio']
  },
  {
    group: 'Inventory (WMS)',
    modules: [
      'Inventory Workflow', 'Product Master', 'Location Settings', 'Stock In', 'Stock Out', 
      'Inventory Ledger', 'Inventory Reports', 'Low Stock Alert',
      'WMS Workflow', 'Warehouse Dashboard', 'Warehouse Transfer', 'Pick List', 
      'Stock Opname', 'Outbound Delivery'
    ]
  },
  {
    group: 'Procurement',
    modules: [
      'Procurement Workflow', 'Suppliers', 'Purchase Requisition', 'Purchase Orders', 
      'Goods Receipt', 'Inventory GRN', 'Supplier Return'
    ]
  },
  {
    group: 'Customers & Promotions',
    modules: [
      'Customer Master', 'Customer Segmentation', 'Marketing Automation', 
      'Discount Management', 'Loyalty Program'
    ]
  },
  {
    group: 'Sales',
    modules: [
      'Sales Workflow', 'Sales Transaction', 'Sales Invoices', 'Sales Return', 'Revenue Reports'
    ]
  },
  {
    group: 'Financial & Operations',
    modules: [
      'Bank Accounts', 'Bank Transactions', 'Fund Transfers', 'Cash Register', 'Bank Reconciliation',
      'Account Receivables', 'Account Receivable Invoices', 'Account Payables', 'Account Payable Invoices', 
      'Payments', 'Operational Expenses', 'Journal Entries', 'Chart of Accounts', 'Tax Management'
    ]
  },
  {
    group: 'Agent & Teams',
    modules: [
      'Employee Management', 'Sales Performance', 'User Management',
      'Agent Workflow', 'Agent Dashboard', 'Agent Transactions', 'Service Catalog', 
      'Agent Balance & Cash', 'Commission Reports', 'Agent Performance', 'Agent Settings'
    ]
  },
  {
    group: 'Reports & Settings',
    modules: [
      'Financial Statements', 'Stock Report', 'Sales Report', 'Reports',
      'Audit Log', 'Company Settings', 'User Preferences', 'Tradixa Assistant'
    ]
  }
];

const ALL_MODULES = MODULE_GROUPS.flatMap(g => g.modules);

export default function CustomizeMenuModal({ isOpen, onClose }) {
  const { t, i18n } = useTranslation();
  const { preferences, updatePreferences } = useUserPreferences();
  const [searchTerm, setSearchTerm] = React.useState('');
  
  const [localHiddenModules, setLocalHiddenModules] = React.useState(preferences?.hiddenModules || []);
  const [localLanguage, setLocalLanguage] = React.useState(i18n.language);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setLocalHiddenModules(preferences?.hiddenModules || []);
      setLocalLanguage(i18n.language);
    }
  }, [isOpen, preferences, i18n.language]);

  const toggleLocalModule = (moduleName) => {
    const isHidden = localHiddenModules.includes(moduleName);
    if (isHidden) {
      setLocalHiddenModules(prev => prev.filter(m => m !== moduleName));
    } else {
      setLocalHiddenModules(prev => [...prev, moduleName]);
    }
  };

  const toggleGroupModules = (groupModules, isAllHidden) => {
    if (isAllHidden) {
      // Turn them ON (remove from hidden)
      setLocalHiddenModules(prev => prev.filter(m => !groupModules.includes(m)));
    } else {
      // Turn them OFF (add to hidden)
      setLocalHiddenModules(prev => {
        const newHidden = [...prev];
        groupModules.forEach(m => {
          if (!newHidden.includes(m)) newHidden.push(m);
        });
        return newHidden;
      });
    }
  };

  const allModulesVisible = localHiddenModules.length === 0;

  const toggleAllModules = () => {
    if (allModulesVisible) {
      setLocalHiddenModules([...ALL_MODULES]);
    } else {
      setLocalHiddenModules([]);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await updatePreferences({ 
      hiddenModules: localHiddenModules, 
      language: localLanguage 
    });
    setIsSaving(false);
    onClose();
  };

  const filteredGroups = MODULE_GROUPS.map(group => {
    const filteredModules = group.modules.filter(m => 
      t(`sidebar.${m}`).toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.group.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return { ...group, modules: filteredModules };
  }).filter(group => group.modules.length > 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl">
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 pr-8 sm:pr-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Settings2 className="w-5 h-5" />
                </div>
                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                  {t('preferences.title')}
                </DialogTitle>
              </div>

              <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg shrink-0">
                <button 
                  onClick={() => setLocalLanguage('id')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${localLanguage === 'id' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                  <span className="text-sm">🇮🇩</span> ID
                </button>
                <button 
                  onClick={() => setLocalLanguage('en')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${localLanguage === 'en' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                  <span className="text-sm">🇬🇧</span> EN
                </button>
              </div>
            </div>
            <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium">
              {t('preferences.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('preferences.search')}
              className="pl-9 h-11 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl focus-visible:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-2 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl shadow-sm">
            <span className="text-sm font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest">
              {i18n.language === 'id' ? 'Tampilkan Semua Menu' : 'Show All Modules'}
            </span>
            <Switch
              checked={allModulesVisible}
              onCheckedChange={toggleAllModules}
              className={allModulesVisible ? 'bg-blue-600' : ''}
            />
          </div>

          <div className="space-y-8">
            {filteredGroups.map(group => {
              const allHiddenInGroup = group.modules.every(m => localHiddenModules.includes(m));
              const someHiddenInGroup = group.modules.some(m => localHiddenModules.includes(m));
              const isIndeterminate = someHiddenInGroup && !allHiddenInGroup;
              
              return (
                <div key={group.group} className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700/50">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 tracking-wide">{group.group}</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-semibold text-slate-400">
                        {allHiddenInGroup ? 'OFF' : isIndeterminate ? 'MIXED' : 'ON'}
                      </span>
                      <Switch
                        checked={!allHiddenInGroup}
                        onCheckedChange={() => toggleGroupModules(group.modules, allHiddenInGroup)}
                        className={!allHiddenInGroup ? (isIndeterminate ? 'bg-indigo-400' : 'bg-blue-600') : ''}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.modules.map(moduleName => {
                      const isHidden = localHiddenModules.includes(moduleName);
                      
                      return (
                        <div 
                          key={moduleName}
                          className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 ${
                            isHidden 
                              ? 'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 opacity-60 grayscale-[0.5]' 
                              : 'bg-white border-blue-100 shadow-sm shadow-blue-100/50 dark:bg-slate-800 dark:border-blue-900/30'
                          }`}
                        >
                          <span className={`text-sm font-semibold tracking-wide ${isHidden ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-slate-200'}`}>
                            {t(`sidebar.${moduleName}`)}
                          </span>
                          <Switch
                            checked={!isHidden}
                            onCheckedChange={() => toggleLocalModule(moduleName)}
                            className={!isHidden ? 'bg-blue-600' : ''}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            
            {filteredGroups.length === 0 && (
              <div className="text-center py-10">
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                  {i18n.language === 'id' ? 'Tidak ada modul yang ditemukan.' : 'No modules found.'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900 mt-auto">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors">
            {t('preferences.cancel') || 'Batal'}
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-xl font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
          >
            {isSaving ? (
               <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
            ) : (
               <>Simpan Perubahan</>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
