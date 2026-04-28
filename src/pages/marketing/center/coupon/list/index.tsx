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
import { useHistory } from 'react-router-dom';
import { useSelector } from 'react-redux';
import styles from './index.module.less';
import {
  COUPON_DISCOUNT_LABEL_MAP,
  COUPON_DISCOUNT_OPTIONS,
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
  deleteCouponById,
  readCouponListItems,
  updateCouponStatus,
} from '../data';
import { GlobalState } from '@/store';
import {
  maskPhone,
  ProductStoreItem,
  readProductStoreItems,
} from '@/pages/product/store-config/data';

const Option = Select.Option;

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
    if (filters.discountType && item.discountType !== filters.discountType) {
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

function CouponListPage() {
  const history = useHistory();
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

  const storeItems = useMemo(() => readProductStoreItems(), []);
  const storeItemMap = useMemo(
    () => new Map(storeItems.map((item) => [item.id, item])),
    [storeItems]
  );
  const ownershipStoreOptions = useMemo(() => {
    const optionMap = new Map<string, string>();
    coupons.forEach((item) => {
      optionMap.set(item.ownershipStoreId, item.ownershipLabel);
    });

    return Array.from(optionMap.entries()).map(([value, label]) => ({
      label,
      value,
    }));
  }, [coupons]);
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

  function handleDeleteCoupon(record: CouponListItem) {
    deleteCouponById(record.id);
    refreshCoupons();
  }

  function renderActionLinks(record: CouponListItem) {
    const isStorePlatformCoupon =
      isStoreSystem && record.ownershipType === 'platform';

    if (record.ownershipScope === 'shared_in' || isStorePlatformCoupon) {
      return (
        <span className={styles.actionLinks}>
          <Link
            onClick={() =>
              history.push(`/marketing/center/coupon/detail?id=${record.id}`)
            }
          >
            查看
          </Link>
          <span className={styles.actionDivider}>|</span>
          <Link
            onClick={() =>
              history.push(
                `/marketing/center/coupon/create?sourceId=${record.id}`
              )
            }
          >
            复制
          </Link>
        </span>
      );
    }

    const isActive = record.status === 'notStarted' || record.status === 'active';
    const actions: { key: string; node: React.ReactNode }[] = [
      {
        key: 'view',
        node: (
          <Link
            onClick={() =>
              history.push(`/marketing/center/coupon/detail?id=${record.id}`)
            }
          >
            查看
          </Link>
        ),
      },
    ];

    if (isActive) {
      actions.push(
        {
          key: 'edit',
          node: (
            <Link
              onClick={() =>
                history.push(`/marketing/center/coupon/edit?id=${record.id}`)
              }
            >
              修改
            </Link>
          ),
        },
        {
          key: 'copy',
          node: (
            <Link
              onClick={() =>
                history.push(
                  `/marketing/center/coupon/create?sourceId=${record.id}`
                )
              }
            >
              复制
            </Link>
          ),
        }
      );

      actions.push({
        key: 'void',
        node: (
          <Popconfirm
            focusLock
            title="确认作废该优惠券吗？"
            onOk={() => handleVoidCoupon(record)}
          >
            <Link>作废</Link>
          </Popconfirm>
        ),
      });
    } else {
      actions.push(
        {
          key: 'copy',
          node: (
            <Link
              onClick={() =>
                history.push(
                  `/marketing/center/coupon/create?sourceId=${record.id}`
                )
              }
            >
              复制
            </Link>
          ),
        },
        {
          key: 'delete',
          node: (
            <Popconfirm
              focusLock
              title="确认删除该优惠券吗？"
              onOk={() => handleDeleteCoupon(record)}
            >
              <Link status="error">删除</Link>
            </Popconfirm>
          ),
        }
      );
    }

    return (
      <span className={styles.actionLinks}>
        {actions.map((action, index) => (
          <React.Fragment key={action.key}>
            {index > 0 && <span className={styles.actionDivider}>|</span>}
            {action.node}
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
              {COUPON_DISCOUNT_LABEL_MAP[record.discountType]}
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
    isStoreSystem
      ? {
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
        }
      : {
          title: '活动归属',
          dataIndex: 'ownershipLabel',
          width: 180,
          render: (_: string, record: CouponListItem) => (
            <div className={styles.infoCell}>
              <Typography.Text className={styles.primaryText}>
                {record.ownershipLabel}
              </Typography.Text>
            </div>
          ),
        },
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
      title: '领取/发放',
      dataIndex: 'receivedCount',
      width: 170,
      render: (_: number, record: CouponListItem) => (
        <div className={styles.infoCell}>
          <Typography.Text className={styles.primaryText}>
            {record.receivedCount}/{record.issueCount}
          </Typography.Text>
          <Typography.Text className={styles.secondaryText}>
            领取率 {record.receiveRate}%
          </Typography.Text>
          {record.ownershipScope !== 'own' && (
            <Typography.Text className={styles.secondaryText}>
              本店已领 {record.localReceivedCount} 张
            </Typography.Text>
          )}
        </div>
      ),
    },
    {
      title: '领取/使用时间',
      dataIndex: 'receiveStartAt',
      width: 380,
      render: (_: string, record: CouponListItem) => (
        <div className={styles.infoCell}>
          <Typography.Text className={styles.timeText}>
            领：{record.receiveStartAt} - {record.receiveEndAt}
          </Typography.Text>
          <Typography.Text className={styles.timeText}>
            用：{record.useStartAt} - {record.useEndAt}
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
            <div className={styles.filterItem}>
              <div className={styles.filterLabel}>优惠方式</div>
              <Select
                allowClear
                className={styles.filterSelect}
                placeholder="请选择优惠方式"
                value={formValues.discountType}
                onChange={(value) =>
                  updateFormValue(
                    'discountType',
                    (value || undefined) as CouponDiscountType | undefined
                  )
                }
              >
                {COUPON_DISCOUNT_OPTIONS.map((item) => (
                  <Option key={item.value} value={item.value}>
                    {item.label}
                  </Option>
                ))}
              </Select>
            </div>

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
            ) : (
              <div className={styles.filterItem}>
                <div className={styles.filterLabel}>活动归属</div>
                <Select
                  allowClear
                  mode="multiple"
                  className={styles.filterSelect}
                  placeholder="请选择活动归属"
                  value={formValues.ownershipStoreIds}
                  onChange={(value) => {
                    updateFormValue(
                      'ownershipStoreIds',
                      Array.isArray(value) ? value.map(String) : []
                    );
                  }}
                >
                  {ownershipStoreOptions.map((item) => (
                    <Option key={item.value} value={item.value}>
                      {item.label}
                    </Option>
                  ))}
                </Select>
              </div>
            )}

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
            scroll={{ x: isStoreSystem ? 1530 : 1710 }}
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
    </div>
  );
}

export default CouponListPage;
