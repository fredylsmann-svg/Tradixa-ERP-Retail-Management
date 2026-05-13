import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Building2,
  MapPin,
  Signature as SignatureIcon,
  CheckCircle2,
  Loader2,
  FileSearch,
  ArrowLeft,
  Package,
  ShieldCheck,
  AlertCircle,
  Truck,
  UserCircle,
  Warehouse,
  Search,
  Download,
  FileText,
  Plus,
  RefreshCw,
  Eye,
  X,
  ChevronLeft,
  Boxes,
  Info,
  Barcode
} from 'lucide-react';
import SignaturePad from '@/components/ui/SignaturePad';
import PageDatePicker from '@/components/layout/PageDatePicker';
import ExportToolbar from '@/components/layout/ExportToolbar';
import PageHeader from '@/components/layout/PageHeader';
import { useGlobalDate, matchesDate } from '@/contexts/DateContext';
import moment from 'moment';
import 'moment/locale/id';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { getEffectiveLimits } from '@/planConfig';

// Info Tooltip component
const InfoTip = ({ text }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span role="button" tabIndex={0} onClick={() => setOpen(!open)}
          className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-colors shrink-0 ml-1.5 cursor-pointer">
          <Info className="w-2.5 h-2.5 pointer-events-none" />
        </span>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className="bg-slate-900 text-white text-[11px] font-medium leading-relaxed p-3 rounded-xl shadow-xl w-60 border-slate-800 z-[9999]"
      >
        {text}
      </PopoverContent>
    </Popover>
  );
};

export default function InventoryGRN({ store }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryParams = new URLSearchParams(location.search);
  const initialGrnId = queryParams.get('grn_id');

  const [view, setView] = useState(initialGrnId ? 'create' : 'list');
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { selectedDate } = useGlobalDate();

  // Create Section States
  const [procurementGrns, setProcurementGrns] = useState([]);
  const [selectedGrn, setSelectedGrn] = useState(null);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [signatureHistory, setSignatureHistory] = useState([]);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [currentBatchItemIdx, setCurrentBatchItemIdx] = useState(null);
  const [showSerialDialog, setShowSerialDialog] = useState(false);
  const [currentSerialItemIdx, setCurrentSerialItemIdx] = useState(null);

  const [form, setForm] = useState({
    storage_location: '',
    warehouse_name: '',
    surat_jalan: '',
    notes: '',
    received_by: store?.owner_name || 'Administrator',
    approved_by: 'Kepala Gudang / Manager',
    shipped_by: ''
  });

  const [signatures, setSignatures] = useState({
    shipped: null,
    received: null,
    approved: null
  });

  const [activeSignPad, setActiveSignPad] = useState(null);

  const [locations, setLocations] = useState([]);
  const [isManualLocation, setIsManualLocation] = useState(false);

  useEffect(() => {
    if (store?.id) {
      loadHistory();
      loadProcurementGrns();
      loadLocations();

      const saved = localStorage.getItem(`signatures_${store.id}_manager`);
      if (saved) setSignatureHistory(JSON.parse(saved));
    }
  }, [store]);

  const loadLocations = async () => {
    try {
      const data = await api.entities.ProductLocation.filter({ store_id: store.id });
      setLocations(data);
    } catch (err) {
      console.error("Failed to load locations", err);
    }
  };

  useEffect(() => {
    if (initialGrnId && procurementGrns.length > 0) {
      const found = procurementGrns.find(g => g.id === initialGrnId);
      if (found) {
        handleSelectGrn(found.id, procurementGrns);
        setView('create');
      }
    }
  }, [initialGrnId, procurementGrns]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await api.entities.InventoryGRN.filter({ store_id: store.id });
      setHistory(data.sort((a, b) => new Date(b.timestamp_wib.split(' ')[0].split('/').reverse().join('-')) - new Date(a.timestamp_wib.split(' ')[0].split('/').reverse().join('-'))));
    } catch (err) {
      console.error("Failed to load history", err);
    }
    setIsLoading(false);
  };

  const loadProcurementGrns = async () => {
    try {
      const grns = await api.entities.GoodsReceipt.filter({
        store_id: store.id,
        status: 'Terverifikasi'
      });
      setProcurementGrns(grns);
    } catch (err) {
      console.error("Failed to load procurement GRNs", err);
    }
  };

  const handleSelectGrn = async (id, grnList = procurementGrns) => {
    const grn = grnList.find(g => g.id === id);
    setSelectedGrn(grn);
    if (grn) {
      let productDetails = [];
      try {
        // Fetch ALL store products to ensure we have tracking rules for any item in the GRN
        productDetails = await api.entities.Product.filter({ store_id: store.id });
      } catch (e) {
        console.error("Failed to fetch products for tracking rules", e);
      }

      setItems((grn.items || []).map(item => {
        // Find product with fallback: match by product_id OR by SKU OR by Name
        const prod = productDetails.find(p => 
          p.id === item.product_id || 
          (item.sku && p.sku === item.sku) ||
          (p.name && item.product_name && p.name.toLowerCase() === item.product_name.toLowerCase())
        ) || {};

        const isBatchTracked = (prod.tracking_type || 'None') === 'Batch';
        const isSerialTracked = (prod.tracking_type || 'None') === 'Serial';
        const warehouseQty = item.received_qty || 0;

        // Auto-generate batch untuk produk batch-tracked (seperti real ERP)
        let autoBatches = [];
        if (isBatchTracked && warehouseQty > 0) {
          let defaultExpiry = '';
          if (prod.track_expiry && prod.default_shelf_life) {
            defaultExpiry = moment().add(prod.default_shelf_life, 'days').format('YYYY-MM-DD');
          }
          autoBatches = [{
            batch_number: `BCH-${moment().format('YYMM')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
            manufacture_date: moment().format('YYYY-MM-DD'),
            expiry_date: defaultExpiry,
            quantity: warehouseQty
          }];
        }

        // Initialize empty serials for Serial tracked products
        let initialSerials = [];
        if (isSerialTracked && warehouseQty > 0) {
          initialSerials = Array(warehouseQty).fill({ serial_number: '' });
        }

        return {
          ...item,
          sku: item.sku || prod.sku || '',
          warehouse_qty: warehouseQty,
          reject_qty: 0,
          condition: 'Baik',
          unit: item.unit || prod.unit || 'pcs',
          tracking_type: prod.tracking_type || 'None',
          track_expiry: prod.track_expiry || false,
          default_shelf_life: prod.default_shelf_life || 365,
          batches: autoBatches,
          serials: initialSerials
        };
      }));
      setForm(prev => ({
        ...prev,
        surat_jalan: grn.surat_jalan || '',
        shipped_by: grn.driver_name || grn.supplier_name || '',
        received_by: grn.admin_name || store?.owner_name || 'Administrator'
      }));
      setSignatures(prev => ({
        ...prev,
        received: grn.admin_signature || null,
        shipped: grn.driver_signature || null
      }));
    }
  };

  const updateItem = (productId, field, value) => {
    setItems(items.map(it => {
      if (it.product_id !== productId) return it;
      const updated = { ...it, [field]: value };
      // Auto-adjust: warehouse_qty = received_qty - reject_qty when reject changes
      if (field === 'reject_qty') {
        const rejectVal = Number(value) || 0;
        updated.warehouse_qty = Math.max(0, (it.received_qty || it.quantity || 0) - rejectVal);
      }

      // Auto-adjust batch quantities if overall quantity changes
      if ((field === 'reject_qty' || field === 'warehouse_qty') && updated.tracking_type === 'Batch' && updated.batches?.length > 0) {
        const totalBatchQty = updated.batches.reduce((sum, b) => sum + Number(b.quantity), 0);
        if (totalBatchQty > updated.warehouse_qty) {
          updated.batches = []; // Reset batches if they exceed new quantity
        }
      }

      // Auto-adjust serials array length
      if ((field === 'reject_qty' || field === 'warehouse_qty') && updated.tracking_type === 'Serial') {
        const currentLen = (updated.serials || []).length;
        if (currentLen > updated.warehouse_qty) {
          updated.serials = updated.serials.slice(0, updated.warehouse_qty);
        } else if (currentLen < updated.warehouse_qty) {
          updated.serials = [
            ...(updated.serials || []),
            ...Array(updated.warehouse_qty - currentLen).fill({ serial_number: '' })
          ];
        }
      }

      return updated;
    }));
  };

  const addBatchRow = () => {
    if (currentBatchItemIdx === null) return;
    const item = items[currentBatchItemIdx];
    const totalCurrent = (item.batches || []).reduce((s, b) => s + Number(b.quantity), 0);
    const remaining = Math.max(0, item.warehouse_qty - totalCurrent);

    let defaultExpiry = '';
    if (item.track_expiry && item.default_shelf_life) {
      defaultExpiry = moment().add(item.default_shelf_life, 'days').format('YYYY-MM-DD');
    }

    const newBatches = [...(item.batches || []), {
      batch_number: `BCH-${moment().format('YYMM')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      manufacture_date: moment().format('YYYY-MM-DD'),
      expiry_date: defaultExpiry,
      quantity: remaining
    }];

    const newItems = [...items];
    newItems[currentBatchItemIdx].batches = newBatches;
    setItems(newItems);
  };

  const removeBatchRow = (batchIdx) => {
    const newItems = [...items];
    newItems[currentBatchItemIdx].batches = newItems[currentBatchItemIdx].batches.filter((_, i) => i !== batchIdx);
    setItems(newItems);
  };

  const updateBatchField = (batchIdx, field, value) => {
    setItems(prevItems => {
      const newItems = [...prevItems];
      const newItem = { ...newItems[currentBatchItemIdx] };
      const newBatches = [...newItem.batches];
      newBatches[batchIdx] = {
        ...newBatches[batchIdx],
        [field]: value
      };

      // Auto calculate expiry if manufacture_date changes and shelf_life exists
      if (field === 'manufacture_date' && newItem.track_expiry && newItem.default_shelf_life) {
        newBatches[batchIdx].expiry_date = moment(value).add(newItem.default_shelf_life, 'days').format('YYYY-MM-DD');
      }

      newItem.batches = newBatches;
      newItems[currentBatchItemIdx] = newItem;
      return newItems;
    });
  };

  const updateSerialField = (serialIdx, value) => {
    setItems(prevItems => {
      const newItems = [...prevItems];
      const newItem = { ...newItems[currentSerialItemIdx] };
      const newSerials = [...newItem.serials];
      newSerials[serialIdx] = {
        ...newSerials[serialIdx],
        serial_number: value
      };
      newItem.serials = newSerials;
      newItems[currentSerialItemIdx] = newItem;
      return newItems;
    });
  };

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID').format(val);

  const getWIBTimestamp = () => {
    const now = new Date();
    const wibOffset = 7 * 60;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibTime = new Date(utc + (wibOffset * 60000));
    return `${String(wibTime.getDate()).padStart(2, '0')}/${String(wibTime.getMonth() + 1).padStart(2, '0')}/${wibTime.getFullYear()} ${String(wibTime.getHours()).padStart(2, '0')}:${String(wibTime.getMinutes()).padStart(2, '0')} WIB`;
  };

  const handleSubmit = async () => {
    if (!selectedGrn || isSaving) return;

    // --- PROCUREMENT LIMIT CHECK ---
    const limits = getEffectiveLimits(store);
    if (limits.maxInventoryGRN !== Infinity && history.length >= limits.maxInventoryGRN) {
      toast({
        title: "Batas Inventory GRN Tercapai",
        description: `Batas Inventory GRN tercapai (${limits.maxInventoryGRN} data). Upgrade ke Pro Plan untuk akses tanpa batas.`,
        variant: "destructive"
      });
      return;
    }
    // --------------------------------

    if (!signatures.shipped || !signatures.received || !signatures.approved) {
      toast({
        title: "Tanda Tangan Diperlukan",
        description: "Semua tanda tangan (Dikirim, Diterima, Disetujui) diperlukan!",
        variant: "destructive"
      });
      return;
    }

    // Validation for Batches
    const batchTrackedItems = items.filter(i => i.tracking_type === 'Batch' && i.warehouse_qty > 0);
    const missingBatches = batchTrackedItems.find(i => {
      const totalBatchQty = (i.batches || []).reduce((s, b) => s + Number(b.quantity), 0);
      return totalBatchQty !== i.warehouse_qty;
    });

    if (missingBatches) {
      toast({
        title: "Batch Belum Lengkap",
        description: `Produk "${missingBatches.product_name}" memerlukan alokasi batch sejumlah Diterima ke Gudang (${missingBatches.warehouse_qty}).`,
        variant: "destructive"
      });
      return;
    }

    // Validation for Serials
    const serialTrackedItems = items.filter(i => i.tracking_type === 'Serial' && i.warehouse_qty > 0);
    const missingSerials = serialTrackedItems.find(i => {
      const validSerials = (i.serials || []).filter(s => s.serial_number && s.serial_number.trim() !== '');
      return validSerials.length !== i.warehouse_qty;
    });

    if (missingSerials) {
      toast({
        title: "Nomor Seri Belum Lengkap",
        description: `Produk "${missingSerials.product_name}" memerlukan input ${missingSerials.warehouse_qty} Nomor Seri spesifik.`,
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const igrnNumber = `IGRN-${moment().format('YYYYMMDD')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const totalAmount = items.reduce((sum, it) => sum + (Number(it.warehouse_qty || 0) * (it.unit_price || it.price || 0)), 0);

      // --- NEW: AUTO-CREATE RACK IN LOCATION SETTINGS ---
      if (isManualLocation && form.storage_location) {
        try {
          const existing = (locations || []).find(l => l.name?.toLowerCase() === form.storage_location.toLowerCase());
          if (!existing) {
            await api.entities.ProductLocation.create({
              store_id: store.id,
              name: form.storage_location,
              type: 'rack',
              description: `Otomatis ditambahkan dari ${igrnNumber}`,
              reference: igrnNumber
            });
            toast({
              title: "Rak Baru Ditambahkan",
              description: `Rak "${form.storage_location}" telah otomatis didaftarkan di Location Settings.`,
              variant: "success"
            });
          }
        } catch (err) {
          console.error("Failed to auto-create rack", err);
          toast({
            title: "Gagal Sinkronisasi Rak",
            description: `Rak gagal ditambahkan otomatis ke Settings. Pastikan database sudah terupdate.`,
            variant: "destructive"
          });
        }
      }
      // --------------------------------------------------

      const igrnRecord = await api.entities.InventoryGRN.create({
        store_id: store.id,
        igrn_number: igrnNumber,
        journal_id: `JV-${moment().format('YYYYMMDD')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        procurement_grn_id: selectedGrn.id,
        procurement_grn_number: selectedGrn.gr_number,
        po_id: selectedGrn.po_id,
        po_number: selectedGrn.po_number,
        supplier_name: selectedGrn.supplier_name,
        surat_jalan: form.surat_jalan,
        items,
        total_amount: totalAmount,
        storage_location: form.storage_location,
        warehouse_name: form.warehouse_name,
        notes: form.notes,
        signatures,
        status: 'Posted',
        timestamp_wib: getWIBTimestamp()
      });

      // --- ACCOUNT PAYABLE INTEGRATION ---
      // Automatically record debt to supplier
      await api.entities.Payable.create({
        store_id: store.id,
        invoice_number: `INV-PAY-${igrnNumber.replace('IGRN-', '')}`,
        supplier_id: selectedGrn.supplier_id || '',
        supplier_name: selectedGrn.supplier_name,
        amount: totalAmount,
        remaining_amount: totalAmount,
        due_date: moment().add(7, 'days').format('YYYY-MM-DD'),
        notes: `Hutang otomatis dari penerimaan gudang ${igrnNumber}`,
        status: 'Pending',
        timestamp_wib: getWIBTimestamp()
      });
      // ------------------------------------

      // --- JOURNAL ENTRY INTEGRATION (GRN) ---
      const grnJournal = await api.entities.JournalEntry.create({
        store_id: store.id,
        transaction_id: `GRN-${igrnNumber}`,
        date: new Date().toISOString(),
        description: `Penerimaan Barang - ${selectedGrn.supplier_name} (${igrnNumber})`,
        type: 'GRN',
        status: 'Draft',
        total_debit: totalAmount,
        total_credit: totalAmount,
        created_by: 'Administrator'
      });

      await Promise.all([
        api.entities.JournalLine.create({
          journal_id: grnJournal.id,
          account_name: 'Persediaan Barang Dagang',
          description: `Penerimaan stok dari ${selectedGrn.supplier_name}`,
          debit: totalAmount,
          credit: 0
        }),
        api.entities.JournalLine.create({
          journal_id: grnJournal.id,
          account_name: 'Hutang Usaha',
          description: `Hutang otomatis - ${selectedGrn.supplier_name} (${igrnNumber})`,
          debit: 0,
          credit: totalAmount
        })
      ]);
      // ----------------------------------------


      await api.entities.GoodsReceipt.update(selectedGrn.id, {
        status: 'Posted',
        inventory_grn_number: igrnNumber
      });

      for (let item of items) {
        if (item.warehouse_qty > 0) {
          let productId = item.product_id;

          // --- AUTO-CREATE PRODUCT IF MISSING ---
          if (!productId || productId === 'undefined' || productId === '') {
            try {
              const newProduct = await api.entities.Product.create({
                store_id: store.id,
                name: item.product_name || item.description || 'Produk Baru (Auto-Gen)',
                unit: item.unit || 'pcs',
                buy_price: Number(item.unit_price || item.price || 0),
                sell_price: Math.round(Number(item.unit_price || item.price || 0) * 1.2), // Default margin 20%
                stock: 0,
                status: 'In Stock',
                category: item.category || 'Uncategorized',
                sku: item.sku || `SKU-AUTO-${Date.now().toString().slice(-6)}`,
                created_at: new Date().toISOString()
              });
              productId = newProduct.id;
              item.product_id = productId;
              item.product_name = newProduct.name;
            } catch (err) {
              console.error("Auto-creation failed for item", item.product_name, err);
              continue; // Skip if creation failed
            }
          }
          // ---------------------------------------

          const prods = await api.entities.Product.filter({ id: productId });
          if (prods.length > 0) {
            const product = prods[0];
            const newStock = (product.stock || 0) + Number(item.warehouse_qty);
            const status = newStock <= 0 ? 'Out of Stock' : newStock <= (product.reorder_level || 0) ? 'Low Stock' : 'In Stock';
            await api.entities.Product.update(productId, {
              stock: newStock,
              status,
              sku: item.sku || product.sku,
              location_name: form.storage_location,
              warehouse_name: form.warehouse_name,
              expired_date: item.expired_date || product.expired_date
            });
          }

          // --- BATCH MANAGEMENT INTEGRATION ---
          if (item.tracking_type === 'Batch' && item.batches?.length > 0) {
            for (let b of item.batches) {
              const batchData = await api.entities.InventoryBatch.create({
                store_id: store.id,
                product_id: productId,
                product_name: item.product_name || item.description,
                grn_number: igrnNumber,
                batch_number: b.batch_number,
                manufacture_date: b.manufacture_date || null,
                expiry_date: b.expiry_date || null,
                supplier_id: selectedGrn.supplier_id || null,
                po_id: selectedGrn.po_id || null,
                procurement_grn_id: selectedGrn.id,
                inventory_grn_id: igrnRecord?.id || null,
                unit_cost: Number(item.unit_price || item.price || 0),
                qty_received: Number(b.quantity),
                qty_on_hand: Number(b.quantity),
                status: 'Available'
              });

              // Add StockMovement with batch attributes
              await api.entities.StockMovement.create({
                store_id: store.id,
                reference: igrnNumber,
                product_id: productId,
                product_name: item.product_name || item.description,
                movement_type: 'in',
                stock_type: 'IGRN',
                quantity: Number(b.quantity),
                batch_id: batchData.id,
                batch_number: b.batch_number,
                expiry_date: b.expiry_date || null,
                manufacture_date: b.manufacture_date || null,
                timestamp_wib: getWIBTimestamp()
              });
            }
          } else if (item.tracking_type === 'Serial' && item.serials?.length > 0) {
            // --- SERIAL MANAGEMENT INTEGRATION ---
            
            // 1. Check for duplicates within the current input
            const serialNumbers = item.serials.map(s => s.serial_number?.trim()).filter(Boolean);
            const uniqueSerials = new Set(serialNumbers);
            if (uniqueSerials.size !== serialNumbers.length) {
              throw new Error(`Terdapat duplikat serial number pada input untuk produk ${item.product_name || item.description}. Silakan periksa kembali.`);
            }

            for (let s of item.serials) {
              if (!s.serial_number?.trim()) continue; // Skip empty serials

              try {
                await api.entities.InventorySerial.create({
                store_id: store.id,
                product_id: productId,
                serial_number: s.serial_number,
                status: 'Available',
                supplier_id: selectedGrn.supplier_id || null,
                po_id: selectedGrn.po_id || null,
                inventory_grn_id: igrnRecord?.id || null,
                unit_cost: Number(item.unit_price || item.price || 0)
              });

              // Each serial gets its own StockMovement row
              await api.entities.StockMovement.create({
                store_id: store.id,
                reference: igrnNumber,
                product_id: productId,
                product_name: item.product_name || item.description,
                movement_type: 'in',
                stock_type: 'IGRN',
                quantity: 1,
                notes: `SN: ${s.serial_number}`,
                timestamp_wib: getWIBTimestamp()
              });
              } catch (err) {
                if (err.message?.includes('duplicate key')) {
                  throw new Error(`Serial Number "${s.serial_number}" untuk produk ${item.product_name || item.description} sudah terdaftar di sistem Tradixa.`);
                }
                throw err;
              }
            }
          } else {
            // Add StockMovement without batch/serial
            await api.entities.StockMovement.create({
              store_id: store.id,
              reference: igrnNumber,
              product_id: productId,
              product_name: item.product_name || item.description,
              movement_type: 'in',
              stock_type: 'IGRN',
              quantity: Number(item.warehouse_qty),
              expiry_date: item.expired_date || null,
              timestamp_wib: getWIBTimestamp()
            });
          }
        }
      }

      const activeGrns = await api.entities.GoodsReceipt.filter({ po_id: selectedGrn.po_id, status: 'Posted' });
      const poList = await api.entities.PurchaseOrder.filter({ id: selectedGrn.po_id });
      if (poList.length > 0) {
        const po = poList[0];
        let allReceived = true;
        const updatedItems = po.items.map(poItem => {
          const totalReceived = activeGrns.reduce((sum, g) => {
            const itemMatch = g.items?.find(i => i.product_id === poItem.product_id || (i.sku && i.sku === poItem.sku));
            return sum + (itemMatch?.received_qty || 0);
          }, 0);
          if (totalReceived < poItem.quantity) allReceived = false;
          return { ...poItem, received_qty: totalReceived };
        });

        await api.entities.PurchaseOrder.update(po.id, {
          status: allReceived ? 'Fully Received' : 'Partial Received',
          items: updatedItems
        });
      }

      // Save to history
      const newHistoryItem = { signature: signatures.approved, name: form.approved_by, role: 'Kepala Gudang / Manager' };
      const updatedSignatureHistory = [
        newHistoryItem,
        ...signatureHistory.filter(h => h.signature !== signatures.approved)
      ].slice(0, 5);

      setSignatureHistory(updatedSignatureHistory);
      localStorage.setItem(`signatures_${store.id}_manager`, JSON.stringify(updatedSignatureHistory));

      localStorage.setItem(`last_manager_signature_${store.id}`, signatures.approved);
      localStorage.setItem(`last_manager_name_${store.id}`, form.approved_by);

      toast({
        title: "Berhasil!",
        description: "Inventory GRN Berhasil di Post ke Ledger.",
        variant: "success"
      });
      loadHistory();
      setView('list');
      setSelectedGrn(null);
      setItems([]);
      setForm({
        storage_location: '',
        warehouse_name: '',
        surat_jalan: '',
        notes: '',
        received_by: 'Administrator',
        approved_by: 'Kepala Gudang / Manager',
        shipped_by: ''
      });
      setSignatures({ shipped: null, received: null, approved: null });
      setIsManualLocation(false);
    } catch (err) {
      console.error("Failed to submit Inventory GRN", err);
      toast({
        title: "Gagal Menyimpan GRN",
        description: err.message || "Terjadi kesalahan internal saat menyimpan GRN.",
        variant: "destructive"
      });
    }
    setIsSaving(false);
  };

  const filteredHistory = history.filter(h => {
    const isDateMatch = matchesDate(h, selectedDate);
    const isSearchMatch = h.igrn_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return isDateMatch && isSearchMatch;
  });

  if (isLoading && view === 'list' && history.length === 0) {
    return <div className="p-10 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-slate-300" /></div>;
  }

  // LIST VIEW
  if (view === 'list') {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <PageHeader
          title="Inventory GRN"
          subtitle="Goods Receipt Note untuk penerimaan barang"
          icon={Warehouse}
          actions={
            <div className="flex items-center gap-2">
              <ExportToolbar
                title="Inventory GRN"
                date={moment().format('DD/MM/YYYY')}
                storeName={store?.store_name}
                contentId="print-igrn-history"
              />
              <Button
                onClick={() => setView('create')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-6 flex items-center gap-2 transition-all active:scale-95 rounded-xl"
              >
                <Plus className="w-4 h-4" />
                Terima Barang
              </Button>
            </div>
          }
        />

        <PageDatePicker />

        {/* Standard Search Bar Layout */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Cari nomor GRN, PO, atau supplier..."
              className="pl-10 h-11 bg-white border-slate-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Card className="border shadow-sm overflow-hidden" id="print-igrn-history">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12 text-center">No.</TableHead>
                <TableHead>No. GRN</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>No. PO</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Journal</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-300 gap-2">
                      <Warehouse className="w-12 h-12 opacity-20" />
                      <p className="font-medium">Belum ada data Inventory GRN</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredHistory.map((h, i) => (
                  <TableRow key={h.id} className="group hover:bg-slate-50/50 transition-colors">
                    <TableCell className="text-center font-bold text-slate-400 pl-6">{i + 1}</TableCell>
                    <TableCell className="font-bold text-slate-800">{h.igrn_number}</TableCell>
                    <TableCell className="text-slate-500 font-medium whitespace-nowrap">{h.timestamp_wib.split(' ')[0]}</TableCell>
                    <TableCell className="font-bold text-slate-700">{h.po_number}</TableCell>
                    <TableCell className="font-bold text-slate-700">{h.supplier_name}</TableCell>
                    <TableCell className="text-center font-medium text-slate-500">{h.items?.length || 0} item</TableCell>
                    <TableCell className="text-right font-black text-slate-700">Rp {formatCurrency(h.total_amount)}</TableCell>
                    <TableCell className="text-center font-mono text-[10px] text-slate-500 font-bold">{h.journal_id || '-'}</TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-50 border-none font-black px-3 py-1 rounded-lg">
                        {h.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center pr-6">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl border border-slate-100 bg-white shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-all"
                        onClick={() => navigate(`/InventoryGRNDetail?id=${h.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    );
  }

  // CREATE VIEW (Gambar 2 style)
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 pb-32 overflow-x-auto">
      <div className="min-w-[1000px]">
        <PageHeader
          title="Terima Barang (Inventory GRN)"
          subtitle="Penerimaan ke gudang dari Procurement GRN"
          icon={Warehouse}
          actions={
            <Button variant="ghost" size="icon" onClick={() => setView('list')} className="rounded-full bg-white border shadow-sm h-11 w-11">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="rounded-3xl border shadow-sm overflow-hidden border-slate-200">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Label className="text-base font-black text-slate-900 underline decoration-slate-300">Pilih Procurement GRN</Label>
                  <p className="text-xs text-slate-500 mb-2 font-medium italic">Pilih berkas GRN dari supplier yang sudah diverifikasi</p>
                  <Select value={selectedGrn?.id || ""} onValueChange={handleSelectGrn}>
                    <SelectTrigger className="h-12 border-slate-200 bg-white">
                      <SelectValue placeholder="Pilih Procurement GRN..." />
                    </SelectTrigger>
                    <SelectContent>
                      {procurementGrns.map(g => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.gr_number} (PO: {g.po_number}) - {g.supplier_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {selectedGrn && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="rounded-3xl border shadow-sm overflow-hidden border-slate-200">
                  <CardHeader className="border-b p-6 bg-slate-50/30">
                    <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Package className="w-5 h-5 text-slate-600" /> Detail Barang Diterima
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table className="min-w-[850px]">
                        <TableHeader className="bg-white border-b">
                          <TableRow>
                            <TableHead className="pl-6">Nama Barang / Deskripsi</TableHead>
                            <TableHead className="w-[160px] text-center">Batch/Serial Entry</TableHead>
                            <TableHead className="w-[140px] text-center">Expired Date</TableHead>
                            <TableHead className="w-[140px] text-center">Masuk Gudang</TableHead>
                            <TableHead className="w-[120px] text-center">Reject</TableHead>
                            <TableHead className="w-[140px] pr-6">Kondisi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item) => (
                            <TableRow key={item.product_id} className="hover:bg-slate-50/50">
                              <TableCell className="pl-6 py-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-slate-900">{item.product_name}</p>
                                    {item.tracking_type === 'Batch' && (
                                      <Badge className="bg-blue-50 text-blue-600 border-blue-200 text-[8px] font-black uppercase tracking-wider h-4 px-1 rounded-sm whitespace-nowrap">Batch Tracked</Badge>
                                    )}
                                    {item.tracking_type === 'Serial' && (
                                      <Badge className="bg-purple-50 text-purple-600 border-purple-200 text-[8px] font-black uppercase tracking-wider h-4 px-1 rounded-sm whitespace-nowrap">Serial Tracked</Badge>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium">
                                    <span className="text-blue-600 font-black bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                      {item.sku?.toLowerCase().startsWith('sku') ? item.sku.toUpperCase() : `SKU: ${item.sku || '-'}`}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-slate-400 uppercase tracking-tight">
                                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                      <span>Draft GRN: {item.received_qty} {item.unit}</span>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            <TableCell className="text-center">
                              {item.tracking_type === 'Batch' ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => { setCurrentBatchItemIdx(items.findIndex(i => i.product_id === item.product_id)); setShowBatchDialog(true); }}
                                  className={`h-8 w-full text-[10px] font-black uppercase tracking-tighter shadow-sm transition-all ${item.batches?.length > 0 ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' : 'text-blue-700 bg-blue-50/50 hover:bg-blue-100 border-blue-200'}`}
                                >
                                  <Boxes className="w-3 h-3 mr-1" />
                                  {item.batches?.length > 0 ? `${item.batches.reduce((s, b) => s + Number(b.quantity), 0)} PCS` : 'Manage'}
                                </Button>
                              ) : item.tracking_type === 'Serial' ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => { setCurrentSerialItemIdx(items.findIndex(i => i.product_id === item.product_id)); setShowSerialDialog(true); }}
                                  className={`h-8 w-full text-[10px] font-black uppercase tracking-tighter shadow-sm transition-all ${item.serials?.filter(s => s.serial_number).length === item.warehouse_qty && item.warehouse_qty > 0 ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700' : 'text-purple-700 bg-purple-50/50 hover:bg-purple-100 border-purple-200'}`}
                                >
                                  <Barcode className="w-3 h-3 mr-1" />
                                  {item.serials?.filter(s => s.serial_number).length === item.warehouse_qty && item.warehouse_qty > 0 ? `${item.warehouse_qty} OK` : 'Scan SN'}
                                </Button>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Standard</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {item.tracking_type === 'Batch' ? (
                                <div className="space-y-1 py-1">
                                  {item.batches?.length > 0 ? (
                                    item.batches.map((b, bi) => (
                                      <div key={bi} className="text-[9px] font-black text-slate-600 bg-slate-100/50 border border-slate-200 rounded px-1.5 py-0.5 w-fit mx-auto">
                                        {b.expiry_date ? moment(b.expiry_date).format('DD/MM/YY') : 'No Exp'}
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-bold uppercase italic">Via Batch</span>
                                  )}
                                </div>
                              ) : item.tracking_type === 'Serial' ? (
                                <span className="text-[10px] text-slate-400 font-bold uppercase italic">No Expiry (Serial)</span>
                              ) : (
                                <Input
                                  type="date"
                                  className="h-10 text-[10px] font-bold bg-slate-50 border-slate-200 uppercase tracking-widest"
                                  value={item.expired_date || ''}
                                  onChange={(e) => updateItem(item.product_id, 'expired_date', e.target.value)}
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              <NumberInput
                                className="h-10 text-center font-black text-emerald-700 bg-emerald-50 border-emerald-100"
                                value={item.warehouse_qty}
                                onChange={(e) => updateItem(item.product_id, 'warehouse_qty', e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <NumberInput
                                className="h-10 text-center font-bold text-red-700 bg-red-50 border-red-100"
                                value={item.reject_qty}
                                onChange={(e) => updateItem(item.product_id, 'reject_qty', e.target.value)}
                              />
                            </TableCell>
                            <TableCell className="pr-6">
                              <Select value={item.condition} onValueChange={(v) => updateItem(item.product_id, 'condition', v)}>
                                <SelectTrigger className="h-10">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Baik">Baik</SelectItem>
                                  <SelectItem value="Rusak">Rusak</SelectItem>
                                  <SelectItem value="Cacat">Cacat (Diterima)</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
                </Card>

                {/* Triple Signature Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* 1. Shipped By (Driver/Supplier) - Read Only */}
                  <Card className="rounded-3xl border shadow-sm">
                    <CardHeader className="p-4 text-center border-b bg-slate-50/50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dikirim Oleh</p>
                      <p className="text-[10px] font-medium text-slate-500 mt-0.5">( Driver )</p>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      <div className="h-28 border-2 border-slate-50 rounded-2xl flex items-center justify-center bg-slate-50/50">
                        {signatures.shipped ? (
                          <img src={signatures.shipped} alt="Driver Sign" className="h-full object-contain dark:invert dark:brightness-150" />
                        ) : (
                          <span className="text-xs text-slate-400 font-medium italic">Tidak ada TTD digital</span>
                        )}
                      </div>
                      <p className="text-center h-10 leading-10 font-bold text-slate-700">{form.shipped_by || '-'}</p>
                    </CardContent>
                  </Card>

                  {/* 2. Received By (Admin) - Read Only */}
                  <Card className="rounded-3xl border shadow-sm">
                    <CardHeader className="p-4 text-center border-b bg-slate-50/50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Diterima Oleh</p>
                      <p className="text-[10px] font-medium text-slate-500 mt-0.5">( Administrator )</p>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      <div className="h-28 border-2 border-slate-50 rounded-2xl flex items-center justify-center bg-slate-50/50">
                        {signatures.received ? (
                          <img src={signatures.received} alt="Admin Sign" className="h-full object-contain dark:invert dark:brightness-150" />
                        ) : (
                          <span className="text-xs text-slate-400 font-medium italic">Tidak ada TTD digital</span>
                        )}
                      </div>
                      <p className="text-center h-10 leading-10 font-bold text-slate-700">{form.received_by || '-'}</p>
                    </CardContent>
                  </Card>

                  {/* 3. Approved By (Kepala Gudang) - Interactive */}
                  <Card className="rounded-3xl border shadow-sm ring-2 ring-blue-100 ring-offset-2">
                    <CardHeader className="p-4 text-center border-b bg-blue-50/30">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-left">
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Disetujui Oleh</p>
                          <p className="text-[10px] font-medium text-slate-500 mt-0.5">( Kepala Gudang / Manager )</p>
                        </div>
                        {signatureHistory.length > 0 && (
                          <div className="flex gap-1.5 overflow-x-auto max-w-[280px] py-1 px-1 scrollbar-thin scrollbar-thumb-slate-200">
                            {signatureHistory.map((h, i) => (
                              <button
                                key={i}
                                type="button"
                                title={`Gunakan TTD ${h.name}`}
                                className="w-10 h-10 rounded-lg border border-blue-100 bg-white p-1 hover:border-blue-400 transition-all flex-shrink-0 flex items-center justify-center overflow-hidden"
                                onClick={() => {
                                  setSignatures(prev => ({ ...prev, approved: h.signature }));
                                  setForm(prev => ({ ...prev, approved_by: h.name }));
                                }}
                              >
                                <img src={h.signature} alt="History Sign" className="max-h-full max-w-full object-contain grayscale dark:invert dark:brightness-150 hover:grayscale-0" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      <div
                        className="h-28 border-2 border-dashed border-blue-200 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors bg-white group"
                        onClick={() => setActiveSignPad('approved')}
                      >
                        {signatures.approved ? (
                          <img src={signatures.approved} alt="Manager Sign" className="h-full object-contain dark:invert dark:brightness-150" />
                        ) : (
                          <SignatureIcon className="w-8 h-8 text-blue-300 group-hover:text-blue-500 group-hover:scale-110 transition-all" />
                        )}
                      </div>
                      <Input
                        placeholder="Nama Kepala Gudang"
                        className="text-center h-10 border-slate-100 font-bold text-slate-700 focus:border-blue-300"
                        value={form.approved_by}
                        onChange={(e) => setForm({ ...form, approved_by: e.target.value })}
                      />
                    </CardContent>
                  </Card>
                </div>

                <Card className="rounded-3xl border shadow-sm">
                  <CardContent className="p-6 space-y-6">
                    <h3 className="text-base font-bold text-slate-800">Informasi Gudang</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label>Gudang / Toko</Label>
                        <div className="relative">
                          <Warehouse className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Select value={form.warehouse_name} onValueChange={(v) => setForm({ ...form, warehouse_name: v })}>
                            <SelectTrigger className="pl-10 h-12 border-slate-200 bg-white">
                              <SelectValue placeholder="Pilih Gudang" />
                            </SelectTrigger>
                            <SelectContent>
                              {locations.filter(l => l.type === 'store').map(loc => (
                                <SelectItem key={loc.id} value={loc.name}>{loc.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Rak Penyimpanan</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          {isManualLocation ? (
                            <div className="flex gap-2">
                              <Input placeholder="Rak penyimpanan" className="pl-10 h-12" value={form.storage_location} onChange={(e) => setForm({ ...form, storage_location: e.target.value })} />
                              <Button variant="ghost" onClick={() => setIsManualLocation(false)} className="shrink-0 text-xs font-bold">Batal</Button>
                            </div>
                          ) : (
                            <Select value={form.storage_location} onValueChange={(v) => { if (v === 'MANUAL') { setIsManualLocation(true); setForm({ ...form, storage_location: '' }); } else { setForm({ ...form, storage_location: v }); } }}>
                              <SelectTrigger className="pl-10 h-12 border-slate-200 bg-white">
                                <SelectValue placeholder="Rak penyimpanan" />
                              </SelectTrigger>
                              <SelectContent>
                                {locations.filter(l => l.type === 'rack' || !l.type).map(loc => (
                                  <SelectItem key={loc.id} value={loc.name}>{loc.name}</SelectItem>
                                ))}
                                <SelectItem value="MANUAL" className="font-bold text-blue-600 border-t mt-2">+ Input Manual</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>No. Surat Jalan</Label>
                        <div className="relative">
                          <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input value={form.surat_jalan} className="pl-10 h-12 bg-slate-50 font-bold" readOnly />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Catatan</Label>
                      <Textarea placeholder="Catatan tambahan..." rows={3} className="rounded-xl border-slate-200" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
            <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-[32px] bg-white border-none shadow-2xl flex flex-col max-h-[90vh]" aria-describedby="batch-dialog-desc">
              <p id="batch-dialog-desc" className="sr-only">Kelola nomor batch dan kadaluarsa produk</p>
              {currentBatchItemIdx !== null && items[currentBatchItemIdx] && (
                <>
                  <div className="bg-blue-600 p-8 text-white relative shrink-0">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold flex items-center gap-3">
                        <Boxes className="w-6 h-6" />
                        Manage Batches & Expiry
                      </DialogTitle>
                      <p className="text-blue-100 text-xs font-medium opacity-80 mt-1">
                        {items[currentBatchItemIdx].product_name} • Total Masuk Gudang: {items[currentBatchItemIdx].warehouse_qty} {items[currentBatchItemIdx].unit}
                      </p>
                    </DialogHeader>
                  </div>

                  <div className="p-8 space-y-6 flex-1 overflow-y-auto flex flex-col">
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex-1 overflow-y-auto">
                      <Table>
                        <TableHeader className="bg-white sticky top-0 z-10">
                          <TableRow>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest pl-6 flex items-center h-12">
                              Batch Number
                              <InfoTip text="Nomor identifikasi unik untuk setiap lot/batch barang. Digunakan untuk pelacakan jika terjadi recall atau audit kualitas." />
                            </TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest w-[160px] whitespace-nowrap">
                              <div className="flex items-center">
                                Mfg Date (Opt)
                                <InfoTip text="Tanggal barang diproduksi oleh supplier/pabrik. Field ini opsional, boleh dikosongkan." />
                              </div>
                            </TableHead>
                            {items[currentBatchItemIdx].track_expiry && (
                              <TableHead className="text-[10px] font-black uppercase tracking-widest w-[160px] whitespace-nowrap">
                                <div className="flex items-center">
                                  Expiry Date
                                  <InfoTip text="Tanggal kadaluarsa barang. Sangat penting untuk produk makanan/obat agar mengikuti metode FEFO." />
                                </div>
                              </TableHead>
                            )}
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-center w-24 whitespace-nowrap">
                              <div className="flex items-center justify-center">
                                Qty
                                <InfoTip text="Jumlah barang untuk nomor batch ini. Total qty batch harus sama dengan total barang masuk gudang." />
                              </div>
                            </TableHead>
                            <TableHead className="text-right pr-6 w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(!items[currentBatchItemIdx].batches || items[currentBatchItemIdx].batches.length === 0) ? (
                            <TableRow>
                              <TableCell colSpan={items[currentBatchItemIdx].track_expiry ? 5 : 4} className="text-center py-10 text-slate-400 italic text-sm">
                                Belum ada batch dialokasikan. Klik tombol tambah baris batch.
                              </TableCell>
                            </TableRow>
                          ) : (
                            items[currentBatchItemIdx].batches.map((batch, bIdx) => (
                              <TableRow key={bIdx} className="bg-white border-b border-slate-100">
                                <TableCell className="pl-6 py-4">
                                  <Input
                                    value={batch.batch_number}
                                    onChange={(e) => updateBatchField(bIdx, 'batch_number', e.target.value)}
                                    className="h-10 text-xs font-bold bg-slate-50 border-slate-200"
                                    placeholder="Nomor Batch"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="date"
                                    value={batch.manufacture_date}
                                    onChange={(e) => updateBatchField(bIdx, 'manufacture_date', e.target.value)}
                                    className="h-10 text-xs font-bold bg-slate-50 border-slate-200"
                                  />
                                </TableCell>
                                {items[currentBatchItemIdx].track_expiry && (
                                  <TableCell>
                                    <Input
                                      type="date"
                                      value={batch.expiry_date}
                                      onChange={(e) => updateBatchField(bIdx, 'expiry_date', e.target.value)}
                                      className="h-10 text-xs font-bold bg-slate-50 border-slate-200"
                                      required
                                    />
                                  </TableCell>
                                )}
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={batch.quantity}
                                    onChange={(e) => updateBatchField(bIdx, 'quantity', e.target.value)}
                                    className="h-10 text-center font-black text-blue-600 bg-blue-50 border-blue-100"
                                  />
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                  <Button variant="ghost" size="icon" onClick={() => removeBatchRow(bIdx)} className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8">
                                    <X className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex items-center justify-between shrink-0">
                      <div className="flex gap-4">
                        <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
                          <div className="flex items-center gap-1 mb-1">
                            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest leading-none">Alokasi Batch</p>
                            <InfoTip text="Total kuantitas semua batch harus sama dengan jumlah barang masuk gudang. Contoh: Jika terima 10 pcs, Anda bisa bagi menjadi Batch A (5 pcs) & Batch B (5 pcs). Tombol Save hanya aktif jika angka ini Match (Warna Hijau)." />
                          </div>
                          <p className={`text-lg font-black tracking-tighter ${items[currentBatchItemIdx].batches?.reduce((s, b) => s + Number(b.quantity), 0) !== items[currentBatchItemIdx].warehouse_qty ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {items[currentBatchItemIdx].batches?.reduce((s, b) => s + Number(b.quantity), 0) || 0} / {items[currentBatchItemIdx].warehouse_qty}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        onClick={addBatchRow}
                        className="h-12 px-6 rounded-xl border-blue-200 text-blue-700 font-bold hover:bg-blue-50 flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> 
                        <span>Tambah Baris Batch</span>
                        <InfoTip text="Gunakan fitur ini jika satu barang yang datang memiliki nomor batch atau tanggal kadaluarsa yang berbeda-beda." />
                      </Button>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t shrink-0">
                      <Button
                        className="h-12 px-8 rounded-2xl bg-slate-900 text-white hover:bg-black dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white font-black uppercase tracking-widest text-[10px] transition-colors"
                        onClick={() => setShowBatchDialog(false)}
                        disabled={items[currentBatchItemIdx].batches?.reduce((s, b) => s + Number(b.quantity), 0) !== items[currentBatchItemIdx].warehouse_qty}
                      >
                        Save & Close
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={showSerialDialog} onOpenChange={setShowSerialDialog}>
            <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-[32px] bg-white border-none shadow-2xl flex flex-col max-h-[90vh]" aria-describedby="serial-dialog-desc">
              <p id="serial-dialog-desc" className="sr-only">Kelola nomor seri produk (IMEI/SN)</p>
              {currentSerialItemIdx !== null && items[currentSerialItemIdx] && (
                <>
                  <div className="bg-purple-600 p-8 text-white relative shrink-0">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold flex items-center gap-3">
                        <Barcode className="w-6 h-6" />
                        Pindai Nomor Seri (IMEI/SN)
                      </DialogTitle>
                      <p className="text-purple-100 text-xs font-medium opacity-80 mt-1">
                        {items[currentSerialItemIdx].product_name} • Total Wajib Scan: {items[currentSerialItemIdx].warehouse_qty} Unit
                      </p>
                    </DialogHeader>
                  </div>

                  <div className="p-8 space-y-6 flex-1 overflow-y-auto flex flex-col">
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex-1 overflow-y-auto">
                      <Table>
                        <TableHeader className="bg-white sticky top-0 z-10">
                          <TableRow>
                            <TableHead className="w-16 text-center">No.</TableHead>
                            <TableHead className="text-xs font-black uppercase tracking-widest pl-4">Nomor Seri / IMEI</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(!items[currentSerialItemIdx].serials || items[currentSerialItemIdx].serials.length === 0) ? (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center py-10 text-slate-400 italic text-sm">
                                Kuantitas masuk gudang 0. Tidak perlu scan serial.
                              </TableCell>
                            </TableRow>
                          ) : (
                            items[currentSerialItemIdx].serials.map((serial, sIdx) => (
                              <TableRow key={sIdx} className="bg-white border-b border-slate-100">
                                <TableCell className="text-center font-bold text-slate-400">{sIdx + 1}</TableCell>
                                <TableCell className="pl-4 py-3">
                                  <Input
                                    value={serial.serial_number}
                                    onChange={(e) => updateSerialField(sIdx, e.target.value)}
                                    className="h-12 text-sm font-bold bg-slate-50 border-slate-200"
                                    placeholder="Arahkan kursor kesini, lalu Scan Barcode..."
                                    autoFocus={sIdx === 0} // Auto-focus on first empty row if possible
                                  />
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex items-center justify-between shrink-0">
                      <div className="flex gap-4">
                        <div className="bg-purple-50 px-4 py-2 rounded-xl border border-purple-100">
                          <p className="text-[9px] font-black text-purple-500 uppercase tracking-widest mb-1">Status Pindai</p>
                          <p className={`text-lg font-black tracking-tighter ${items[currentSerialItemIdx].serials?.filter(s => s.serial_number && s.serial_number.trim() !== '').length !== items[currentSerialItemIdx].warehouse_qty ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {items[currentSerialItemIdx].serials?.filter(s => s.serial_number && s.serial_number.trim() !== '').length || 0} / {items[currentSerialItemIdx].warehouse_qty}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t shrink-0">
                      <Button
                        className="h-12 px-8 rounded-2xl bg-slate-900 text-white hover:bg-black dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white font-black uppercase tracking-widest text-[10px] transition-colors"
                        onClick={() => setShowSerialDialog(false)}
                        disabled={items[currentSerialItemIdx].serials?.filter(s => s.serial_number && s.serial_number.trim() !== '').length !== items[currentSerialItemIdx].warehouse_qty}
                      >
                        Save & Close
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>

          <div className="space-y-6">
            <Card className="rounded-3xl border-none shadow-2xl sticky top-8">
              <CardHeader className="bg-white p-6 border-b">
                <CardTitle className="text-lg font-bold text-slate-800">Ringkasan</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-8 bg-white">
                {selectedGrn ? (
                  <>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-widest">Supplier</span>
                        <span className="font-bold text-slate-700">{selectedGrn.supplier_name}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-widest">Ref PO</span>
                        <span className="font-bold text-slate-700">{selectedGrn.po_number}</span>
                      </div>
                      <div className="pt-4 border-t border-dashed">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Nilai Asset</p>
                        <p className="text-2xl font-black text-slate-900 tracking-tighter">
                          Rp {formatCurrency(items.reduce((sum, it) => sum + (Number(it.warehouse_qty || 0) * (it.unit_price || it.price || 0)), 0))}
                        </p>
                      </div>
                    </div>
                    <Button
                      className="w-full h-auto min-h-[56px] py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-2xl transition-all hover:scale-[1.02] active:scale-95 leading-tight"
                      onClick={handleSubmit}
                      disabled={isSaving}
                    >
                      <div className="flex items-center justify-center gap-2 px-2 w-full">
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin shrink-0" /> : null}
                        <span className="text-center whitespace-normal break-words leading-tight">Buat Inventory GRN & Post ke Ledger</span>
                      </div>
                    </Button>
                  </>
                ) : (
                  <div className="h-48 flex flex-col items-center justify-center text-center text-slate-300 gap-3">
                    <FileSearch className="w-10 h-10 opacity-20" />
                    <p className="text-sm font-medium">Pilih Procurement GRN untuk melihat ringkasan</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog open={!!activeSignPad} onOpenChange={() => setActiveSignPad(null)}>
          <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-3xl" aria-describedby="signpad-dialog-desc">
            <DialogHeader className="p-6 border-b bg-slate-50">
              <DialogTitle className="flex items-center gap-2 text-slate-900 font-black">
                <SignatureIcon className="w-5 h-5 text-slate-900" /> Tanda Tangan Konfirmasi
              </DialogTitle>
              <p id="signpad-dialog-desc" className="sr-only">Masukkan tanda tangan Anda di sini</p>
            </DialogHeader>
            <div className="p-6">
              <SignaturePad onSave={(data) => {
                setSignatures({ ...signatures, [activeSignPad]: data });
                setActiveSignPad(null);
              }} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
