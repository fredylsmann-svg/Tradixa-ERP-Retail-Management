/**
 * TRADIXA - Unified Storage Service
 * Handles file uploads to Cloudflare R2, Cloudinary, or Supabase.
 */

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`;

/**
 * Main upload function
 * @param {File} file - The file object to upload
 * @param {string} type - 'product' | 'profile' | 'logo' | 'document'
 */
export const uploadFile = async (file, type = 'product') => {
  if (!file) return null;

  console.log(`[Storage] Uploading ${file.name} as ${type}...`);

  try {
    if (type === 'profile' || type === 'logo') {
      return await uploadToCloudinary(file, type);
    }
    
    if (type === 'product' || type === 'document') {
      return await uploadToR2(file, type);
    }

    // Default to Supabase for anything else
    return await uploadToSupabase(file);
  } catch (error) {
    console.error(`[Storage] ${type} upload failed:`, error);
    throw error;
  }
};

/**
 * Upload to Cloudflare R2 (Secured via App Bridge)
 */
async function uploadToR2(file, type = 'product') {
  const { supabase } = await import('@/lib/supabase');
  const folder = type === 'product' ? 'products' : 'documents';
  
  const { data: signerData, error: signerError } = await supabase.functions.invoke('app-bridge', {
    body: { 
      action: 'sign-r2',
      payload: {
        filename: `${Date.now()}-${file.name.replace(/\s+/g, '-')}`,
        contentType: file.type,
        folder
      }
    }
  });

  if (signerError || !signerData?.uploadUrl) {
    console.error('[Storage] R2 Signer Failed Detail:', signerData?.error || signerError);
    // Fallback ke Cloudinary jika R2 bermasalah
    return await uploadToCloudinary(file, 'product');
  }

  const uploadResponse = await fetch(signerData.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type }
  });

  if (!uploadResponse.ok) throw new Error('Gagal mengunggah file ke R2');
  return signerData.publicUrl;
}

/**
 * Upload to Cloudinary (Secured via App Bridge)
 */
async function uploadToCloudinary(file, type = 'profile') {
  const { supabase } = await import('@/lib/supabase');
  const folder = type === 'product' ? 'products' : type === 'logo' ? 'logos' : 'profiles';

  // Minta signature rahasia dari Edge Function
  const { data: sigData, error: sigError } = await supabase.functions.invoke('app-bridge', {
    body: { action: 'sign-cloudinary', payload: { folder } }
  });

  if (sigError) {
    console.error('[Storage] Cloudinary Signer Error:', sigError);
    throw new Error('Gagal autentikasi Cloudinary');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', sigData.apiKey);
  formData.append('timestamp', sigData.timestamp);
  formData.append('signature', sigData.signature);
  formData.append('folder', folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Cloudinary upload failed');
  }

  const data = await res.json();
  return data.secure_url;
}

/**
 * Fallback to Supabase Storage
 */
async function uploadToSupabase(file) {
  const { supabase } = await import('@/lib/supabase');
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
  const filePath = `uploads/${fileName}`;

  const { data, error } = await supabase.storage
    .from('public')
    .upload(filePath, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('public')
    .getPublicUrl(filePath);

  return publicUrl;
}
