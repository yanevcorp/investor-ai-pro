// Alpha Vantage returns numeric fields as strings, using "None" or "-" for
// missing data instead of omitting the key or using null/0.
function avNumber(value) {
  if (value === undefined || value === null || value === 'None' || value === '-') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

module.exports = { avNumber };
