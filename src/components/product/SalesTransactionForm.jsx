import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Search, ShoppingCart, Plus, Minus, Trash2, Loader2, Upload, X, Package, ShieldCheck, CheckCircle2, Info, Receipt, CreditCard, Truck } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NumberInput } from '@/components/ui/number-input';
import { formatNumber } from '@/components/utils/currencyFormatter';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import PrintInvoice from '../invoice/PrintInvoice';
import { allocateBatches, deductBatches } from '@/utils/fefoEngine';
import { supabase } from '@/lib/supabase';
import { useTaxRate } from '@/hooks/useTaxRate';

export default function SalesTransactionForm({ open, onClose, store, onSuccess }) {
  const { toast } = useToast();
  const storeId = store?.id;
  const { ppnRate, ppnLabel, ppnDecimal } = useTaxRate(storeId);
  const [completedTransaction, setCompletedTransaction] = useState(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [salesLocations, setSalesLocations] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('walk-in');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [salesPic, setSalesPic] = useState('');
  const [saleLocation, setSaleLocation] = useState('');
  const [saleCoordinates, setSaleCoordinates] = useState('');
  const [discount, setDiscount] = useState(0);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [discountCode, setDiscountCode] = useState('');
  const [manualDiscount, setManualDiscount] = useState('');
  const [includeTax, setIncludeTax] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBank, setSelectedBank] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stayOnPage, setStayOnPage] = useState(false);
  const [leftWidth, setLeftWidth] = useState(55); // Default 55%
  const [isResizing, setIsResizing] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [qrisImage, setQrisImage] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [needsDelivery, setNeedsDelivery] = useState(false);
  const [showSerialModal, setShowSerialModal] = useState(false);
  const [serialAssignments, setSerialAssignments] = useState({});
  const [serialTrackedItemsInCart, setSerialTrackedItemsInCart] = useState([]);
  const containerRef = React.useRef(null);

  useEffect(() => {
    if (open && storeId) {
      loadProducts();
      loadBankAccounts();
      loadCustomers();
      loadDiscounts();
      loadEmployees();
      loadSalesLocations();
    }
  }, [open, storeId]);

  const loadProducts = async () => {
    const data = await api.entities.Product.filter({ store_id: storeId });
    setProducts(data);
  };

  const loadBankAccounts = async () => {
    const data = await api.entities.BankAccount.filter({ store_id: storeId, is_active: true });
    setBankAccounts(data);
    if (data.length > 0) setSelectedBank(data[0].id);
  };

  const loadCustomers = async () => {
    const data = await api.entities.Customer.filter({ store_id: storeId, status: 'Active' });
    setCustomers(data);
  };

  const loadDiscounts = async () => {
    const data = await api.entities.Discount.filter({ store_id: storeId, is_active: true });
    setDiscounts(data);
  };

  const loadEmployees = async () => {
    const data = await api.entities.Employee.filter({ store_id: storeId, status: 'Active' });
    const salesEmployees = data.filter(emp => {
      const dept = emp.department?.toLowerCase() || '';
      const pos = emp.position?.toLowerCase() || '';
      return dept.includes('sales') || pos.includes('sales');
    });
    setEmployees(salesEmployees);
  };

  const loadSalesLocations = async () => {
    const data = await api.entities.ProductLocation.filter({ store_id: storeId, type: 'sales' });
    setSalesLocations(data || []);
  };

  const applyDiscount = (discountId) => {
    const disc = discounts.find(d => d.id === discountId);
    if (!disc) {
      setDiscount(0);
      setSelectedDiscount(null);
      return;
    }

    // Check if discount is active
    const now = new Date();
    const start = new Date(disc.start_date);
    const end = new Date(disc.end_date);
    if (now < start || now > end) {
      toast({
        variant: "destructive",
        title: "Diskon Tidak Berlaku",
        description: "Periode diskon ini sudah berakhir atau belum dimulai."
      });
      return;
    }

    // Check minimum purchase
    if (subtotal < disc.min_purchase) {
      toast({
        variant: "destructive",
        title: "Minimum Pembelian Belum Tercapai",
        description: `Gunakan voucher ini dengan minimal pembelian Rp ${formatNumber(disc.min_purchase)}`
      });
      return;
    }

    // Check max usage
    if (disc.max_usage && disc.usage_count >= disc.max_usage) {
      toast({
        variant: "destructive",
        title: "Batas Penggunaan Tercapai",
        description: "Diskon ini sudah mencapai batas maksimal penggunaan."
      });
      return;
    }

    // Calculate discount
    let discountAmount = 0;
    const isProductSpecific = disc.applicable_products && disc.applicable_products.length > 0;

    if (isProductSpecific) {
      // Calculate subtotal only for applicable products
      const applicableSubtotal = cart
        .filter(item => disc.applicable_products.includes(item.product_id))
        .reduce((sum, item) => sum + item.subtotal, 0);

      if (applicableSubtotal === 0) {
        toast({
          variant: "destructive",
          title: "Produk Tidak Sesuai",
          description: "Diskon ini tidak berlaku untuk produk yang ada di keranjang Anda."
        });
        return;
      }

      if (disc.discount_type === 'Percentage') {
        discountAmount = Math.round((applicableSubtotal * disc.discount_value) / 100);
      } else {
        discountAmount = disc.discount_value;
      }
    } else {
      // Standard discount on whole cart
      if (disc.discount_type === 'Percentage') {
        discountAmount = Math.round((subtotal * disc.discount_value) / 100);
      } else {
        discountAmount = disc.discount_value;
      }
    }

    setDiscount(discountAmount);
    setSelectedDiscount(disc);
  };

  const applyDiscountByCode = () => {
    const disc = discounts.find(d => d.code?.toLowerCase() === discountCode.toLowerCase());
    if (!disc) {
      alert('Kode diskon tidak valid');
      return;
    }
    applyDiscount(disc.id);
  };

  const handleCustomerChange = (customerId) => {
    setSelectedCustomer(customerId);
    if (customerId === 'walk-in') {
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      setCustomerEmail('');
    } else {
      const customer = customers.find(c => c.id === customerId);
      setCustomerName(customer?.name || 'Walk-in Customer');
      setCustomerPhone(customer?.phone || '');
      setCustomerEmail(customer?.email || '');
    }
  };

  const handleProofChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setProofPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const formatCurrency = (value) => formatNumber(value || 0);

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (product) => {
    const existing = cart.find(item => item.product_id === product.id);
    if (existing) {
      if (existing.quantity < product.stock) {
        setCart(cart.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unit_price }
            : item
        ));
      }
    } else {
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.sell_price,
        buy_price: product.buy_price,
        subtotal: product.sell_price,
        max_stock: product.stock
      }]);
    }
  };

  const updateQuantity = (productId, delta) => {
    setCart(cart.map(item => {
      if (item.product_id === productId) {
        const newQty = Math.max(1, Math.min(item.max_stock, item.quantity + delta));
        return { ...item, quantity: newQty, subtotal: newQty * item.unit_price };
      }
      return item;
    }));
  };

  const setExactQuantity = (productId, value) => {
    setCart(cart.map(item => {
      if (item.product_id === productId) {
        if (value === '') {
          return { ...item, quantity: '', subtotal: 0 };
        }
        let newQty = parseInt(value, 10);
        if (isNaN(newQty) || newQty < 0) newQty = 0;
        newQty = Math.min(item.max_stock, newQty);
        return { ...item, quantity: newQty, subtotal: newQty * item.unit_price };
      }
      return item;
    }));
  };

  const handleBlurQuantity = (productId) => {
    setCart(cart.map(item => {
      if (item.product_id === productId) {
        if (item.quantity === '' || item.quantity <= 0) {
          return { ...item, quantity: 1, subtotal: 1 * item.unit_price };
        }
      }
      return item;
    }));
  };


  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);

  useEffect(() => {
    if (selectedDiscount && subtotal > 0) {
      let discountAmount = 0;
      const isProductSpecific = selectedDiscount.applicable_products && selectedDiscount.applicable_products.length > 0;

      if (isProductSpecific) {
        const applicableSubtotal = cart
          .filter(item => selectedDiscount.applicable_products.includes(item.product_id))
          .reduce((sum, item) => sum + item.subtotal, 0);

        if (selectedDiscount.discount_type === 'Percentage') {
          discountAmount = Math.round((applicableSubtotal * selectedDiscount.discount_value) / 100);
        } else {
          // If nominal discount exceeds applicable subtotal, cap it (optional but safer)
          discountAmount = Math.min(selectedDiscount.discount_value, applicableSubtotal);
        }
      } else {
        if (selectedDiscount.discount_type === 'Percentage') {
          discountAmount = Math.round((subtotal * selectedDiscount.discount_value) / 100);
        } else {
          discountAmount = selectedDiscount.discount_value;
        }
      }
      setDiscount(discountAmount);
    }
  }, [subtotal, cart, selectedDiscount]);

  const taxAmount = includeTax ? Math.round(subtotal * ppnDecimal) : 0;
  const numManualDiscount = Number(manualDiscount) || 0;
  let total = subtotal + taxAmount - discount - numManualDiscount;
  if (total < 0) total = 0;

  const profit = cart.reduce((sum, item) => sum + ((item.unit_price - item.buy_price) * item.quantity), 0) - numManualDiscount;

  const getWIBTimestamp = () => {
    const now = new Date();
    const wibOffset = 7 * 60;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibTime = new Date(utc + (wibOffset * 60000));

    const day = String(wibTime.getDate()).padStart(2, '0');
    const month = String(wibTime.getMonth() + 1).padStart(2, '0');
    const year = wibTime.getFullYear();
    const hours = String(wibTime.getHours()).padStart(2, '0');
    const minutes = String(wibTime.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes} WIB`;
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return;

    if (paymentMethod === 'Piutang / Termin') {
      if (selectedCustomer === 'walk-in' && (!customerName || customerName === 'Walk-in Customer' || !customerPhone)) {
        toast({
          variant: "destructive",
          title: "Data Pelanggan Tidak Lengkap",
          description: "Untuk Piutang pada Walk-in Customer, Nama Lengkap dan Nomor HP wajib diisi!"
        });
        return;
      }
      if (!dueDate) {
        toast({
          variant: "destructive",
          title: "Jatuh Tempo Kosong",
          description: "Silakan pilih Tanggal Jatuh Tempo untuk pencatatan piutang."
        });
        return;
      }
    }

    // --- SERIAL TRACKING INTERCEPT ---
    const serialItems = cart.filter(item => {
      const p = products.find(prod => prod.id === item.product_id);
      return p && p.tracking_type === 'Serial';
    });

    if (serialItems.length > 0) {
      const incomplete = serialItems.some(item => {
        const assigned = serialAssignments[item.product_id] || [];
        const validAssigned = assigned.filter(s => s && s.trim() !== '');
        return validAssigned.length !== item.quantity;
      });

      if (incomplete) {
        setSerialTrackedItemsInCart(serialItems);
        setShowSerialModal(true);
        return; // Pause submission, wait for modal
      }
    }
    // ---------------------------------

    setIsLoading(true);

    // Auto-capture GPS coordinates
    let capturedCoords = '';
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
      });
      capturedCoords = `${pos.coords.latitude}, ${pos.coords.longitude}`;
    } catch (e) {
      // GPS not available or denied — continue without coordinates
      console.log('GPS not available:', e.message);
    }

    const invoiceNumber = `INV-${Date.now()}`;
    let proofUrl = '';

    // 1. Generate Mayar QRIS Link FIRST before creating transaction
    let generatedPaymentLink = '';
    if (paymentMethod === 'QRIS') {
      if (!store.mayar_api_key) {
        toast({ 
          title: 'Konfigurasi Belum Lengkap', 
          description: 'Anda belum memasukkan Mayar API Key di menu Settings. Silakan atur terlebih dahulu untuk menggunakan QRIS.', 
          variant: 'destructive' 
        });
        setIsLoading(false);
        return;
      }

      if (total < 500) {
        toast({ title: 'Gagal Memproses QRIS', description: 'Total transaksi untuk metode QRIS/E-Wallet minimal Rp 500.', variant: 'destructive' });
        return;
      }

      try {
        setIsGeneratingLink(true);
        console.log('[Tradixa] Calling mayar-create-link Edge Function with storeId:', storeId);
        // For walk-in customers, use store info to avoid Mayar rejection
        const effectiveName = (customerName && customerName !== 'Walk-in Customer') ? customerName : (store?.store_name || 'Pelanggan');
        const effectiveEmail = customerEmail || store?.email || 'pos@tradixa.com';
        const effectivePhone = customerPhone || store?.phone || '6281000000000';
        
        const { data, error } = await api.client.functions.invoke('mayar-create-link', {
          body: {
            store_id: storeId,
            receivable_id: invoiceNumber, // used as reference
            amount: total,
            customer_name: effectiveName,
            customer_email: effectiveEmail,
            customer_phone: effectivePhone,
            description: `Pembayaran Penjualan ${invoiceNumber}`
          }
        });

        console.log('[Tradixa] Edge Function Response:', { data, error });

        if (error) throw new Error(error.message);
        if (data && !data.success) throw new Error(data.error);

        if (data?.link) {
          console.log('[Tradixa] Payment Link received:', data.link);
          generatedPaymentLink = data.link;
          setPaymentLink(data.link);
          proofUrl = data.link;
          // Set real QRIS image from Mayar if available
          if (data.qris_image) {
            console.log('[Tradixa] QRIS Image received:', data.qris_image);
            setQrisImage(data.qris_image);
          }
        } else {
          throw new Error('Payment Link is empty or undefined in data object.');
        }
      } catch (err) {
        console.error('[Tradixa] Error generating Mayar link:', err);
        toast({ title: 'Gagal Membuat Link QRIS', description: err.message || JSON.stringify(err), variant: 'destructive' });
        setIsGeneratingLink(false);
        setIsLoading(false);
        return; // Abort transaction creation if QRIS fails
      }
    } else if (proofFile && paymentMethod !== 'Cash') {
      const _uploadRes = await api.storage.upload(proofFile);
      const file_url = _uploadRes.url;
      proofUrl = file_url;
    }

    const numDownPayment = Number(downPayment) || 0;
    let paymentStatus = paymentMethod === 'Cash' ? 'Paid' : 'Pending';
    let paidAmount = paymentStatus === 'Paid' ? total : 0;

    if (paymentMethod === 'Piutang / Termin') {
      paymentStatus = numDownPayment > 0 ? (numDownPayment >= total ? 'Paid' : 'Partial') : 'Pending';
      paidAmount = numDownPayment;
    }

    // Auto-create Customer for walk-in Piutang (wajib tercatat di Customer Master)
    let resolvedCustomerId = (selectedCustomer && selectedCustomer !== 'walk-in') ? selectedCustomer : null;
    if ((selectedCustomer === 'walk-in' || !selectedCustomer) && paymentMethod === 'Piutang / Termin') {
      try {
        const newCustomer = await api.entities.Customer.create({
          store_id: storeId,
          name: customerName,
          phone: customerPhone || '',
          email: '',
          address: '-',
          bank_name: '',
          bank_account: '',
          status: 'Active'
        });
        resolvedCustomerId = newCustomer.id;
        toast({ title: '✅ Pelanggan Baru Ditambahkan', description: `${customerName} otomatis tersimpan ke Customer Master.` });
      } catch (err) {
        console.error('[Tradixa] Auto-create customer failed:', err);
        toast({ title: '⚠️ Gagal Simpan Pelanggan', description: 'Transaksi tetap diproses, silakan tambah manual di Customer Master.', variant: 'destructive' });
      }
    }

    const salesTransaction = await api.entities.SalesTransaction.create({
      store_id: storeId,
      invoice_number: invoiceNumber,
      customer_id: resolvedCustomerId,
      customer_name: customerName,
      items: cart.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        buy_price: item.buy_price,
        subtotal: item.subtotal
      })),
      subtotal,
      discount: discount + numManualDiscount,
      tax_percentage: includeTax ? ppnRate : 0,
      tax_amount: taxAmount,
      total,
      profit,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      paid_amount: paidAmount,
      bank_account_id: selectedBank || null,
      payment_proof_url: proofUrl,
      sales_pic: salesPic,
      sale_location: saleLocation,
      sale_coordinates: capturedCoords,
      timestamp_wib: getWIBTimestamp()
    });

    // AR Creation
    if (paymentMethod === 'Piutang / Termin' && paymentStatus !== 'Paid') {
      await api.entities.Receivable.create({
        store_id: storeId,
        invoice_number: invoiceNumber,
        customer_id: resolvedCustomerId,
        customer_name: customerName,
        sales_id: salesTransaction.id,
        amount: total,
        paid_amount: paidAmount,
        remaining_amount: total - paidAmount,
        due_date: dueDate,
        status: 'Belum Lunas',
        payment_proof_url: proofUrl || null,
        payment_bank_name: selectedBank ? bankAccounts.find(b => b.id === selectedBank)?.bank_name : 'Cash',
        notes: `Piutang dari POS. No HP: ${customerPhone || '-'}`,
        timestamp_wib: getWIBTimestamp()
      });
    }

    // === JURNAL AKUNTANSI PENJUALAN (Proper Double-Entry) ===
    const totalHPP = cart.reduce((sum, item) => sum + (item.buy_price * item.quantity), 0);
    const reference = invoiceNumber;

    // Create single JournalEntry header
    const journal = await api.entities.JournalEntry.create({
      store_id: storeId,
      transaction_id: reference,
      date: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD format in local time
      description: `Penjualan - ${customerName} (${invoiceNumber})`,
      type: 'Sales',
      status: 'Draft',
      total_debit: total + totalHPP,
      total_credit: total + totalHPP,
      created_by: 'Administrator'
    });

    // Create JournalLine records (double-entry)
    const journalLines = [];

    // 1. DR Kas/Piutang Usaha (total penjualan)
    if (paymentMethod === 'Piutang / Termin') {
      if (paidAmount > 0) {
        journalLines.push(api.entities.JournalLine.create({
          journal_id: journal.id,
          account_name: 'Kas Kantor',
          description: `DP Penjualan ${customerName}`,
          debit: paidAmount,
          credit: 0
        }));
      }
      if (total - paidAmount > 0) {
        journalLines.push(api.entities.JournalLine.create({
          journal_id: journal.id,
          account_name: 'Piutang Usaha',
          description: `Piutang Penjualan ${customerName}`,
          debit: total - paidAmount,
          credit: 0
        }));
      }
    } else {
      const accountDebit = paymentStatus === 'Paid' ? 'Kas Kantor' : 'Piutang Usaha';
      journalLines.push(api.entities.JournalLine.create({
        journal_id: journal.id,
        account_name: accountDebit,
        description: `Penjualan ${customerName} (${paymentMethod})`,
        debit: total,
        credit: 0
      }));
    }

    // 2. CR Pendapatan Penjualan
    journalLines.push(api.entities.JournalLine.create({
      journal_id: journal.id,
      account_name: 'Pendapatan Penjualan',
      description: `Penjualan ${customerName} - Netto`,
      debit: 0,
      credit: total
    }));

    // 3. DR HPP & CR Persediaan (jika ada)
    if (totalHPP > 0) {
      journalLines.push(api.entities.JournalLine.create({
        journal_id: journal.id,
        account_name: 'Harga Pokok Penjualan (HPP)',
        description: `HPP untuk ${invoiceNumber}`,
        debit: totalHPP,
        credit: 0
      }));
      journalLines.push(api.entities.JournalLine.create({
        journal_id: journal.id,
        account_name: 'Persediaan Barang Dagang',
        description: `Pengurangan Stok - ${invoiceNumber}`,
        debit: 0,
        credit: totalHPP
      }));
    }

    await Promise.all(journalLines);


    if (selectedDiscount && discount > 0) {
      await api.entities.DiscountUsage.create({
        store_id: storeId,
        discount_id: selectedDiscount.id,
        discount_code: selectedDiscount.code,
        sales_transaction_id: salesTransaction.id,
        invoice_number: invoiceNumber,
        customer_name: customerName,
        discount_amount: discount,
        timestamp_wib: getWIBTimestamp()
      });

      await api.entities.Discount.update(selectedDiscount.id, {
        usage_count: (selectedDiscount.usage_count || 0) + 1
      });
    }

    const allFefoWarnings = [];
    for (const item of cart) {
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        const newStock = product.stock - item.quantity;
        const status = newStock <= 0 ? 'Out of Stock' : newStock <= product.reorder_level ? 'Low Stock' : 'In Stock';
        await api.entities.Product.update(item.product_id, { stock: newStock, status });

        if (product.tracking_type === 'Batch') {
          // FEFO Logic
          const allocationResult = await allocateBatches(storeId, item.product_id, item.quantity);
          
          // Collect near-expiry warnings
          if (allocationResult.warnings?.length > 0) {
            allFefoWarnings.push(...allocationResult.warnings);
          }

          if (allocationResult.success && allocationResult.allocations.length > 0) {
            await deductBatches(allocationResult.allocations);

            // Create StockMovement for each allocation
            for (const alloc of allocationResult.allocations) {
              await api.entities.StockMovement.create({
                store_id: storeId,
                reference: invoiceNumber,
                product_id: item.product_id,
                product_name: item.product_name,
                movement_type: 'out',
                stock_type: 'Sales',
                quantity: alloc.quantity,
                batch_id: alloc.batch_id,
                batch_number: alloc.batch_number,
                expiry_date: alloc.expiry_date,
                timestamp_wib: getWIBTimestamp()
              });
            }
          } else {
            // Fallback if batch allocation fails or no active batches found (safety net)
            console.warn(`[Tradixa FEFO] Allocation failed or empty for ${item.product_name}. Using standard movement.`);
            await api.entities.StockMovement.create({
              store_id: storeId,
              reference: invoiceNumber,
              product_id: item.product_id,
              product_name: item.product_name,
              movement_type: 'out',
              stock_type: 'Sales',
              quantity: item.quantity,
              timestamp_wib: getWIBTimestamp()
            });
          }
        } else if (product.tracking_type === 'Serial') {
          // Serial Logic
          const assignedSerials = serialAssignments[item.product_id] || [];
          
          for (const sNumber of assignedSerials) {
            // Find the specific serial record
            const serialRecords = await api.entities.InventorySerial.filter({ store_id: storeId, serial_number: sNumber, status: 'Available' });
            if (serialRecords.length > 0) {
              await api.entities.InventorySerial.update(serialRecords[0].id, {
                status: 'Sold',
                sales_transaction_id: salesTransaction.id
              });
            }

            await api.entities.StockMovement.create({
              store_id: storeId,
              reference: invoiceNumber,
              product_id: item.product_id,
              product_name: item.product_name,
              movement_type: 'out',
              stock_type: 'Sales',
              quantity: 1, // 1 per serial
              timestamp_wib: getWIBTimestamp()
            });
          }
        } else {
          // Standard Logic
          await api.entities.StockMovement.create({
            store_id: storeId,
            reference: invoiceNumber,
            product_id: item.product_id,
            product_name: item.product_name,
            movement_type: 'out',
            stock_type: 'Sales',
            quantity: item.quantity,
            timestamp_wib: getWIBTimestamp()
          });
        }
      }
    }

    // Show FEFO Warnings if any
    if (allFefoWarnings.length > 0) {
      toast({
        title: "⚠️ Peringatan FEFO",
        description: `Beberapa item mendekati kadaluarsa: ${allFefoWarnings.slice(0, 3).join(', ')}${allFefoWarnings.length > 3 ? '...' : ''}`,
        duration: 8000
      });
    }

    if (paymentMethod !== 'Cash' && selectedBank) {
      const bankAccount = bankAccounts.find(b => b.id === selectedBank);
      if (bankAccount) {
        const txAmount = paidAmount > 0 ? paidAmount : total;
        await api.entities.BankTransaction.create({
          store_id: storeId,
          bank_account_id: selectedBank,
          bank_name: bankAccount.bank_name,
          transaction_type: 'Credit',
          amount: txAmount,
          description: `Penjualan ${invoiceNumber} - ${customerName}`,
          reference: invoiceNumber,
          balance_after: bankAccount.balance,
          status: 'Pending',
          sales_transaction_id: salesTransaction.id,
          payment_proof_url: proofUrl,
          timestamp_wib: getWIBTimestamp()
        });
      }
    }

    // 8. Update Loyalty Points if customer is selected
    if (selectedCustomer && selectedCustomer !== 'walk-in') {
      try {
        const loyalData = await api.entities.CustomerLoyalty.filter({ store_id: storeId, customer_id: selectedCustomer });
        const tiers = await api.entities.LoyaltyTier.filter({ store_id: storeId });
        const sortedTiers = (tiers || []).sort((a, b) => b.min_points - a.min_points);

        let currentLoyalty = loyalData[0];
        const pointsMultiplier = currentLoyalty?.points_multiplier || 1;
        const earnedPoints = Math.floor(total / 1000) * pointsMultiplier;

        if (currentLoyalty) {
          const newPoints = (currentLoyalty.total_points || 0) + earnedPoints;
          const newSpending = (currentLoyalty.lifetime_spending || 0) + total;

          // Check for tier upgrade
          let newTier = currentLoyalty.current_tier || 'Bronze';
          const applicableTier = sortedTiers.find(t => newPoints >= t.min_points);
          if (applicableTier) newTier = applicableTier.tier_name;

          await api.entities.CustomerLoyalty.update(currentLoyalty.id, {
            total_points: newPoints,
            lifetime_spending: newSpending,
            current_tier: newTier,
            points_earned: (currentLoyalty.points_earned || 0) + earnedPoints,
            updated_date: new Date().toISOString()
          });
        } else {
          // Create new loyalty record if not exists
          await api.entities.CustomerLoyalty.create({
            store_id: storeId,
            customer_id: selectedCustomer,
            customer_name: customerName,
            total_points: earnedPoints,
            lifetime_spending: total,
            current_tier: 'Bronze',
            points_earned: earnedPoints,
            join_date: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error('[Tradixa] Error updating loyalty:', err);
      }
    }

    // 9. Handle Outbound Delivery Integration
    if (needsDelivery && selectedCustomer && selectedCustomer !== 'walk-in') {
      try {
        const customer = customers.find(c => c.id === selectedCustomer);
        if (customer) {
          await supabase.from('outbound_deliveries').insert([{
            store_id: storeId,
            sales_transaction_id: salesTransaction.id,
            customer_id: customer.id,
            shipping_address: customer.address || customer.formatted_address || '',
            latitude: customer.latitude,
            longitude: customer.longitude,
            status: 'Pending'
          }]);
        }
      } catch (err) {
        console.error("Failed to create outbound delivery:", err);
      }
    }

    toast({
      title: "Transaksi Berhasil",
      description: `Invoice ${invoiceNumber} telah dibuat.`
    });

    setIsGeneratingLink(false);
    setIsLoading(false);
    onSuccess();
    setCompletedTransaction(salesTransaction);
  };

  const handleResetAfterSuccess = () => {
    setCart([]);
    setSelectedCustomer('walk-in');
    setCustomerName('Walk-in Customer');
    setSalesPic('');
    setSaleLocation('');
    setSaleCoordinates('');
    setDiscount(0);
    setManualDiscount('');
    setSelectedDiscount(null);
    setDiscountCode('');
    setIncludeTax(false);
    setPaymentMethod('Cash');
    setProofFile(null);
    setProofPreview(null);
    setDueDate('');
    setDownPayment('');
    setCustomerPhone('');
    setPaymentLink('');
    setQrisImage('');
    setCompletedTransaction(null);
    if (!stayOnPage) {
      onClose();
    }
  };

  const startResizing = React.useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = React.useCallback((e) => {
    if (isResizing && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      if (newWidth > 30 && newWidth < 75) {
        setLeftWidth(newWidth);
      }
    }
  }, [isResizing]);

  React.useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
        <DialogContent hideFullscreen={true} className="max-w-[95vw] w-[1400px] h-[95vh] rounded-2xl flex flex-col p-0 border-none overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b bg-white flex-shrink-0 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">Transaksi Baru</DialogTitle>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Kelola penjualan dengan cepat dan efisien</p>
            </div>
          </DialogHeader>

          <div ref={containerRef} className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden bg-slate-50/50 select-none">
            {/* Left: Product Selection */}
            <div
              style={{ width: typeof window !== 'undefined' && window.innerWidth < 1024 ? '100%' : `${leftWidth}%` }}
              className="flex flex-col border-r bg-white h-[65vh] lg:h-full overflow-hidden lg:w-auto w-full shrink-0 lg:shrink"
            >
              <div className="p-6 border-b space-y-4">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    placeholder="Cari nama produk, SKU, atau scan barcode..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const exactMatch = filteredProducts.find(p => 
                          (p.barcode && p.barcode.toLowerCase() === searchQuery.toLowerCase()) || 
                          (p.sku && p.sku.toLowerCase() === searchQuery.toLowerCase())
                        );
                        if (exactMatch && exactMatch.stock > 0) {
                          addToCart(exactMatch);
                          setSearchQuery('');
                        } else if (filteredProducts.length === 1 && filteredProducts[0].stock > 0) {
                          addToCart(filteredProducts[0]);
                          setSearchQuery('');
                        } else if (!exactMatch && filteredProducts.length === 0) {
                          toast({ title: "Tidak Ditemukan", description: "Produk dengan barcode tersebut tidak ada atau stok habis.", variant: "destructive" });
                        }
                      }
                    }}
                    className="pl-12 h-14 text-base rounded-2xl border-slate-200 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full w-full">
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 gap-6 pb-10">
                      {filteredProducts.map(product => {
                        const cartItem = cart.find(item => item.product_id === product.id);
                        const availableStock = product.stock - (cartItem ? cartItem.quantity : 0);
                        const isOutOfStock = availableStock <= 0;

                        return (
                          <div
                            key={product.id}
                            onClick={() => !isOutOfStock && addToCart(product)}
                            className={`group relative bg-white border border-slate-100 rounded-3xl overflow-hidden cursor-pointer transition-all hover:shadow-2xl hover:border-blue-300 active:scale-[0.98] ${isOutOfStock ? 'opacity-50 grayscale' : ''
                              }`}
                          >
                            {/* Product Image */}
                            <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                  <Package className="w-12 h-12 text-slate-200" />
                                </div>
                              )}

                              {/* Price Badge Overlay */}
                              <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg">
                                <p className="text-sm font-black text-blue-600">Rp {formatCurrency(product.sell_price)}</p>
                              </div>

                              {/* Stock Badge Overlay */}
                              <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-sm ${isOutOfStock ? 'bg-red-500' :
                                availableStock <= (product.reorder_level || 5) ? 'bg-amber-500' :
                                  'bg-blue-600/80'
                                }`}>
                                {isOutOfStock ? 'Habis' : `Stok: ${availableStock}`}
                              </div>
                            </div>

                          <div className="p-4 space-y-1">
                            <p className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
                              {product.name}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {product.sku || 'N/A'}
                            </p>
                          </div>

                          {/* Quick Add Overlay */}
                          {!isOutOfStock && (
                            <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-colors pointer-events-none" />
                          )}
                        </div>
                        );
                      })}
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Resizable Divider Handle - Hidden on Mobile */}
            <div
              onMouseDown={startResizing}
              className={`hidden lg:flex w-1.5 h-full bg-slate-100 hover:bg-blue-400 cursor-col-resize transition-colors flex-shrink-0 z-10 items-center justify-center group ${isResizing ? 'bg-blue-500' : ''}`}
            >
              <div className="w-0.5 h-8 bg-slate-300 group-hover:bg-blue-200 rounded-full" />
            </div>

            {/* Right: Cart & Checkout */}
            <ScrollArea
              style={{ width: typeof window !== 'undefined' && window.innerWidth < 1024 ? '100%' : `${100 - leftWidth}%` }}
              className="bg-slate-50/50 h-auto min-h-[50vh] lg:h-full lg:w-auto w-full shrink-0 lg:shrink"
            >
              {completedTransaction ? (
                <div className="flex flex-col items-center justify-center p-10 h-full min-h-[60vh] space-y-6 text-center">
                  {paymentLink ? (
                    <>
                      <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-2 mt-6 animate-pulse">
                        <CreditCard className="w-9 h-9 text-amber-600" />
                      </div>
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                        <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Menunggu Pembayaran</span>
                      </div>
                      <p className="text-sm text-slate-500 max-w-xs">Minta pelanggan scan QRIS di bawah untuk membayar.</p>
                      
                      {/* QRIS - Real dari Mayar atau fallback ke URL QR */}
                      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                        <img
                          src={qrisImage || `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(paymentLink)}`}
                          alt="QRIS Pembayaran"
                          className="w-52 h-52 mx-auto"
                        />
                        <p className="text-[10px] text-slate-400 mt-3">
                          {qrisImage ? 'QRIS resmi — scan dengan e-wallet / mobile banking' : 'Scan untuk buka halaman pembayaran'}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4 mt-10">
                        <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-800">Transaksi Berhasil!</h2>
                    </>
                  )}
                  <p className="text-slate-500">Invoice: <span className="font-semibold text-slate-700">{completedTransaction.invoice_number}</span></p>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border w-full max-w-sm">
                    <p className="text-sm text-slate-500 mb-1">Total Pembayaran</p>
                    <p className="text-3xl font-bold text-blue-600">Rp {formatCurrency(completedTransaction.total)}</p>
                  </div>

                  {paymentLink && (
                    <div className="w-full max-w-sm space-y-2 mt-2">
                      <Button
                        onClick={() => window.open(paymentLink, '_blank')}
                        className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-5 h-5" /> Buka Tautan di HP
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(paymentLink);
                          toast({ title: "Tautan Disalin", description: "Tautan pembayaran berhasil disalin ke clipboard." });
                        }}
                        className="w-full h-11 font-bold rounded-xl border-slate-200"
                      >
                        Salin Tautan (Kirim WA Pelanggan)
                      </Button>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 pt-4 w-full max-w-sm">
                    <Button
                      onClick={() => setShowPrintPreview(true)}
                      className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 shadow-lg text-base text-white rounded-xl"
                    >
                      <Receipt className="w-5 h-5 mr-2" />
                      Cetak Struk
                    </Button>
                    <Button
                      onClick={handleResetAfterSuccess}
                      variant="outline"
                      className="w-full h-12 text-base rounded-xl"
                    >
                      Transaksi Baru
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-6 flex flex-col gap-6">
                  {/* Customer Selection */}
                  <div className="grid grid-cols-3 gap-4 bg-white p-4 rounded-3xl border shadow-sm">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Pelanggan</Label>
                      <Select value={selectedCustomer || 'walk-in'} onValueChange={handleCustomerChange}>
                        <SelectTrigger className="h-10 border-slate-100 bg-slate-50 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                          {customers.map(customer => (
                            <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Sales PIC</Label>
                      <Select value={salesPic} onValueChange={setSalesPic}>
                        <SelectTrigger className="h-10 border-slate-100 bg-slate-50 rounded-xl">
                          <SelectValue placeholder="Pilih Sales..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Tanpa PIC</SelectItem>
                          {employees.map(emp => (
                            <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Lokasi Penjualan</Label>
                      <Select value={saleLocation} onValueChange={setSaleLocation}>
                        <SelectTrigger className="h-10 border-slate-100 bg-slate-50 rounded-xl">
                          <SelectValue placeholder="Pilih Lokasi..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Tanpa Lokasi</SelectItem>
                          {salesLocations.map(loc => (
                            <SelectItem key={loc.id} value={loc.name}>{loc.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Cart List */}
                  <div className="flex flex-col bg-white rounded-3xl border shadow-sm overflow-hidden">
                    <div className="p-4 border-b flex items-center justify-between bg-slate-50/50 flex-shrink-0">
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest">
                        <ShoppingCart className="w-4 h-4 text-blue-600" /> Item Penjualan
                      </h3>
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-black">{cart.length} Item</Badge>
                    </div>

                    <div className="flex-1">
                      {cart.length === 0 ?
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20 bg-white rounded-3xl border shadow-sm">
                          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                            <ShoppingCart className="w-8 h-8" />
                          </div>
                          <p className="text-sm font-medium">Belum ada item ditambahkan</p>
                        </div>
                        :
                        <div className="space-y-3">
                          {cart.map((item) => (
                            <div key={item.product_id} className="flex flex-col gap-3 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-blue-200 transition-all">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <p className="font-black text-slate-900 text-sm leading-tight">{item.product_name}</p>
                                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">@ Rp {formatCurrency(item.unit_price)}</p>
                                </div>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50" onClick={() => removeFromCart(item.product_id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>

                              <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                <div className="flex items-center bg-slate-50 rounded-xl p-1 gap-1 border">
                                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-white text-slate-600 shadow-sm" onClick={() => updateQuantity(item.product_id, -1)}>
                                    <Minus className="w-4 h-4" />
                                  </Button>
                                  <Input
                                    type="number"
                                    className="w-12 h-8 border-none bg-transparent text-center font-black text-sm p-0 focus-visible:ring-0"
                                    value={item.quantity}
                                    onChange={(e) => setExactQuantity(item.product_id, e.target.value)}
                                    onBlur={() => handleBlurQuantity(item.product_id)}
                                  />
                                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-white text-slate-600 shadow-sm" onClick={() => updateQuantity(item.product_id, 1)}>
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal</p>
                                  <p className="font-black text-blue-600 text-base tracking-tight">Rp {formatCurrency(item.subtotal)}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      }
                    </div>
                  </div>

                  {/* Payment & Totals */}
                  <div className="bg-white p-6 rounded-3xl border shadow-xl space-y-4">
                    {/* PPN Toggle */}
                    <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                      <Checkbox
                        id="include-tax-pos"
                        checked={includeTax}
                        onCheckedChange={setIncludeTax}
                        className="w-5 h-5 rounded-lg border-blue-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <Label htmlFor="include-tax-pos" className="text-sm font-bold text-blue-900 cursor-pointer">
                        Kenakan {ppnLabel}
                      </Label>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 font-medium">Subtotal</span>
                        <span className="font-bold text-slate-800">Rp {formatCurrency(subtotal)}</span>
                      </div>
                      {includeTax && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500 font-medium">{ppnLabel}</span>
                          <span className="font-bold text-slate-800">Rp {formatCurrency(taxAmount)}</span>
                        </div>
                      )}
                      {discount > 0 && (
                        <div className="flex justify-between text-sm text-emerald-600 font-bold">
                          <span>Total Diskon</span>
                          <span>-Rp {formatCurrency(discount + numManualDiscount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                        <span className="text-base font-black text-slate-900 uppercase tracking-tighter">Total Bayar</span>
                        <span className="text-3xl font-black text-blue-600 tracking-tighter">Rp {formatCurrency(total)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-1">
                          Promo/Voucher
                          <Popover>
                            <PopoverTrigger asChild>
                              <button type="button" className="p-1 hover:bg-slate-100 rounded-full transition-colors outline-none">
                                <Info className="w-3 h-3 text-blue-500 cursor-pointer" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent side="top" className="w-[220px] p-3 bg-slate-900 text-white border-none rounded-xl shadow-2xl z-[100] animate-in fade-in zoom-in duration-200">
                              <p className="text-[10px] font-bold leading-relaxed">
                                Promo atau voucher ini dapat dikelola pada modul <span className="text-blue-400">Discount Management</span>
                              </p>
                            </PopoverContent>
                          </Popover>
                        </Label>
                        <Select
                          value={selectedDiscount?.id || 'none'}
                          onValueChange={(val) => val === 'none' ? applyDiscount(null) : applyDiscount(val)}
                        >
                          <SelectTrigger className="h-12 text-sm rounded-2xl border-slate-100 bg-slate-50 font-bold">
                            <SelectValue placeholder="Pilih Promo..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Tanpa Promo</SelectItem>
                            {discounts.map(d => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.name} ({d.discount_type === 'Percentage' ? `${d.discount_value}%` : `Rp ${formatCurrency(d.discount_value)}`})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Potongan Manual (Rp)</Label>
                        <NumberInput
                          placeholder="0"
                          className="h-12 text-sm rounded-2xl border-slate-100 bg-slate-50 font-bold text-amber-600"
                          value={manualDiscount}
                          onChange={(e) => setManualDiscount(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="pt-2" />
                    <div className="pt-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Metode Bayar</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger className="h-12 border-slate-100 bg-slate-50 rounded-2xl font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">Cash / Tunai</SelectItem>
                          <SelectItem value="Transfer">Bank Transfer</SelectItem>
                          <SelectItem value="QRIS" disabled={!store?.mayar_api_key}>
                            QRIS / E-Wallet {!store?.mayar_api_key && '(Belum Aktif)'}
                          </SelectItem>
                          <SelectItem value="Credit Card">Credit Card</SelectItem>
                          <SelectItem value="Debit Card">Debit Card</SelectItem>
                          <SelectItem value="Piutang / Termin">Piutang / Termin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Bank Account Selection (Conditional) */}
                    {paymentMethod !== 'Cash' && paymentMethod !== 'QRIS / E-Wallet' && (
                      <div className="col-span-2 space-y-1.5 pt-2 animate-in fade-in slide-in-from-top-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Pilih Bank Tujuan</Label>
                        <Select value={selectedBank} onValueChange={setSelectedBank}>
                          <SelectTrigger className="h-12 border-slate-100 bg-slate-50 rounded-2xl font-bold">
                            <SelectValue placeholder="Pilih rekening bank..." />
                          </SelectTrigger>
                          <SelectContent>
                            {bankAccounts.map(bank => (
                              <SelectItem key={bank.id} value={bank.id}>
                                {bank.bank_name} - {bank.account_number}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Piutang Fields */}
                    {paymentMethod === 'Piutang / Termin' && (
                      <div className="col-span-2 space-y-3 pt-2 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600"><Receipt className="w-4 h-4" /></div>
                          <p className="text-xs font-bold text-blue-900">Catat sebagai Piutang (AR)</p>
                        </div>

                        {/* Walk-in: Wajib isi data pelanggan — tampil di atas */}
                        {(selectedCustomer === 'walk-in' || !selectedCustomer) && (
                          <div className="space-y-3">
                            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                              <div className="p-1 bg-amber-100 rounded-md mt-0.5 flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                              </div>
                              <div>
                                <p className="text-[11px] font-black text-amber-800">Data Pelanggan Wajib Diisi</p>
                                <p className="text-[10px] text-amber-700 leading-relaxed">Untuk transaksi piutang walk-in, kasir <strong>wajib</strong> mencatat nama lengkap dan nomor HP. Data ini otomatis tersimpan ke <strong>Customer Master</strong>.</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nama Lengkap <span className="text-red-500">*</span></Label>
                                <Input placeholder="Nama Pelanggan" className="h-12 border-white bg-white rounded-xl text-sm font-bold shadow-sm" value={customerName === 'Walk-in Customer' ? '' : customerName} onChange={e => setCustomerName(e.target.value)} />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nomor HP <span className="text-red-500">*</span></Label>
                                <Input placeholder="08..." type="tel" className="h-12 border-white bg-white rounded-xl text-sm font-bold shadow-sm" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5 flex flex-col justify-end">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 mb-1">Jatuh Tempo <span className="text-red-500">*</span></Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full h-12 justify-start text-left font-bold rounded-xl border-white bg-white shadow-sm hover:bg-slate-50 text-slate-900",
                                    !dueDate && "text-slate-400"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {dueDate ? format(new Date(dueDate), "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl" align="start">
                                <Calendar
                                  mode="single"
                                  selected={dueDate ? new Date(dueDate) : undefined}
                                  onSelect={(date) => {
                                    if (date) {
                                      setDueDate(format(date, 'yyyy-MM-dd'));
                                    } else {
                                      setDueDate('');
                                    }
                                  }}
                                  initialFocus
                                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl p-3"
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Uang Muka (Rp)</Label>
                            <NumberInput placeholder="0" className="h-12 border-white bg-white rounded-xl text-sm font-bold shadow-sm" value={downPayment} onChange={e => setDownPayment(e.target.value)} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Proof of Payment (Conditional) */}
                    {paymentMethod !== 'Cash' && paymentMethod !== 'QRIS' && (
                      <div className="col-span-2 pt-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProofChange}
                          className="hidden"
                          id="pos-proof-upload"
                        />
                        <label
                          htmlFor="pos-proof-upload"
                          className="flex items-center justify-center w-full h-20 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors bg-slate-50/50"
                        >
                          {proofPreview ? (
                            <div className="flex items-center gap-3">
                              <img src={proofPreview} alt="Proof" className="h-14 w-14 object-cover rounded-lg shadow-sm" />
                              <span className="text-xs font-bold text-blue-600">Bukti Terupload (Klik untuk ganti)</span>
                            </div>
                          ) : (
                            <div className="text-center">
                              <Upload className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Upload Bukti Bayar</span>
                            </div>
                          )}
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 mt-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="needs-delivery"
                        checked={needsDelivery}
                        onCheckedChange={(checked) => {
                          setNeedsDelivery(checked);
                          if (checked && selectedCustomer === 'walk-in') {
                            toast({
                              title: "Pilih Pelanggan",
                              description: "Silakan pilih pelanggan (bukan walk-in) untuk menggunakan fitur pengiriman.",
                              variant: "destructive"
                            });
                          }
                        }}
                        className="w-5 h-5 rounded-lg border-indigo-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                      />
                      <Label htmlFor="needs-delivery" className="text-sm font-bold text-indigo-900 cursor-pointer flex items-center gap-2">
                        <Truck className="w-4 h-4" /> Butuh Pengiriman Barang (Outbound Delivery)
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-4 h-4 text-indigo-400" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs">
                              Sistem akan otomatis menjadwalkan pengiriman dari <b>Alamat Toko Saat Ini</b> menuju alamat Pelanggan (Customer Master) yang dipilih.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                    </div>
                    {needsDelivery && selectedCustomer === 'walk-in' && (
                      <p className="text-xs text-red-500 font-bold ml-8">⚠️ Anda harus memilih pelanggan (Customer Master) di bagian atas untuk mencatat alamat tujuan pengiriman.</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 mt-4">
                    <Checkbox
                      id="stay-on-page"
                      checked={stayOnPage}
                      onCheckedChange={setStayOnPage}
                      className="w-5 h-5 rounded-lg border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <Label htmlFor="stay-on-page" className="text-sm font-bold text-slate-600 cursor-pointer">
                      Tetap di halaman ini setelah bayar
                    </Label>
                  </div>

                  <div className="flex justify-end pt-6">
                    <Button
                      className="h-14 px-10 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-blue-100 transition-all active:scale-95 flex items-center justify-center w-fit"
                      disabled={cart.length === 0 || isLoading}
                      onClick={handleSubmit}
                    >
                      {isLoading ? 'MEMPROSES...' : 'BAYAR SEKARANG'}
                    </Button>
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* SERIAL ALLOCATION MODAL */}
      <Dialog open={showSerialModal} onOpenChange={setShowSerialModal}>
        <DialogContent className="max-w-xl p-0 overflow-hidden rounded-[32px] bg-white border-none shadow-2xl">
          <div className="bg-purple-600 p-8 text-white relative">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-3">
                <ShieldCheck className="w-6 h-6" />
                Alokasi Nomor Seri
              </DialogTitle>
              <p className="text-purple-100 text-xs font-medium opacity-80 mt-1">
                Harap pindai (scan) Nomor Seri untuk produk yang memerlukan pelacakan IMEI/SN sebelum melanjutkan pembayaran.
              </p>
            </DialogHeader>
          </div>
          <div className="p-8 space-y-6">
            <div className="max-h-[50vh] overflow-y-auto space-y-6 pr-2">
              {serialTrackedItemsInCart.map((item, idx) => {
                const requiredQty = item.quantity;
                const assignments = serialAssignments[item.product_id] || Array(requiredQty).fill('');

                return (
                  <div key={item.product_id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-slate-900">{item.product_name}</p>
                        <p className="text-xs text-slate-500 font-medium">Butuh {requiredQty} Nomor Seri</p>
                      </div>
                      <Badge className="bg-purple-100 text-purple-700">Serial</Badge>
                    </div>
                    <div className="space-y-2">
                      {assignments.map((serial, sIdx) => (
                        <div key={sIdx} className="relative">
                          <Input
                            value={serial}
                            onChange={(e) => {
                              const newArr = [...assignments];
                              newArr[sIdx] = e.target.value;
                              setSerialAssignments({ ...serialAssignments, [item.product_id]: newArr });
                            }}
                            placeholder={`Scan Nomor Seri ke-${sIdx + 1}...`}
                            className="pl-10 h-11 font-bold bg-white border-slate-200 uppercase"
                            autoFocus={idx === 0 && sIdx === 0}
                          />
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button
                variant="outline"
                className="h-12 px-6 rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                onClick={() => setShowSerialModal(false)}
              >
                Kembali
              </Button>
              <Button
                className="h-12 px-8 rounded-2xl bg-purple-600 hover:bg-purple-700 font-black uppercase tracking-widest text-[10px]"
                onClick={async () => {
                  // Final Verification against DB
                  setIsLoading(true);
                  let allValid = true;
                  let errMsg = '';
                  
                  for (const item of serialTrackedItemsInCart) {
                    const assigned = serialAssignments[item.product_id] || [];
                    const validAssigned = assigned.filter(s => s && s.trim() !== '');
                    if (validAssigned.length !== item.quantity) {
                      allValid = false;
                      errMsg = `Produk ${item.product_name} masih kurang nomor seri!`;
                      break;
                    }
                    
                    // Verify if each serial is Available
                    for (const s of validAssigned) {
                      const records = await api.entities.InventorySerial.filter({ store_id: storeId, serial_number: s, status: 'Available' });
                      if (records.length === 0) {
                        allValid = false;
                        errMsg = `Nomor Seri ${s} tidak ditemukan di gudang atau sudah terjual!`;
                        break;
                      }
                    }
                  }
                  
                  setIsLoading(false);
                  
                  if (!allValid) {
                    toast({ title: 'Gagal Verifikasi Seri', description: errMsg, variant: 'destructive' });
                    return;
                  }
                  
                  setShowSerialModal(false);
                  handleSubmit(); // Process actual checkout
                }}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Konfirmasi & Bayar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showPrintPreview && completedTransaction && (
        <PrintInvoice
          invoice={completedTransaction}
          store={store}
          onClose={() => setShowPrintPreview(false)}
          forceThermal={true}
        />
      )}
    </>
  );
}
