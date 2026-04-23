import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Message,
  Modal,
  Pagination,
  Popconfirm,
  Table,
  Tag,
  Typography,
} from '@arco-design/web-react';
import { IconPlus } from '@arco-design/web-react/icon';
import { useHistory, useLocation } from 'react-router-dom';
import styles from './index.module.less';
import {
  ENTERPRISE_ROLE_DATA_VIEW_SCOPE_LABEL_MAP,
  ENTERPRISE_ROLE_SCOPE_LABEL_MAP,
  EnterpriseRoleItem,
  EnterpriseRoleScope,
  getEnterpriseRolePermissionTitles,
  getMerchantRoleSystemNames,
  useEnterpriseRoleItems,
} from '@/pages/enterprise/role/data';
import {
  DEFAULT_EMPLOYEE_ITEMS,
  EmployeeItem,
} from '@/pages/enterprise/employee/data';
import { getRoleCreatePath, getRoleEditPath } from '@/utils/demo-route';
import usePersistentState from '@/utils/usePersistentState';

const MERCHANT_ROLE_SCOPES: EnterpriseRoleScope[] = ['headquarter', 'region'];
const MERCHANT_ROLE_CREATE_SCOPE: EnterpriseRoleScope = 'headquarter';
const PAGE_SIZE = 8;

function MerchantRolePage() {
  const history = useHistory();
  const location = useLocation();
  const [roleItems, setRoleItems] = useEnterpriseRoleItems();
  const [employeeItems] = usePersistentState<EmployeeItem[]>(
    'enterprise-employee-items-v1',
    DEFAULT_EMPLOYEE_ITEMS
  );
  const [detailVisible, setDetailVisible] = useState(false);
  const [viewingRole, setViewingRole] = useState<EnterpriseRoleItem | null>(null);
  const [employeeListVisible, setEmployeeListVisible] = useState(false);
  const [employeeListRole, setEmployeeListRole] = useState<EnterpriseRoleItem | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const currentRoles = useMemo(() => {
    return roleItems
      .filter((item) => MERCHANT_ROLE_SCOPES.includes(item.scope))
      .sort((left, right) => {
        if (left.isDefault !== right.isDefault) {
          return Number(right.isDefault) - Number(left.isDefault);
        }
        return right.updatedAt.localeCompare(left.updatedAt);
      });
  }, [roleItems]);

  const pagedRoles = useMemo(
    () => currentRoles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [currentRoles, page]
  );

  const referenceRoleNameMap = useMemo(
    () =>
      roleItems.reduce<Record<string, string>>((acc, item) => {
        acc[item.id] = item.name;
        return acc;
      }, {}),
    [roleItems]
  );

  function openDetailModal(record: EnterpriseRoleItem) {
    setViewingRole(record);
    setDetailVisible(true);
  }

  function openEmployeeListModal(record: EnterpriseRoleItem) {
    setEmployeeListRole(record);
    setEmployeeListVisible(true);
  }

  function handleBatchDelete() {
    const toDelete = selectedRowKeys.filter((id) => {
      const role = currentRoles.find((r) => r.id === id);
      return role && !role.isDefault;
    });
    setRoleItems((prev) => prev.filter((item) => !toDelete.includes(item.id)));
    if (viewingRole && toDelete.includes(viewingRole.id)) {
      setDetailVisible(false);
      setViewingRole(null);
    }
    if (employeeListRole && toDelete.includes(employeeListRole.id)) {
      setEmployeeListVisible(false);
      setEmployeeListRole(null);
    }
    setSelectedRowKeys([]);
    Message.success(`已删除 ${toDelete.length} 个角色`);
  }

  const roleEmployees = useMemo(() => {
    if (!employeeListRole) {
      return [];
    }

    return employeeItems.filter((item) => item.roleId === employeeListRole.id);
  }, [employeeItems, employeeListRole]);

  const missingRoleEmployeeCount = useMemo(() => {
    if (!employeeListRole) {
      return 0;
    }

    return Math.max(0, employeeListRole.employeeCount - roleEmployees.length);
  }, [employeeListRole, roleEmployees.length]);

  const columns = [
    {
      title: '角色名称',
      dataIndex: 'name',
      width: 200,
      render: (value: string, record: EnterpriseRoleItem) => (
        <div className={styles.roleNameCell}>
          <Typography.Text className={styles.roleName}>{value}</Typography.Text>
          {record.isDefault && (
            <Tag size="small" color="arcoblue">
              默认
            </Tag>
          )}
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
      title: '系统',
      dataIndex: 'functionPermissionKeys',
      width: 230,
      render: (_: unknown, record: EnterpriseRoleItem) => {
        const systems = getMerchantRoleSystemNames(record.functionPermissionKeys, record.scope);
        if (!systems.length) {
          return <Typography.Text className={styles.roleDescription}>-</Typography.Text>;
        }
        return (
          <span>
            {systems.map((name) => (
              <Tag
                key={name}
                size="small"
                color={name === '商户管理系统' ? 'arcoblue' : 'green'}
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
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 180,
    },
    {
      title: '操作',
      dataIndex: 'operations',
      width: 120,
      fixed: 'right' as const,
      render: (_: unknown, record: EnterpriseRoleItem) => (
        <span className={styles.actionLinks}>
          <Typography.Text
            className={styles.actionLink}
            onClick={() => openDetailModal(record)}
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
        </span>
      ),
    },
  ];

  const viewingRolePermissionTitles = viewingRole
    ? getEnterpriseRolePermissionTitles(
        viewingRole.functionPermissionKeys,
        viewingRole.scope,
        'merchant'
      )
    : [];

  return (
    <div className={styles.page}>
      <Card className={styles.panelCard}>
        <div className={`${styles.toolbar} ${styles.toolbarActionsOnly}`}>
          <Button
            icon={<IconPlus />}
            type="primary"
            onClick={() =>
              history.push(
                getRoleCreatePath(
                  location.pathname,
                  MERCHANT_ROLE_CREATE_SCOPE
                )
              )
            }
          >
            添加角色
          </Button>
        </div>

        <Table
          rowKey="id"
          columns={columns}
          data={pagedRoles}
          noDataElement="当前分类下暂无角色"
          pagination={false}
          scroll={{ x: 1100 }}
          tableLayoutFixed
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys as string[]),
            checkboxProps: (record: EnterpriseRoleItem) => ({
              disabled: record.isDefault,
            }),
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
            onChange={(p) => {
              setPage(p);
              setSelectedRowKeys([]);
            }}
          />
        </div>
      </Card>

      <Modal
        title="角色详情"
        visible={detailVisible}
        footer={null}
        onCancel={() => setDetailVisible(false)}
        style={{ width: 720 }}
      >
        {viewingRole && (
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>角色范围</span>
              <span className={styles.detailValue}>
                {ENTERPRISE_ROLE_SCOPE_LABEL_MAP[viewingRole.scope]}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>角色属性</span>
              <span className={styles.detailValue}>
                <Tag size="small" color={viewingRole.isDefault ? 'arcoblue' : 'green'}>
                  {viewingRole.isDefault ? '默认角色' : '自定义角色'}
                </Tag>
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>角色名称</span>
              <span className={styles.detailValue}>{viewingRole.name}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>员工数量</span>
              <span className={styles.detailValue}>{viewingRole.employeeCount} 人</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>参考角色</span>
              <span className={styles.detailValue}>
                {viewingRole.referenceRoleId
                  ? referenceRoleNameMap[viewingRole.referenceRoleId] || '-'
                  : '-'}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>数据权限</span>
              <span className={styles.detailValue}>
                {ENTERPRISE_ROLE_DATA_VIEW_SCOPE_LABEL_MAP[viewingRole.dataPermissions.viewScope]}
              </span>
            </div>
            <div className={styles.detailItemFull}>
              <span className={styles.detailLabel}>功能权限</span>
              {viewingRolePermissionTitles.length ? (
                <div className={styles.detailTags}>
                  {viewingRolePermissionTitles.map((title) => (
                    <Tag key={title} size="small">
                      {title}
                    </Tag>
                  ))}
                </div>
              ) : (
                <span className={styles.detailValue}>未配置功能权限</span>
              )}
            </div>
            <div className={styles.detailItemFull}>
              <span className={styles.detailLabel}>角色描述</span>
              <span className={styles.detailValue}>{viewingRole.description || '-'}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>创建时间</span>
              <span className={styles.detailValue}>{viewingRole.createdAt}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>更新时间</span>
              <span className={styles.detailValue}>{viewingRole.updatedAt}</span>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title={employeeListRole ? `角色员工（${employeeListRole.name}）` : '角色员工'}
        visible={employeeListVisible}
        footer={null}
        onCancel={() => setEmployeeListVisible(false)}
        style={{ width: 560 }}
      >
        {employeeListRole && (
          <div className={styles.roleEmployeeModal}>
            <Typography.Text className={styles.roleEmployeeSummary}>
              员工数量：{employeeListRole.employeeCount} 人
            </Typography.Text>

            {roleEmployees.length ? (
              <div className={styles.roleEmployeeList}>
                {roleEmployees.map((item, index) => (
                  <div key={item.id} className={styles.roleEmployeeItem}>
                    <span className={styles.roleEmployeeOrder}>{index + 1}</span>
                    <div className={styles.roleEmployeeContent}>
                      <Typography.Text className={styles.roleEmployeeName}>
                        {item.name}
                      </Typography.Text>
                      <Typography.Text className={styles.roleEmployeeAccount}>
                        {item.account}
                      </Typography.Text>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Typography.Text className={styles.roleEmployeeEmpty}>
                当前角色暂无已录入员工
              </Typography.Text>
            )}

            {missingRoleEmployeeCount > 0 && (
              <Typography.Text className={styles.roleEmployeeHint}>
                其中 {missingRoleEmployeeCount} 人尚未录入员工档案。
              </Typography.Text>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default MerchantRolePage;
