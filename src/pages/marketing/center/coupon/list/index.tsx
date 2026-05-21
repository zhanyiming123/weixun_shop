import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Link,
  Modal,
  Popconfirm,
  Select,
  Table,
  Typography,
} from '@arco-design/web-react';
import { useHistory, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import styles from './index.module.less';
import {
  COUPON_LIST_STATUS_LABEL_MAP,
  COUPON_LIST_STATUS_OPTIONS,
  COUPON_OWNERSHIP_TYPE_LABEL_MAP,
  COUPON_OWNERSHIP_TYPE_OPTIONS,
  COUPON_SCOPE_SUMMARY_LABEL_MAP,
  CouponDiscountType,
  CouponListFilterValues,
  CouponListItem,
  CouponListStatus,
  CouponOwnershipType,
  DEFAULT_COUPON_LIST_FILTER_VALUES,
  readCouponListItems,
  updateCouponStatus,
} from '../data';
import { getCouponActionKeys, type CouponActionKey } from './actions';
import { GlobalState } from '@/store';
import {
  maskPhone,
  ProductStoreItem,
  readProductStoreItems,
} from '@/pages/product/store-config/data';
import CouponDetailDrawer from '../coupon-detail-drawer';

const Option = Select.Option;

type CouponListPageProps = {
  detailCouponId?: string;
};

export function getCouponListDiscountLabel(_discountType: CouponDiscountType) {
  void _discountType;
  return '满减';
}

export function getReceiveIssueDescriptions(
  record: Pick<CouponListItem, 'ownershipType' | 'localReceivedCount' | 'receiveRate'>,
  isStoreSystem: boolean
) {
  const descriptions = [`使用率 ${record.receiveRate}%`];

  if (isStoreSystem && record.ownershipType === 'platform') {
    descriptions.push(`本店已使用 ${record.localReceivedCount} 张`);
  }

  return descriptions;
}

export function formatCouponListDateTime(dateTime: string) {
  return dateTime.slice(0, 16);
}

export function formatCouponListTimeRange(startAt: string, endAt: string) {
  return `${formatCouponListDateTime(startAt)} - ${formatCouponListDateTime(endAt)}`;
}

function getDefaultFilterValues(): CouponListFilterValues {
  return { ...DEFAULT_COUPON_LIST_FILTER_VALUES };
}

function applyFilters(
  coupons: CouponListItem[],
  filters: CouponListFilterValues,
  isStoreSystem: boolean
) {
  const keyword = filters.keyword.trim().toLowerCase();

  return coupons.filter((item) => {
    if (
      filters.discountType &&
      getCouponListDiscountLabel(item.discountType) !==
        getCouponListDiscountLabel(filters.discountType)
    ) {
      return false;
    }

    if (isStoreSystem) {
      if (filters.ownershipType && item.ownershipType !== filters.ownershipType) {
        return false;
      }
    } else {
      if (
        filters.ownershipStoreIds.length &&
        !filters.ownershipStoreIds.includes(item.ownershipStoreId)
      ) {
        return false;
      }
    }

    if (filters.status && item.status !== filters.status) {
      return false;
    }

    if (keyword && !item.name.toLowerCase().includes(keyword)) {
      return false;
    }

    return true;
  });
}

function CouponListPage({ detailCouponId: routeDetailCouponId }: CouponListPageProps) {
  const history = useHistory();
  const location = useLocation();
  const currentOrganization = useSelector(
    (state: GlobalState) => state.currentOrganization
  );
  const isStoreSystem = useSelector(
    (state: GlobalState) => state.currentDemoSystem === 'store'
  );
  const visibleStoreIds = useMemo(
    () =>
      currentOrganization?.scope === 'headquarter'
        ? undefined
        : currentOrganization?.storeIds || [],
    [currentOrganization?.scope, currentOrganization?.storeIds]
  );
  const [coupons, setCoupons] = useState<CouponListItem[]>(() =>
    readCouponListItems(visibleStoreIds, { isStoreSystem })
  );
  const [formValues, setFormValues] = useState<CouponListFilterValues>(
    getDefaultFilterValues()
  );
  const [appliedFilters, setAppliedFilters] = useState<CouponListFilterValues>(
    getDefaultFilterValues()
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [applicableStoresCoupon, setApplicableStoresCoupon] =
    useState<CouponListItem | null>(null);
  const [detailCouponId, setDetailCouponId] = useState<string | null>(
    routeDetailCouponId || null
  );
  const isDetailRoute = location.pathname === '/marketing/center/coupon/detail';

  const storeItems = useMemo(() => readProductStoreItems(), []);
  const storeItemMap = useMemo(
    () => new Map(storeItems.map((item) => [item.id, item])),
    [storeItems]
  );
  const applicableStores = useMemo(() => {
    if (!applicableStoresCoupon) {
      return [];
    }

    return applicableStoresCoupon.storeIds
      .map((storeId) => storeItemMap.get(storeId))
      .filter((item): item is ProductStoreItem => Boolean(item));
  }, [applicableStoresCoupon, storeItemMap]);

  const filteredCoupons = useMemo(
    () => applyFilters(coupons, appliedFilters, isStoreSystem),
    [appliedFilters, coupons, isStoreSystem]
  );

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredCoupons.length / pageSize));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, filteredCoupons.length, pageSize]);

  useEffect(() => {
    setCoupons(readCouponListItems(visibleStoreIds, { isStoreSystem }));
    setCurrentPage(1);
  }, [currentOrganization?.id, isStoreSystem, visibleStoreIds]);

  useEffect(() => {
    setDetailCouponId(routeDetailCouponId || null);
  }, [routeDetailCouponId]);

  useEffect(() => {
    if (isDetailRoute && !routeDetailCouponId) {
      history.replace('/marketing/center/coupon/list');
    }
  }, [history, isDetailRoute, routeDetailCouponId]);

  function updateFormValue<K extends keyof CouponListFilterValues>(
    field: K,
    value: CouponListFilterValues[K]
  ) {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleQuery() {
    setAppliedFilters({ ...formValues });
    setCurrentPage(1);
  }

  function handleReset() {
    const nextValues = getDefaultFilterValues();
    setFormValues(nextValues);
    setAppliedFilters(nextValues);
    setCurrentPage(1);
  }

  function refreshCoupons() {
    setCoupons(readCouponListItems(visibleStoreIds, { isStoreSystem }));
  }

  function handleVoidCoupon(record: CouponListItem) {
    updateCouponStatus(record.id, 'voided');
    refreshCoupons();
  }

  function renderActionLinks(record: CouponListItem) {
    const actionNodes: Record<CouponActionKey, React.ReactNode> = {
      edit: (
        <Link
          onClick={() =>
            history.push(`/marketing/center/coupon/edit?id=${record.id}`)
          }
        >
          修改
        </Link>
      ),
      copy: (
        <Link
          onClick={() =>
            history.push(`/marketing/center/coupon/create?sourceId=${record.id}`)
          }
        >
          复制
        </Link>
      ),
      void: (
        <Popconfirm
          focusLock
          title="确认作废该优惠券吗？"
          onOk={() => handleVoidCoupon(record)}
        >
          <Link>作废</Link>
        </Popconfirm>
      ),
    };
    const actionKeys = getCouponActionKeys(record, isStoreSystem);

    return (
      <span className={styles.actionLinks}>
        {actionKeys.map((actionKey, index) => (
          <React.Fragment key={actionKey}>
            {index > 0 && <span className={styles.actionDivider}>|</span>}
            {actionNodes[actionKey]}
          </React.Fragment>
        ))}
      </span>
    );
  }

  const columns = [
    {
      title: '优惠券信息',
      dataIndex: 'name',
      width: 320,
      render: (_: string, record: CouponListItem) => (
        <div className={styles.infoCell}>
          <Typography.Text className={styles.primaryText}>
            {record.name}
          </Typography.Text>
          <div className={styles.metaRow}>
            <Typography.Text className={styles.secondaryText}>
              {getCouponListDiscountLabel(record.discountType)}
            </Typography.Text>
            <span className={styles.metaDivider}>|</span>
            <Typography.Text className={styles.secondaryText}>
              {COUPON_SCOPE_SUMMARY_LABEL_MAP[record.productScope]}
            </Typography.Text>
          </div>
          <Typography.Text className={styles.secondaryText}>
            ID: {record.id}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: '优惠详情',
      dataIndex: 'discountSummary',
      width: 140,
    },
    ...(isStoreSystem
      ? [
          {
            title: '券归属类型',
            dataIndex: 'ownershipType',
            width: 140,
            render: (_: string, record: CouponListItem) => (
              <div className={styles.infoCell}>
                <Typography.Text className={styles.primaryText}>
                  {COUPON_OWNERSHIP_TYPE_LABEL_MAP[record.ownershipType]}
                </Typography.Text>
              </div>
            ),
          },
        ]
      : []),
    ...(!isStoreSystem
      ? [
          {
            title: '适用店铺',
            dataIndex: 'storeIds',
            width: 120,
            render: (_: string[], record: CouponListItem) => (
              <Link
                className={styles.inlineLink}
                onClick={() => setApplicableStoresCoupon(record)}
              >
                {record.storeIds.length} 家店铺
              </Link>
            ),
          },
        ]
      : []),
    {
      title: '使用/发放',
      dataIndex: 'receivedCount',
      width: 170,
      render: (_: number, record: CouponListItem) => (
        <div className={styles.infoCell}>
          <Typography.Text className={styles.primaryText}>
            {record.receivedCount}/{record.issueCount}
          </Typography.Text>
          {getReceiveIssueDescriptions(record, isStoreSystem).map((description) => (
            <Typography.Text key={description} className={styles.secondaryText}>
              {description}
            </Typography.Text>
          ))}
        </div>
      ),
    },
    {
      title: '使用时间',
      dataIndex: 'receiveStartAt',
      width: 300,
      render: (_: string, record: CouponListItem) => (
        <div className={styles.infoCell}>
          <Typography.Text className={styles.timeText}>
            {formatCouponListTimeRange(record.useStartAt, record.useEndAt)}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: '券状态',
      dataIndex: 'status',
      width: 120,
      render: (value: CouponListStatus) => COUPON_LIST_STATUS_LABEL_MAP[value],
    },
    {
      title: '操作',
      dataIndex: 'operations',
      width: 260,
      fixed: 'right' as const,
      render: (_: unknown, record: CouponListItem) => renderActionLinks(record),
    },
  ];

  return (
    <div className={styles.page}>
      <Card className={styles.filterCard}>
        <Form className={styles.filterForm}>
          <div className={styles.filterGrid}>
            {isStoreSystem ? (
              <div className={styles.filterItem}>
                <div className={styles.filterLabel}>券归属类型</div>
                <Select
                  allowClear
                  className={styles.filterSelect}
                  placeholder="请选择券归属类型"
                  value={formValues.ownershipType}
                  onChange={(value) =>
                    updateFormValue(
                      'ownershipType',
                      (value || undefined) as CouponOwnershipType | undefined
                    )
                  }
                >
                  {COUPON_OWNERSHIP_TYPE_OPTIONS.map((item) => (
                    <Option key={item.value} value={item.value}>
                      {item.label}
                    </Option>
                  ))}
                </Select>
              </div>
            ) : null}

            <div className={styles.filterItem}>
              <div className={styles.filterLabel}>券状态</div>
              <Select
                allowClear
                className={styles.filterSelect}
                placeholder="请选择券状态"
                value={formValues.status}
                onChange={(value) =>
                  updateFormValue(
                    'status',
                    (value || undefined) as CouponListStatus | undefined
                  )
                }
              >
                {COUPON_LIST_STATUS_OPTIONS.map((item) => (
                  <Option key={item.value} value={item.value}>
                    {item.label}
                  </Option>
                ))}
              </Select>
            </div>

            <div className={styles.filterItem}>
              <div className={styles.filterLabel}>券名称</div>
              <Input
                allowClear
                className={styles.filterInput}
                placeholder="请输入优惠券名称"
                value={formValues.keyword}
                onChange={(value) => updateFormValue('keyword', value)}
              />
            </div>
          </div>

          <div className={styles.filterActions}>
            <Button type="primary" onClick={handleQuery}>
              查询
            </Button>
            <Button onClick={handleReset}>重置</Button>
          </div>
        </Form>
      </Card>

      <Card className={styles.panelCard}>
        <div className={styles.toolbar}>
          <Button
            type="primary"
            onClick={() => history.push('/marketing/center/coupon/create')}
          >
            新增
          </Button>
        </div>

        <div className={styles.tableWrapper}>
          <Table
            rowKey="id"
            columns={columns}
            data={filteredCoupons}
            noDataElement="暂无优惠券"
            pagination={{
              current: currentPage,
              pageSize,
              total: filteredCoupons.length,
              sizeCanChange: true,
              sizeOptions: [10, 20, 50],
              showTotal: true,
              showJumper: true,
              onChange: (pageNumber, nextPageSize) => {
                setCurrentPage(pageNumber);
                setPageSize(nextPageSize);
              },
            }}
            scroll={{ x: isStoreSystem ? 1450 : 1450 }}
            tableLayoutFixed
          />
        </div>
      </Card>

      {!isStoreSystem && (
        <Modal
          title="适用店铺"
          visible={Boolean(applicableStoresCoupon)}
          footer={null}
          style={{ width: 880 }}
          onCancel={() => setApplicableStoresCoupon(null)}
        >
          <Table
            rowKey="id"
            columns={[
              {
                title: '店铺名称',
                dataIndex: 'name',
                width: 220,
              },
              {
                title: '店铺地址',
                dataIndex: 'address',
                width: 360,
              },
              {
                title: '店铺负责人',
                dataIndex: 'managerName',
                width: 200,
                render: (_: string, record: ProductStoreItem) => (
                  <div className={styles.storeContactCell}>
                    <span>{record.managerName}</span>
                    <span>{`+86-${maskPhone(record.phone)}`}</span>
                  </div>
                ),
              },
            ]}
            data={applicableStores}
            noDataElement="暂无适用店铺"
            pagination={false}
            scroll={{ y: 420 }}
            tableLayoutFixed
          />
        </Modal>
      )}

      <CouponDetailDrawer
        couponId={detailCouponId}
        visible={Boolean(detailCouponId)}
        onCancel={() => {
          if (isDetailRoute) {
            history.replace('/marketing/center/coupon/list');
            return;
          }

          setDetailCouponId(null);
        }}
      />
    </div>
  );
}

export default CouponListPage;
