import React, { useEffect, useMemo, useState } from 'react';
import qs from 'query-string';
import {
  Button,
  Card,
  Cascader,
  Form,
  Input,
  Link,
  Message,
  Modal,
  Select,
  Table,
  Tabs,
  Tag,
  Typography,
} from '@arco-design/web-react';
import { useHistory, useLocation } from 'react-router-dom';
import styles from './index.module.less';
import {
  DEFAULT_ORGANIZATION_FILTER_VALUES,
  getOrganizationSelectedStoreSummary,
  ORGANIZATION_REGION_OPTIONS,
  ORGANIZATION_STATUS_LABEL_MAP,
  ORGANIZATION_STATUS_OPTIONS,
  ORGANIZATION_TYPE_LABEL_MAP,
  OrganizationCapabilityConfig,
  OrganizationFilterValues,
  OrganizationItem,
  OrganizationStatus,
  OrganizationType,
  useOrganizationItems,
  writeOrganizationItems,
} from './data';
import StoreDetailModal from './store-detail-modal';
import { getStoreCloseCheckResult } from './store-close';
import { useSelector } from 'react-redux';
import { GlobalState } from '@/store';
import {
  getOrganizationCreatePath,
  getOrganizationEditPath,
  getOrganizationListPath,
} from '@/utils/demo-route';

const Option = Select.Option;
const TabPane = Tabs.TabPane;

function normalizePath(value: (string | string[])[] | undefined): string[] {
  if (!Array.isArray(value) || !value.length) {
    return [];
  }

  const firstValue = value[0];
  if (Array.isArray(firstValue)) {
    return firstValue;
  }

  return value as string[];
}

function renderCapabilityTag(checked: boolean) {
  if (checked) {
    return <Tag color="green">开启</Tag>;
  }

  return <Tag>关闭</Tag>;
}

function renderStatusTag(status: OrganizationStatus) {
  if (status === 'enabled') {
    return <Tag color="green">{ORGANIZATION_STATUS_LABEL_MAP[status]}</Tag>;
  }

  return <Tag>{ORGANIZATION_STATUS_LABEL_MAP[status]}</Tag>;
}

function renderCapabilityColumn(
  capabilityKey: keyof OrganizationCapabilityConfig
): (value: unknown, record: OrganizationItem) => React.ReactNode {
  return (_: unknown, record: OrganizationItem) =>
    renderCapabilityTag(record.capabilities[capabilityKey]);
}

function EnterpriseOrganizationPage() {
  const history = useHistory();
  const location = useLocation();
  const [organizationItems, setOrganizationItems] = useOrganizationItems();
  const { currentDemoIdentity, demoContext } = useSelector(
    (state: GlobalState) => state
  );
  const locationQuery = useMemo(() => qs.parse(location.search), [location.search]);
  const activeTab = useMemo<OrganizationType>(
    () => (locationQuery.tab === 'partner' ? 'partner' : 'store'),
    [locationQuery.tab]
  );

  const [draftFilters, setDraftFilters] = useState<OrganizationFilterValues>(
    DEFAULT_ORGANIZATION_FILTER_VALUES
  );
  const [appliedFilters, setAppliedFilters] = useState<OrganizationFilterValues>(
    DEFAULT_ORGANIZATION_FILTER_VALUES
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailVisible, setDetailVisible] = useState(false);
  const [viewingOrganization, setViewingOrganization] =
    useState<OrganizationItem | null>(null);

  useEffect(() => {
    if (locationQuery.tab !== activeTab) {
      history.replace(getOrganizationListPath(location.pathname, activeTab));
    }
  }, [activeTab, history, location.pathname, locationQuery.tab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  function updateDraftFilter<Key extends keyof OrganizationFilterValues>(
    key: Key,
    value: OrganizationFilterValues[Key]
  ) {
    setDraftFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleQuery() {
    setAppliedFilters({
      ...draftFilters,
      regionPath: [...draftFilters.regionPath],
    });
    setCurrentPage(1);
  }

  function handleReset() {
    const nextFilters = {
      ...DEFAULT_ORGANIZATION_FILTER_VALUES,
      regionPath: [],
    };

    setDraftFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setCurrentPage(1);
  }

  function openStoreDetail(record: OrganizationItem) {
    setViewingOrganization(record);
    setDetailVisible(true);
  }

  function handleStoreDisable(record: OrganizationItem) {
    const closeCheckResult = getStoreCloseCheckResult(record.id);

    if (!closeCheckResult.canClose) {
      Modal.warning({
        title: '暂无法停用店铺',
        content: '当前店铺已存在业务数据，暂无法停用。',
      });
      return;
    }

    Modal.confirm({
      title: '确认停用店铺',
      content: '停用后该店铺将变为停用状态，是否继续？',
      onOk: () => {
        const nextItems = organizationItems.map((item) =>
          item.id === record.id
            ? {
                ...item,
                status: 'disabled' as const,
              }
            : item
        );

        writeOrganizationItems(nextItems);
        setOrganizationItems(nextItems);
        setViewingOrganization((current) =>
          current?.id === record.id
            ? {
                ...current,
                status: 'disabled',
              }
            : current
        );
        Message.success('店铺已停用');
      },
    });
  }

  function handleStoreEnable(record: OrganizationItem) {
    Modal.confirm({
      title: '确认启用店铺',
      content: `确定启用店铺「${record.name}」吗？`,
      onOk: () => {
        const nextItems = organizationItems.map((item) =>
          item.id === record.id
            ? {
                ...item,
                status: 'enabled' as const,
              }
            : item
        );

        writeOrganizationItems(nextItems);
        setOrganizationItems(nextItems);
        setViewingOrganization((current) =>
          current?.id === record.id
            ? {
                ...current,
                status: 'enabled',
              }
            : current
        );
        Message.success('店铺已启用');
      },
    });
  }

  function handleStoreDelete(record: OrganizationItem) {
    Modal.confirm({
      title: '确认删除店铺',
      content: `删除后将无法恢复，确定删除店铺「${record.name}」吗？`,
      onOk: () => {
        const nextItems = organizationItems.filter((item) => item.id !== record.id);

        writeOrganizationItems(nextItems);
        setOrganizationItems(nextItems);
        if (viewingOrganization?.id === record.id) {
          setViewingOrganization(null);
          setDetailVisible(false);
        }
        Message.success('店铺删除成功');
      },
    });
  }

  const filteredOrganizations = useMemo(
    () =>
      organizationItems
        .filter((item) => {
          if (currentDemoIdentity !== 'region_admin') {
            return true;
          }

          return demoContext?.allowedOrganizationIds.includes(item.id);
        })
        .filter((item) => item.type === activeTab)
        .filter((item) => {
          const keyword = appliedFilters.keyword.trim();
          if (keyword && !item.name.includes(keyword)) {
            return false;
          }

          const managerKeyword = appliedFilters.managerKeyword.trim();
          if (managerKeyword && !item.managerName.includes(managerKeyword)) {
            return false;
          }

          if (appliedFilters.regionPath.length) {
            const matchedPath =
              item.regionPath.length === appliedFilters.regionPath.length &&
              item.regionPath.every(
                (value, index) => value === appliedFilters.regionPath[index]
              );

            if (!matchedPath) {
              return false;
            }
          }

          if (appliedFilters.status && item.status !== appliedFilters.status) {
            return false;
          }

          return true;
        })
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [activeTab, appliedFilters, currentDemoIdentity, demoContext, organizationItems]
  );
  const regionFieldLabel = activeTab === 'partner' ? '区域' : '所属区域';
  const isRegionTab = activeTab === 'partner';

  const columns = useMemo(() => {
    const baseColumns = [
      {
        title: '名称',
        dataIndex: 'name',
        width: 180,
        render: (value: string) => (
          <Typography.Text className={styles.organizationName}>
            {value}
          </Typography.Text>
        ),
      },
      {
        title: '编号',
        dataIndex: 'code',
        width: 170,
      },
      {
        title: regionFieldLabel,
        dataIndex: 'regionLabel',
        width: 180,
      },
      {
        title: '联系地址',
        dataIndex: 'address',
        width: 280,
      },
      {
        title: '负责人姓名',
        dataIndex: 'managerName',
        width: 120,
      },
      {
        title: '联系电话',
        dataIndex: 'contactPhone',
        width: 140,
      },
    ];

    const statusColumn = {
      title: '组织状态',
      dataIndex: 'status',
      width: 120,
      render: (value: OrganizationStatus) => renderStatusTag(value),
    };

    if (isRegionTab) {
      return [
        ...baseColumns,
        {
          title: '圈选店铺范围',
          dataIndex: 'selectedStoreIds',
          width: 320,
          render: (_: unknown, record: OrganizationItem) => (
            <Typography.Text className={styles.storeScopeText}>
              {getOrganizationSelectedStoreSummary(record.selectedStoreIds) || '-'}
            </Typography.Text>
          ),
        },
        statusColumn,
        {
          title: '操作',
          dataIndex: 'operations',
          width: 160,
          fixed: 'right' as const,
          render: (_: unknown, record: OrganizationItem) => (
            <div className={styles.actionLinks}>
              <Link
                onClick={() =>
                  history.push(
                    getOrganizationEditPath(
                      location.pathname,
                      record.id,
                      record.type,
                      'basic'
                    )
                  )
                }
              >
                编辑基础信息
              </Link>
            </div>
          ),
        },
      ];
    }

    return [
      ...baseColumns,
      {
        title: '自建商品',
        dataIndex: 'selfBuiltProduct',
        width: 120,
        render: renderCapabilityColumn('selfBuiltProduct'),
      },
      {
        title: '自建营销活动',
        dataIndex: 'selfBuiltMarketingActivity',
        width: 150,
        render: renderCapabilityColumn('selfBuiltMarketingActivity'),
      },
      statusColumn,
      {
        title: '操作',
        dataIndex: 'operations',
        width: 240,
        fixed: 'right' as const,
        render: (_: unknown, record: OrganizationItem) => (
          <div className={styles.actionLinks}>
            <Link onClick={() => openStoreDetail(record)}>详情</Link>
            <Link
              onClick={() =>
                history.push(
                  getOrganizationEditPath(
                    location.pathname,
                    record.id,
                    record.type,
                    'basic'
                  )
                )
              }
            >
              编辑
            </Link>
            {record.status === 'enabled' && (
              <Link onClick={() => handleStoreDisable(record)}>停用</Link>
            )}
            {record.status === 'disabled' && (
              <>
                <Link onClick={() => handleStoreEnable(record)}>启用</Link>
                <Link onClick={() => handleStoreDelete(record)}>删除</Link>
              </>
            )}
          </div>
        ),
      },
    ];
  }, [
    handleStoreDelete,
    handleStoreDisable,
    handleStoreEnable,
    history,
    isRegionTab,
    location.pathname,
    openStoreDetail,
    regionFieldLabel,
  ]);

  const currentTypeLabel = ORGANIZATION_TYPE_LABEL_MAP[activeTab];
  const canCreateCurrentType =
    currentDemoIdentity === 'merchant_admin' || activeTab === 'store';

  return (
    <div className={styles.page}>
      <Card className={styles.filterCard}>
        <Form className={styles.filterForm}>
          <div className={styles.filterGrid}>
            <div className={styles.filterItem}>
              <div className={styles.filterLabel}>组织名称</div>
              <Input
                allowClear
                className={styles.filterInput}
                placeholder="请输入组织名称"
                value={draftFilters.keyword}
                onChange={(value) => updateDraftFilter('keyword', value)}
              />
            </div>

            <div className={styles.filterItem}>
              <div className={styles.filterLabel}>负责人姓名</div>
              <Input
                allowClear
                className={styles.filterInput}
                placeholder="请输入负责人姓名"
                value={draftFilters.managerKeyword}
                onChange={(value) => updateDraftFilter('managerKeyword', value)}
              />
            </div>

            <div className={styles.filterItem}>
              <div className={styles.filterLabel}>{regionFieldLabel}</div>
              <Cascader
                allowClear
                className={styles.filterCascader}
                options={ORGANIZATION_REGION_OPTIONS}
                placeholder={`请选择${regionFieldLabel}`}
                value={draftFilters.regionPath.length ? draftFilters.regionPath : undefined}
                onChange={(value) =>
                  updateDraftFilter('regionPath', normalizePath(value))
                }
              />
            </div>

            <div className={styles.filterItem}>
              <div className={styles.filterLabel}>组织状态</div>
              <Select
                allowClear
                className={styles.filterSelect}
                placeholder="请选择组织状态"
                value={draftFilters.status}
                onChange={(value) =>
                  updateDraftFilter(
                    'status',
                    (value || undefined) as OrganizationStatus | undefined
                  )
                }
              >
                {ORGANIZATION_STATUS_OPTIONS.map((item) => (
                  <Option key={item.value} value={item.value}>
                    {item.label}
                  </Option>
                ))}
              </Select>
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
        <Tabs
          activeTab={activeTab}
          className={styles.tabs}
          destroyOnHide={false}
          onChange={(value) => {
            const nextTab = value as OrganizationType;
            setCurrentPage(1);
            history.replace(getOrganizationListPath(location.pathname, nextTab));
          }}
        >
          <TabPane key="store" title="店铺" />
          <TabPane key="partner" title="区域" />
        </Tabs>

        {canCreateCurrentType && (
          <div className={styles.toolbar}>
            <Button
              type="primary"
              onClick={() =>
                history.push(
                  getOrganizationCreatePath(location.pathname, activeTab)
                )
              }
            >
              新建{currentTypeLabel}
            </Button>
          </div>
        )}

        <div className={styles.tableWrapper}>
          <Table
            rowKey="id"
            columns={columns}
            data={filteredOrganizations}
            noDataElement={`暂无${currentTypeLabel}数据`}
            pagination={{
              current: currentPage,
              pageSize,
              total: filteredOrganizations.length,
              sizeCanChange: true,
              sizeOptions: [10, 20, 50],
              showTotal: true,
              showJumper: true,
              onChange: (pageNumber, nextPageSize) => {
                setCurrentPage(pageNumber);
                setPageSize(nextPageSize);
              },
            }}
            scroll={{ x: isRegionTab ? 1680 : 2040 }}
            tableLayoutFixed
          />
        </div>
      </Card>

      <StoreDetailModal
        visible={detailVisible}
        organization={viewingOrganization}
        onCancel={() => setDetailVisible(false)}
      />
    </div>
  );
}

export default EnterpriseOrganizationPage;
