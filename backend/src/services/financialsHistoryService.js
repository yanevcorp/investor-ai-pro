const alphaVantageService = require('./alphaVantageService');
const fmpService = require('./fmpService');
const { avNumber } = require('../utils/numbers');
const { mapToFmpSector } = require('../utils/sectorMapping');

// Finds the most recent price at or before a fiscal date-ending, from an
// oldest-first {date, close} array — used to compute historical P/E
// without a dedicated ratios-history API (price / trailing annual EPS).
function priceNearDate(priceHistory, targetDate) {
  if (!Array.isArray(priceHistory) || priceHistory.length === 0) return null;
  let best = null;
  for (const point of priceHistory) {
    if (point.date <= targetDate) best = point;
    else break;
  }
  return best ? best.close : priceHistory[0]?.close ?? null;
}

function totalDebtFrom(balanceReport) {
  const combined = avNumber(balanceReport?.shortLongTermDebtTotal);
  if (combined !== null) return combined;
  const longTerm = avNumber(balanceReport?.longTermDebt);
  const shortTerm = avNumber(balanceReport?.currentDebt);
  if (longTerm === null && shortTerm === null) return null;
  return (longTerm || 0) + (shortTerm || 0);
}

// Combines income statement, balance sheet, cash flow, and earnings
// (all Alpha Vantage, keyed by fiscalDateEnding) with the already-cached
// Yahoo/Alpha Vantage price history into the chart-ready series the
// fundamentals section renders: revenue growth, margins, debt vs cash,
// EPS growth, and P/E history.
function buildFinancialsHistory({ income, balance, cashflow, earnings, priceHistory }) {
  const balanceByDate = new Map((balance?.annualReports || []).map((r) => [r.fiscalDateEnding, r]));
  const epsByDate = new Map((earnings?.annualEarnings || []).map((r) => [r.fiscalDateEnding, r]));

  const fiscalDates = (income?.annualReports || []).map((r) => r.fiscalDateEnding).filter(Boolean).sort();
  const incomeByDate = new Map((income?.annualReports || []).map((r) => [r.fiscalDateEnding, r]));

  const revenueHistory = [];
  const marginsHistory = [];
  const debtVsCashHistory = [];
  const epsHistory = [];
  const peHistory = [];

  let prevRevenue = null;
  let prevEps = null;

  fiscalDates.forEach((date) => {
    const year = date.slice(0, 4);
    const inc = incomeByDate.get(date);
    const bal = balanceByDate.get(date);
    const eps = epsByDate.get(date);

    const revenue = avNumber(inc?.totalRevenue);
    if (revenue !== null) {
      const growthPercent = prevRevenue ? Number((((revenue - prevRevenue) / prevRevenue) * 100).toFixed(1)) : null;
      revenueHistory.push({ year, date, revenue, growthPercent });
      prevRevenue = revenue;

      const grossProfit = avNumber(inc?.grossProfit);
      const operatingIncome = avNumber(inc?.operatingIncome);
      const netIncome = avNumber(inc?.netIncome);
      marginsHistory.push({
        year,
        date,
        grossMarginPercent: grossProfit !== null ? Number(((grossProfit / revenue) * 100).toFixed(1)) : null,
        operatingMarginPercent: operatingIncome !== null ? Number(((operatingIncome / revenue) * 100).toFixed(1)) : null,
        netMarginPercent: netIncome !== null ? Number(((netIncome / revenue) * 100).toFixed(1)) : null,
      });
    }

    const debt = totalDebtFrom(bal);
    const cash = avNumber(bal?.cashAndCashEquivalentsAtCarryingValue) ?? avNumber(bal?.cashAndShortTermInvestments);
    if (debt !== null || cash !== null) {
      debtVsCashHistory.push({ year, date, debt, cash });
    }

    const epsValue = avNumber(eps?.reportedEPS);
    if (epsValue !== null) {
      const growthPercent = prevEps ? Number((((epsValue - prevEps) / Math.abs(prevEps)) * 100).toFixed(1)) : null;
      epsHistory.push({ year, date, eps: epsValue, growthPercent });
      prevEps = epsValue;

      const price = priceNearDate(priceHistory, date);
      if (price !== null && epsValue > 0) {
        peHistory.push({ year, date, pe: Number((price / epsValue).toFixed(2)) });
      }
    }
  });

  return { revenueHistory, marginsHistory, debtVsCashHistory, epsHistory, peHistory };
}

// FMP's free tier caps ratios/key-metrics history at 5 records regardless
// of the `limit` requested (confirmed live — not a bug here), so
// ratioHistory only ever covers 5 years, shorter than the AV-sourced
// series above. Merged by fiscalYear since ratios and key-metrics are two
// separate FMP endpoints.
function buildRatioHistoryFromFmp(ratios, keyMetrics) {
  const byYear = new Map();

  (ratios || []).forEach((r) => {
    byYear.set(r.fiscalYear, {
      year: r.fiscalYear,
      date: r.date,
      pe: typeof r.priceToEarningsRatio === 'number' ? Number(r.priceToEarningsRatio.toFixed(2)) : null,
      ps: typeof r.priceToSalesRatio === 'number' ? Number(r.priceToSalesRatio.toFixed(2)) : null,
      pb: typeof r.priceToBookRatio === 'number' ? Number(r.priceToBookRatio.toFixed(2)) : null,
    });
  });

  (keyMetrics || []).forEach((k) => {
    const existing = byYear.get(k.fiscalYear) || { year: k.fiscalYear, date: k.date, pe: null, ps: null, pb: null };
    existing.evToEbitda = typeof k.evToEBITDA === 'number' ? Number(k.evToEBITDA.toFixed(2)) : null;
    byYear.set(k.fiscalYear, existing);
  });

  return Array.from(byYear.values()).sort((a, b) => a.year.localeCompare(b.year));
}

// ETFs don't file income statements/balance sheets the way equities do —
// Alpha Vantage's ETF_PROFILE (already used for ETF fundamentals) is a
// different, non-historical shape, so this section is equity-only.
async function getOrFetchFinancialsHistory(stockDoc, priceHistory) {
  if (stockDoc.financialsHistory) return stockDoc.financialsHistory;

  // Sequential with spacing, not Promise.all — Alpha Vantage's free tier
  // throttles bursts above ~1 request/second, and four parallel calls for
  // one symbol's financials history reliably triggers that limit.
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const income = await alphaVantageService.getIncomeStatement(stockDoc.symbol);
  await wait(1100);
  const balance = await alphaVantageService.getBalanceSheet(stockDoc.symbol);
  await wait(1100);
  const cashflow = await alphaVantageService.getCashFlow(stockDoc.symbol);
  await wait(1100);
  const earnings = await alphaVantageService.getEarnings(stockDoc.symbol);

  const financialsHistory = buildFinancialsHistory({ income, balance, cashflow, earnings, priceHistory });

  // FMP additions are best-effort — a failure here shouldn't take down the
  // AV-sourced sections above, which is most of the page.
  try {
    const [ratios, keyMetrics] = await Promise.all([
      fmpService.getRatiosHistory(stockDoc.symbol),
      fmpService.getKeyMetricsHistory(stockDoc.symbol),
    ]);
    financialsHistory.ratioHistory = buildRatioHistoryFromFmp(ratios, keyMetrics);
  } catch (err) {
    financialsHistory.ratioHistory = [];
  }

  try {
    const fmpSector = mapToFmpSector(stockDoc.sector);
    financialsHistory.sectorAveragePE = fmpSector
      ? await fmpService.getSectorPE(fmpSector, new Date().toISOString().slice(0, 10))
      : null;
  } catch (err) {
    financialsHistory.sectorAveragePE = null;
  }

  stockDoc.financialsHistory = financialsHistory;
  stockDoc.financialsHistoryFetchedAt = new Date();
  await stockDoc.save();
  return financialsHistory;
}

module.exports = { getOrFetchFinancialsHistory, buildFinancialsHistory, buildRatioHistoryFromFmp };
