const alphaVantageService = require('./alphaVantageService');
const { avNumber } = require('../utils/numbers');

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
  stockDoc.financialsHistory = financialsHistory;
  stockDoc.financialsHistoryFetchedAt = new Date();
  await stockDoc.save();
  return financialsHistory;
}

module.exports = { getOrFetchFinancialsHistory, buildFinancialsHistory };
