/**
 * Tradixa Link Bridge Mock Server
 * Simulates a local EDC bridge listening on WebSocket port 9000.
 * Use this script to test EDC local integration without a physical EDC machine.
 * 
 * Run this script using:
 *   node scripts/mock-bridge.js
 */

const { WebSocketServer } = require('ws');

const PORT = 9000;
const wss = new WebSocketServer({ port: PORT });

console.log(`====================================================`);
console.log(` Tradixa Link Bridge Mock Server`);
console.log(` Running on ws://localhost:${PORT}`);
console.log(`====================================================`);
console.log(`Waiting for connection from POS checkout or agent form...`);

wss.on('connection', (ws) => {
  console.log('\n[Client Connected] POS Kasir / Transaksi Agen terhubung.');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`[EDC Request] Perintah diterima:`, data);

      if (data.command === 'purchase') {
        const amountFormatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(data.amount);
        console.log(`[EDC Action] Memproses Pembayaran sebesar: ${amountFormatted}`);
        console.log(`[EDC Action] Menunggu kartu digesek / diproses di mesin EDC...`);

        // Simulate 3 seconds processing on EDC machine
        setTimeout(() => {
          const traceNumber = Math.floor(100000 + Math.random() * 900000).toString();
          console.log(`[EDC Success] Pembayaran berhasil! Trace Number: ${traceNumber}`);
          
          const response = {
            status: 'success',
            trace_number: traceNumber,
            message: 'Transaksi Berhasil Disetujui'
          };
          
          ws.send(JSON.stringify(response));
        }, 3000);
      } else {
        console.log(`[EDC Error] Perintah tidak dikenal: ${data.command}`);
        ws.send(JSON.stringify({ status: 'failed', message: 'Perintah tidak dikenal' }));
      }
    } catch (err) {
      console.error('[Error] Gagal membaca pesan:', err.message);
      ws.send(JSON.stringify({ status: 'failed', message: 'Format data tidak valid' }));
    }
  });

  ws.on('close', () => {
    console.log('[Client Disconnected] POS Kasir / Transaksi Agen memutuskan koneksi.');
  });
});
