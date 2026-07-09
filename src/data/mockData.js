// Portfolio-analysis data with no backend endpoint yet — kept as static
// mock data until stress-test / correlation modeling is implemented server-side.

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
