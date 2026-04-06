import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Link,
  Message,
  Popconfirm,
  Select,
  Table,
  Typography,
} from '@arco-design/web-react';
import { useHistory } from 'react-router-dom';
import styles from './index.module.less';
import {
  COUPON_DISCOUNT_LABEL_MAP,
  COUPON_DISCOUNT_OPTIONS,
  COUPON_LIST_STATUS_LABEL_MAP,
  COUPON_LIST_STATUS_OPTIONS,
  COUPON_SCOPE_SUMMARY_LABEL_MAP,
  CouponDiscountType,
  CouponListFilterValues,
  CouponListItem,
  CouponListStatus,
  DEFAULT_COUPON_LIST_FILTER_VALUES,
  MOCK_COUPON_LIST,
} from '../data';

const Option = Select.Option;

function getDefaultFilterValues(): CouponListFilterValues {
  return {
    ...DEFAULT_COUPON_LIST_FILTER_VALUES,
  };
}

function applyFilters(
  coupons: CouponListItem[],
  filters: CouponListFilterValues
) {
  const keyword = filters.keyword.trim().toLowerCase();

  return coupons.filter((item) => {
    if (filters.discountType && item.discountType !== filters.discountType) {
      return false;
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
  const [coupons, setCoupons] = useState<CouponListItem[]>(MOCK_COUPON_LIST);
  const [formValues, setFormValues] = useState<CouponListFilterValues>(
    getDefaultFilterValues()
  );
  const [appliedFilters, setAppliedFilters] = useState<CouponListFilterValues>(
    getDefaultFilterValues()
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredCoupons = useMemo(
    () => applyFilters(coupons, appliedFilters),
    [appliedFilters, coupons]
  );

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredCoupons.length / pageSize));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, filteredCoupons.length, pageSize]);

  function updateFormValue<K extends keyof CouponListFilterValues>(
    field: K,
    value: CouponListFilterValues[K]
  ) {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleQuery() {
    setAppliedFilters({
      ...formValues,
    });
    setCurrentPage(1);
  }

  function handleReset() {
    const nextValues = getDefaultFilterValues();
    setFormValues(nextValues);
    setAppliedFilters(nextValues);
    setCurrentPage(1);
  }

  function showPendingMessage(text: string) {
    Message.info(text);
  }

  function handleVoidCoupon(record: CouponListItem) {
    setCoupons((prev) =>
      prev.map((item) =>
        item.id === record.id ? { ...item, status: 'voided' } : item
      )
    );
    Message.success(`${record.name}已作废`);
  }

  function handleDeleteCoupon(record: CouponListItem) {
    setCoupons((prev) => prev.filter((item) => item.id !== record.id));
    Message.success(`${record.name}已删除`);
  }

  function renderActionLinks(record: CouponListItem) {
    const actions: { key: string; node: React.ReactNode }[] = [
      {
        key: 'view',
        node: (
          <Link onClick={() => showPendingMessage(`${record.name}详情暂未实现`)}>
            查看
          </Link>
        ),
      },
    ];

    if (record.status === 'notStarted' || record.status === 'active') {
      actions.push(
        {
          key: 'edit',
          node: (
            <Link onClick={() => showPendingMessage(`${record.name}编辑暂未实现`)}>
              修改
            </Link>
          ),
        },
        {
          key: 'copy',
          node: (
            <Link onClick={() => showPendingMessage(`${record.name}复制暂未实现`)}>
              复制
            </Link>
          ),
        },
        {
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
        }
      );
    } else {
      actions.push(
        {
          key: 'copy',
          node: (
            <Link onClick={() => showPendingMessage(`${record.name}复制暂未实现`)}>
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
              <Link>删除</Link>
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
            {record.productScope === 'specific' ? (
              <Link
                className={styles.inlineLink}
                onClick={() =>
                  showPendingMessage(`${record.name}适用商品详情暂未实现`)
                }
              >
                {COUPON_SCOPE_SUMMARY_LABEL_MAP[record.productScope]}
              </Link>
            ) : (
              <Typography.Text className={styles.secondaryText}>
                {COUPON_SCOPE_SUMMARY_LABEL_MAP[record.productScope]}
              </Typography.Text>
            )}
          </div>
          <Typography.Text className={styles.secondaryText}>
            ID: {record.id}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: '推广场景',
      dataIndex: 'promotionScene',
      width: 140,
    },
    {
      title: '优惠详情',
      dataIndex: 'discountSummary',
      width: 140,
    },
    {
      title: '领取/发放',
      dataIndex: 'receivedCount',
      width: 160,
      render: (_: number, record: CouponListItem) => (
        <div className={styles.infoCell}>
          <Typography.Text className={styles.primaryText}>
            {record.receivedCount}/{record.issueCount}
          </Typography.Text>
          <Typography.Text className={styles.secondaryText}>
            领取率{record.receiveRate}%
          </Typography.Text>
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
      width: 220,
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
              <div className={styles.filterLabel}>券类型</div>
              <Select
                allowClear
                className={styles.filterSelect}
                placeholder="请选择券类型"
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
            scroll={{ x: 1480 }}
            tableLayoutFixed
          />
        </div>
      </Card>
    </div>
  );
}

export default CouponListPage;
