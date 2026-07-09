// Centralized mock data for InvestorAI Pro V2.0

export const quickSuggestions = ['RKLB', 'PLTR', 'MSTR', 'AAPL', 'TSLA'];

export const stocks = {
  RKLB: {
    symbol: 'RKLB',
    name: 'Rocket Lab USA, Inc.',
    price: 24.87,
    change: 3.42,
    changePercent: 15.94,
    verdict: 'STRONG BUY',
    aiScore: 91,
    sector: 'Aerospace & Defense',
  },
  PLTR: {
    symbol: 'PLTR',
    name: 'Palantir Technologies Inc.',
    price: 27.65,
    change: -0.83,
    changePercent: -2.91,
    verdict: 'HOLD',
    aiScore: 68,
    sector: 'Software - Infrastructure',
  },
  MSTR: {
    symbol: 'MSTR',
    name: 'MicroStrategy Incorporated',
    price: 1642.3,
    change: 58.12,
    changePercent: 3.67,
    verdict: 'BUY',
    aiScore: 79,
    sector: 'Software - Application',
  },
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 227.52,
    change: 1.14,
    changePercent: 0.5,
    verdict: 'HOLD',
    aiScore: 72,
    sector: 'Consumer Electronics',
  },
  TSLA: {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    price: 248.98,
    change: -6.31,
    changePercent: -2.47,
    verdict: 'SELL',
    aiScore: 41,
    sector: 'Auto Manufacturers',
  },
};

export const analysisDetails = {
  RKLB: {
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
};

// Generate simplified analysisDetails for the other tickers by reusing structure
const genericAnalysis = (symbol, positive) => ({
  xaiReasons: [
    { label: positive ? 'Стабилен ръст на приходите' : 'Забавящ се ръст на приходите', points: positive ? 16 : -14, positive },
    { label: positive ? 'Силен паричен поток' : 'Свиващи се маржове', points: positive ? 14 : -10, positive },
    { label: positive ? 'Позитивен технически тренд' : 'Технически пробив надолу', points: positive ? 12 : -12, positive },
    { label: positive ? 'Ниска оценка спрямо сектора' : 'Висока оценка спрямо сектора', points: positive ? 10 : -8, positive },
    { label: positive ? 'Институционално натрупване' : 'Институционална разпродажба', points: positive ? 9 : -9, positive },
  ],
  probability: {
    '1W': positive ? { up: 55, flat: 28, down: 17 } : { up: 22, flat: 26, down: 52 },
    '1M': positive ? { up: 61, flat: 24, down: 15 } : { up: 19, flat: 24, down: 57 },
    '3M': positive ? { up: 66, flat: 20, down: 14 } : { up: 17, flat: 21, down: 62 },
  },
  overview: [
    { label: 'Пазарна капитализация', value: '$—', good: true },
    { label: 'P/E съотношение', value: '24.6', good: positive },
    { label: '52-седмичен диапазон', value: 'N/A', good: true },
    { label: 'Обем (среден)', value: '9.8M', good: true },
    { label: 'Бета', value: '1.32', good: positive },
  ],
  financials: [
    { label: 'Приходи (TTM)', value: '$—', good: true },
    { label: 'Ръст на приходите YoY', value: positive ? '+18%' : '-4%', good: positive },
    { label: 'Марж на печалба', value: positive ? '22%' : '6%', good: positive },
    { label: 'Дълг/Активи', value: positive ? '0.28' : '0.61', good: positive },
    { label: 'Паричен поток', value: positive ? '+$120M' : '-$18M', good: positive },
    { label: 'Кеш резерви', value: '$—', good: true },
  ],
  technicals: [
    { label: 'RSI (14)', value: positive ? '58.1' : '31.4', good: positive },
    { label: 'MACD', value: positive ? 'Бичи пресичане' : 'Мечи пресичане', good: positive },
    { label: '50-дн. пл. средна', value: positive ? 'Над цената' : 'Под цената', good: positive },
    { label: '200-дн. пл. средна', value: positive ? 'Над цената' : 'Под цената', good: positive },
    { label: 'Поддръжка', value: '$—', good: true },
    { label: 'Съпротива', value: '$—', good: false },
  ],
  sentiment: [
    { label: 'Новинарски сентимент', value: positive ? '74% позитивен' : '38% позитивен', good: positive },
    { label: 'Social media buzz', value: positive ? 'Нарастващ' : 'Намаляващ', good: positive },
    { label: 'Analyst рейтинги', value: positive ? '7 Buy / 3 Hold / 0 Sell' : '2 Buy / 5 Hold / 6 Sell', good: positive },
    { label: 'Reddit/X mentions', value: positive ? '+90% седмично' : '-20% седмично', good: positive },
    { label: 'Short interest', value: positive ? '4.2%' : '22.7% (високо)', good: positive },
  ],
  macro: [
    { label: 'Чувствителност към лихви', value: 'Средна', good: true },
    { label: 'Валутен риск', value: 'Нисък', good: true },
    { label: 'Секторен tailwind', value: positive ? 'Позитивен' : 'Насрещен вятър', good: positive },
    { label: 'Регулаторен риск', value: 'Умерен', good: positive },
  ],
  insider: [
    { label: 'Insider покупки (90д)', value: positive ? '3 транзакции' : '0 транзакции', good: positive },
    { label: 'Insider продажби (90д)', value: positive ? '0 транзакции' : '5 транзакции', good: positive },
    { label: 'Institutional ownership', value: '41.2%', good: true },
    { label: 'Insider net активност', value: positive ? '+$0.8M нетни покупки' : '-$3.4M нетни продажби', good: positive },
  ],
  predictions: [
    { label: 'AI прогнозна цена (3M)', value: positive ? '+14%' : '-11%', good: positive },
    { label: 'Модел confidence', value: positive ? '71%' : '64%', good: positive },
    { label: 'Консенсус аналитици (12M)', value: '$—', good: true },
    { label: 'Ключов риск фактор', value: positive ? 'Пазарна волатилност' : 'Свиващи се маржове', good: false },
  ],
});

['PLTR', 'MSTR', 'AAPL', 'TSLA'].forEach((sym) => {
  const positive = stocks[sym].verdict === 'BUY' || stocks[sym].verdict === 'STRONG BUY';
  analysisDetails[sym] = genericAnalysis(sym, positive);
});

export const portfolioHoldings = [
  { symbol: 'RKLB', weight: 22, value: 24870 },
  { symbol: 'PLTR', weight: 18, value: 20340 },
  { symbol: 'MSTR', weight: 15, value: 16980 },
  { symbol: 'AAPL', weight: 25, value: 28200 },
  { symbol: 'TSLA', weight: 20, value: 22600 },
];

export const stressTestScenarios = [
  {
    id: '2008',
    label: '2008 Финансова криза',
    portfolioImpact: -38.4,
    marketImpact: -48.9,
    description: 'Симулация на глобален кредитен колапс и ликвидна криза.',
    worstHolding: 'MSTR (-52%)',
  },
  {
    id: '2020',
    label: '2020 COVID Срив',
    portfolioImpact: -24.1,
    marketImpact: -33.9,
    description: 'Рязък шок и бързо V-образно възстановяване.',
    worstHolding: 'RKLB (-41%)',
  },
  {
    id: '2022',
    label: '2022 Инфлационен спад',
    portfolioImpact: -19.7,
    marketImpact: -25.4,
    description: 'Агресивно покачване на лихвите от Фед, свиване на растежни оценки.',
    worstHolding: 'PLTR (-29%)',
  },
];

export const hiddenRisks = [
  {
    title: 'Концентрация в growth/tech сектор',
    severity: 'High',
    detail: '80% от портфолиото е изложено на high-beta растежни активи с ниска диверсификация.',
  },
  {
    title: 'Корелация между RKLB и MSTR по-висока от очакваното',
    severity: 'Medium',
    detail: 'В стресови сценарии двата актива падат заедно вместо да хеджират.',
  },
  {
    title: 'Липса на defensive/hedge позиции',
    severity: 'High',
    detail: 'Няма облигации, злато или ниско-бета активи за буфер при спад.',
  },
  {
    title: 'Валутен риск при TSLA международни продажби',
    severity: 'Low',
    detail: 'Приблизително 45% от приходите на TSLA са изложени на EUR/CNY колебания.',
  },
];

export const correlationMatrix = {
  symbols: ['RKLB', 'PLTR', 'MSTR', 'AAPL', 'TSLA'],
  data: [
    [1.0, 0.62, 0.71, 0.28, 0.45],
    [0.62, 1.0, 0.58, 0.31, 0.4],
    [0.71, 0.58, 1.0, 0.22, 0.38],
    [0.28, 0.31, 0.22, 1.0, 0.5],
    [0.45, 0.4, 0.38, 0.5, 1.0],
  ],
};

export const alerts = [
  {
    id: 1,
    priority: 'High',
    symbol: 'TSLA',
    title: 'Необичаен insider продажби обем',
    description: 'Регистрирани са продажби на акции от изпълнителен директор на стойност $12M за последните 48 часа — 4x над средното.',
    time: 'преди 2 часа',
    type: 'anomaly',
  },
  {
    id: 2,
    priority: 'High',
    symbol: 'MSTR',
    title: 'Рязка промяна в short interest',
    description: 'Short interest се е увеличил с 34% за седмица — възможен сигнал за нарастващ мечи сентимент.',
    time: 'преди 5 часа',
    type: 'anomaly',
  },
  {
    id: 3,
    priority: 'Medium',
    symbol: 'RKLB',
    title: 'Необичаен options обем',
    description: 'Call опции с падеж следващия месец показват 6x обем спрямо 30-дневната средна.',
    time: 'преди 8 часа',
    type: 'volume',
  },
  {
    id: 4,
    priority: 'Medium',
    symbol: 'PLTR',
    title: 'Промяна в институционално притежание',
    description: 'Голям хедж фонд намали позицията си с 15% според последния 13F filing.',
    time: 'вчера',
    type: 'ownership',
  },
  {
    id: 5,
    priority: 'Low',
    symbol: 'AAPL',
    title: 'Сентимент дрифт в новините',
    description: 'Постепенно охлаждане на позитивния новинарски тон през последните 10 дни.',
    time: 'преди 2 дни',
    type: 'sentiment',
  },
];

export const screenerResults = [
  { symbol: 'RKLB', name: 'Rocket Lab USA, Inc.', aiScore: 91, verdict: 'STRONG BUY', pe: 'N/A', debtToEquity: 0.31, revenueGrowth: 78 },
  { symbol: 'ASTS', name: 'AST SpaceMobile, Inc.', aiScore: 84, verdict: 'BUY', pe: 'N/A', debtToEquity: 0.18, revenueGrowth: 142 },
  { symbol: 'SOUN', name: 'SoundHound AI, Inc.', aiScore: 77, verdict: 'BUY', pe: 'N/A', debtToEquity: 0.09, revenueGrowth: 89 },
  { symbol: 'MSTR', name: 'MicroStrategy Incorporated', aiScore: 79, verdict: 'BUY', pe: 'N/A', debtToEquity: 0.44, revenueGrowth: 12 },
  { symbol: 'PLTR', name: 'Palantir Technologies Inc.', aiScore: 68, verdict: 'HOLD', pe: 62.1, debtToEquity: 0.05, revenueGrowth: 27 },
  { symbol: 'AAPL', name: 'Apple Inc.', aiScore: 72, verdict: 'HOLD', pe: 31.4, debtToEquity: 1.87, revenueGrowth: 5 },
  { symbol: 'TSLA', name: 'Tesla, Inc.', aiScore: 41, verdict: 'SELL', pe: 68.9, debtToEquity: 0.29, revenueGrowth: -4 },
];

export const watchlist = ['RKLB', 'PLTR', 'MSTR', 'AAPL', 'TSLA'];

export const currentUser = {
  name: 'Investor',
  email: 'yanevcorp@gmail.com',
  initials: 'IN',
};
