import { api } from '@/api/client';
import moment from 'moment';

/**
 * FEFO (First Expired First Out) Engine
 * Allocates requested quantity across active batches based on expiry dates.
 * 
 * @param {string} storeId - Store ID
 * @param {string} productId - Product ID to allocate
 * @param {number} requestedQty - Quantity requested for sales/issue
 * @returns {Promise<{
 *   success: boolean,
 *   allocations: Array<{batch_id: string, batch_number: string, quantity: number, expiry_date: string, original_qty: number}>,
 *   warnings: string[],
 *   message: string
 * }>}
 */
export const allocateBatches = async (storeId, productId, requestedQty) => {
  try {
    // 1. Fetch active batches for the product
    const batches = await api.entities.InventoryBatch.filter({
      store_id: storeId,
      product_id: productId,
      status: 'Available'
    });

    // 2. Filter out batches with 0 qty AND expired batches
    const now = new Date();
    const availableBatches = batches.filter(b => {
      const qty = Number(b.qty_on_hand || 0);
      const isExpired = b.expiry_date && new Date(b.expiry_date) < now;
      return qty > 0 && !isExpired;
    });

    // 2.5 Fetch product to know its issue_method
    const product = await api.entities.Product.get(productId);
    const issueMethod = product?.issue_method || 'FIFO';

    // 3. Sort based on issueMethod (FIFO, LIFO, FEFO)
    availableBatches.sort((a, b) => {
      if (issueMethod === 'FEFO') {
        const expA = a.expiry_date ? new Date(a.expiry_date).getTime() : Infinity;
        const expB = b.expiry_date ? new Date(b.expiry_date).getTime() : Infinity;
        if (expA !== expB) return expA - expB;
        // fallback to FIFO if expiry dates are the same or missing
      }
      
      const recA = a.created_date ? new Date(a.created_date).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
      const recB = b.created_date ? new Date(b.created_date).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
      
      if (issueMethod === 'LIFO') {
        return recB - recA; // Newest first
      }
      
      // Default to FIFO (Oldest first)
      return recA - recB;
    });

    // 4. Allocate quantity
    let remainingQty = Number(requestedQty);
    const allocations = [];

    for (const batch of availableBatches) {
      if (remainingQty <= 0) break;

      const currentQty = Number(batch.qty_on_hand || 0);
      const takeQty = Math.min(currentQty, remainingQty);
      
      allocations.push({
        batch_id: batch.id,
        batch_number: batch.batch_number,
        quantity: takeQty,
        expiry_date: batch.expiry_date,
        original_qty: currentQty
      });

      remainingQty -= takeQty;
    }

    // 4.5 Generate Warnings for Near Expiry (3 months)
    const warnings = [];
    const threeMonthsFromNow = moment().add(3, 'months');
    allocations.forEach(a => {
      if (a.expiry_date && moment(a.expiry_date).isBefore(threeMonthsFromNow)) {
        warnings.push(`Batch ${a.batch_number} akan kadaluarsa pada ${moment(a.expiry_date).format('DD MMM YYYY')}`);
      }
    });

    // 5. Check if we could fulfill the request
    if (remainingQty > 0) {
      return {
        success: false,
        allocations: [],
        message: `Stok batch tidak mencukupi. Kurang ${remainingQty} pcs.`
      };
    }

    return {
      success: true,
      allocations,
      warnings,
      message: 'FEFO allocation successful'
    };

  } catch (error) {
    console.error("FEFO Allocation Error:", error);
    return {
      success: false,
      allocations: [],
      warnings: [],
      message: 'Terjadi kesalahan sistem saat alokasi FEFO.'
    };
  }
};

/**
 * Deduct Batch Quantities
 * Executes the deduction in the database based on the allocations.
 * 
 * @param {Array<{batch_id: string, quantity: number, original_qty: number}>} allocations 
 */
export const deductBatches = async (allocations) => {
  try {
    for (const alloc of allocations) {
      const newQty = alloc.original_qty - alloc.quantity;
      await api.entities.InventoryBatch.update(alloc.batch_id, {
        qty_on_hand: newQty,
        status: newQty === 0 ? 'Depleted' : 'Available'
      });
    }
    return true;
  } catch (error) {
    console.error("Batch Deduction Error:", error);
    return false;
  }
};
