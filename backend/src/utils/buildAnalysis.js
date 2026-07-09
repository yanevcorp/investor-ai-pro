// Heuristic/placeholder analysis content for stocks with no dedicated,
// hand-curated seed data (e.g. tickers discovered on-demand via search).
// Shared by the seed script and the stock controller's auto-provisioning
// path so both stay in sync.
function buildGenericAnalysis(positive) {
  return {
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
  };
}

module.exports = { buildGenericAnalysis };
