import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, X, Loader2, AlertCircle, Info } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export default function BarcodeScanner({ open, onClose, onBarcodeScanned }) {
  const [error, setError] = useState(null);
  const [isScannerInitialized, setIsScannerInitialized] = useState(false);
  const scannerRef = useRef(null);
  const lastScanRef = useRef(0); // Debounce tracker

  useEffect(() => {
    let html5QrCode;

    if (open) {
      setError(null);
      // Small timeout to ensure DOM element 'reader' is rendered by the Dialog
      setTimeout(() => {
        html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 30,
            qrbox: { width: 280, height: 100 },
            aspectRatio: 1.7778,
            disableFlip: false,
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true
            },
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.UPC_E,
            ]
          },
          (decodedText, decodedResult) => {
            // Debounce: ignore if scanned within 800ms
            const now = Date.now();
            if (now - lastScanRef.current < 800) return;
            lastScanRef.current = now;

            // Beep feedback
            try {
              const ctx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = ctx.createOscillator();
              osc.frequency.value = 1200;
              osc.connect(ctx.destination);
              osc.start(); osc.stop(ctx.currentTime + 0.08);
            } catch(e) {}

            if (scannerRef.current) {
              scannerRef.current.stop().then(() => {
                scannerRef.current.clear();
                setIsScannerInitialized(false);
                onBarcodeScanned(decodedText.trim());
                onClose();
              }).catch((err) => console.error("Failed to stop", err));
            }
          },
          (errorMessage) => {
            // Ignore scan parse errors (runs consistently when no barcode is in frame)
          }
        ).then(() => {
          setIsScannerInitialized(true);
        }).catch((err) => {
          console.error("Camera error:", err);
          setError("Gagal mengakses kamera. Pastikan memberikan izin kamera pada browser Anda.");
        });
      }, 100);
    }

    return () => {
      // Cleanup on unmount or when dialog closes
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().then(() => {
              scannerRef.current.clear();
            }).catch((err) => console.log(err));
          }
        } catch (error) {
          console.error("Failed to cleanup scanner", error);
        }
      }
      setIsScannerInitialized(false);
    };
  }, [open]);

  const handleClose = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => {
        scannerRef.current.clear();
        setIsScannerInitialized(false);
        onClose();
      }).catch((err) => {
        console.error("Failed to stop", err);
        onClose();
      });
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes scanLine {
            0% { top: 5%; opacity: 0; }
            10% { opacity: 1; }
            50% { top: 95%; opacity: 1; }
            90% { opacity: 1; }
            100% { top: 5%; opacity: 0; }
          }
          .animate-scan-line {
            animation: scanLine 2.5s infinite ease-in-out;
          }
        `}} />
        <DialogHeader>
          <DialogTitle>Scan Barcode Kamera</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          
          {error ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            <div className="relative bg-black rounded-lg overflow-hidden min-h-[300px] flex items-center justify-center border-4 border-slate-900 shadow-inner">
              <div id="reader" className="w-full h-full [&>video]:object-cover"></div>
              
              {isScannerInitialized && !error && (
                <>
                  {/* Scanner overlay effect */}
                  <div className="absolute inset-0 pointer-events-none w-full h-full">
                    {/* Darkened edges, clear center */}
                    <div className="absolute inset-x-8 inset-y-12 border-2 border-emerald-500/50 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] transition-all"></div>
                    
                    {/* Animated Laser Line */}
                    <div className="absolute left-10 right-10 h-0.5 bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.8)] animate-scan-line"></div>
                  </div>
                  
                  {/* Helper Text Overlay */}
                  <div className="absolute bottom-4 left-0 right-0 text-center animate-pulse z-20">
                    <p className="text-white text-xs bg-black/60 inline-block py-1.5 px-4 rounded-full">Sejajarkan Barcode di dalam kotak</p>
                  </div>
                </>
              )}

              {!isScannerInitialized && !error && (
                <div className="absolute inset-0 bg-black flex flex-col items-center justify-center text-white gap-3 z-10 w-full h-full">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-sm font-medium">Memulai Kamera...</p>
                </div>
              )}
            </div>
          )}

          <div className="bg-slate-50 border border-slate-100 p-3 rounded-md flex gap-2">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 leading-relaxed">Pastikan ruangan cukup terang. Jika menggunakan <b>webcam Laptop/Desktop</b>, beri jarak ~15cm dan tahan barang bertenang agar fokus kamera dapat menyesuaikan sebelum memindai.</p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} className="w-full">
              <X className="w-4 h-4 mr-2" /> Batalkan Scan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
