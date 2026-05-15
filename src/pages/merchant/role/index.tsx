import React, { useEffect, useMemo, useState } from 'react';
import qs from 'query-string';
import {
  Button,
  Card,
  Input,
  Message,
  Modal,
  Pagination,
  Popconfirm,
  Table,
  Tabs,
  Tag,
  Typography,
} from '@arco-design/web-react';
import { IconPlus } from '@arco-design/web-react/icon';
import { useHistory, useLocation } from 'react-router-dom';
import styles from './index.module.less';
import {
  EnterpriseRoleItem,
  getMerchantRoleEnabledSystemNames,
  useEnterpriseRoleItems,
} from '@/pages/enterprise/role/data';
import {
  DEFAULT_EMPLOYEE_ITEMS,
  EmployeeItem,
  EMPLOYEE_STATUS_TABLE_LABEL_MAP,
} from '@/pages/enterprise/employee/data';
import {
  getRoleCreatePath,
  getRoleEditPath,
  getRoleViewPath,
} from '@/utils/demo-route';
import usePersistentState from '@/utils/usePersistentState';
import { buildMerchantRoleEmployeePreviewRows } from './role-employees';
import {
  filterMerchantRoleItems,
  getMerchantRoleCreateScope,
  getMerchantRoleListTabPath,
  MerchantRoleTab,
  normalizeMerchantRoleTab,
  MERCHANT_ROLE_TYPE_LABEL_MAP,
  getMerchantRoleTypeByScope,
} from './tab-config';

const TabPane = Tabs.TabPane;
const PAGE_SIZE = 8;

function MerchantRolePage() {
  const history = useHistory();
  const location = useLocation();
  const [roleItems, setRoleItems] = useEnterpriseRoleItems();
  const [employeeItems] = usePersistentState<EmployeeItem[]>(
    'enterprise-employee-items-v1',
    DEFAULT_EMPLOYEE_ITEMS
  );
  const [employeeListVisible, setEmployeeListVisible] = useState(false);
  const [employeeListRole, setEmployeeListRole] = useState<EnterpriseRoleItem | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [roleKeyword, setRoleKeyword] = useState('');

  const locationQuery = useMemo(() => qs.parse(location.search), [location.search]);
  const activeTab = useMemo<MerchantRoleTab>(
    () => normalizeMerchantRoleTab(locationQuery.tab),
    [locationQuery.tab]
  );

  useEffect(() => {
    const currentTab = typeof locationQuery.tab === 'string' ? locationQuery.tab : undefined;
    if (currentTab !== activeTab) {
      history.replace(getMerchantRoleListTabPath(location.pathname, activeTab));
    }
  }, [activeTab, history, location.pathname, locationQuery.tab]);

  const currentRoles = useMemo(
    () =>
      filterMerchantRoleItems(roleItems, activeTab)
        .filter((item) => item.name.includes(roleKeyword.trim()))
        .sort((left, right) => {
          if (left.isDefault !== right.isDefault) {
            return Number(right.isDefault) - Number(left.isDefault);
          }

          return right.updatedAt.localeCompare(left.updatedAt);
        }),
    [activeTab, roleItems, roleKeyword]
  );

  useEffect(() => {
    setSelectedRowKeys([]);
    setPage(1);
  }, [activeTab, roleKeyword]);

  useEffect(() => {
    const pageCount = Math.max(1, Math.ceil(currentRoles.length / PAGE_SIZE));
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [currentRoles.length, page]);

  const pagedRoles = useMemo(
    () => currentRoles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [currentRoles, page]
  );

  function openEmployeeListModal(record: EnterpriseRoleItem) {
    setEmployeeListRole(record);
    setEmployeeListVisible(true);
  }

  function resetRelatedModalState(removedRoleIds: string[]) {
    if (employeeListRole && removedRoleIds.includes(employeeListRole.id)) {
      setEmployeeListVisible(false);
      setEmployeeListRole(null);
    }
  }

  function handleBatchDelete() {
    const toDelete = selectedRowKeys.filter((id) =>
      currentRoles.some((item) => item.id === id)
    );

    setRoleItems((prev) => prev.filter((item) => !toDelete.includes(item.id)));
    resetRelatedModalState(toDelete);
    setSelectedRowKeys([]);
    Message.success(`已删除 ${toDelete.length} 个角色`);
  }

  function handleDelete(record: EnterpriseRoleItem) {
    setRoleItems((prev) => prev.filter((item) => item.id !== record.id));
    resetRelatedModalState([record.id]);
    setSelectedRowKeys((prev) => prev.filter((id) => id !== record.id));
    Message.success('角色删除成功');
  }

  const roleEmployees = useMemo(() => {
    if (!employeeListRole) {
      return [];
    }

    return buildMerchantRoleEmployeePreviewRows(employeeListRole, employeeItems);
  }, [employeeItems, employeeListRole]);

  const roleEmployeeColumns = [
    {
      title: '员工姓名',
      dataIndex: 'name',
      width: 150,
      render: (_: string, record: (typeof roleEmployees)[number]) => (
        <div className={styles.roleEmployeeNameCell}>
          <Typography.Text className={styles.roleEmployeeName}>
            {record.name}
          </Typography.Text>
          {record.isCurrentAccount && (
            <Tag size="small" color="arcoblue">
              当前账号
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: '登录账号',
      dataIndex: 'account',
      width: 150,
    },
    {
      title: '手机号',
      dataIndex: 'contactPhone',
      width: 140,
    },
    {
      title: '归属组织',
      dataIndex: 'organization',
      render: (value: string) => (
        <Typography.Text className={styles.roleEmployeeOrganization}>
          {value}
        </Typography.Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: EmployeeItem['status']) => (
        <Tag color={value === 'enabled' ? 'green' : 'orangered'}>
          {EMPLOYEE_STATUS_TABLE_LABEL_MAP[value]}
        </Tag>
      ),
    },
    {
      title: '最近操作时间',
      dataIndex: 'operatedAt',
      width: 170,
    },
  ];

  const columns = [
    {
      title: '角色名称',
      dataIndex: 'name',
      width: 200,
      render: (value: string) => (
        <div className={styles.roleNameCell}>
          <Typography.Text className={styles.roleName}>{value}</Typography.Text>
        </div>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      render: (value: string) => (
        <Typography.Text className={styles.roleDescription}>
          {value || '-'}
        </Typography.Text>
      ),
    },
    {
      title: '角色类型',
      dataIndex: 'scope',
      width: 140,
      render: (_: unknown, record: EnterpriseRoleItem) => (
        <Typography.Text className={styles.roleDescription}>
          {MERCHANT_ROLE_TYPE_LABEL_MAP[getMerchantRoleTypeByScope(record.scope)]}
        </Typography.Text>
      ),
    },
    {
      title: '系统',
      dataIndex: 'functionPermissionKeys',
      width: 230,
      render: (_: unknown, record: EnterpriseRoleItem) => {
        const systems = getMerchantRoleEnabledSystemNames(record);
        if (!systems.length) {
          return <Typography.Text className={styles.roleDescription}>-</Typography.Text>;
        }

        return (
          <span>
            {systems.map((name) => (
              <Tag
                key={name}
                size="small"
                color={name === '电商管理工作台' ? 'arcoblue' : 'green'}
                style={{ marginRight: 4, marginBottom: 2 }}
              >
                {name}
              </Tag>
            ))}
          </span>
        );
      },
    },
    {
      title: '员工数量',
      dataIndex: 'employeeCount',
      width: 110,
      render: (value: number, record: EnterpriseRoleItem) => (
        <Typography.Text
          className={styles.employeeCountLink}
          onClick={() => openEmployeeListModal(record)}
        >
          {`${value} 人`}
        </Typography.Text>
      ),
    },
    {
      title: '更新人',
      dataIndex: 'updatedBy',
      width: 120,
      render: (value?: string) => (
        <Typography.Text className={styles.roleDescription}>
          {value || '-'}
        </Typography.Text>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 180,
    },
    {
      title: '操作',
      dataIndex: 'operations',
      width: 220,
      fixed: 'right' as const,
      render: (_: unknown, record: EnterpriseRoleItem) => (
        <span className={styles.actionLinks}>
          <Typography.Text
            className={styles.actionLink}
            onClick={() =>
              history.push(getRoleViewPath(location.pathname, record.id, record.scope))
            }
          >
            查看
          </Typography.Text>
          <span className={styles.actionDivider}>|</span>
          <Typography.Text
            className={styles.actionLink}
            onClick={() =>
              history.push(getRoleEditPath(location.pathname, record.id, record.scope))
            }
          >
            编辑
          </Typography.Text>
          <span className={styles.actionDivider}>|</span>
          <Typography.Text
            className={styles.actionLink}
            onClick={() =>
              history.push(
                getRoleCreatePath(
                  location.pathname,
                  getMerchantRoleCreateScope(getMerchantRoleTypeByScope(record.scope)),
                  {
                  sourceId: record.id,
                  }
                )
              )
            }
          >
            复制
          </Typography.Text>
          <span className={styles.actionDivider}>|</span>
          <Popconfirm
            title={`确定删除角色「${record.name}」吗？`}
            onOk={() => handleDelete(record)}
          >
            <Typography.Text className={styles.actionLinkDanger}>
              删除
            </Typography.Text>
          </Popconfirm>
        </span>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <Card className={styles.panelCard}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarFilters}>
            <span className={styles.filterLabel}>角色名称</span>
            <Input.Search
              allowClear
              className={styles.filterInput}
              placeholder="请输入角色名称"
              value={roleKeyword}
              onChange={setRoleKeyword}
            />
          </div>

          <Button
            icon={<IconPlus />}
            type="primary"
            onClick={() =>
              history.push(
                getRoleCreatePath(
                  location.pathname,
                  getMerchantRoleCreateScope(activeTab)
                )
              )
            }
          >
            添加角色
          </Button>
        </div>

        <Tabs
          activeTab={activeTab}
          className={styles.tabs}
          onChange={(value) =>
            history.replace(
              getMerchantRoleListTabPath(
                location.pathname,
                normalizeMerchantRoleTab(value)
              )
            )
          }
        >
          <TabPane key="merchant" title={MERCHANT_ROLE_TYPE_LABEL_MAP.merchant} />
          <TabPane key="store" title={MERCHANT_ROLE_TYPE_LABEL_MAP.store} />
        </Tabs>

        <Table
          rowKey="id"
          columns={columns}
          data={pagedRoles}
          noDataElement="当前分类下暂无角色"
          pagination={false}
          scroll={{ x: 1320 }}
          tableLayoutFixed
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys as string[]),
          }}
        />

        <div className={styles.tableFooter}>
          <div className={styles.tableFooterLeft}>
            {selectedRowKeys.length > 0 && (
              <Popconfirm
                title={`确定删除选中的 ${selectedRowKeys.length} 个角色吗？`}
                onOk={handleBatchDelete}
              >
                <Typography.Text className={styles.actionLinkDanger}>
                  删除
                </Typography.Text>
              </Popconfirm>
            )}
          </div>
          <Pagination
            current={page}
            total={currentRoles.length}
            pageSize={PAGE_SIZE}
            showTotal
            onChange={(nextPage) => {
              setPage(nextPage);
              setSelectedRowKeys([]);
            }}
          />
        </div>
      </Card>

      <Modal
        title={employeeListRole ? `角色员工（${employeeListRole.name}）` : '角色员工'}
        visible={employeeListVisible}
        footer={null}
        onCancel={() => setEmployeeListVisible(false)}
        style={{ width: 880 }}
      >
        {employeeListRole && (
          <div className={styles.roleEmployeeModal}>
            <div className={styles.roleEmployeeSummaryRow}>
              <Typography.Text className={styles.roleEmployeeSummary}>
                员工数量：{employeeListRole.employeeCount} 人
              </Typography.Text>
              <Typography.Text className={styles.roleEmployeeHint}>
                当前弹窗使用 mock 员工档案展示该角色的成员明细
              </Typography.Text>
            </div>

            <Table
              rowKey="id"
              columns={roleEmployeeColumns}
              data={roleEmployees}
              pagination={false}
              scroll={{ y: 360 }}
              className={styles.roleEmployeeTable}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}

export default MerchantRolePage;
