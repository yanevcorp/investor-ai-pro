// This app stores Finnhub's granular `finnhubIndustry` string as a stock's
// sector (e.g. "Software - Application", "Aerospace & Defense") — FMP's
// sector-average-P/E endpoint only accepts its 11 broad GICS-style sectors
// (Technology, Healthcare, ...). This is a best-effort keyword mapping
// between the two, not an authoritative industry taxonomy — when nothing
// matches, callers should treat the sector-average comparison as
// unavailable rather than guessing.
const FMP_SECTORS = [
  'Technology',
  'Healthcare',
  'Financial Services',
  'Consumer Cyclical',
  'Consumer Defensive',
  'Industrials',
  'Energy',
  'Basic Materials',
  'Real Estate',
  'Utilities',
  'Communication Services',
];

const KEYWORD_TO_SECTOR = [
  [/software|semiconductor|technology|internet|electronic|computer|it services/i, 'Technology'],
  [/biotechnology|pharma|health|medical|drug/i, 'Healthcare'],
  [/bank|insurance|financial|capital markets|asset management|credit/i, 'Financial Services'],
  [/retail|auto|apparel|leisure|hotel|restaurant|luxury|homebuilding/i, 'Consumer Cyclical'],
  [/food|beverage|household|tobacco|personal products|grocery/i, 'Consumer Defensive'],
  [/aerospace|defense|industrial|machinery|construction|airline|transport/i, 'Industrials'],
  [/oil|gas|energy|coal/i, 'Energy'],
  [/mining|chemical|materials|steel|metals/i, 'Basic Materials'],
  [/reit|real estate/i, 'Real Estate'],
  [/utility|utilities|electric|water/i, 'Utilities'],
  [/media|telecom|communication|entertainment|broadcasting/i, 'Communication Services'],
];

function mapToFmpSector(finnhubIndustry) {
  if (!finnhubIndustry) return null;
  if (FMP_SECTORS.includes(finnhubIndustry)) return finnhubIndustry;
  const match = KEYWORD_TO_SECTOR.find(([pattern]) => pattern.test(finnhubIndustry));
  return match ? match[1] : null;
}

module.exports = { mapToFmpSector, FMP_SECTORS };
