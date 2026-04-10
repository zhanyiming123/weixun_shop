import React, { useEffect, useMemo, useState } from 'react';
import { Empty, Spin } from '@arco-design/web-react';
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

function Workplace() {
  const t = useLocale(locale);
  const currentOrganization = useSelector(
    (state: GlobalState) => state.currentOrganization
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
    setData(buildWorkplaceDashboardData(currentOrganization));
    setLoading(false);
  }, [currentOrganization]);

  if (!loading && !data) {
    return <Empty className={styles.emptyState} />;
  }

  return (
    <Spin loading={loading} style={{ display: 'block' }}>
      <div className={styles.loadingPlaceholder}>
        {data && (
          <div className={styles.page}>
            <div className={styles.main}>
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
