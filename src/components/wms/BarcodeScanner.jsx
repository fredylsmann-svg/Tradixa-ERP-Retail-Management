import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, ScanLine, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const playSound = (type) => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'success') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // High pitch beep
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'error') {
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(150, audioCtx.currentTime); // Low pitch buzz
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.4);
    }
  } catch (e) {
    console.warn("Audio not supported");
  }
};

export default function BarcodeScanner({ onScan, onError, isActive = true }) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const html5QrCode = useRef(null);

  // Physical Scanner Listener (HID Keyboard emulation)
  useEffect(() => {
    if (!isActive) return;
    
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();
    let timeoutId = null;

    const handleKeyDown = (e) => {
      // Ignore if typing in an input field (so we don't interfere with forms)
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const currentTime = Date.now();
      
      // If typing is too slow (human typing > 50ms per keystroke), reset buffer
      if (currentTime - lastKeyTime > 50) {
        barcodeBuffer = '';
      }
      
      if (e.key === 'Enter') {
        if (barcodeBuffer.length > 3) {
          e.preventDefault();
          const code = barcodeBuffer;
          barcodeBuffer = ''; // clear immediately
          // playSound('success'); // Physical scanners usually have their own beep
          onScan(code);
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        barcodeBuffer += e.key;
      }
      
      lastKeyTime = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isActive, onScan]);

  // Camera Scanner Logic
  useEffect(() => {
    if (!isCameraActive || !isActive) {
      if (html5QrCode.current) {
        html5QrCode.current.stop().catch(console.error);
        html5QrCode.current = null;
      }
      return;
    }

    const lastScan = { text: null, time: 0 };

    const startScanner = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length) {
          const backCamera = devices.find(d => d.label.toLowerCase().includes('back')) || devices[0];
          
          html5QrCode.current = new Html5Qrcode("reader-container");
          await html5QrCode.current.start(
            backCamera.id,
            { 
              fps: 15,
              qrbox: { width: 280, height: 280 },
              aspectRatio: 1.0,
              experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
              }
            },
            (decodedText) => {
              const now = Date.now();
              // Prevent duplicate scans of the same barcode within 2 seconds
              if (lastScan.text === decodedText && now - lastScan.time < 2000) {
                return;
              }
              lastScan.text = decodedText;
              lastScan.time = now;
              
              onScan(decodedText);
            },
            (errorMessage) => {
              // Silent error for scanning failures per frame to avoid console spam
            }
          ).catch(e => {
            console.warn("Camera start warning:", e);
          });
        } else {
          if (onError) onError("Tidak ada kamera yang terdeteksi");
        }
      } catch (err) {
        if (onError) onError("Gagal mengakses kamera: " + err.message);
      }
    };

    // Small delay to allow the DOM element to render
    setTimeout(startScanner, 100);

    return () => {
      if (html5QrCode.current) {
        html5QrCode.current.stop().catch(console.error);
      }
    };
  }, [isCameraActive, isActive, onScan, onError]);

  if (!isActive) return null;

  return (
    <div className="bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center space-y-4">
      <div className="flex flex-col md:flex-row items-center gap-2 text-slate-500 dark:text-slate-400 font-medium text-sm text-center">
        <Keyboard className="w-5 h-5 text-emerald-500 shrink-0" />
        <span><strong className="text-emerald-600 dark:text-emerald-400">Scanner Fisik AKTIF</strong> (Siap menerima input otomatis)</span>
      </div>
      
      {!isCameraActive ? (
        <Button 
          onClick={() => setIsCameraActive(true)}
          className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl h-11 px-6 shadow-md hover:shadow-xl transition-all"
        >
          <Camera className="w-5 h-5 mr-2" /> Aktifkan Kamera HP / Tablet
        </Button>
      ) : (
        <div className="w-full max-w-sm flex flex-col items-center gap-4">
          <div className="relative w-full aspect-square bg-black rounded-2xl overflow-hidden shadow-lg border-4 border-slate-800">
            <div id="reader-container" className="w-full h-full object-cover"></div>
            {/* Scanline animation overlay */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex items-center justify-center">
               <div className="w-3/4 h-3/4 border-2 border-emerald-500/50 rounded-xl relative">
                 <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-400 shadow-[0_0_15px_3px_rgba(52,211,153,0.8)] opacity-70" 
                      style={{ animation: 'scanline 2s linear infinite' }} />
               </div>
            </div>
          </div>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes scanline {
              0% { top: 0%; opacity: 0; }
              10% { opacity: 1; }
              90% { opacity: 1; }
              100% { top: 100%; opacity: 0; }
            }
          `}} />
          <Button 
            onClick={() => setIsCameraActive(false)}
            variant="destructive"
            className="w-full rounded-xl h-11 font-bold shadow-md"
          >
            <X className="w-5 h-5 mr-2" /> Matikan Kamera
          </Button>
        </div>
      )}
    </div>
  );
}
