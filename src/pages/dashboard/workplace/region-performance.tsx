import React from 'react';
import { Card, Table, Tag, Typography } from '@arco-design/web-react';
import useLocale from '@/utils/useLocale';
import locale from './locale';
import { HeadquartersDashboardRegion } from './types';
import { formatCompactCurrency, formatNumber } from './utils';
import styles from './style/index.module.less';

function RegionPerformance({
  regions,
}: {
  regions: HeadquartersDashboardRegion[];
}) {
  const t = useLocale(locale);

  const columns = [
    {
      title: t['workplace.region.column.name'],
      dataIndex: 'name',
      render: (value: string) => (
        <Typography.Text className={styles.tablePrimaryText}>
          {value}
        </Typography.Text>
      ),
    },
    {
      title: t['workplace.region.column.storeCount'],
      dataIndex: 'storeCount',
      width: 120,
      render: (value: number) => `${value}${t['workplace.storeUnit']}`,
    },
    {
      title: t['workplace.region.column.gmv'],
      dataIndex: 'gmv',
      width: 160,
      render: (value: number) => formatCompactCurrency(value),
    },
    {
      title: t['workplace.region.column.orderCount'],
      dataIndex: 'orderCount',
      width: 140,
      render: (value: number) => formatNumber(value),
    },
    {
      title: t['workplace.region.column.customerCount'],
      dataIndex: 'customerCount',
      width: 140,
      render: (value: number) => formatNumber(value),
    },
    {
      title: t['workplace.region.column.warningCount'],
      dataIndex: 'warningCount',
      width: 120,
      render: (value: number) =>
        value ? <Tag color="red">{value}</Tag> : <Tag>{t['workplace.none']}</Tag>,
    },
  ];

  return (
    <Card className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div>
          <Typography.Title heading={6} className={styles.sectionTitle}>
            {t['workplace.regionPerformance']}
          </Typography.Title>
          <Typography.Text type="secondary">
            {t['workplace.regionPerformance.description']}
          </Typography.Text>
        </div>
      </div>
      <div className={styles.tableWrapper}>
        <Table
          rowKey="id"
          columns={columns}
          data={regions}
          pagination={false}
          border={false}
          scroll={{ x: 760 }}
        />
      </div>
    </Card>
  );
}

export default RegionPerformance;
