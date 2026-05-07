export const formatNumber = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'string' ? parseFloat(value.replace(/\./g, '')) : value;
  if (isNaN(num)) return '';
  return Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export const parseNumber = (value) => {
  if (!value) return 0;
  const cleanValue = typeof value === 'string' ? value.replace(/\./g, '') : value;
  const num = parseFloat(cleanValue);
  return isNaN(num) ? 0 : num;
};

export const formatInputNumber = (value) => {
  const numbers = value.replace(/[^\d]/g, '');
  if (!numbers) return '';
  return formatNumber(numbers);
};

export const handleNumberInput = (e, setter) => {
  const formatted = formatInputNumber(e.target.value);
  setter(formatted);
};

export const formatCurrency = (value) => {
  const formatted = formatNumber(value);
  return formatted ? `Rp ${formatted}` : 'Rp 0';
};
