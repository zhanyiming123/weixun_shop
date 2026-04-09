import React, { useEffect, useMemo, useState } from 'react';
import qs from 'query-string';
import {
  Button,
  Card,
  Cascader,
  Form,
  Input,
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
} from './data';

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
  const [organizationItems] = useOrganizationItems();
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

  useEffect(() => {
    if (locationQuery.tab !== activeTab) {
      history.replace(`/enterprise/organization?tab=${activeTab}`);
    }
  }, [activeTab, history, locationQuery.tab]);

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

  const filteredOrganizations = useMemo(
    () =>
      organizationItems
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
    [activeTab, appliedFilters, organizationItems]
  );

  const columns = [
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
      title: '所属区域',
      dataIndex: 'regionLabel',
      width: 180,
    },
    {
      title: '详细地址',
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
    {
      title: '网店隔离',
      dataIndex: 'shopIsolation',
      width: 120,
      render: renderCapabilityColumn('shopIsolation'),
    },
    {
      title: '网店状态',
      dataIndex: 'shopStatus',
      width: 120,
      render: renderCapabilityColumn('shopStatus'),
    },
    {
      title: '自建商品',
      dataIndex: 'selfBuiltProduct',
      width: 120,
      render: renderCapabilityColumn('selfBuiltProduct'),
    },
    {
      title: '自定义商品信息',
      dataIndex: 'customProductInfo',
      width: 150,
      render: renderCapabilityColumn('customProductInfo'),
    },
    {
      title: '组织状态',
      dataIndex: 'status',
      width: 120,
      render: (value: OrganizationStatus) => renderStatusTag(value),
    },
  ];

  const currentTypeLabel = ORGANIZATION_TYPE_LABEL_MAP[activeTab];

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
              <div className={styles.filterLabel}>所属区域</div>
              <Cascader
                allowClear
                className={styles.filterCascader}
                options={ORGANIZATION_REGION_OPTIONS}
                placeholder="请选择所属区域"
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
            history.replace(`/enterprise/organization?tab=${nextTab}`);
          }}
        >
          <TabPane key="store" title="门店" />
          <TabPane key="partner" title="合伙人" />
        </Tabs>

        <div className={styles.toolbar}>
          <Button
            type="primary"
            onClick={() =>
              history.push(`/enterprise/organization/create?type=${activeTab}`)
            }
          >
            新建{currentTypeLabel}
          </Button>
        </div>

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
            scroll={{ x: 1740 }}
            tableLayoutFixed
          />
        </div>
      </Card>
    </div>
  );
}

export default EnterpriseOrganizationPage;
