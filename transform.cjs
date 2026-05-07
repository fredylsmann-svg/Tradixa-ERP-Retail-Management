const fs = require('fs');
let code = fs.readFileSync('src/pages/PublicGRNSign.jsx', 'utf8');

code = code.replace(/PublicPOSign/g, 'PublicGRNSign');
code = code.replace(/Purchase Order/g, 'Goods Receipt Note');
code = code.replace(/PURCHASE ORDER/g, 'GOODS RECEIPT NOTE');
code = code.replace(/po_number/g, 'gr_number');
code = code.replace(/po\./g, 'grn.');
code = code.replace(/setPo\(/g, 'setGrn(');
code = code.replace(/const \[po,/g, 'const [grn,');
code = code.replace(/po \?/g, 'grn ?');
code = code.replace(/!po /g, '!grn ');
code = code.replace(/api\.entities\.PurchaseOrder/g, 'api.entities.GoodsReceipt');
code = code.replace(/supplier_signature/g, 'driver_signature');
code = code.replace(/supplier_signed_at/g, 'driver_signed_at');
code = code.replace(/supplier_name/g, 'driver_name');

fs.writeFileSync('src/pages/PublicGRNSign.jsx', code);
