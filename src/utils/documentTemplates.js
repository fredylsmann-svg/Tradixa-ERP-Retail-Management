/**
 * TRADIXA - Professional Document Templates
 * Menyediakan layout Invoice, PO, dan DO bergaya Corporate
 */
import moment from 'moment';

export const getDocumentTemplate = ({
  type = 'INVOICE',
  storeName,
  logoUrl,
  brandColor = '#2563eb',
  titleColor = '#0f172a',
  signatureUrl,
  ownerName,
  ownerPosition,
  data = {},
  layout = 'Modern',
  isPreview = false,
  fontFamily = 'Inter'
}) => {
  const isAP = type === 'INVOICE AP' || type === 'GOODS RECEIPT' || type === 'GOODS RECEIPT NOTE' || type === 'INVENTORY GRN' || type === 'SURAT JALAN' || type === 'DELIVERY ORDER';
  const isInvoice = type.includes('INVOICE');
  const isPaid = (data.status === 'Paid' || data.payment_status === 'Paid');
  const isPayment = type === 'PAYMENT' || type === 'KUITANSI';
  const isDO = type === 'DELIVERY ORDER' || type === 'GOODS RECEIPT' || type === 'GOODS RECEIPT NOTE' || type === 'SURAT JALAN';
  const isReceived = data.status === 'Received' || data.status === 'Selesai' || !!data.received_signature;
  const isGRN = type === 'GOODS RECEIPT' || type === 'GOODS RECEIPT NOTE';
  const displayType = isGRN ? 'GOODS RECEIPT NOTE' : (isPayment ? 'OFFICIAL RECEIPT' : (isReceived && isDO ? 'DELIVERY RECEIPT' : (isPaid && type === 'INVOICE' ? 'PAYMENT RECEIPT' : type)));

  // Color & Gradient Logic
  const getBgStyle = (color) => color.includes('gradient') ? `background: ${color};` : `background-color: ${color};`;
  const getTextStyle = (color) => color.includes('gradient') ? `background: ${color}; -webkit-background-clip: text; -webkit-text-fill-color: transparent;` : `color: ${color};`;

  // SLA Performance Logic
  const confirmedDate = data.confirmed_delivery_date ? new Date(data.confirmed_delivery_date) : null;
  const arrivalDate = data.actual_arrival_at ? new Date(data.actual_arrival_at) : (data.received_at ? new Date(data.received_at) : (data.date ? new Date(data.date) : null));

  let deliveryPerformance = 'ON-TIME';
  let performanceColor = '#10b981';

  if (confirmedDate && arrivalDate) {
    // Give 30 mins grace period
    const graceArrival = new Date(arrivalDate.getTime() - (30 * 60 * 1000));
    if (graceArrival <= confirmedDate) {
      deliveryPerformance = 'ON-TIME DELIVERY';
      performanceColor = '#10b981';
    } else {
      deliveryPerformance = 'LATE DELIVERY';
      performanceColor = '#ef4444';
    }
  } else if (!arrivalDate) {
    deliveryPerformance = 'PENDING ARRIVAL';
    performanceColor = '#f59e0b';
  }

  const primaryColor = brandColor;
  const headerColor = titleColor;

  // Font Mapping
  const fontConfig = {
    'Inter': "'Inter', sans-serif",
    'Roboto': "'Roboto', sans-serif",
    'Playfair Display': "'Playfair Display', serif",
    'Montserrat': "'Montserrat', sans-serif",
    'Outfit': "'Outfit', sans-serif"
  };

  const selectedFont = fontConfig[fontFamily] || fontConfig['Inter'];
  const fontImport = `
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Montserrat:wght@400;600;700;800;900&family=Outfit:wght@400;600;700;800;900&family=Playfair+Display:wght@400;600;700;800;900&family=Roboto:wght@400;500;700;900&display=swap" rel="stylesheet">
  `;

  // Mock Data jika tidak ada
  // Robust Data Extraction
  const docNo = data.no || data.invoice_number || data.po_number || data.pr_number || 'DOC-REF';
  const now = new Date();
  const date = data.date || data.created_date || now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');
  const time = data.time || now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  const fullTimestamp = data.timestamp_wib || `${date} ${time}`;

  const watermark = isPreview ? `
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 150px; font-weight: 900; color: #000; opacity: ${isInvoice ? '0.03' : '0.05'}; pointer-events: none; z-index: 100; white-space: nowrap; font-family: sans-serif; letter-spacing: 20px;">
      SAMPLE
    </div>
  ` : '';

  const senderName = isAP ? (data.supplier_name || 'Supplier Name') : storeName;
  const senderAddress = isAP ? (data.supplier_address || 'Supplier Address') : (data.store_address || 'Alamat Toko');
  const senderPhone = isAP ? (data.supplier_phone || '-') : (data.store_phone || '-');
  const senderEmail = isAP ? (data.supplier_email || '-') : (data.store_email || '-');

  const receiverName = isAP ? storeName : (data.customer_name || data.billed_to_name || 'Customer Name');
  const receiverAddress = isAP ? (data.store_address || 'Alamat Toko') : (data.customer_address || data.billed_to_address || 'Customer Address');
  const receiverPhone = isAP ? (data.store_phone || '-') : (data.customer_phone || '-');
  const receiverEmail = isAP ? (data.store_email || '-') : (data.customer_email || '-');

  // Format addresses for HTML
  const formattedSenderAddress = senderAddress.replace(/\n/g, '<br>');
  const formattedReceiverAddress = receiverAddress.replace(/\n/g, '<br>');
  const formattedStoreAddress = (data.store_address || 'Alamat Toko Belum Diatur').replace(/\n/g, '<br>');

  const billedTo = data.billedTo || data.customer_name || 'Customer Name\n123 Street Address, City\ncontact@email.com';
  const items = data.items || [];
  const subtotal = items.reduce((acc, item) => acc + (Number(item.total || item.subtotal) || 0), 0);
  const discount = data.discount || 0;
  const total = data.total !== undefined ? data.total : (subtotal - discount + (data.tax_amount || 0));

  // Custom data mapping for incoming logistics (isDO)
  // Ensure 'FROM' is Supplier and 'DESTINATION' is Store
  const finalSenderName = (isDO && isAP) ? (data.supplier_name || 'SUPPLIER') : senderName;
  const finalReceiverName = (isDO && isAP) ? storeName : receiverName;
  const finalSenderAddress = (isDO && isAP) ? (data.supplier_address || '-') : senderAddress;
  const finalReceiverAddress = (isDO && isAP) ? (data.store_address || '-') : receiverAddress;

  // Layout untuk Purchase Order (PO) - Modern
  if (type === 'PURCHASE ORDER' && layout === 'Modern') {
    return `
      <div style="font-family: 'Inter', sans-serif; max-width: 800px; margin: 0 auto; background: white; min-height: 1000px; display: flex; flex-direction: column; border: 1px solid #e2e8f0; position: relative; overflow: hidden;">
        ${watermark}
        <!-- Header Strip -->
        <div style="height: 10px; ${getBgStyle(primaryColor)} width: 100%;"></div>
        
        <div style="padding: 40px 50px;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 40px;">
            <div>
              ${logoUrl ? `<img src="${logoUrl}" style="max-height: 70px; margin-bottom: 15px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.05));">` : `<div style="font-weight: 900; font-size: 24px; ${getTextStyle(primaryColor)} letter-spacing: -1px;">${storeName}</div>`}
              <div style="font-size: 13px; font-weight: 700; color: #1e293b; margin-top: 5px;">${storeName}</div>
              <div style="font-size: 12px; color: #64748b; line-height: 1.5; max-width: 250px;">
                ${formattedStoreAddress}
              </div>
            </div>
            <div style="text-align: right;">
              <h1 style="font-size: 36px; font-weight: 900; margin: 0; ${getTextStyle(headerColor)} text-transform: uppercase; letter-spacing: -1px; line-height: 0.9;">PURCHASE<br>ORDER</h1>
              <div style="margin-top: 15px;">
                <p style="margin: 0; color: #64748b; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Order No.</p>
                <p style="margin: 2px 0 0 0; color: #0f172a; font-size: 16px; font-weight: 900;">${docNo}</p>
              </div>
            </div>
          </div>

          <!-- Info Bar -->
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; padding: 20px; background: #f8fafc; border-radius: 12px; margin-bottom: 40px; border: 1px solid #f1f5f9;">
            <div>
              <p style="margin: 0; color: #94a3b8; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Order Date</p>
              <p style="margin: 4px 0 0 0; color: #1e293b; font-size: 13px; font-weight: 700;">${date}</p>
            </div>
            <div>
              <p style="margin: 0; color: #94a3b8; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Requested Arrival Date</p>
              <p style="margin: 4px 0 0 0; color: #1e293b; font-size: 13px; font-weight: 700;">${data.delivery_date || '-'}</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; color: #94a3b8; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Order Status</p>
              <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 900; color: ${data.status === 'Confirmed' || data.status === 'Approved' ? '#10b981' : data.status === 'In Transit' ? '#f59e0b' : '#64748b'}; text-transform: uppercase;">
                ${data.status || 'Draft'}
              </p>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-bottom: 50px;">
            <div>
              <h3 style="font-size: 11px; font-weight: 800; ${getTextStyle(primaryColor)} text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px; border-bottom: 2px solid #f1f5f9; padding-bottom: 5px;">VENDOR / SUPPLIER</h3>
              <p style="margin: 0; font-size: 16px; font-weight: 900; color: #0f172a;">${data.supplier_name || 'Supplier Name'}</p>
              <div style="margin-top: 8px; font-size: 13px; color: #64748b; line-height: 1.6;">
                ${data.supplier_address || 'Supplier address details here...'}
              </div>
              <p style="margin: 5px 0 0 0; font-size: 13px; font-weight: 600; color: #334155;">WA: ${data.supplier_phone || '-'}</p>
              ${data.supplier_email ? `<p style="margin: 2px 0 0 0; font-size: 13px; color: #64748b;">Email: ${data.supplier_email}</p>` : ''}
            </div>
            <div>
              <h3 style="font-size: 11px; font-weight: 800; ${getTextStyle(primaryColor)} text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px; border-bottom: 2px solid #f1f5f9; padding-bottom: 5px;">SHIP TO (DESTINATION)</h3>
              <p style="margin: 0; font-size: 14px; font-weight: 800; color: #0f172a;">${storeName}</p>
              <div style="margin-top: 8px; font-size: 13px; color: #64748b; line-height: 1.6;">
                ${data.shipping_address || data.store_address || 'Gudang Utama - ' + storeName}
              </div>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
            <thead>
              <tr style="background: #1e293b; color: white;">
                <th style="padding: 15px; text-align: left; font-size: 11px; font-weight: 800; text-transform: uppercase; border-top-left-radius: 8px;">No.</th>
                <th style="padding: 15px; text-align: left; font-size: 11px; font-weight: 800; text-transform: uppercase;">Description</th>
                <th style="padding: 15px; text-align: center; font-size: 11px; font-weight: 800; text-transform: uppercase;">Qty</th>
                <th style="padding: 15px; text-align: right; font-size: 11px; font-weight: 800; text-transform: uppercase;">Unit Price</th>
                <th style="padding: 15px; text-align: right; font-size: 11px; font-weight: 800; text-transform: uppercase; border-top-right-radius: 8px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, i) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 15px; font-size: 13px; color: #64748b; text-align: center;">${String(i + 1).padStart(2, '0')}</td>
                  <td style="padding: 15px; font-size: 14px; color: #1e293b; font-weight: 700;">${item.name || item.product_name}</td>
                  <td style="padding: 15px; text-align: center; font-size: 14px; color: #1e293b; font-weight: 600;">${item.qty || item.quantity} ${item.unit || 'pcs'}</td>
                  <td style="padding: 15px; text-align: right; font-size: 13px; color: #64748b;">Rp ${Number(item.price || item.unit_price).toLocaleString()}</td>
                  <td style="padding: 15px; text-align: right; font-size: 14px; color: #0f172a; font-weight: 800;">Rp ${Number(item.total || item.subtotal).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="display: flex; justify-content: flex-end; margin-bottom: 60px;">
            <div style="width: 300px; padding: 25px; background: #f8fafc; border-radius: 16px; border: 1px solid #f1f5f9;">
              <div style="display: flex; justify-content: space-between; padding-bottom: 10px; margin-bottom: 10px; border-bottom: 1px dashed #cbd5e1;">
                <span style="font-size: 13px; color: #64748b; font-weight: 600;">Subtotal</span>
                <span style="font-size: 14px; color: #0f172a; font-weight: 700;">Rp ${subtotal.toLocaleString()}</span>
              </div>
              ${data.tax_amount > 0 ? `
              <div style="display: flex; justify-content: space-between; padding-bottom: 10px; margin-bottom: 10px; border-bottom: 1px dashed #cbd5e1;">
                <span style="font-size: 13px; color: #64748b; font-weight: 600;">PPN (11%)</span>
                <span style="font-size: 14px; color: #0f172a; font-weight: 700;">Rp ${data.tax_amount.toLocaleString()}</span>
              </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; padding-top: 5px;">
                <span style="font-size: 15px; color: #0f172a; font-weight: 900; text-transform: uppercase;">Total Order</span>
                <span style="font-size: 18px; ${getTextStyle(primaryColor)} font-weight: 900;">Rp ${total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <!-- Signatures -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; text-align: center;">
            <div style="display: flex; flex-direction: column; align-items: center;">
              <p style="font-size: 12px; color: #94a3b8; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px;">Dipesan Oleh,</p>
              <div style="height: 80px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; width: 100%;">
                ${data.admin_signature ? `<img src="${data.admin_signature}" style="max-height: 80px; object-fit: contain; mix-blend-mode: multiply;">` : ''}
              </div>
              <p style="font-size: 14px; font-weight: 900; color: #1e293b; margin: 0;">${data.admin_name || '...........................'}</p>
              <p style="font-size: 11px; color: #64748b; font-weight: 600; margin: 2px 0 0 0;">${data.admin_role || 'Authorized Signature'}</p>
            </div>

            <div style="display: flex; flex-direction: column; align-items: center;">
              <p style="font-size: 12px; color: #94a3b8; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px;">Supplier / Vendor,</p>
              <div style="height: 80px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; width: 100%;">
                ${data.supplier_signature ? `<img src="${data.supplier_signature}" style="max-height: 80px; object-fit: contain; mix-blend-mode: multiply;">` : ''}
              </div>
              <p style="font-size: 14px; font-weight: 900; color: #1e293b; margin: 0;">${data.supplier_name || '...........................'}</p>
              <p style="font-size: 11px; color: #64748b; font-weight: 600; margin: 2px 0 0 0;">Digital Signature</p>
            </div>
          </div>
        </div>

        <!-- Footer Bar -->
        <div style="margin-top: auto; padding: 30px 50px; background: #1e293b; color: #94a3b8; font-size: 11px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-weight: 600; color: white;">This Purchase Order is a legally binding document generated by ${storeName}.</p>
          <p style="margin: 5px 0 0 0;">© 2026 Tradixa Cloud ERP • System Authenticated</p>
        </div>
      </div>
    `;
  }

  // Layout untuk Inventory GRN (Goods Receipt Note) - Modern
  if (type === 'INVENTORY GRN' && layout === 'Modern') {
    return `
      <div style="font-family: 'Inter', sans-serif; max-width: 800px; margin: 0 auto; background: white; min-height: 1000px; display: flex; flex-direction: column; border: 1px solid #e2e8f0; position: relative; overflow: hidden;">
        ${watermark}
        <!-- Header Strip -->
        <div style="height: 10px; ${getBgStyle(primaryColor)} width: 100%;"></div>
        
        <div style="padding: 40px 50px;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 40px;">
            <div>
              ${logoUrl ? `<img src="${logoUrl}" style="max-height: 70px; margin-bottom: 15px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.05));">` : `<div style="font-weight: 900; font-size: 24px; ${getTextStyle(primaryColor)} letter-spacing: -1px;">${storeName}</div>`}
              <div style="font-size: 13px; font-weight: 700; color: #1e293b; margin-top: 5px;">${storeName}</div>
              <div style="font-size: 12px; color: #64748b; line-height: 1.5; max-width: 250px;">
                ${formattedStoreAddress}
              </div>
            </div>
            <div style="text-align: right;">
              <h1 style="font-size: 32px; font-weight: 900; margin: 0; ${getTextStyle(headerColor)} text-transform: uppercase; letter-spacing: -1px; line-height: 0.9;">INVENTORY GOODS<br>RECEIPT NOTE</h1>
              <div style="margin-top: 15px;">
                <p style="margin: 0; color: #64748b; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Document No.</p>
                <p style="margin: 2px 0 0 0; color: #0f172a; font-size: 16px; font-weight: 900;">${docNo}</p>
                <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 10px; font-weight: 700;">${fullTimestamp}</p>
                <p style="margin: 8px 0 0 0; color: #cbd5e1; font-size: 8px; font-weight: 700; text-transform: uppercase;">DOCUMENT ORIGINAL COPY</p>
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px;">
            <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #f1f5f9;">
              <h3 style="font-size: 10px; font-weight: 800; ${getTextStyle(primaryColor)} text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px;">INFORMASI PENGADAAN</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <p style="margin: 0; color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase;">Supplier</p>
                  <p style="margin: 2px 0 0 0; color: #1e293b; font-size: 12px; font-weight: 700;">${data.supplier_name || '-'}</p>
                </div>
                <div>
                  <p style="margin: 0; color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase;">Reference PO</p>
                  <p style="margin: 2px 0 0 0; ${getTextStyle(primaryColor)} font-size: 12px; font-weight: 800;">${data.po_number || '-'}</p>
                </div>
                <div>
                  <p style="margin: 0; color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase;">No. Surat Jalan</p>
                  <p style="margin: 2px 0 0 0; color: #1e293b; font-size: 12px; font-weight: 700;">${data.surat_jalan || '-'}</p>
                </div>
                <div>
                  <p style="margin: 0; color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase;">Journal ID</p>
                  <p style="margin: 2px 0 0 0; color: #64748b; font-size: 11px; font-family: monospace;">${data.journal_id || '-'}</p>
                </div>
              </div>
            </div>
            <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #f1f5f9;">
              <h3 style="font-size: 10px; font-weight: 800; ${getTextStyle(primaryColor)} text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px;">LOKASI & PETUGAS</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <p style="margin: 0; color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase;">Storage Location</p>
                  <p style="margin: 2px 0 0 0; color: #1e293b; font-size: 12px; font-weight: 700;">${data.storage_location || '-'}</p>
                </div>
                <div>
                  <p style="margin: 0; color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase;">Diverifikasi Oleh</p>
                  <p style="margin: 2px 0 0 0; color: #1e293b; font-size: 12px; font-weight: 700;">${data.admin_name || 'Administrator'}</p>
                </div>
                <div style="grid-column: span 2;">
                  <p style="margin: 0; color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase;">Catatan</p>
                  <p style="margin: 2px 0 0 0; color: #64748b; font-size: 11px; font-style: italic;">"${data.notes || 'Tidak ada catatan tambahan untuk penerimaan ini.'}"</p>
                </div>
              </div>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
              <tr style="background: #1e293b; color: white;">
                <th style="padding: 12px 15px; text-align: left; font-size: 11px; font-weight: 800; text-transform: uppercase; border-top-left-radius: 8px;">No.</th>
                <th style="padding: 12px 15px; text-align: left; font-size: 11px; font-weight: 800; text-transform: uppercase;">Nama Produk</th>
                <th style="padding: 12px 10px; text-align: center; font-size: 11px; font-weight: 800; text-transform: uppercase;">Batch No.</th>
                <th style="padding: 12px 10px; text-align: center; font-size: 11px; font-weight: 800; text-transform: uppercase;">Expiry</th>
                <th style="padding: 12px 15px; text-align: center; font-size: 11px; font-weight: 800; text-transform: uppercase;">Jumlah</th>
                <th style="padding: 12px 15px; text-align: center; font-size: 11px; font-weight: 800; text-transform: uppercase;">Reject</th>
                <th style="padding: 12px 15px; text-align: center; font-size: 11px; font-weight: 800; text-transform: uppercase;">Unit</th>
                <th style="padding: 12px 15px; text-align: center; font-size: 11px; font-weight: 800; text-transform: uppercase; border-top-right-radius: 8px;">Kondisi</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, i) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 12px 15px; font-size: 12px; color: #64748b; text-align: center;">${i + 1}</td>
                  <td style="padding: 12px 15px;">
                    <div style="font-size: 13px; color: #0f172a; font-weight: 700;">${item.name || item.product_name}</div>
                  </td>
                  <td style="padding: 12px 10px; text-align: center; vertical-align: top;">
                    ${item.tracking_type === 'Batch' && item.batches?.length > 0 ? 
                      item.batches.map(b => `
                        <div style="display: block; padding: 2px 6px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; font-size: 9px; color: #1d4ed8; font-weight: 700; margin-bottom: 2px; text-align: center;">
                          ${b.batch_number}
                        </div>
                      `).join('') 
                    : '<span style="font-size: 10px; color: #94a3b8;">-</span>'}
                  </td>
                  <td style="padding: 12px 10px; text-align: center; vertical-align: top;">
                    ${item.tracking_type === 'Batch' && item.batches?.length > 0 ? 
                      item.batches.map(b => `
                        <div style="display: block; padding: 2px 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 9px; color: #475569; font-weight: 600; margin-bottom: 2px; text-align: center;">
                          ${b.expiry_date ? new Date(b.expiry_date).toLocaleDateString('en-GB') : '-'}
                        </div>
                      `).join('') 
                    : (item.expired_date ? `<span style="font-size: 9px; color: #475569; font-weight: 600;">${new Date(item.expired_date).toLocaleDateString('en-GB')}</span>` : '<span style="font-size: 10px; color: #94a3b8;">-</span>')}
                  </td>
                  <td style="padding: 12px 15px; text-align: center; font-size: 14px; color: #0f172a; font-weight: 800;">${item.qty || item.quantity || item.warehouse_qty || 0}</td>
                  <td style="padding: 12px 15px; text-align: center; font-size: 14px; color: #ef4444; font-weight: 800;">${item.reject_qty || 0}</td>
                  <td style="padding: 12px 15px; text-align: center; font-size: 12px; color: #64748b;">${item.unit || 'pcs'}</td>
                  <td style="padding: 12px 15px; text-align: center;">
                    <span style="display: inline-block; padding: 2px 10px; background: #f0fdf4; color: #16a34a; font-size: 10px; font-weight: 800; border-radius: 4px; border: 1px solid #bbf7d0;">${item.condition || 'Baik'}</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="display: flex; justify-content: flex-end; margin-bottom: 60px;">
            <div style="text-align: right;">
              <p style="margin: 0; color: #94a3b8; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">TOTAL NILAI ASSET</p>
              <p style="margin: 5px 0 0 0; color: #10b981; font-size: 28px; font-weight: 900;">Rp ${total.toLocaleString()}</p>
            </div>
          </div>

          <!-- Triple Signatures -->
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; margin-top: 40px; text-align: center;">
            <div style="background: #f8fafc; padding: 20px; border-radius: 20px; border: 1px solid #f1f5f9;">
              <p style="font-size: 10px; color: #94a3b8; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">DIKIRIM OLEH</p>
              <div style="height: 80px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                ${data.shipped_signature ? `<img src="${data.shipped_signature}" style="max-height: 80px; mix-blend-mode: multiply;">` : ''}
              </div>
              <p style="font-size: 13px; font-weight: 900; color: #1e293b; margin: 0;">${data.driver_name || 'DRIVER'}</p>
              <p style="font-size: 10px; color: #94a3b8; font-weight: 600; margin: 2px 0 0 0;">( DRIVER / PENGIRIM )</p>
            </div>

            <div style="background: #f8fafc; padding: 20px; border-radius: 20px; border: 1px solid #f1f5f9;">
              <p style="font-size: 10px; color: #94a3b8; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">DITERIMA OLEH</p>
              <div style="height: 80px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                ${data.received_signature ? `<img src="${data.received_signature}" style="max-height: 80px; mix-blend-mode: multiply;">` : ''}
              </div>
              <p style="font-size: 13px; font-weight: 900; color: #1e293b; margin: 0;">${data.received_by || 'ADMINISTRATOR'}</p>
              <p style="font-size: 10px; color: #10b981; font-weight: 800; margin: 2px 0 0 0;">DIGITALLY VERIFIED</p>
            </div>

            <div style="background: #f8fafc; padding: 20px; border-radius: 20px; border: 1px solid #f1f5f9;">
              <p style="font-size: 10px; color: #94a3b8; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">DISETUJUI OLEH</p>
              <div style="height: 80px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                ${data.approved_signature ? `<img src="${data.approved_signature}" style="max-height: 80px; mix-blend-mode: multiply;">` : ''}
              </div>
              <p style="font-size: 13px; font-weight: 900; color: #1e293b; margin: 0;">${data.approved_by || 'WAREHOUSE MANAGER'}</p>
              <p style="font-size: 10px; color: #94a3b8; font-weight: 600; margin: 2px 0 0 0;">( APPROVAL STATUS )</p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: auto; padding: 20px 50px; background: white; color: #94a3b8; font-size: 10px; border-top: 1px solid #f1f5f9;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <p style="margin: 0;">Tradixa ERP System • ${new Date().getFullYear()}</p>
            <p style="margin: 0;">Page 1 of 1</p>
          </div>
        </div>
      </div>
    `;
  }

  if (layout === 'Thermal') {
    return `
      <div style="font-family: 'Courier New', Courier, monospace; width: 100%; max-width: 300px; margin: 0 auto; background: white; color: #000; font-size: 12px; line-height: 1.4; padding: 10px;">
        <div style="text-align: center; margin-bottom: 10px;">
          <div style="font-weight: bold; font-size: 16px; margin-bottom: 2px;">${storeName}</div>
          <div style="font-size: 10px;">RECEIPT</div>
        </div>
        
        <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 5px 0; margin-bottom: 10px; font-size: 11px;">
          <div style="display: flex; justify-content: space-between;"><span>No:</span><span>${docNo}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>Date:</span><span>${date} ${time}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>Cust:</span><span>${data.customer_name || 'Walk-in'}</span></div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11px;">
          <tbody>
            ${items.map(item => `
              <tr>
                <td colspan="3" style="padding-bottom: 2px; font-weight: bold;">${item.name}</td>
              </tr>
              <tr>
                <td style="padding-bottom: 5px; width: 40%;">${item.qty} x ${item.price.toLocaleString()}</td>
                <td style="padding-bottom: 5px; text-align: right;" colspan="2">${item.total.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="border-top: 1px dashed #000; padding-top: 5px; margin-bottom: 10px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>Subtotal</span>
            <span>${subtotal.toLocaleString()}</span>
          </div>
          ${discount > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>Discount</span>
            <span>-${discount.toLocaleString()}</span>
          </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-top: 5px;">
            <span>TOTAL</span>
            <span>${total.toLocaleString()}</span>
          </div>
        </div>

        <div style="border-top: 1px dashed #000; padding-top: 5px; text-align: center; font-size: 10px;">
          <div style="margin-bottom: 3px; font-weight: bold;">Payment: ${data.payment_method || 'Cash'}</div>
          <div>Terima kasih atas kunjungan Anda</div>
          <div>Barang yang dibeli tidak dapat ditukar</div>
        </div>
      </div>
    `;
  }


  if (layout === 'Classic') {
    return `
      ${fontImport}
      <div style="font-family: ${selectedFont}; max-width: 800px; margin: 0 auto; background: white; padding: 40px; color: #334155; position: relative; overflow: hidden;">
        ${watermark}
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 40px;">
          <div>
            <h1 style="${getTextStyle(primaryColor)} margin: 0; font-size: 48px; font-weight: 900; letter-spacing: -2px; line-height: 1;">${displayType}</h1>
            <p style="margin: 5px 0 0 0; color: #1e293b; font-size: 14px; font-weight: 700;">NO. ${docNo}</p>
            <p style="margin: 2px 0 0 0; color: #94a3b8; font-size: 11px; font-weight: 600;">${fullTimestamp}</p>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 800; font-size: 18px; color: #1e293b;">${storeName}</div>
            <p style="margin: 5px 0 0 0; color: #64748b; font-size: 12px; line-height: 1.5;">${formattedStoreAddress}</p>
          </div>
        </div>

        ${isGRN ? `
        <!-- Professional GRN Header (Real ERP Style - Classic) -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 25px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px;">
          <div style="flex: 1; max-width: 420px;">
            <h3 style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 1.5px; margin: 0 0 8px 0;">RECEIVED FROM</h3>
            <p style="margin: 0; font-size: 13px; font-weight: 800; color: #1e293b; line-height: 1.3;">${data.supplier_name || 'Supplier Name'}</p>
            <p style="margin: 3px 0 0 0; font-size: 11px; color: #64748b; line-height: 1.4;">${data.supplier_address || '-'}</p>
            <p style="margin: 5px 0 0 0; font-size: 11px; color: #475569;">Tel: ${data.supplier_phone || '-'} &nbsp;|&nbsp; ${data.supplier_email || '-'}</p>
          </div>
          <div style="width: 220px; border-left: 2px solid #e2e8f0; padding-left: 20px;">
            <h3 style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 1.5px; margin: 0 0 8px 0;">DOCUMENT DETAILS</h3>
            <table style="font-size: 11px; color: #1e293b; line-height: 1.8; width: 100%;">
              <tr><td style="font-weight: 700; color: #64748b; width: 75px;">Date</td><td style="font-weight: 700;">${date}</td></tr>
              <tr><td style="font-weight: 700; color: #64748b;">PO Ref</td><td style="font-weight: 700;">${data.po_number || '-'}</td></tr>
              <tr><td style="font-weight: 700; color: #64748b;">No. SJ</td><td style="font-weight: 700;">${data.surat_jalan || '-'}</td></tr>
              <tr><td style="font-weight: 700; color: #64748b;">Storage</td><td style="font-weight: 700;">${data.storage_location || '-'}</td></tr>
            </table>
          </div>
        </div>
        ` : `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px;">
          <div style="background-color: #f8fafc; padding: 20px; border-top: 4px solid #cbd5e1;">
            <h3 style="margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; color: #64748b; letter-spacing: 1px;">
              ${type === 'PURCHASE ORDER' ? 'VENDOR / SUPPLIER' : (isDO || type === 'INVENTORY GRN') ? 'FROM' : isAP ? 'From (Supplier):' : 'From:'}
            </h3>
            ${type === 'INVENTORY GRN' ? `
              <div style="font-size: 13px; line-height: 1.6;">
                <p style="margin: 0;"><strong>Supplier:</strong> ${data.supplier_name || '-'}</p>
                <p style="margin: 4px 0 0 0;"><strong>Verifier:</strong> ${data.admin_name || 'Admin'}</p>
                <p style="margin: 4px 0 0 0; font-style: italic; color: #94a3b8;">${data.notes || '-'}</p>
              </div>
            ` : `
              <div style="font-size: 14px; line-height: 1.6; color: #1e293b;">
                <p style="margin: 0; font-weight: 700;">${type === 'PURCHASE ORDER' ? (data.supplier_name || 'Supplier Name') : finalSenderName}</p>
                <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">${type === 'PURCHASE ORDER' ? (data.supplier_address || '-') : finalSenderAddress}</p>
                <p style="margin: 4px 0 0 0; font-size: 12px;"><strong>WA/Telp:</strong> ${type === 'PURCHASE ORDER' ? (data.supplier_phone || '-') : senderPhone}</p>
                <p style="margin: 2px 0 0 0; font-size: 12px;"><strong>Email:</strong> ${type === 'PURCHASE ORDER' ? (data.supplier_email || '-') : senderEmail}</p>
              </div>
            `}
          </div>
          <div style="background-color: #f8fafc; padding: 20px; border-top: 4px solid ${primaryColor};">
            <h3 style="margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; color: #64748b; letter-spacing: 1px;">
              ${type === 'PURCHASE ORDER' ? 'SHIP TO (DESTINATION)' :
        (isDO || type === 'INVENTORY GRN') ? 'DESTINATION' : isAP ? 'Billed To (You):' : 'Billed to:'}
            </h3>
            ${type === 'INVENTORY GRN' ? `
              <div style="font-size: 13px; line-height: 1.6;">
                <p style="margin: 0;"><strong>Store:</strong> ${storeName}</p>
                <p style="margin: 4px 0 0 0;"><strong>Ref PO:</strong> ${data.po_number || '-'}</p>
                <p style="margin: 4px 0 0 0;"><strong>Surat Jalan:</strong> ${data.surat_jalan || '-'}</p>
              </div>
            ` : `
              <div style="font-size: 14px; line-height: 1.6; color: #1e293b;">
                <p style="margin: 0; font-weight: 700;">${type === 'PURCHASE ORDER' ? storeName : finalReceiverName}</p>
                <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">${type === 'PURCHASE ORDER' ? (data.shipping_address || data.store_address || 'Gudang Utama - ' + storeName) : finalReceiverAddress}</p>
                ${type === 'PURCHASE ORDER' ? '' : `
                <p style="margin: 4px 0 0 0; font-size: 12px;"><strong>Phone:</strong> ${receiverPhone}</p>
                <p style="margin: 2px 0 0 0; font-size: 12px;"><strong>Email:</strong> ${receiverEmail}</p>
                `}
              </div>
            `}
          </div>
        </div>
        `}

        ${type !== 'INVENTORY GRN' ? `
        <!-- Document Details Bar -->
        <div style="display: flex; gap: 40px; margin-bottom: 40px; padding: 15px 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;">
          <div>
            <span style="font-size: 10px; color: #94a3b8; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 2px;">Document Date</span>
            <span style="font-size: 13px; font-weight: 700; color: #1e293b;">${date}</span>
          </div>
          ${(type === 'PURCHASE ORDER' || isDO || isGRN) ? `
          <div>
            <span style="font-size: 10px; color: #94a3b8; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 2px;">
              ${type === 'PURCHASE ORDER' ? 'Requested Arrival Date' : 'Arrival Date'}
            </span>
            <span style="font-size: 13px; font-weight: 700; color: #1e293b;">
              ${data.delivery_date || data.confirmed_delivery_date || data.shipping_confirmation?.confirmed_delivery_date || data.shipping_confirmation?.delivery_date || '-'}
            </span>
          </div>
          ` : ''}
          ${isGRN ? `
          <div>
            <span style="font-size: 10px; color: #94a3b8; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 2px;">Actual Arrival</span>
            <span style="font-size: 13px; font-weight: 700; color: #3b82f6;">${arrivalDate ? moment.utc(arrivalDate).format('DD/MM/YYYY HH:mm') : '-'}</span>
          </div>
          ` : ''}
          ${type !== 'PURCHASE ORDER' ? `
          <div>
            <span style="font-size: 10px; color: #94a3b8; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 2px;">
              ${(isDO || isGRN) ? 'Ship Via' : 'Due Date'}
            </span>
            <span style="font-size: 13px; font-weight: 700; ${getTextStyle(primaryColor)}">
              ${(isDO || isGRN) ? (data.shipping_confirmation ? (data.shipping_confirmation.delivery_method === 'Ekspedisi Eksternal' ? data.shipping_confirmation.courier_name : data.shipping_confirmation.delivery_method) : (data.shipping_via || data.ship_via || '-')) : (data.due_date || '-')}
            </span>
          </div>
          ` : ''}
          <div style="margin-left: auto; text-align: right;">
            <span style="font-size: 10px; color: #94a3b8; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 2px;">
              ${type === 'PURCHASE ORDER' ? 'Order Status' : 'Status'}
            </span>
            <span style="font-size: 11px; font-weight: 900; color: ${isReceived ? '#10b981' : (data.status === 'In Transit' ? '#f59e0b' : (isDO && data.status === 'Approved') ? '#3b82f6' : '#64748b')}; text-transform: uppercase;">
              ${isReceived ? 'RECEIVED' : (isDO && data.status === 'Approved') ? 'CONFIRMED' : (data.status || 'RELEASED')}
            </span>
          </div>
        </div>

        ${(type === 'DELIVERY ORDER' && data.shipping_confirmation) ? `
        <!-- Shipping Information Section (Classic) -->
        <div style="margin-bottom: 20px; padding: 15px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;">
          <h3 style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #92400e; letter-spacing: 1px; margin: 0 0 12px 0;">Shipping Information</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; font-size: 12px;">
            <div>
              <span style="display: block; color: #92400e; font-weight: 800; font-size: 9px; text-transform: uppercase; margin-bottom: 2px;">Metode Pengiriman</span>
              <span style="color: #1e293b; font-weight: 700;">${data.shipping_confirmation.delivery_method || '-'}</span>
            </div>
            <div>
              <span style="display: block; color: #92400e; font-weight: 800; font-size: 9px; text-transform: uppercase; margin-bottom: 2px;">Ekspedisi / Kurir</span>
              <span style="color: #1e293b; font-weight: 700;">${data.shipping_confirmation.courier_name || data.shipping_confirmation.driver_name || '-'}</span>
            </div>
            <div>
              <span style="display: block; color: #92400e; font-weight: 800; font-size: 9px; text-transform: uppercase; margin-bottom: 2px;">Driver / Pengirim</span>
              <span style="color: #1e293b; font-weight: 700;">${data.shipping_confirmation.driver_name || '-'}</span>
            </div>
            <div>
              <span style="display: block; color: #92400e; font-weight: 800; font-size: 9px; text-transform: uppercase; margin-bottom: 2px;">No. Kendaraan</span>
              <span style="color: #1e293b; font-weight: 700;">${data.shipping_confirmation.vehicle_number || '-'}</span>
            </div>
            <div>
              <span style="display: block; color: #92400e; font-weight: 800; font-size: 9px; text-transform: uppercase; margin-bottom: 2px;">No. Resi / Tracking</span>
              <span style="color: #1e293b; font-weight: 700;">${data.shipping_confirmation.tracking_number || '-'}</span>
            </div>
            <div>
              <span style="display: block; color: #92400e; font-weight: 800; font-size: 9px; text-transform: uppercase; margin-bottom: 2px;">No. SJ Supplier</span>
              <span style="color: #1e293b; font-weight: 900;">${data.shipping_confirmation.supplier_delivery_note_no || '-'}</span>
            </div>
          </div>
          ${data.shipping_confirmation.shipping_notes ? `
          <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #fde68a;">
            <span style="display: block; color: #92400e; font-weight: 800; font-size: 9px; text-transform: uppercase; margin-bottom: 2px;">Catatan Pengiriman</span>
            <span style="color: #1e293b; font-weight: 600; font-size: 12px; font-style: italic;">${data.shipping_confirmation.shipping_notes}</span>
          </div>
          ` : ''}
        </div>
        ` : ''}
        ` : ''}


        ${(type === 'INVOICE AR' || type === 'INVOICE AP') ? `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 1px solid #e2e8f0;">
          <thead style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
            <tr style="font-size: 10px; fontWeight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px;">
              <th style="padding: 14px 16px; text-align: left; border-right: 1px solid #e2e8f0;">${type === 'INVOICE AR' ? 'Deskripsi Tagihan' : 'Description'}</th>
              <th style="padding: 14px 16px; text-align: right;">Jumlah (IDR)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 14px 16px; color: #475569; font-weight: 600; border-right: 1px solid #e2e8f0;">${type === 'INVOICE AR' ? 'Total Nilai Penjualan / Piutang Usaha' : 'Total Bill Amount'}</td>
              <td style="padding: 14px 16px; text-align: right; font-weight: 700;">Rp ${(data.bill_amount || 500000).toLocaleString()}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f0fdf4;">
              <td style="padding: 14px 16px; color: #15803d; font-weight: 600; border-right: 1px solid #e2e8f0;">${type === 'INVOICE AR' ? 'Total Pembayaran yang Telah Diterima' : 'Total Amount Settled'}</td>
              <td style="padding: 14px 16px; text-align: right; font-weight: 900, color: #16a34a;">- Rp ${(data.settled_amount || 200000).toLocaleString()}</td>
            </tr>
            <tr style="${getBgStyle(primaryColor)} color: white;">
              <td style="padding: 18px 16px; font-weight: 900; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">${type === 'INVOICE AR' ? 'Sisa Tagihan yang Harus Diselesaikan' : 'Total Outstanding Balance'}</td>
              <td style="padding: 18px 16px; text-align: right; font-weight: 900; font-size: 18px; font-style: italic;">Rp ${(data.remaining_amount || 300000).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
        ` : `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 1px solid #e2e8f0; table-layout: fixed;">
          <thead>
            <tr style="background-color: #f8fafc; color: #1e293b; border-bottom: 2px solid #e2e8f0;">
              ${isGRN ? `
                <th style="padding: 12px 10px; text-align: left; font-size: 10px; text-transform: uppercase; border-right: 1px solid #e2e8f0; width: 34%;">Item Description</th>
                <th style="padding: 12px 10px; text-align: center; font-size: 10px; text-transform: uppercase; border-right: 1px solid #e2e8f0; width: 11%;">Ordered</th>
                <th style="padding: 12px 10px; text-align: center; font-size: 10px; text-transform: uppercase; border-right: 1px solid #e2e8f0; width: 12%;">Received</th>
                <th style="padding: 12px 10px; text-align: center; font-size: 10px; text-transform: uppercase; border-right: 1px solid #e2e8f0; width: 11%; color: #ef4444;">Reject</th>
                <th style="padding: 12px 10px; text-align: center; font-size: 10px; text-transform: uppercase; border-right: 1px solid #e2e8f0; width: 12%; color: #f59e0b;">B.Order</th>
                <th style="padding: 12px 10px; text-align: center; font-size: 10px; text-transform: uppercase; width: 20%; color: #0369a1; font-weight: 900; background: #f0f9ff;">Accepted</th>
              ` : `
              <th style="padding: 12px 15px; text-align: left; font-size: 11px; text-transform: uppercase; border-right: 1px solid #e2e8f0;">
                Description
              </th>
              ${(isDO || type === 'INVENTORY GRN') ? `
                <th style="padding: 12px 15px; text-align: center; font-size: 11px; text-transform: uppercase; border-right: 1px solid #e2e8f0;">SKU</th>
              ` : ''}
              <th style="padding: 12px 15px; text-align: center; font-size: 11px; text-transform: uppercase; border-right: 1px solid #e2e8f0;">Qty</th>
              ${type === 'INVENTORY GRN' ? `
                <th style="padding: 12px 15px; text-align: center; font-size: 11px; text-transform: uppercase; border-right: 1px solid #e2e8f0; color: #ef4444;">Reject</th>
              ` : ''}
              <th style="padding: 12px 15px; text-align: right; font-size: 11px; text-transform: uppercase; border-right: 1px solid #e2e8f0;">
                ${(isDO || type === 'INVENTORY GRN') ? 'Unit' : 'Price'}
              </th>
              <th style="padding: 12px 15px; text-align: right; font-size: 11px; text-transform: uppercase;">
                ${(isDO || type === 'INVENTORY GRN') ? 'Notes/Cond' : 'Total'}
              </th>
              `}
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                ${isGRN ? `
                  <td style="padding: 12px 15px; font-size: 13px; color: #1e293b; border-right: 1px solid #e2e8f0; font-weight: 600;">
                    ${item.name || item.product_name}
                    ${item.sku ? `<br/><span style="font-size: 10px; color: #94a3b8; font-weight: 500;">SKU: ${item.sku}</span>` : ''}
                    ${(item.notes || item.condition) ? `<br/><span style="font-size: 10px; color: #64748b; font-style: italic;">${item.notes || item.condition}</span>` : ''}
                  </td>
                  <td style="padding: 12px 8px; text-align: center; font-size: 13px; color: #1e293b; border-right: 1px solid #e2e8f0;">${item.qty_ordered || item.quantity || 0}</td>
                  <td style="padding: 12px 8px; text-align: center; font-size: 13px; color: #1e293b; border-right: 1px solid #e2e8f0;">${item.received_qty || 0}</td>
                  <td style="padding: 12px 8px; text-align: center; font-size: 13px; color: #ef4444; border-right: 1px solid #e2e8f0; font-weight: 700;">${item.reject_qty || 0}</td>
                  <td style="padding: 12px 8px; text-align: center; font-size: 13px; color: #f59e0b; border-right: 1px solid #e2e8f0;">${item.back_order_qty || 0}</td>
                  <td style="padding: 12px 10px; text-align: center; font-size: 14px; color: #0369a1; font-weight: 900; background: #f0f9ff;">${item.accepted_qty || 0}</td>
                ` : `
                <td style="padding: 15px; font-size: 13px; color: #1e293b; border-right: 1px solid #e2e8f0; font-weight: 600;">
                  ${item.name || item.product_name}
                  ${(type === 'PURCHASE ORDER' && item.sku) ? `<br/><span style="font-size: 10px; color: #64748b; font-weight: 400;">SKU: ${item.sku}</span>` : ''}
                  ${item.tracking_type === 'Batch' && item.batches?.length > 0 ? `
                    <div style="margin-top: 4px; display: flex; flex-direction: column; gap: 2px;">
                      ${item.batches.map(b => `
                        <div style="display: inline-block; padding: 2px 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 9px; color: #64748b; font-weight: 600; width: fit-content;">
                          <span style="color: #475569;">Batch: ${b.batch_number}</span> &nbsp;|&nbsp; 
                          Mfg: ${b.manufacture_date ? new Date(b.manufacture_date).toLocaleDateString('en-GB') : '-'} &nbsp;|&nbsp; Exp: ${b.expiry_date ? new Date(b.expiry_date).toLocaleDateString('en-GB') : '-'} &nbsp;|&nbsp; 
                          <span style="color: #2563eb;">Qty: ${b.quantity}</span>
                        </div>
                      `).join('')}
                    </div>
                  ` : (item.tracking_type !== 'Batch' && item.expired_date) ? `
                    <div style="margin-top: 4px; display: inline-block; padding: 2px 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 9px; color: #64748b; font-weight: 600; width: fit-content;">
                      Exp: ${new Date(item.expired_date).toLocaleDateString('en-GB')}
                    </div>
                  ` : ''}
                </td>
                ${(isDO || type === 'INVENTORY GRN') ? `
                  <td style="padding: 15px; text-align: center; font-size: 12px; color: #64748b; border-right: 1px solid #e2e8f0; font-weight: 700;">${item.sku || '-'}</td>
                ` : ''}
                <td style="padding: 15px; text-align: center; font-size: 13px; color: #1e293b; border-right: 1px solid #e2e8f0;">${item.qty || item.quantity || item.warehouse_qty || item.qty_ordered || 0}</td>
                ${type === 'INVENTORY GRN' ? `
                  <td style="padding: 15px; text-align: center; font-size: 13px; color: #ef4444; border-right: 1px solid #e2e8f0; font-weight: 700;">${item.reject_qty || 0}</td>
                ` : ''}
                <td style="padding: 15px; text-align: right; font-size: 13px; color: #1e293b; border-right: 1px solid #e2e8f0;">
                  ${(isDO || type === 'INVENTORY GRN') ? (item.unit || 'pcs') : `Rp ${(item.price || item.unit_price || 0).toLocaleString()}`}
                </td>
                <td style="padding: 15px; text-align: right; font-size: 13px; color: #1e293b; font-weight: 700;">
                  ${(isDO || type === 'INVENTORY GRN') ? (item.notes || item.condition || data.shipping_confirmation?.shipping_notes || data.shipping_notes || '-') : `Rp ${(item.total || item.subtotal || 0).toLocaleString()}`}
                </td>
                `}
              </tr>
            `).join('')}
          </tbody>
          ${isGRN ? `
          <tfoot>
            <tr style="background: #f8fafc; border-top: 2px solid #e2e8f0;">
              <td style="padding: 10px 10px; font-size: 11px; color: #64748b; font-style: italic;" colspan="4">
                Catatan: ${data.notes || 'Barang diterima dalam kondisi baik.'}
              </td>
              <td style="padding: 10px 10px; text-align: center; font-size: 9px; color: #64748b; font-weight: 800; text-transform: uppercase; border-right: 1px solid #e2e8f0;">TOTAL</td>
              <td style="padding: 10px 10px; text-align: center; font-size: 15px; color: #0369a1; font-weight: 900; background: #f0f9ff;">${items.reduce((acc, item) => acc + (item.accepted_qty || 0), 0)}</td>
            </tr>
          </tfoot>
          ` : ''}
        </table>
        `}

        ${(type === 'INVOICE AR' || type === 'INVOICE AP' || isDO || isGRN) ? '' : `
        <div style="display: flex; justify-content: flex-end; margin-top: 15px;">
          <div style="width: 300px;">
              <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="color: #64748b; font-size: 14px;">${type === 'INVENTORY GRN' ? 'Total Asset Value' : 'Subtotal'}</span>
                <span style="font-weight: 800; font-size: 16px; ${getTextStyle(primaryColor)}">Rp ${total.toLocaleString()}</span>
              </div>
              ${(discount > 0 && type !== 'INVENTORY GRN') ? `
              <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="color: #64748b; font-size: 14px;">Discount</span>
                <span style="font-weight: 600; color: #ef4444;">-Rp ${discount.toLocaleString()}</span>
              </div>
              ` : ''}
              ${(!isDO && type !== 'INVENTORY GRN') ? `
              <div style="display: flex; justify-content: space-between; padding: 20px 0; ${getTextStyle(primaryColor)}">
                <span style="font-weight: 800; font-size: 16px;">TOTAL</span>
                <span style="font-weight: 800; font-size: 18px;">Rp ${total.toLocaleString()}</span>
              </div>
              ` : ''}
          </div>
        </div>
        `}

        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 50px;">
          <div style="text-align: center; width: 180px;">
            ${(type === 'INVENTORY GRN' || isDO) ? `
              <p style="font-size: 10px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 10px;">PENGIRIM / KURIR</p>
              <div style="height: 60px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                ${(data.courier_signature || data.shipped_signature || data.driver_signature) ? `<img src="${data.courier_signature || data.shipped_signature || data.driver_signature}" style="max-height: 60px; mix-blend-mode: multiply;">` : ''}
              </div>
              <p style="font-size: 13px; font-weight: 900; color: #1e293b; margin: 0;">${(data.shipping_confirmation?.driver_name) || data.shipped_by || data.driver_name || 'DRIVER'}</p>
              ${(data.driver_phone || data.shipping_confirmation?.courier_phone) ? `<p style="font-size: 10px; font-weight: 700; color: #64748b; margin: 2px 0 0 0;">WA: ${data.driver_phone || data.shipping_confirmation.courier_phone}</p>` : ''}
              <p style="font-size: 9px; color: #94a3b8; font-weight: 600; margin: 2px 0 0 0;">( PENGIRIM )</p>
            ` : type === 'PURCHASE ORDER' ? `
              <p style="font-size: 10px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 10px;">SUPPLIER / VENDOR</p>
              <div style="height: 60px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                ${data.supplier_signature ? `<img src="${data.supplier_signature}" style="max-height: 60px; mix-blend-mode: multiply;">` : ''}
              </div>
              <p style="font-size: 13px; font-weight: 900; color: #1e293b; margin: 0;">${data.supplier_name || '...........................'}</p>
              <p style="font-size: 9px; color: #94a3b8; font-weight: 600; margin: 2px 0 0 0;">( Digital Signature )</p>
            ` : ''}
          </div>

          ${(isDO && type !== 'INVENTORY GRN' && !isGRN) ? `
          <div style="text-align: center; width: 180px;">
            <p style="margin: 0 0 10px 0; font-size: 10px; color: #94a3b8; font-weight: 800; text-transform: uppercase;">VENDOR / SUPPLIER</p>
            <div style="height: 60px; display: flex; align-items: center; justify-content: center; margin: 5px 0;">
              ${(data.shipping_signature || data.supplier_signature) ? `<img src="${data.shipping_signature || data.supplier_signature}" style="max-height: 60px; object-fit: contain; mix-blend-mode: multiply;">` : ''}
            </div>
            <p style="margin: 10px 0 2px 0; font-size: 13px; font-weight: 700; color: #1e293b; text-decoration: underline;">${data.supplier_name || '...........................'}</p>
            <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 600;">Authorized Supplier</p>
          </div>
          ` : ''}

          ${(type === 'INVENTORY GRN' || isDO) ? `
          <div style="text-align: center; width: 180px;">
            <p style="font-size: 10px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 10px;">DITERIMA OLEH</p>
            <div style="height: 60px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
              ${(isGRN ? (data.received_signature || data.admin_signature) : data.received_signature) ? `<img src="${isGRN ? (data.received_signature || data.admin_signature) : data.received_signature}" style="max-height: 60px; mix-blend-mode: multiply;">` : ''}
            </div>
            <p style="font-size: 13px; font-weight: 900; color: #1e293b; margin: 0;">${(isGRN ? (data.received_by || data.admin_name) : data.received_by) || '...........................'}</p>
            <p style="font-size: 9px; color: ${(isGRN ? (data.received_signature || data.admin_signature) : data.received_signature) ? '#10b981' : '#94a3b8'}; font-weight: 800; margin: 2px 0 0 0;">${(isGRN ? (data.received_signature || data.admin_signature) : data.received_signature) ? 'DIGITALLY VERIFIED' : '( STAF GUDANG )'}</p>
          </div>
          ` : ''}

          ${(isDO && type !== 'INVENTORY GRN') ? '' : `
          <div style="text-align: center; width: 180px;">
            <p style="margin: 0 0 10px 0; font-size: 10px; color: #94a3b8; font-weight: 800; text-transform: uppercase;">
              ${type === 'INVENTORY GRN' ? 'DISETUJUI OLEH' : type === 'PURCHASE ORDER' ? 'DIPESAN OLEH' : 'Hormat Kami,'}
            </p>
            <p style="margin: 0 0 5px 0; font-size: 13px; font-weight: 700; color: #1e293b;">${type === 'INVENTORY GRN' ? '' : storeName}</p>
            <div style="height: 60px; display: flex; align-items: center; justify-content: center; margin: 5px 0;">
              ${((data.approved_signature || signatureUrl || data.admin_signature) && (!isPreview || type.includes('INVOICE') || type === 'INVENTORY GRN')) ? `<img src="${data.approved_signature || signatureUrl || data.admin_signature}" style="max-height: 60px; object-fit: contain; mix-blend-mode: multiply;">` : ''}
            </div>
            <p style="margin: 10px 0 2px 0; font-size: 13px; font-weight: 700; color: #1e293b; text-decoration: underline;">${data.approved_by || ownerName || data.admin_name || '...........................'}</p>
            <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 600;">${type === 'INVENTORY GRN' ? 'Kepala Gudang / Manager' : (ownerPosition || data.admin_role || 'Authorized Signature')}</p>
          </div>
          `}
        </div>

        <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
          Thank you for your business!
        </div>
      </div>
    `;
  }

  // Modern Layout (Inspired by Image 1)
  return `
    ${fontImport}
    <div style="font-family: ${selectedFont}; max-width: 800px; margin: 0 auto; background: white; display: flex; flex-direction: column; position: relative; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
      ${watermark}
      <div style="padding: 50px 50px 0 50px; flex: 1; position: relative; z-index: 10;">
        <div style="width: 100%; height: 6px; ${getBgStyle(primaryColor)} position: absolute; top: 0; left: 0;"></div>
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
          <div>
            ${logoUrl ? `<img src="${logoUrl}" style="max-height: 80px; max-width: 200px; object-fit: contain;">` : `<div style="font-weight: 900; font-size: 24px; color: #1e293b; letter-spacing: -1px;">YOUR LOGO</div>`}
          </div>
          <div style="text-align: right;">
            <div style="font-size: 13px; font-weight: 700; color: #94a3b8; letter-spacing: 1px;">NO. ${docNo}</div>
            <h1 style="font-size: 60px; font-weight: 900; margin: 0; ${getTextStyle(headerColor)} letter-spacing: -3px; line-height: 1; text-transform: uppercase;">${displayType}</h1>
          </div>
        </div>

        ${isGRN ? `
        <!-- Professional GRN Header (Modern ERP Style) -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 25px; background: #f8fafc; padding: 18px 20px; border-radius: 10px; border: 1px solid #e2e8f0;">
          <div style="flex: 1; max-width: 400px;">
            <h3 style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #94a3b8; letter-spacing: 1.5px; margin: 0 0 8px 0;">RECEIVED FROM</h3>
            <p style="margin: 0; font-size: 13px; font-weight: 800; color: #1e293b; line-height: 1.3;">${data.supplier_name || 'Supplier Name'}</p>
            <p style="margin: 3px 0 0 0; font-size: 11px; color: #64748b; line-height: 1.4;">${data.supplier_address || '-'}</p>
            <p style="margin: 5px 0 0 0; font-size: 11px; color: #475569;">Tel: ${data.supplier_phone || '-'} &nbsp;|&nbsp; ${data.supplier_email || '-'}</p>
          </div>
          <div style="width: 220px; margin-left: 20px; background: white; padding: 14px 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h3 style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #94a3b8; letter-spacing: 1.5px; margin: 0 0 8px 0;">DOCUMENT DETAILS</h3>
            <table style="font-size: 11px; color: #1e293b; line-height: 1.8; width: 100%;">
              <tr><td style="color: #64748b; font-weight: 700; width: 65px;">Date</td><td style="text-align: right; font-weight: 700;">${date}</td></tr>
              <tr><td style="color: #64748b; font-weight: 700;">PO Ref</td><td style="text-align: right; font-weight: 700;">${data.po_number || '-'}</td></tr>
              <tr><td style="color: #64748b; font-weight: 700;">No. SJ</td><td style="text-align: right; font-weight: 700;">${data.surat_jalan || '-'}</td></tr>
              <tr><td style="color: #64748b; font-weight: 700;">Storage</td><td style="text-align: right; font-weight: 700;">${data.storage_location || '-'}</td></tr>
            </table>
          </div>
        </div>
        ` : ''}

        <!-- Document Info Bar (Unified for Modern) -->
        <div style="display: flex; gap: 30px; margin-bottom: 40px; padding: 20px; border-radius: 12px; background: #f8fafc; border: 1px solid #f1f5f9;">
          <div style="flex: 1;">
            <span style="font-size: 10px; color: #94a3b8; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 4px;">Document Date</span>
            <span style="font-size: 13px; font-weight: 700; color: #1e293b;">${date}</span>
          </div>
          ${(type === 'PURCHASE ORDER' || isDO || isGRN) ? `
          <div style="flex: 1;">
            <span style="font-size: 10px; color: #94a3b8; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 4px;">
              ${type === 'PURCHASE ORDER' ? 'Requested Arrival Date' : 'Arrival Date'}
            </span>
            <span style="font-size: 13px; font-weight: 700; color: #1e293b;">
              ${data.delivery_date || data.confirmed_delivery_date || data.shipping_confirmation?.confirmed_delivery_date || data.shipping_confirmation?.delivery_date || '-'}
            </span>
          </div>
          ` : ''}
          ${isGRN ? `
          <div style="flex: 1;">
            <span style="font-size: 10px; color: #94a3b8; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 4px;">Actual Arrival</span>
            <span style="font-size: 13px; font-weight: 700; color: #3b82f6;">${arrivalDate ? moment.utc(arrivalDate).format('DD/MM/YYYY HH:mm') : '-'}</span>
          </div>
          ` : ''}
          ${type !== 'PURCHASE ORDER' ? `
          <div style="flex: 1;">
            <span style="font-size: 10px; color: #94a3b8; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 4px;">
              ${(isDO || isGRN) ? 'Ship Via' : 'Due Date'}
            </span>
            <span style="font-size: 13px; font-weight: 700; color: ${primaryColor};">
              ${(isDO || isGRN) ? (data.shipping_confirmation ? (data.shipping_confirmation.delivery_method === 'Ekspedisi Eksternal' ? data.shipping_confirmation.courier_name : data.shipping_confirmation.delivery_method) : (data.shipping_via || data.ship_via || '-')) : (data.due_date || '-')}
            </span>
          </div>
          ` : ''}
          <div style="flex: 1; text-align: right;">
            <span style="font-size: 10px; color: #94a3b8; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 4px;">Status</span>
            <span style="font-size: 13px; font-weight: 900; color: ${isReceived ? '#10b981' : (data.status === 'In Transit' ? '#f59e0b' : (isDO && data.status === 'Approved') ? '#3b82f6' : '#64748b')}; text-transform: uppercase;">
              ${isReceived ? 'RECEIVED' : (isDO && data.status === 'Approved') ? 'CONFIRMED' : (data.status || 'RELEASED')}
            </span>
          </div>
        </div>

        ${(type === 'DELIVERY ORDER' && data.shipping_confirmation) ? `
        <!-- Shipping Information Section -->
        <div style="margin-bottom: 30px; padding: 20px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px;">
          <h3 style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #92400e; letter-spacing: 1px; margin: 0 0 15px 0;">Shipping Information</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; font-size: 12px;">
            <div>
              <span style="display: block; color: #92400e; font-weight: 800; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Metode Pengiriman</span>
              <span style="color: #1e293b; font-weight: 700;">${data.shipping_confirmation.delivery_method || '-'}</span>
            </div>
            <div>
              <span style="display: block; color: #92400e; font-weight: 800; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Ekspedisi / Kurir</span>
              <span style="color: #1e293b; font-weight: 700;">${data.shipping_confirmation.courier_name || data.shipping_confirmation.driver_name || '-'}</span>
            </div>
            <div>
              <span style="display: block; color: #92400e; font-weight: 800; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">No. SJ Supplier</span>
              <span style="color: #1e293b; font-weight: 900;">${data.shipping_confirmation.supplier_delivery_note_no || '-'}</span>
            </div>
            <div>
              <span style="display: block; color: #92400e; font-weight: 800; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Driver / Pengirim</span>
              <span style="color: #1e293b; font-weight: 700;">${data.shipping_confirmation.driver_name || data.shipping_confirmation.courier_person_name || '-'}</span>
              ${(data.shipping_confirmation.driver_phone || data.shipping_confirmation.courier_person_phone || data.shipping_confirmation.courier_phone) ? `<span style="display: block; color: #64748b; font-weight: 600; font-size: 10px; margin-top: 2px;">WA: ${data.shipping_confirmation.driver_phone || data.shipping_confirmation.courier_person_phone || data.shipping_confirmation.courier_phone}</span>` : ''}
            </div>
            <div>
              <span style="display: block; color: #92400e; font-weight: 800; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Tipe Kendaraan</span>
              <span style="color: #1e293b; font-weight: 700;">${data.shipping_confirmation.ship_via || '-'}</span>
            </div>
            <div>
              <span style="display: block; color: #92400e; font-weight: 800; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">No. Kendaraan</span>
              <span style="color: #1e293b; font-weight: 700;">${data.shipping_confirmation.vehicle_number || '-'}</span>
            </div>
            <div>
              <span style="display: block; color: #92400e; font-weight: 800; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">No. Resi / Tracking</span>
              <span style="color: #1e293b; font-weight: 700;">${data.shipping_confirmation.tracking_number || '-'}</span>
            </div>
          </div>
          ${data.shipping_confirmation.shipping_notes ? `
          <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed #fde68a;">
            <span style="display: block; color: #92400e; font-weight: 800; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">Catatan Pengiriman</span>
            <span style="color: #1e293b; font-weight: 600; font-size: 12px; font-style: italic;">${data.shipping_confirmation.shipping_notes}</span>
          </div>
          ` : ''}
        </div>
        ` : ''}


        ${(!isGRN) ? `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 50px;">
          <div style="background-color: #f8fafc; padding: 20px; border-top: 4px solid #cbd5e1;">
            <h3 style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin: 0 0 12px 0;">
              ${type === 'PURCHASE ORDER' ? 'VENDOR / SUPPLIER' : (isDO || type === 'INVENTORY GRN') ? 'FROM' : isAP ? 'From (Supplier):' : 'From:'}
            </h3>
            <div style="font-size: 14px; line-height: 1.5; color: #1e293b;">
              <p style="margin: 0; font-weight: 700;">${type === 'PURCHASE ORDER' ? (data.supplier_name || 'Supplier Name') : finalSenderName}</p>
              <p style="margin: 5px 0 0 0; font-weight: 400; color: #64748b; font-size: 13px;">${type === 'PURCHASE ORDER' ? (data.supplier_address || '-') : finalSenderAddress}</p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #1e293b;"><strong>WA/Telp:</strong> ${type === 'PURCHASE ORDER' ? (data.supplier_phone || '-') : senderPhone}</p>
              <p style="margin: 2px 0 0 0; font-size: 12px; color: #1e293b;"><strong>Email:</strong> ${type === 'PURCHASE ORDER' ? (data.supplier_email || '-') : senderEmail}</p>
            </div>
          </div>
          <div style="background-color: #f8fafc; padding: 20px; border-top: 4px solid ${primaryColor};">
            <h3 style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin: 0 0 12px 0;">
              ${type === 'PURCHASE ORDER' ? 'SHIP TO (DESTINATION)' : (isDO || type === 'INVENTORY GRN') ? 'DESTINATION' : isAP ? 'Billed To (You):' : 'Billed to:'}
            </h3>
            <div style="font-size: 14px; line-height: 1.5; color: #1e293b;">
              <p style="margin: 0; font-weight: 700;">${type === 'PURCHASE ORDER' ? storeName : finalReceiverName}</p>
              <p style="margin: 5px 0 0 0; font-weight: 400; color: #64748b; font-size: 13px;">${type === 'PURCHASE ORDER' ? (data.shipping_address || data.store_address || 'Gudang Utama - ' + storeName) : finalReceiverAddress}</p>
              ${type === 'PURCHASE ORDER' ? '' : `
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #1e293b;"><strong>Phone:</strong> ${receiverPhone}</p>
              <p style="margin: 2px 0 0 0; font-size: 12px; color: #1e293b;"><strong>Email:</strong> ${receiverEmail}</p>
              `}
            </div>
          </div>
        </div>
        ` : ''}



        ${(type === 'INVOICE AR' || type === 'INVOICE AP') ? `
        <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 30px;">
          <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
            <thead style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <tr style="font-size: 10px; fontWeight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px;">
                <th style="padding: 14px 16px; text-align: left;">${type === 'INVOICE AR' ? 'Deskripsi Tagihan' : 'Description'}</th>
                <th style="padding: 14px 16px; text-align: right;">Jumlah (IDR)</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 14px 16px; color: #475569; font-weight: 600;">${type === 'INVOICE AR' ? 'Total Nilai Penjualan / Piutang Usaha' : 'Total Bill Amount'}</td>
                <td style="padding: 14px 16px; text-align: right; font-weight: 700;">Rp ${(data.bill_amount || 500000).toLocaleString()}</td>
              </tr>
              <tr style="background-color: #f0fdf4; border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 14px 16px; color: #15803d; font-weight: 600;">${type === 'INVOICE AR' ? 'Total Pembayaran yang Telah Diterima' : 'Total Amount Settled'}</td>
                <td style="padding: 14px 16px; text-align: right; font-weight: 900; color: #16a34a;">- Rp ${(data.settled_amount || 200000).toLocaleString()}</td>
              </tr>
              <tr style="background-color: ${primaryColor}; color: white;">
                <td style="padding: 18px 16px; font-weight: 900; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">${type === 'INVOICE AR' ? 'Sisa Tagihan yang Harus Diselesaikan' : 'Total Outstanding Balance'}</td>
                <td style="padding: 18px 16px; text-align: right; font-weight: 900; font-size: 18px; font-style: italic;">Rp ${(data.remaining_amount || 300000).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
        ` : `
        <div style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; margin-bottom: 30px;">
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
              ${isGRN ? `
                <th style="padding: 14px 10px; text-align: left; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; width: 34%;">Item Description</th>
                <th style="padding: 14px 10px; text-align: center; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; width: 11%;">Ordered</th>
                <th style="padding: 14px 10px; text-align: center; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; width: 12%;">Received</th>
                <th style="padding: 14px 10px; text-align: center; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #ef4444; width: 11%;">Reject</th>
                <th style="padding: 14px 10px; text-align: center; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #f59e0b; width: 12%;">B.Order</th>
                <th style="padding: 14px 10px; text-align: center; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #0369a1; width: 20%; background: #f0f9ff;">Accepted</th>
              ` : `
                <th style="padding: 15px; text-align: left; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #94a3b8;">Description</th>
              ${(isDO || type === 'INVENTORY GRN') ? `
                <th style="padding: 15px; text-align: center; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #94a3b8;">SKU</th>
              ` : ''}
                <th style="padding: 15px; text-align: center; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #94a3b8;">Qty</th>
              ${type === 'INVENTORY GRN' ? `
                <th style="padding: 15px; text-align: center; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #ef4444;">Reject</th>
              ` : ''}
                <th style="padding: 15px; text-align: right; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #94a3b8;">
                  ${(isDO || type === 'INVENTORY GRN') ? 'Unit' : 'Price'}
                </th>
              <th style="padding: 15px; text-align: right; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #94a3b8;">
                ${(isDO || type === 'INVENTORY GRN') ? 'Notes' : 'Amount'}
              </th>
              `}
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                ${isGRN ? `
                  <td style="padding: 14px 15px; font-size: 13px; color: #1e293b; font-weight: 600;">
                    ${item.name || item.product_name}
                    ${item.sku ? `<br/><span style="font-size: 10px; color: #94a3b8; font-weight: 500;">SKU: ${item.sku}</span>` : ''}
                    ${(item.notes || item.condition) ? `<br/><span style="font-size: 10px; color: #64748b; font-style: italic;">${item.notes || item.condition}</span>` : ''}
                  </td>
                  <td style="padding: 14px 8px; text-align: center; font-size: 13px; color: #1e293b;">${item.qty_ordered || item.quantity || 0}</td>
                  <td style="padding: 14px 8px; text-align: center; font-size: 13px; color: #1e293b;">${item.received_qty || 0}</td>
                  <td style="padding: 14px 8px; text-align: center; font-size: 13px; color: #ef4444; font-weight: 700;">${item.reject_qty || 0}</td>
                  <td style="padding: 14px 8px; text-align: center; font-size: 13px; color: #f59e0b;">${item.back_order_qty || 0}</td>
                  <td style="padding: 14px 8px; text-align: center; font-size: 15px; color: #0369a1; font-weight: 900; background: #f0f9ff;">${item.accepted_qty || 0}</td>
                ` : `
                <td style="padding: 18px 15px; font-size: 15px; color: #334155; border-bottom: 1px solid #f8fafc; font-weight: 600;">
                  ${item.name || item.product_name}
                  ${item.tracking_type === 'Batch' && item.batches?.length > 0 ? `
                    <div style="margin-top: 4px; display: flex; flex-direction: column; gap: 2px;">
                      ${item.batches.map(b => `
                        <div style="display: inline-block; padding: 2px 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 9px; color: #64748b; font-weight: 600; width: fit-content;">
                          <span style="color: #475569;">Batch: ${b.batch_number}</span> &nbsp;|&nbsp; 
                          Mfg: ${b.manufacture_date ? new Date(b.manufacture_date).toLocaleDateString('en-GB') : '-'} &nbsp;|&nbsp; Exp: ${b.expiry_date ? new Date(b.expiry_date).toLocaleDateString('en-GB') : '-'} &nbsp;|&nbsp; 
                          <span style="color: #2563eb;">Qty: ${b.quantity}</span>
                        </div>
                      `).join('')}
                    </div>
                  ` : (item.tracking_type !== 'Batch' && item.expired_date) ? `
                    <div style="margin-top: 4px; display: inline-block; padding: 2px 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 9px; color: #64748b; font-weight: 600; width: fit-content;">
                      Exp: ${new Date(item.expired_date).toLocaleDateString('en-GB')}
                    </div>
                  ` : ''}
                </td>
                ${(isDO || type === 'INVENTORY GRN') ? `
                  <td style="padding: 18px 15px; text-align: center; font-size: 14px; color: #64748b; border-bottom: 1px solid #f8fafc;">${item.sku || '-'}</td>
                ` : ''}
                  <td style="padding: 18px 15px; text-align: center; font-size: 15px; color: #334155; border-bottom: 1px solid #f8fafc; font-weight: 700;">${item.qty || item.quantity || item.warehouse_qty || item.received_qty}</td>
                ${type === 'INVENTORY GRN' ? `
                  <td style="padding: 18px 15px; text-align: center; font-size: 15px; color: #ef4444; border-bottom: 1px solid #f8fafc; font-weight: 700;">${item.reject_qty || 0}</td>
                ` : ''}
                  <td style="padding: 18px 15px; text-align: right; font-size: 15px; color: #334155; border-bottom: 1px solid #f8fafc;">
                    ${(isDO || type === 'INVENTORY GRN') ? (item.unit || 'pcs') : `Rp ${(item.price || item.unit_price || 0).toLocaleString()}`}
                  </td>
                <td style="padding: 18px 15px; text-align: right; font-size: 15px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #f8fafc;">
                  ${(isDO || type === 'INVENTORY GRN') ? (item.notes || item.condition || data.shipping_confirmation?.shipping_notes || data.shipping_notes || '-') : `Rp ${(item.total || 0).toLocaleString()}`}
                </td>
                `}
              </tr>
            `).join('')}
          </tbody>
          ${isGRN ? `
          <tfoot>
            <tr style="background: #f8fafc; border-top: 2px solid #e2e8f0;">
              <td style="padding: 12px 15px; font-size: 11px; color: #64748b; font-style: italic;" colspan="4">
                Catatan: ${data.notes || 'Barang diterima dalam kondisi baik.'}
              </td>
              <td style="padding: 12px 10px; text-align: center; font-size: 9px; color: #64748b; font-weight: 800; text-transform: uppercase;">TOTAL</td>
              <td style="padding: 12px 10px; text-align: center; font-size: 16px; color: #0369a1; font-weight: 900; background: #f0f9ff;">${items.reduce((acc, item) => acc + (item.accepted_qty || 0), 0)}</td>
            </tr>
          </tfoot>
          ` : ''}
        </table>
      </div>

        ${(!isDO && type !== 'INVENTORY GRN' && !isGRN) ? `
          <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
            <div style="width: 300px;">
              ${discount > 0 ? `
              <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="color: #64748b; font-size: 14px;">Subtotal</span>
                <span style="font-weight: 800; font-size: 16px;">Rp ${subtotal.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="color: #64748b; font-size: 14px;">Discount</span>
                <span style="font-weight: 600; color: #ef4444;">-Rp ${discount.toLocaleString()}</span>
              </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; padding: 20px 0;">
                <span style="font-weight: 800; font-size: 16px; color: #64748b;">Total Amount</span>
                <span style="font-weight: 900; font-size: 24px; color: #0f172a;">Rp ${total.toLocaleString()}</span>
              </div>
            </div>
          </div>
         ` : ''}
      </div>
        `}

        <!-- Footer section -->
        <div style="padding: 0 50px 50px 50px; position: relative; z-index: 20;">
        <div style="margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-start;">
          
          ${isDO ? `
            <div style="text-align: center; display: flex; flex-direction: column; align-items: center; width: 180px;">
              <p style="margin: 0 0 5px 0; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase;">PENGIRIM / KURIR,</p>
              <p style="margin: 0 0 2px 0; font-size: 13px; font-weight: 700; color: #1e293b;">${(data.shipping_confirmation?.driver_name) || data.driver_name || data.shipped_by || 'DRIVER'}</p>
              ${(data.driver_phone || data.shipping_confirmation?.courier_phone) ? `<p style="margin: 0 0 10px 0; font-size: 10px; font-weight: 600; color: #64748b;">WA: ${data.driver_phone || data.shipping_confirmation.courier_phone}</p>` : '<div style="margin-bottom: 10px;"></div>'}
              <div style="height: 80px; display: flex; align-items: center; justify-content: center; margin: 5px 0;">
                ${(data.courier_signature || data.driver_signature || data.shipped_signature) ? `<img src="${data.courier_signature || data.driver_signature || data.shipped_signature}" style="max-height: 80px; object-fit: contain; mix-blend-mode: multiply;">` : '<div style="height: 80px; width: 120px; border-bottom: 1px dashed #cbd5e1;"></div>'}
              </div>
              <p style="margin: 5px 0 0 0; font-size: 12px; font-weight: 700; color: #1e293b;">( ........................... )</p>
            </div>

            ${(isDO && type !== 'INVENTORY GRN' && !isGRN) ? `
            <div style="text-align: center; display: flex; flex-direction: column; align-items: center; width: 180px;">
              <p style="margin: 0 0 5px 0; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase;">VENDOR / SUPPLIER,</p>
              <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: #1e293b;">${data.supplier_name || 'SUPPLIER'}</p>
              <div style="height: 80px; display: flex; align-items: center; justify-content: center; margin: 5px 0;">
                ${(data.shipping_signature || data.supplier_signature) ? `<img src="${data.shipping_signature || data.supplier_signature}" style="max-height: 80px; object-fit: contain; mix-blend-mode: multiply;">` : '<div style="height: 80px; width: 120px; border-bottom: 1px dashed #cbd5e1;"></div>'}
              </div>
              <p style="margin: 5px 0 0 0; font-size: 12px; font-weight: 700; color: #1e293b;">( ........................... )</p>
            </div>
            ` : ''}

            <div style="text-align: center; display: flex; flex-direction: column; align-items: center; width: 180px;">
              <p style="margin: 0 0 5px 0; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase;">DITERIMA OLEH,</p>
              <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: #1e293b;">${(isGRN ? (data.received_by || data.admin_name) : data.received_by) || 'PENERIMA'}</p>
              <div style="height: 80px; display: flex; align-items: center; justify-content: center; margin: 5px 0;">
                ${(isGRN ? (data.received_signature || data.admin_signature) : data.received_signature) ? `<img src="${isGRN ? (data.received_signature || data.admin_signature) : data.received_signature}" style="max-height: 80px; object-fit: contain; mix-blend-mode: multiply;">` : '<div style="height: 80px; width: 120px; border-bottom: 1px dashed #cbd5e1;"></div>'}
              </div>
              <p style="margin: 5px 0 0 0; font-size: 12px; font-weight: 700; color: #1e293b;">( ........................... )</p>
            </div>

            ${type === 'INVENTORY GRN' ? `
            <div style="text-align: center; display: flex; flex-direction: column; align-items: center; width: 180px;">
              <p style="margin: 0 0 5px 0; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase;">DISETUJUI OLEH,</p>
              <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: #1e293b;">${data.approved_by || 'KEPALA GUDANG'}</p>
              <div style="height: 80px; display: flex; align-items: center; justify-content: center; margin: 5px 0;">
                ${data.approved_signature ? `<img src="${data.approved_signature}" style="max-height: 80px; object-fit: contain; mix-blend-mode: multiply;">` : '<div style="height: 80px; width: 120px; border-bottom: 1px dashed #cbd5e1;"></div>'}
              </div>
              <p style="margin: 5px 0 0 0; font-size: 12px; font-weight: 700; color: #1e293b;">( ........................... )</p>
            </div>
            ` : ''}
          ` : `
            <div style="padding: 25px; background: #f8fafc; border-radius: 16px; max-width: 380px; border-left: 5px solid ${primaryColor}; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
              <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>Payment Method:</strong> <span style="color: ${primaryColor}; font-weight: 700;">${data.payment_method || 'Bank Transfer'}</span></p>
              <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;"><strong>Note:</strong> Terima kasih atas kepercayaan Anda.<br>Barang yang sudah dibeli tidak dapat ditukar.</p>
            </div>

            <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
              <p style="margin: 0 0 5px 0; font-size: 14px; color: #1e293b;">Hormat Kami,</p>
              <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: #1e293b;">${storeName}</p>
              ${(signatureUrl && (!isPreview || type.includes('INVOICE'))) ? `<img src="${signatureUrl}" style="max-width: 200px; height: auto; max-height: 120px; object-fit: contain; margin: 10px 0; mix-blend-mode: multiply;">` : '<div style="height: 100px; margin: 10px 0;"></div>'}
              <p style="margin: 0 0 2px 0; font-size: 14px; font-weight: 700; color: #1e293b; text-decoration: underline;">${(type === 'INVOICE' && ownerName) ? ownerName : '...........................'}</p>
              <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 600;">${(type === 'INVOICE' && ownerPosition) ? ownerPosition : 'Authorized Signature'}</p>
            </div>
          `}
          
        </div>
        </div>

      <!-- Wave Footer Decor -->
      <div style="height: 80px; position: relative; z-index: 1; overflow: hidden;">
        <svg viewBox="0 0 500 200" preserveAspectRatio="none" style="width: 100%; height: 100%;">
          <path d="M0,100 C150,200 350,0 500,100 L500,200 L0,200 Z" style="fill: ${primaryColor};"></path>
          <path d="M0,120 C150,220 350,20 500,120 L500,200 L0,200 Z" style="fill: #e2e8f0; opacity: 0.3;"></path>
        </svg>
      </div>
    </div>
  `;
};

