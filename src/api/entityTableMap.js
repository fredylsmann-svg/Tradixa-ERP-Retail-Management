/**
 * TRADIXA - Entity Name to Supabase Table Name Mapping
 * 
 * Frontend menggunakan: api.entities.BankAccount.filter(...)
 * Supabase memerlukan:  supabase.from('bank_accounts').select(...)
 * 
 * File ini menjembatani kedua konvensi tersebut.
 */

export const ENTITY_TABLE_MAP = {
  // === CORE ===
  Store:              'stores',
  User:               'users',

  // === INVENTORY ===
  Product:            'products',
  StockMovement:      'stock_movements',
  ProductLocation:    'product_locations',
  StockOpname:        'stock_opnames',
  StockOpnameItem:    'stock_opname_items',
  InventoryBatch:     'inventory_batches',

  // === PROCUREMENT ===
  Supplier:           'suppliers',
  PurchaseRequisition:'purchase_requisitions',
  PurchaseOrder:      'purchase_orders',
  GoodsReceipt:       'goods_receipts',
  InventoryGRN:       'inventory_grns',
  SupplierReturn:     'supplier_returns',

  // === CUSTOMERS & MARKETING ===
  Customer:           'customers',
  CustomerSegment:    'customer_segments',
  CustomerInteraction:'customer_interactions',
  CustomerLoyalty:    'customer_loyalties',
  CommunicationLog:  'communication_logs',
  FollowUpReminder:  'follow_up_reminders',
  MarketingCampaign: 'marketing_campaigns',
  AutomationRule:    'automation_rules',

  // === SALES ===
  SalesTransaction:  'sales_transactions',

  // === FINANCIAL ===
  COA:               'coa',
  JournalEntry:      'journal_entries',
  JournalLine:       'journal_lines',
  Expense:           'expenses',
  BankAccount:       'bank_accounts',
  BankTransaction:   'bank_transactions',
  Payable:           'payables',
  Receivable:        'receivables',
  InvoicePayment:    'invoice_payments',
  BankStatementHistory: 'bank_statement_history',
  OutboundDelivery:  'outbound_deliveries',
  TaxRate:           'tax_rates',

  // === AGENT ===
  Agent:             'agents',
  AgentService:      'agent_services',
  AgentTransaction:  'agent_transactions',

  // === HR ===
  Employee:          'employees',

  // === PROMOTIONS ===
  Discount:          'discounts',
  DiscountUsage:     'discount_usages',
  LoyaltyReward:     'loyalty_rewards',
  LoyaltyTier:       'loyalty_tiers',
  LoyaltyTransaction:'loyalty_transactions',
  InternalMessage:    'internal_messages',
  SystemAuditLog:     'system_audit_logs',
};

/**
 * Mendapatkan nama tabel dari entity name
 * @param {string} entityName - Nama entity (e.g. 'BankAccount')
 * @returns {string} Nama tabel di Supabase (e.g. 'bank_accounts')
 */
export function getTableName(entityName) {
  const table = ENTITY_TABLE_MAP[entityName];
  if (!table) {
    console.warn(`[Tradixa] Unknown entity: ${entityName}. Falling back to lowercase.`);
    return entityName.toLowerCase() + 's';
  }
  return table;
}
