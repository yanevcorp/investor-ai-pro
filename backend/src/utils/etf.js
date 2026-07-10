// Finnhub's free-tier /search response does include a `type` field (e.g.
// "ETP") per result, but the stock-detail endpoint looks up a single known
// symbol directly and has no search result to read `type` from. A static
// list is the simplest reliable way to answer "is this symbol an ETF" for
// a fixed detail lookup — covers the tickers this app is expected to serve
// (US-listed + the common UCITS ETFs EU investors ask about).
const ETF_SYMBOLS = new Set([
  // US-listed
  'SPY', 'VOO', 'IVV', 'VTI', 'QQQ', 'QQQM', 'DIA', 'IWM',
  'VEA', 'VWO', 'EEM', 'EFA', 'AGG', 'BND', 'TLT', 'SHY',
  'GLD', 'SLV', 'USO',
  'XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLP', 'XLI', 'XLB', 'XLU', 'XLRE', 'XLC',
  'ARKK', 'ARKW', 'ARKG',
  'SCHD', 'VYM', 'VIG', 'JEPI', 'JEPQ', 'SPYG', 'SPYV', 'SPLG',
  // UCITS / European
  'VWCE', 'VWRL', 'VUSA', 'VUAA', 'EQQQ', 'CSPX', 'SWDA', 'IWDA', 'EIMI',
  'AGGH', 'VAGF', 'VGVF', 'SGLN', 'IUSA',
]);

function isEtfSymbol(symbol) {
  return ETF_SYMBOLS.has(String(symbol || '').toUpperCase());
}

module.exports = { isEtfSymbol };
