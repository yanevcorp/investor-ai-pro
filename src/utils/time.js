export function timeAgo(dateInput) {
  const timestamp = new Date(dateInput).getTime();
  if (!Number.isFinite(timestamp)) return '';

  const diffMs = Date.now() - timestamp;
  const mins = Math.floor(diffMs / 60000);

  if (mins < 1) return 'току-що';
  if (mins < 60) return `преди ${mins} мин.`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `преди ${hours} ${hours === 1 ? 'час' : 'часа'}`;

  const days = Math.floor(hours / 24);
  return `преди ${days} ${days === 1 ? 'ден' : 'дни'}`;
}
