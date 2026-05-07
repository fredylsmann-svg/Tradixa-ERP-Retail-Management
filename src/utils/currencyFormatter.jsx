/**
 * Format angka ke format Indonesia (pemisah ribuan titik)
 * @param {number|string} value - Angka yang akan diformat
 * @returns {string} - Angka terformat (contoh: "1.000.000")
 */
export const formatNumber = (value) => {
  if (value === null || value === undefined || value === '') return '';
  
  const num = typeof value === 'string' ? parseFloat(value.replace(/\./g, '')) : value;
  
  if (isNaN(num)) return '';
  
  return Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/**
 * Parse format Indonesia kembali ke number
 * @param {string} value - String angka berformat (contoh: "1.000.000")
 * @returns {number} - Angka tanpa format
 */
export const parseNumber = (value) => {
  if (!value) return 0;
  
  const cleanValue = typeof value === 'string' ? value.replace(/\./g, '') : value;
  const num = parseFloat(cleanValue);
  
  return isNaN(num) ? 0 : num;
};

/**
 * Format input field saat user mengetik
 * @param {string} value - Value dari input field
 * @returns {string} - Value terformat
 */
export const formatInputNumber = (value) => {
  // Hapus semua karakter selain angka
  const numbers = value.replace(/[^\d]/g, '');
  
  // Jika kosong, return empty string
  if (!numbers) return '';
  
  // Format dengan titik pemisah
  return formatNumber(numbers);
};

/**
 * Handle onChange untuk input number dengan format Indonesia
 * @param {Event} e - Event dari input
 * @param {Function} setter - State setter function
 */
export const handleNumberInput = (e, setter) => {
  const formatted = formatInputNumber(e.target.value);
  setter(formatted);
};

/**
 * Format currency dengan prefix Rp
 * @param {number|string} value - Angka yang akan diformat
 * @returns {string} - Format currency (contoh: "Rp 1.000.000")
 */
export const formatCurrency = (value) => {
  const formatted = formatNumber(value);
  return formatted ? `Rp ${formatted}` : 'Rp 0';
};
