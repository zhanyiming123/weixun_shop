import React from 'react';
import { Card, Tag, Typography } from '@arco-design/web-react';
import useLocale from '@/utils/useLocale';
import locale from './locale';
import { HeadquartersDashboardStore } from './types';
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
} from './utils';
import styles from './style/index.module.less';

function StoreComparison({
  stores,
  title,
  description,
}: {
  stores: HeadquartersDashboardStore[];
  title?: string;
  description?: string;
}) {
  const t = useLocale(locale);

  return (
    <Card className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div>
          <Typography.Title heading={6} className={styles.sectionTitle}>
            {title || t['workplace.storeComparison']}
          </Typography.Title>
          <Typography.Text type="secondary">
            {description || t['workplace.storeComparison.description']}
          </Typography.Text>
        </div>
      </div>

      <div className={styles.storeGrid}>
        {stores.map((store) => (
          <div key={store.id} className={styles.storeCard}>
            <div className={styles.storeCardHeader}>
              <div>
                <div className={styles.storeName}>{store.name}</div>
                <div className={styles.storeMeta}>
                  <span>{store.regionName}</span>
                  <span>
                    {t['workplace.store.manager']}：{store.managerName}
                  </span>
                </div>
              </div>
              <Tag color="arcoblue">{store.regionName}</Tag>
            </div>

            <div className={styles.storeMetricGrid}>
              <div className={styles.storeMetricItem}>
                <span className={styles.metricLabel}>
                  {t['workplace.metric.gmv']}
                </span>
                <span className={styles.storeMetricValue}>
                  {formatCompactCurrency(store.gmv)}
                </span>
              </div>
              <div className={styles.storeMetricItem}>
                <span className={styles.metricLabel}>
                  {t['workplace.metric.orderCount']}
                </span>
                <span className={styles.storeMetricValue}>
                  {formatNumber(store.orderCount)}
                </span>
              </div>
              <div className={styles.storeMetricItem}>
                <span className={styles.metricLabel}>
                  {t['workplace.metric.customerCount']}
                </span>
                <span className={styles.storeMetricValue}>
                  {formatNumber(store.customerCount)}
                </span>
              </div>
              <div className={styles.storeMetricItem}>
                <span className={styles.metricLabel}>
                  {t['workplace.metric.averageOrderValue']}
                </span>
                <span className={styles.storeMetricValue}>
                  {formatCurrency(store.averageOrderValue)}
                </span>
              </div>
            </div>

            <div className={styles.storeWarnings}>
              <span className={styles.metricLabel}>
                {t['workplace.store.warnings']}
              </span>
              <div className={styles.tagList}>
                {store.warningTags.length ? (
                  store.warningTags.map((tag) => (
                    <Tag key={tag} color="orangered">
                      {tag}
                    </Tag>
                  ))
                ) : (
                  <Tag color="green">{t['workplace.store.stable']}</Tag>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default StoreComparison;
