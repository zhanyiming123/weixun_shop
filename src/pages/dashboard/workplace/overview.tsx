import React from 'react';
import { Card, Divider, Tag, Typography } from '@arco-design/web-react';
import { IconCaretDown, IconCaretUp } from '@arco-design/web-react/icon';
import OverviewAreaLine from '@/components/Chart/overview-area-line';
import locale from './locale';
import useLocale from '@/utils/useLocale';
import {
  HeadquartersDashboardSummary,
  HeadquartersDashboardTrendPoint,
} from './types';
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatTrendLabel,
  getTrendColor,
} from './utils';
import styles from './style/index.module.less';

function TrendFlag({
  direction,
  value,
}: {
  direction: 'up' | 'down' | 'flat';
  value: string;
}) {
  const color = getTrendColor(direction);
  const icon =
    direction === 'up' ? (
      <IconCaretUp />
    ) : direction === 'down' ? (
      <IconCaretDown />
    ) : null;

  return (
    <span className={styles.trendValue} style={{ color }}>
      {icon}
      {formatTrendLabel(direction, value)}
    </span>
  );
}

function Overview({
  updatedAt,
  summary,
  gmvTrend,
  loading,
  title,
  scopeTag,
  trendDescription,
}: {
  updatedAt: string;
  summary: HeadquartersDashboardSummary;
  gmvTrend: HeadquartersDashboardTrendPoint[];
  loading: boolean;
  title?: string;
  scopeTag?: string;
  trendDescription?: string;
}) {
  const t = useLocale(locale);
  const metricList = [
    {
      key: 'gmv',
      label: t['workplace.metric.gmv'],
      value: formatCompactCurrency(summary.gmv.value),
      trendValue: summary.gmv.trendValue,
      trendDirection: summary.gmv.trendDirection,
    },
    {
      key: 'orderCount',
      label: t['workplace.metric.orderCount'],
      value: formatNumber(summary.orderCount.value),
      trendValue: summary.orderCount.trendValue,
      trendDirection: summary.orderCount.trendDirection,
    },
    {
      key: 'customerCount',
      label: t['workplace.metric.customerCount'],
      value: formatNumber(summary.customerCount.value),
      trendValue: summary.customerCount.trendValue,
      trendDirection: summary.customerCount.trendDirection,
    },
    {
      key: 'averageOrderValue',
      label: t['workplace.metric.averageOrderValue'],
      value: formatCurrency(summary.averageOrderValue.value),
      trendValue: summary.averageOrderValue.trendValue,
      trendDirection: summary.averageOrderValue.trendDirection,
    },
  ];

  return (
    <Card className={styles.overviewCard}>
      <div className={styles.overviewHeader}>
        <div>
          <Typography.Title heading={5} className={styles.pageTitle}>
            {title || t['workplace.title']}
          </Typography.Title>
          <Typography.Text type="secondary">
            {t['workplace.updatedAt']}：{updatedAt}
          </Typography.Text>
        </div>
        <div className={styles.headerTags}>
          <Tag color="arcoblue">{t['workplace.period']}</Tag>
          <Tag color="green">{scopeTag || t['workplace.headquartersScope']}</Tag>
        </div>
      </div>

      <div className={styles.metricGrid}>
        {metricList.map((metric) => (
          <div key={metric.key} className={styles.metricCard}>
            <div className={styles.metricLabel}>{metric.label}</div>
            <div className={styles.metricValue}>{metric.value}</div>
            <div className={styles.metricTrend}>
              <span>{t['workplace.vsLastPeriod']}</span>
              <TrendFlag
                direction={metric.trendDirection}
                value={metric.trendValue}
              />
            </div>
          </div>
        ))}
      </div>

      <Divider />
      <div className={styles.trendSection}>
        <div className={styles.sectionHeader}>
          <div>
            <Typography.Title heading={6} className={styles.sectionTitle}>
              {t['workplace.gmvTrend']}
            </Typography.Title>
            <Typography.Text type="secondary">
              {trendDescription || t['workplace.gmvTrend.description']}
            </Typography.Text>
          </div>
        </div>
        <OverviewAreaLine
          data={gmvTrend.map((item) => ({
            date: item.date,
            count: item.value,
          }))}
          loading={loading}
          name={t['workplace.metric.gmv']}
          yLabelFormatter={(text) => `¥${Math.round(Number(text) / 1000)}k`}
          valueFormatter={(value) => formatCurrency(Number(value))}
        />
      </div>
    </Card>
  );
}

export default Overview;
