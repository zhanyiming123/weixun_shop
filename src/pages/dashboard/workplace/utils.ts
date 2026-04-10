import {
  HeadquartersDashboardAlertLevel,
  HeadquartersDashboardTrendDirection,
} from './types';

export function formatNumber(value: number) {
  return value.toLocaleString();
}

export function formatCurrency(value: number, fractionDigits = 2) {
  return `¥${value.toLocaleString('zh-CN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

export function formatCompactCurrency(value: number, fractionDigits = 2) {
  if (Math.abs(value) >= 10000) {
    return `¥${(value / 10000).toLocaleString('zh-CN', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })}万`;
  }

  return formatCurrency(value, fractionDigits);
}

export function formatTrendLabel(
  direction: HeadquartersDashboardTrendDirection,
  trendValue: string
) {
  if (direction === 'flat') {
    return trendValue;
  }

  const normalizedValue = trendValue.startsWith('+') || trendValue.startsWith('-')
    ? trendValue.slice(1)
    : trendValue;

  return `${direction === 'up' ? '+' : '-'}${normalizedValue}`;
}

export function getTrendColor(direction: HeadquartersDashboardTrendDirection) {
  if (direction === 'up') {
    return 'rgb(var(--green-6))';
  }

  if (direction === 'down') {
    return 'rgb(var(--red-6))';
  }

  return 'var(--color-text-3)';
}

export function getAlertLevelColor(level: HeadquartersDashboardAlertLevel) {
  switch (level) {
    case 'high':
      return 'red';
    case 'medium':
      return 'orangered';
    default:
      return 'arcoblue';
  }
}

export function getTodoStatusColor(status: string) {
  if (status.includes('待处理') || status.includes('今日截止')) {
    return 'red';
  }

  if (status.includes('进行中')) {
    return 'arcoblue';
  }

  return 'green';
}
