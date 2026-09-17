// Helper for Vietnamese honorific based on gender
function getHonorific(gender) {
  if (!gender) return 'Thầy/Cô';
  const g = String(gender).trim().toLowerCase();
  if (g === 'nam' || g === 'male' || g === 'ông') return 'Thầy';
  if (g === 'nữ' || g === 'nu' || g === 'female' || g === 'bà') return 'Cô';
  return 'Thầy/Cô';
}

// Helper to format date string to DD-MM-YYYY format
function formatDateDMY(dateStr) {
  if (!dateStr) return 'Chưa định';
  const clean = String(dateStr).trim();
  // YYYY-MM-DD or YYYY/MM/DD
  const m = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    const [, y, mo, d] = m;
    return `${d.padStart(2, '0')}-${mo.padStart(2, '0')}-${y}`;
  }
  // DD/MM/YYYY or DD-MM-YYYY -> standardize to DD-MM-YYYY
  const m2 = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m2) {
    const [, d, mo, y] = m2;
    return `${d.padStart(2, '0')}-${mo.padStart(2, '0')}-${y}`;
  }
  return clean;
}

module.exports = {
  getHonorific,
  formatDateDMY
};
