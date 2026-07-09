require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Stock = require('../models/Stock');
const Alert = require('../models/Alert');
const { buildGenericAnalysis } = require('../utils/buildAnalysis');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const stocksData = [
  {
    symbol: 'RKLB',
    name: 'Rocket Lab USA, Inc.',
    sector: 'Aerospace & Defense',
    price: 24.87,
    change: 3.42,
    changePercent: 15.94,
    verdict: 'STRONG BUY',
    aiScore: 91,
    analysis: {
      xaiReasons: [
        { label: 'Приходите растат с 78% year-over-year', points: 22, positive: true },
        { label: 'Нисък дълг спрямо активите (D/E: 0.31)', points: 18, positive: true },
        { label: 'Институционален интерес се увеличава с 12%', points: 15, positive: true },
        { label: 'Позитивен insider buying сигнал', points: 12, positive: true },
        { label: 'Технически пробив над 200-дневна пл. средна', points: 14, positive: true },
        { label: 'Висока волатилност спрямо сектора', points: -8, positive: false },
        { label: 'Все още не е печеливша компания', points: -6, positive: false },
      ],
      probability: {
        '1W': { up: 62, flat: 24, down: 14 },
        '1M': { up: 71, flat: 18, down: 11 },
        '3M': { up: 78, flat: 12, down: 10 },
      },
      overview: [
        { label: 'Пазарна капитализация', value: '$12.4B', good: true },
        { label: 'P/E съотношение', value: 'N/A (загуба)', good: false },
        { label: '52-седмичен диапазон', value: '$4.24 - $28.60', good: true },
        { label: 'Обем (среден)', value: '18.2M', good: true },
        { label: 'Бета', value: '2.14 (висока волатилност)', good: false },
      ],
      financials: [
        { label: 'Приходи (TTM)', value: '$436M', good: true },
        { label: 'Ръст на приходите YoY', value: '+78%', good: true },
        { label: 'Марж на печалба', value: '-24% (загуба)', good: false },
        { label: 'Дълг/Активи', value: '0.31', good: true },
        { label: 'Паричен поток', value: '-$45M', good: false },
        { label: 'Кеш резерви', value: '$530M', good: true },
      ],
      technicals: [
        { label: 'RSI (14)', value: '64.2 (неутрален)', good: true },
        { label: 'MACD', value: 'Бичи пресичане', good: true },
        { label: '50-дн. пл. средна', value: 'Над цената', good: true },
        { label: '200-дн. пл. средна', value: 'Над цената', good: true },
        { label: 'Поддръжка', value: '$21.50', good: true },
        { label: 'Съпротива', value: '$27.00', good: false },
      ],
      sentiment: [
        { label: 'Новинарски сентимент', value: '82% позитивен', good: true },
        { label: 'Social media buzz', value: 'Силно нарастващ', good: true },
        { label: 'Analyst рейтинги', value: '9 Buy / 2 Hold / 0 Sell', good: true },
        { label: 'Reddit/X mentions', value: '+340% седмично', good: true },
        { label: 'Short interest', value: '18.4% (високо)', good: false },
      ],
      macro: [
        { label: 'Чувствителност към лихви', value: 'Средна', good: true },
        { label: 'Изложеност към държавни поръчки', value: 'Висока (положително)', good: true },
        { label: 'Валутен риск', value: 'Нисък', good: true },
        { label: 'Секторен tailwind', value: 'Space economy растеж', good: true },
        { label: 'Регулаторен риск', value: 'Умерен (ITAR)', good: false },
      ],
      insider: [
        { label: 'Insider покупки (90д)', value: '4 транзакции', good: true },
        { label: 'Insider продажби (90д)', value: '1 транзакция', good: true },
        { label: 'CEO дялово участие', value: '11.2%', good: true },
        { label: 'Institutional ownership', value: '34.6%', good: true },
        { label: 'Insider net активност', value: '+$2.1M нетни покупки', good: true },
      ],
      predictions: [
        { label: 'AI прогнозна цена (3M)', value: '$31.40 (+26%)', good: true },
        { label: 'Модел confidence', value: '78%', good: true },
        { label: 'Консенсус аналитици (12M)', value: '$29.00', good: true },
        { label: 'Ключов риск фактор', value: 'Забавяне на изстрелвания', good: false },
        { label: 'Катализатор', value: 'Neutron rocket дебют Q4', good: true },
      ],
    },
  },
  {
    symbol: 'PLTR',
    name: 'Palantir Technologies Inc.',
    sector: 'Software - Infrastructure',
    price: 27.65,
    change: -0.83,
    changePercent: -2.91,
    verdict: 'HOLD',
    aiScore: 68,
    analysis: buildGenericAnalysis(false),
  },
  {
    symbol: 'MSTR',
    name: 'MicroStrategy Incorporated',
    sector: 'Software - Application',
    price: 1642.3,
    change: 58.12,
    changePercent: 3.67,
    verdict: 'BUY',
    aiScore: 79,
    analysis: buildGenericAnalysis(true),
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Consumer Electronics',
    price: 227.52,
    change: 1.14,
    changePercent: 0.5,
    verdict: 'HOLD',
    aiScore: 72,
    analysis: buildGenericAnalysis(false),
  },
  {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    sector: 'Auto Manufacturers',
    price: 248.98,
    change: -6.31,
    changePercent: -2.47,
    verdict: 'SELL',
    aiScore: 41,
    analysis: buildGenericAnalysis(false),
  },
];

const alertsData = [
  {
    symbol: 'TSLA',
    priority: 'High',
    title: 'Необичаен insider продажби обем',
    description:
      'Регистрирани са продажби на акции от изпълнителен директор на стойност $12M за последните 48 часа — 4x над средното.',
    type: 'anomaly',
    createdAt: new Date(Date.now() - 2 * HOUR),
  },
  {
    symbol: 'MSTR',
    priority: 'High',
    title: 'Рязка промяна в short interest',
    description: 'Short interest се е увеличил с 34% за седмица — възможен сигнал за нарастващ мечи сентимент.',
    type: 'anomaly',
    createdAt: new Date(Date.now() - 5 * HOUR),
  },
  {
    symbol: 'RKLB',
    priority: 'Medium',
    title: 'Необичаен options обем',
    description: 'Call опции с падеж следващия месец показват 6x обем спрямо 30-дневната средна.',
    type: 'volume',
    createdAt: new Date(Date.now() - 8 * HOUR),
  },
  {
    symbol: 'PLTR',
    priority: 'Medium',
    title: 'Промяна в институционално притежание',
    description: 'Голям хедж фонд намали позицията си с 15% според последния 13F filing.',
    type: 'ownership',
    createdAt: new Date(Date.now() - 1 * DAY),
  },
  {
    symbol: 'AAPL',
    priority: 'Low',
    title: 'Сентимент дрифт в новините',
    description: 'Постепенно охлаждане на позитивния новинарски тон през последните 10 дни.',
    type: 'sentiment',
    createdAt: new Date(Date.now() - 2 * DAY),
  },
];

async function seed() {
  await connectDB();

  await Stock.deleteMany();
  await Alert.deleteMany();

  await Stock.insertMany(stocksData);
  await Alert.insertMany(alertsData);

  console.log(`Seeded ${stocksData.length} stocks and ${alertsData.length} alerts`);
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
