import React, { useEffect, useMemo, useState } from 'react';
import qs from 'query-string';
import {
  Button,
  Card,
  Message,
  Modal,
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
  ENTERPRISE_ROLE_DATA_VIEW_SCOPE_LABEL_MAP,
  EnterpriseRoleItem,
  EnterpriseRoleScope,
  ENTERPRISE_ROLE_SCOPE_DESCRIPTION_MAP,
  ENTERPRISE_ROLE_SCOPE_LABEL_MAP,
  getEnterpriseRoleCreatePath,
  getEnterpriseRoleEditPath,
  getEnterpriseRoleListPath,
  getEnterpriseRolePermissionTitles,
  normalizeEnterpriseRoleScope,
  useEnterpriseRoleItems,
} from './data';

const TabPane = Tabs.TabPane;

function EnterpriseRolePage() {
  const history = useHistory();
  const location = useLocation();
  const [roleItems, setRoleItems] = useEnterpriseRoleItems();
  const [detailVisible, setDetailVisible] = useState(false);
  const [viewingRole, setViewingRole] = useState<EnterpriseRoleItem | null>(null);

  const locationQuery = useMemo(() => qs.parse(location.search), [location.search]);
  const activeTab = useMemo<EnterpriseRoleScope>(
    () => normalizeEnterpriseRoleScope(locationQuery.tab),
    [locationQuery.tab]
  );

  useEffect(() => {
    if (locationQuery.tab !== activeTab) {
      history.replace(getEnterpriseRoleListPath(activeTab));
    }
  }, [activeTab, history, locationQuery.tab]);

  const currentRoles = useMemo(
    () =>
      roleItems
        .filter((item) => item.scope === activeTab)
        .sort((left, right) => {
          if (left.isDefault !== right.isDefault) {
            return Number(right.isDefault) - Number(left.isDefault);
          }

          return right.updatedAt.localeCompare(left.updatedAt);
        }),
    [activeTab, roleItems]
  );

  const totalEmployeeCount = useMemo(
    () => currentRoles.reduce((sum, item) => sum + item.employeeCount, 0),
    [currentRoles]
  );
  const defaultRoleCount = useMemo(
    () => currentRoles.filter((item) => item.isDefault).length,
    [currentRoles]
  );

  const referenceRoleNameMap = useMemo(
    () =>
      roleItems.reduce<Record<string, string>>((accumulator, item) => {
        accumulator[item.id] = item.name;
        return accumulator;
      }, {}),
    [roleItems]
  );

  function openDetailModal(record: EnterpriseRoleItem) {
    setViewingRole(record);
    setDetailVisible(true);
  }

  function handleDelete(record: EnterpriseRoleItem) {
    if (record.isDefault) {
      Message.warning('默认角色暂不支持删除');
      return;
    }

    setRoleItems((prev) => prev.filter((item) => item.id !== record.id));
    if (viewingRole?.id === record.id) {
      setDetailVisible(false);
      setViewingRole(null);
    }
    Message.success('角色删除成功');
  }

  const columns = [
    {
      title: '角色名称',
      dataIndex: 'name',
      width: 220,
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
      title: '员工数量',
      dataIndex: 'employeeCount',
      width: 120,
      render: (value: number) => `${value} 人`,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 180,
    },
    {
      title: '操作',
      dataIndex: 'operations',
      width: 180,
      fixed: 'right' as const,
      render: (_: unknown, record: EnterpriseRoleItem) => (
        <span className={styles.actionLinks}>
          <Typography.Text
            className={styles.actionLink}
            onClick={() => openDetailModal(record)}
          >
            查看
          </Typography.Text>
          {!record.isDefault && (
            <>
              <span className={styles.actionDivider}>|</span>
              <Typography.Text
                className={styles.actionLink}
                onClick={() =>
                  history.push(getEnterpriseRoleEditPath(record.id, record.scope))
                }
              >
                编辑
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
            </>
          )}
        </span>
      ),
    },
  ];

  const viewingRolePermissionTitles = viewingRole
    ? getEnterpriseRolePermissionTitles(
        viewingRole.functionPermissionKeys,
        viewingRole.scope
      )
    : [];

  return (
    <div className={styles.page}>
      <Card className={styles.panelCard}>
        <Tabs
          activeTab={activeTab}
          className={styles.tabs}
          onChange={(value) =>
            history.replace(getEnterpriseRoleListPath(normalizeEnterpriseRoleScope(value)))
          }
        >
          {Object.entries(ENTERPRISE_ROLE_SCOPE_LABEL_MAP).map(([key, label]) => (
            <TabPane key={key} title={label} />
          ))}
        </Tabs>

        <div className={styles.summaryRow}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>角色类型</span>
            <span className={styles.summaryValue}>
              {ENTERPRISE_ROLE_SCOPE_LABEL_MAP[activeTab]}
            </span>
            <span className={styles.summaryHelper}>
              {ENTERPRISE_ROLE_SCOPE_DESCRIPTION_MAP[activeTab]}
            </span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>角色数量</span>
            <span className={styles.summaryValue}>{currentRoles.length}</span>
            <span className={styles.summaryHelper}>当前 tab 下已配置的角色数</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>员工覆盖</span>
            <span className={styles.summaryValue}>{totalEmployeeCount} 人</span>
            <span className={styles.summaryHelper}>
              默认角色 {defaultRoleCount} 个，自定义角色 {currentRoles.length - defaultRoleCount} 个
            </span>
          </div>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.toolbarInfo}>
            <Typography.Text className={styles.toolbarTitle}>
              {ENTERPRISE_ROLE_SCOPE_LABEL_MAP[activeTab]}列表
            </Typography.Text>
            <Typography.Text className={styles.toolbarDesc}>
              每个 tab 维护独立角色，新增角色后只会出现在当前 tab 下。
            </Typography.Text>
          </div>
          <Button
            icon={<IconPlus />}
            type="primary"
            onClick={() => history.push(getEnterpriseRoleCreatePath(activeTab))}
          >
            添加角色
          </Button>
        </div>

        <Table
          rowKey="id"
          columns={columns}
          data={currentRoles}
          noDataElement="当前角色类型下暂无角色"
          pagination={{ pageSize: 8, showTotal: true }}
          scroll={{ x: 980 }}
          tableLayoutFixed
        />
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
              <span className={styles.detailLabel}>角色类型</span>
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
                {
                  ENTERPRISE_ROLE_DATA_VIEW_SCOPE_LABEL_MAP[
                    viewingRole.dataPermissions.viewScope
                  ]
                }
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
    </div>
  );
}

export default EnterpriseRolePage;
