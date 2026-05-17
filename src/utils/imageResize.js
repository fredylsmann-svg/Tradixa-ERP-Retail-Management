/**
 * TRADIXA - Client-Side Image Compression Utility
 * 
 * Menggunakan Canvas API bawaan browser (tanpa library tambahan).
 * Otomatis resize & kompres gambar sebelum dikirim ke storage provider.
 */

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const SIZE_PRESETS = {
  product:  { maxWidth: 1200, maxHeight: 1200, quality: 0.8 },
  profile:  { maxWidth: 400,  maxHeight: 400,  quality: 0.8 },
  logo:     { maxWidth: 600,  maxHeight: 600,  quality: 0.85 },
  document: { maxWidth: 1600, maxHeight: 1600, quality: 0.85 },
};

/**
 * Validasi ukuran file sebelum upload.
 * @param {File} file
 * @returns {{ valid: boolean, message?: string }}
 */
export function validateFileSize(file) {
  if (!file) return { valid: false, message: 'Tidak ada file yang dipilih.' };
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      message: `Ukuran file ${sizeMB}MB melebihi batas maksimal 2MB. Silakan pilih foto dengan ukuran lebih kecil.`
    };
  }
  return { valid: true };
}

/**
 * Kompres dan resize gambar menggunakan Canvas API.
 * @param {File} file - File gambar asli
 * @param {string} type - 'product' | 'profile' | 'logo' | 'document'
 * @returns {Promise<File>} File gambar yang sudah dikompres
 */
export async function compressImage(file, type = 'product') {
  // Skip jika bukan gambar
  if (!file || !file.type.startsWith('image/')) {
    return file;
  }

  // Skip jika GIF (agar animasi tidak rusak)
  if (file.type === 'image/gif') {
    return file;
  }

  const preset = SIZE_PRESETS[type] || SIZE_PRESETS.product;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        try {
          // Hitung dimensi baru dengan menjaga aspect ratio
          let { width, height } = img;
          const { maxWidth, maxHeight, quality } = preset;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          // Gambar ke canvas
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Coba export sebagai WebP, fallback ke JPEG
          const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');
          const outputType = supportsWebP ? 'image/webp' : 'image/jpeg';
          const extension = supportsWebP ? 'webp' : 'jpg';

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file); // Fallback: kembalikan file asli
                return;
              }

              // Buat File baru dengan nama yang bersih
              const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/\s+/g, '-');
              const compressedFile = new File(
                [blob],
                `${baseName}.${extension}`,
                { type: outputType, lastModified: Date.now() }
              );

              // Jika hasil kompresi malah lebih besar, pakai file asli
              if (compressedFile.size >= file.size) {
                resolve(file);
                return;
              }

              resolve(compressedFile);
            },
            outputType,
            quality
          );
        } catch (err) {
          console.error('[ImageResize] Canvas error:', err);
          resolve(file); // Fallback: kembalikan file asli
        }
      };

      img.onerror = () => {
        console.error('[ImageResize] Failed to load image');
        resolve(file); // Fallback
      };

      img.src = e.target.result;
    };

    reader.onerror = () => {
      console.error('[ImageResize] FileReader error');
      resolve(file); // Fallback
    };

    reader.readAsDataURL(file);
  });
}
