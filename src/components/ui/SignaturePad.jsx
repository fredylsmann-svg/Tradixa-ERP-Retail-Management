import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, CheckCircle2 } from 'lucide-react';

export default function SignaturePad({ onSave, onClear, title = "Tanda Tangan", initialSignature }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      
      // Get the actual width, fallback to clientWidth if rect is 0
      const rect = parent.getBoundingClientRect();
      const newWidth = rect.width || parent.clientWidth || 300; // default 300
      
      // Only resize if width actually changed to avoid clearing the canvas
      if (canvas.width !== newWidth) {
        canvas.width = newWidth;
        canvas.height = 200;
        
        const ctx = canvas.getContext('2d');
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#0f172a'; // slate-900
      }
    };

    // Initial resize with a slight delay to allow for DOM layout/animations
    setTimeout(resizeCanvas, 100);
    resizeCanvas();

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }
    
    window.addEventListener('resize', resizeCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (initialSignature && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        const x = (canvas.width / 2) - (img.width / 2);
        const y = (canvas.height / 2) - (img.height / 2);
        ctx.drawImage(img, x, y);
        setHasSignature(true);
      };
      img.src = initialSignature;
    }
  }, [initialSignature]);

  const getPointerPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getPointerPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getPointerPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDrawing = () => {
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    if (onClear) onClear();
  };

  const handleSave = () => {
    if (!hasSignature) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
    let hasPixel = false;

    // Find bounding box of non-transparent pixels
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const alpha = data[(y * canvas.width + x) * 4 + 3];
        if (alpha > 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          hasPixel = true;
        }
      }
    }

    if (!hasPixel) {
      onSave(canvas.toDataURL('image/png'));
      return;
    }

    // Add padding to crop
    const padding = 10;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(canvas.width, maxX + padding);
    maxY = Math.min(canvas.height, maxY + padding);

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = maxX - minX;
    croppedCanvas.height = maxY - minY;
    
    const croppedCtx = croppedCanvas.getContext('2d');
    croppedCtx.putImageData(ctx.getImageData(minX, minY, croppedCanvas.width, croppedCanvas.height), 0, 0);
    
    // Bake white background agar tanda tangan terlihat di dark mode
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = croppedCanvas.width;
    finalCanvas.height = croppedCanvas.height;
    const finalCtx = finalCanvas.getContext('2d');
    finalCtx.fillStyle = '#ffffff';
    finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    finalCtx.drawImage(croppedCanvas, 0, 0);
    
    onSave(finalCanvas.toDataURL('image/png'));
  };

  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{title}</label>
        <button onClick={clear} type="button" className="text-slate-400 hover:text-red-500 transition-colors">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-900 transition-colors hover:border-slate-300 dark:hover:border-slate-700">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseOut={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
          className="w-full h-[180px] cursor-crosshair touch-none dark:invert"
        />
        {!hasSignature && (
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300">
             <p className="text-sm font-medium">Tanda tangan di sini...</p>
           </div>
        )}
      </div>
      <div className="flex gap-2">
         <Button 
           onClick={handleSave} 
           type="button"
           disabled={!hasSignature} 
           className="flex-1 bg-blue-600 hover:bg-blue-700 h-10 font-bold"
         >
           <CheckCircle2 className="w-4 h-4 mr-2" />
           Konfirmasi Tanda Tangan
         </Button>
      </div>
    </div>
  );
}
