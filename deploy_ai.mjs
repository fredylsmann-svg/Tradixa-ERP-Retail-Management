import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');

if (!fs.existsSync(envPath)) {
  console.error('❌ File .env tidak ditemukan! Pastikan Anda berada di root directory tradixa-project.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const match = envContent.match(/VITE_SUPABASE_URL=https:\/\/([a-z0-9]+)\.supabase\.co/);

if (!match || !match[1]) {
  console.error('❌ Tidak dapat menemukan Project Reference (subdomain) dari VITE_SUPABASE_URL di file .env.');
  process.exit(1);
}

const projectRef = match[1];
console.log(`🔍 Mendeteksi Supabase Project Reference: ${projectRef}`);
console.log('🚀 Memulai proses deploy Edge Function "tradixa-ai-assistant"...');

try {
  // Menjalankan command deploy
  execSync(`npx supabase functions deploy tradixa-ai-assistant --project-ref ${projectRef}`, { stdio: 'inherit' });
  console.log('✅ Edge Function berhasil di-deploy ke Supabase Cloud!');
} catch (error) {
  console.error('❌ Gagal men-deploy Edge Function.');
  console.log('\n💡 Tips Troubleshooting:');
  console.log('1. Pastikan Anda sudah login ke Supabase CLI dengan menjalankan: npx supabase login');
  console.log('2. Atau pastikan koneksi internet Anda stabil.');
  process.exit(1);
}
