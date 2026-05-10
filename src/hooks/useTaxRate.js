import { useState, useEffect } from 'react';
import { api } from '@/api/client';

/**
 * Custom hook to fetch the active PPN (Value Added Tax) rate from the database.
 * This is the single source of truth for PPN across all modules.
 * 
 * @param {string} storeId - The current store ID
 * @returns {{ ppnRate: number, ppnLabel: string, ppnDecimal: number, isLoading: boolean }}
 */
export function useTaxRate(storeId) {
  const [ppnRate, setPpnRate] = useState(11); // Default fallback
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!storeId) {
      setIsLoading(false);
      return;
    }

    const fetchTaxRate = async () => {
      try {
        const rates = await api.entities.TaxRate.filter({ 
          store_id: storeId, 
          status: 'active',
          type: 'Value Added Tax'
        });

        if (rates && rates.length > 0) {
          // Use the first active VAT rate found
          setPpnRate(Number(rates[0].rate) || 11);
        }
      } catch (err) {
        console.error('[Tradixa] Failed to fetch tax rate:', err);
        // Keep default 11% on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchTaxRate();
  }, [storeId]);

  return {
    ppnRate,                             // e.g. 12
    ppnLabel: `PPN ${ppnRate}%`,         // e.g. "PPN 12%"
    ppnDecimal: ppnRate / 100,           // e.g. 0.12
    isLoading
  };
}
