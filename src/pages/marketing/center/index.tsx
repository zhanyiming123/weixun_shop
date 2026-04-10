import React, { useMemo } from 'react';
import { Card, Tag, Typography } from '@arco-design/web-react';
import { IconTag } from '@arco-design/web-react/icon';
import { useHistory } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { GlobalState } from '@/store';
import { readCouponListItems } from './coupon/data';
import {
  filterProductsByStoreIds,
  readProductItems,
} from '@/pages/product/list/data';
import {
  getOrganizationScopeLabel,
  HEADQUARTER_ORGANIZATION_ID,
} from '@/utils/organization';
import styles from './index.module.less';

function MarketingCenterPage() {
  const history = useHistory();
  const currentOrganization = useSelector(
    (state: GlobalState) => state.currentOrganization
  );
  const visibleStoreIds = useMemo(
    () =>
      currentOrganization?.id === HEADQUARTER_ORGANIZATION_ID
        ? undefined
        : currentOrganization?.storeIds || [],
    [currentOrganization?.id, currentOrganization?.storeIds]
  );
  const visibleCoupons = useMemo(
    () => readCouponListItems(visibleStoreIds),
    [visibleStoreIds]
  );
  const visibleProducts = useMemo(() => {
    const products = readProductItems();
    return typeof visibleStoreIds === 'undefined'
      ? products
      : filterProductsByStoreIds(products, visibleStoreIds);
  }, [visibleStoreIds]);
  const summaryCards = useMemo(
    () => [
      {
        label: '可营销商品',
        value: visibleProducts.length,
        helper: '当前组织范围内可参与营销的商品',
      },
      {
        label: '可见活动',
        value: visibleCoupons.length,
        helper: '当前组织可查看的营销活动数量',
      },
      {
        label: '总部下发',
        value: visibleCoupons.filter((item) => item.ownershipScope === 'headquarter')
          .length,
        helper: '总部统一下发到当前组织的活动',
      },
      {
        label:
          currentOrganization?.scope === 'store' ? '本店自建' : '门店自建',
        value: visibleCoupons.filter((item) => item.ownershipScope === 'store').length,
        helper: '当前组织范围内门店自己创建的活动',
      },
    ],
    [currentOrganization?.scope, visibleCoupons, visibleProducts.length]
  );
  const recentCoupons = useMemo(
    () =>
      [...visibleCoupons]
        .sort(
          (left, right) =>
            new Date(right.receiveStartAt).getTime() -
            new Date(left.receiveStartAt).getTime()
        )
        .slice(0, 6),
    [visibleCoupons]
  );
  const organizationLabel = currentOrganization
    ? currentOrganization.scope === 'headquarter'
      ? currentOrganization.name
      : `${currentOrganization.name} · ${getOrganizationScopeLabel(
          currentOrganization.scope
        )}`
    : '总部';

  return (
    <div className={styles.page}>
      <Typography.Title className={styles.pageTitle} heading={4}>
        营销中心
      </Typography.Title>
      <Typography.Paragraph className={styles.pageMeta} type="secondary">
        当前视角：{organizationLabel}。这里汇总当前组织可见的活动和可营销商品，包含总部下发与门店自建两类数据。
      </Typography.Paragraph>

      <div className={styles.summaryGrid}>
        {summaryCards.map((item) => (
          <Card key={item.label} className={styles.summaryCard}>
            <div className={styles.summaryLabel}>{item.label}</div>
            <div className={styles.summaryValue}>{item.value}</div>
            <div className={styles.summaryHelper}>{item.helper}</div>
          </Card>
        ))}
      </div>

      <Card className={styles.boardCard}>
        <div className={styles.sectionHeader}>
          <Typography.Title className={styles.sectionTitle} heading={5}>
            营销玩法
          </Typography.Title>
          <Typography.Paragraph className={styles.sectionDesc} type="secondary">
            促销、多种营销、提高下单转化率
          </Typography.Paragraph>
        </div>

        <div className={styles.moduleGrid}>
          <Card
            bordered={false}
            hoverable
            className={styles.moduleCard}
            onClick={() => history.push('/marketing/center/coupon/list')}
          >
            <div className={styles.moduleCardInner}>
              <div className={styles.moduleIcon}>
                <IconTag />
              </div>
              <div className={styles.moduleContent}>
                <div className={styles.moduleTitle}>优惠券</div>
                <div className={styles.moduleDesc}>通用券（满减、直减、折扣）</div>
              </div>
            </div>
          </Card>
        </div>
      </Card>

      <Card className={styles.boardCard}>
        <div className={styles.sectionHeader}>
          <Typography.Title className={styles.sectionTitle} heading={5}>
            近期活动
          </Typography.Title>
          <Typography.Paragraph className={styles.sectionDesc} type="secondary">
            按当前组织范围展示最近可见的营销活动，可快速区分总部下发与门店自建。
          </Typography.Paragraph>
        </div>

        <div className={styles.recentList}>
          {recentCoupons.map((item) => (
            <div
              key={item.id}
              className={styles.recentItem}
              onClick={() => history.push(`/marketing/center/coupon/detail?id=${item.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  history.push(`/marketing/center/coupon/detail?id=${item.id}`);
                }
              }}
            >
              <div className={styles.recentMain}>
                <div className={styles.recentTitle}>{item.name}</div>
                <div className={styles.recentMeta}>
                  {item.discountSummary} · 领取期 {item.receiveStartAt} - {item.receiveEndAt}
                </div>
              </div>
              <div className={styles.recentBadgeRow}>
                <Tag color={item.ownershipScope === 'headquarter' ? 'arcoblue' : 'green'}>
                  {item.ownershipScope === 'headquarter' ? '总部下发' : '门店自建'}
                </Tag>
                <Tag>{item.ownershipLabel}</Tag>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default MarketingCenterPage;
