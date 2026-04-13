import React, { useEffect, useMemo, useState } from 'react';
import { Card, Empty, Space, Spin, Tag, Typography } from '@arco-design/web-react';
import { useSelector } from 'react-redux';
import Overview from './overview';
import RegionPerformance from './region-performance';
import StoreComparison from './store-comparison';
import OperationsPanel from './operations-panel';
import styles from './style/index.module.less';
import { HeadquartersDashboardData } from './types';
import locale from './locale';
import useLocale from '@/utils/useLocale';
import { GlobalState } from '@/store';
import { buildWorkplaceDashboardData } from './data';
import { scaleMetricByDemoScope } from '@/utils/demo';

function applyDashboardDemoScope(data: HeadquartersDashboardData, isDepartmentScoped: boolean) {
  const departmentScopeContext = {
    currentDemoIdentity: 'store_staff' as const,
  };

  if (!isDepartmentScoped) {
    return data;
  }

  return {
    ...data,
    summary: {
      gmv: {
        ...data.summary.gmv,
        value: scaleMetricByDemoScope(data.summary.gmv.value, departmentScopeContext),
      },
      orderCount: {
        ...data.summary.orderCount,
        value: scaleMetricByDemoScope(
          data.summary.orderCount.value,
          departmentScopeContext
        ),
      },
      customerCount: {
        ...data.summary.customerCount,
        value: scaleMetricByDemoScope(
          data.summary.customerCount.value,
          departmentScopeContext
        ),
      },
      averageOrderValue: data.summary.averageOrderValue,
    },
    gmvTrend: data.gmvTrend.map((item) => ({
      ...item,
      value: scaleMetricByDemoScope(item.value, departmentScopeContext),
    })),
    alerts: data.alerts.slice(0, 2),
    todos: data.todos.slice(0, 2),
  };
}

function Workplace() {
  const t = useLocale(locale);
  const { currentOrganization, currentDemoSystem, demoContext } = useSelector(
    (state: GlobalState) => state
  );
  const [data, setData] = useState<HeadquartersDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const scope = currentOrganization?.scope || 'headquarter';
  const showRegionPerformance = scope === 'headquarter';
  const overviewTitle = useMemo(() => {
    if (scope === 'region') {
      return currentOrganization?.name
        ? `${currentOrganization.name}${t['workplace.title.region'].replace('区域经营看板', '经营看板')}`
        : t['workplace.title.region'];
    }

    if (scope === 'store') {
      return currentOrganization?.name
        ? `${currentOrganization.name}${t['workplace.title.store'].replace('本店铺经营看板', '经营看板')}`
        : t['workplace.title.store'];
    }

    return t['workplace.title'];
  }, [currentOrganization?.name, scope, t]);
  const scopeTag = useMemo(() => {
    if (scope === 'region') {
      return t['workplace.regionScope'];
    }

    if (scope === 'store') {
      return t['workplace.storeScope'];
    }

    return t['workplace.headquartersScope'];
  }, [scope, t]);
  const storeComparisonTitle = useMemo(() => {
    if (scope === 'region') {
      return t['workplace.storeComparison.region'];
    }

    if (scope === 'store') {
      return t['workplace.storeComparison.store'];
    }

    return t['workplace.storeComparison'];
  }, [scope, t]);
  const storeComparisonDescription = useMemo(() => {
    if (scope === 'region') {
      return t['workplace.storeComparison.region.description'];
    }

    if (scope === 'store') {
      return t['workplace.storeComparison.store.description'];
    }

    return t['workplace.storeComparison.description'];
  }, [scope, t]);

  useEffect(() => {
    setLoading(true);
    const nextData = buildWorkplaceDashboardData(currentOrganization);
    setData(
      applyDashboardDemoScope(
        nextData,
        demoContext?.currentDemoIdentity === 'store_staff'
      )
    );
    setLoading(false);
  }, [currentOrganization, demoContext?.currentDemoIdentity]);

  if (!loading && !data) {
    return <Empty className={styles.emptyState} />;
  }

  return (
    <Spin loading={loading} style={{ display: 'block' }}>
      <div className={styles.loadingPlaceholder}>
        {data && (
          <div className={styles.page}>
            <div className={styles.main}>
              <Card className={styles.demoCard}>
                <Space direction="vertical" size={10} style={{ display: 'flex' }}>
                  <div className={styles.demoHeader}>
                    <div>
                      <Typography.Title heading={5} style={{ margin: 0 }}>
                        {currentDemoSystem === 'merchant'
                          ? '商户管理系统首页'
                          : '门店管理系统首页'}
                      </Typography.Title>
                      <Typography.Text type="secondary">
                        {demoContext?.identityDescription}
                      </Typography.Text>
                    </div>
                    <div className={styles.demoTags}>
                      <Tag color="arcoblue">{demoContext?.systemLabel}</Tag>
                      <Tag color="green">{demoContext?.identityLabel}</Tag>
                      <Tag>{demoContext?.dataScopeLabel}</Tag>
                    </div>
                  </div>
                  <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    当前组织：{currentOrganization?.name || '总部'}
                    {demoContext?.currentStaffDepartmentName
                      ? ` · 当前部门：${demoContext.currentStaffDepartmentName}`
                      : ''}
                  </Typography.Paragraph>
                </Space>
              </Card>
              <Overview
                updatedAt={data.updatedAt}
                summary={data.summary}
                gmvTrend={data.gmvTrend}
                loading={loading}
                title={overviewTitle}
                scopeTag={scopeTag}
              />
              {showRegionPerformance && <RegionPerformance regions={data.regions} />}
              <StoreComparison
                stores={data.stores}
                title={storeComparisonTitle}
                description={storeComparisonDescription}
              />
            </div>

            <div className={styles.sidebar}>
              <OperationsPanel alerts={data.alerts} todos={data.todos} />
            </div>
          </div>
        )}
      </div>
    </Spin>
  );
}

export default Workplace;
