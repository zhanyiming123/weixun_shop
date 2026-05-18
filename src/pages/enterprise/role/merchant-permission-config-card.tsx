import React, { useMemo, useState } from 'react';
import {
  Button,
  Empty,
  Menu,
  Select,
  Table,
  Tabs,
  Trigger,
  Typography,
  Tree,
} from '@arco-design/web-react';
import {
  IconDown,
  IconFile,
  IconMenu,
  IconRecord,
} from '@arco-design/web-react/icon';
import styles from './merchant-permission-config-card.module.less';
import {
  EnterpriseRoleDataViewScope,
  EnterpriseRoleDataViewScopeOption,
  EnterpriseRolePermissionNode,
  MerchantRolePermissionConfigs,
  MerchantRolePermissionState,
  MerchantRolePermissionSystem,
  MERCHANT_ROLE_PERMISSION_SYSTEM_OPTIONS,
  getMerchantRolePermissionRootKeys,
  getMerchantRolePermissionTree,
} from './data';
import usePersistentState from '@/utils/usePersistentState';
import {
  createDefaultDataPermissionSystems,
  DATA_PERMISSION_MODULE_CONFIG_STORAGE_KEY,
  DataPermissionModuleItem,
  DataPermissionSystem,
  getDataPermissionModulesByMerchantSystem,
} from '@/pages/merchant/data-permission-module-config/data';

const TabPane = Tabs.TabPane;
const MenuItem = Menu.Item;
const Option = Select.Option;

export type MerchantPermissionConfigTabKey = 'function' | 'data';

type MerchantPermissionConfigCardProps = {
  activeTab: MerchantPermissionConfigTabKey;
  dataViewScopeOptions: EnterpriseRoleDataViewScopeOption[];
  permissionConfigs: MerchantRolePermissionConfigs;
  readOnly?: boolean;
  selectedSystem: MerchantRolePermissionSystem;
  onActiveTabChange: (value: MerchantPermissionConfigTabKey) => void;
  onBatchDataViewScopeChange?: (
    system: MerchantRolePermissionSystem,
    nextModuleScopes: MerchantRolePermissionState['dataPermissionModuleScopes']
  ) => void;
  onDataViewScopeChange?: (
    system: MerchantRolePermissionSystem,
    moduleId: string,
    value?: EnterpriseRoleDataViewScope
  ) => void;
  onFunctionPermissionChange?: (
    system: MerchantRolePermissionSystem,
    checkedKeys: string[]
  ) => void;
  onSelectedSystemChange: (value: MerchantRolePermissionSystem) => void;
};

function normalizeCheckedKeys(checkedKeys: unknown) {
  if (Array.isArray(checkedKeys)) {
    return checkedKeys.filter((key): key is string => typeof key === 'string');
  }

  if (
    checkedKeys &&
    typeof checkedKeys === 'object' &&
    'checkedKeys' in checkedKeys
  ) {
    const nextKeys = (checkedKeys as { checkedKeys?: unknown }).checkedKeys;
    return Array.isArray(nextKeys)
      ? nextKeys.filter((key): key is string => typeof key === 'string')
      : [];
  }

  return [];
}

function getPermissionNodeVisualType(node: EnterpriseRolePermissionNode) {
  if (node.children?.length) {
    return 'menu';
  }

  const lastSegment = node.key.split('/').pop();
  if (
    lastSegment === 'view' ||
    lastSegment === 'create' ||
    lastSegment === 'edit' ||
    lastSegment === 'remove' ||
    lastSegment === 'void'
  ) {
    return 'button';
  }

  return 'page';
}

function getPermissionNodeIcon(node: EnterpriseRolePermissionNode) {
  const nodeType = getPermissionNodeVisualType(node);
  if (nodeType === 'menu') {
    return <IconMenu />;
  }

  if (nodeType === 'page') {
    return <IconFile />;
  }

  return <IconRecord />;
}

function decoratePermissionTree(nodes: EnterpriseRolePermissionNode[]) {
  return nodes.map((node) => ({
    key: node.key,
    title: (
      <span className={styles.permissionNodeTitle}>
        <span className={styles.permissionNodeIcon}>{getPermissionNodeIcon(node)}</span>
        <span>{node.title}</span>
      </span>
    ),
    children: node.children?.length ? decoratePermissionTree(node.children) : undefined,
  }));
}

function MerchantPermissionConfigCard({
  activeTab,
  dataViewScopeOptions,
  permissionConfigs,
  readOnly = false,
  selectedSystem,
  onActiveTabChange,
  onBatchDataViewScopeChange,
  onDataViewScopeChange,
  onFunctionPermissionChange,
  onSelectedSystemChange,
}: MerchantPermissionConfigCardProps) {
  const [dataPermissionSystems] = usePersistentState<DataPermissionSystem[]>(
    DATA_PERMISSION_MODULE_CONFIG_STORAGE_KEY,
    createDefaultDataPermissionSystems()
  );
  const currentPermissionConfig = permissionConfigs[selectedSystem];
  const [batchSettingVisible, setBatchSettingVisible] = useState(false);
  const [batchScopeValue, setBatchScopeValue] = useState<
    EnterpriseRoleDataViewScope | undefined
  >();
  const permissionTree = getMerchantRolePermissionTree(selectedSystem);
  const treeData = useMemo(() => decoratePermissionTree(permissionTree), [permissionTree]);
  const defaultExpandedKeys = getMerchantRolePermissionRootKeys(selectedSystem);
  const dataPermissionModules = useMemo(
    () => getDataPermissionModulesByMerchantSystem(dataPermissionSystems, selectedSystem),
    [dataPermissionSystems, selectedSystem]
  );
  const treePanelClassName = [
    styles.treePanel,
    readOnly && styles.treePanelReadonly,
  ]
    .filter(Boolean)
    .join(' ');

  function handleBatchScopeApply(value?: EnterpriseRoleDataViewScope) {
    if (!onBatchDataViewScopeChange) {
      return;
    }

    const nextModuleScopes = value
      ? dataPermissionModules.reduce<MerchantRolePermissionState['dataPermissionModuleScopes']>(
          (result, moduleItem) => {
            result[moduleItem.id] = value;
            return result;
          },
          {}
        )
      : {};

    onBatchDataViewScopeChange(selectedSystem, nextModuleScopes);
  }

  const batchSettingContent = (
    <div className={styles.batchSettingCard}>
      <Select
        allowClear
        className={styles.batchSettingSelect}
        placeholder="请选择数据范围"
        value={batchScopeValue}
        onChange={(value) =>
          setBatchScopeValue(value as EnterpriseRoleDataViewScope | undefined)
        }
      >
        {dataViewScopeOptions.map((option) => (
          <Option key={`batch-${option.value}`} value={option.value}>
            {option.label}
          </Option>
        ))}
      </Select>
      <div className={styles.batchSettingActions}>
        <Button
          size="small"
          onClick={() => {
            setBatchScopeValue(undefined);
          }}
        >
          清空
        </Button>
        <Button
          size="small"
          type="primary"
          onClick={() => {
            handleBatchScopeApply(batchScopeValue);
            setBatchSettingVisible(false);
          }}
        >
          应用
        </Button>
      </div>
    </div>
  );

  const dataColumns = [
    {
      title: '功能模块',
      dataIndex: 'name',
      width: 220,
      render: (value: string) => <span className={styles.moduleName}>{value}</span>,
    },
    {
      title: '功能模块说明',
      dataIndex: 'description',
      render: (value: string) => (
        <span className={styles.moduleDescription}>{value || '-'}</span>
      ),
    },
    {
      title: (
        <div className={styles.scopeColumnHeader}>
          <span>数据范围</span>
          <Trigger
            clickToClose={false}
            popup={() => batchSettingContent}
            popupAlign={{ top: 8 }}
            popupVisible={batchSettingVisible}
            position="bl"
            trigger="click"
            unmountOnExit={false}
            onVisibleChange={(visible) => {
              setBatchSettingVisible(visible);
              if (visible) {
                setBatchScopeValue(undefined);
              }
            }}
          >
            <Button
              size="mini"
              type="text"
              disabled={readOnly || !dataPermissionModules.length}
            >
              批量设置
            </Button>
          </Trigger>
        </div>
      ),
      dataIndex: 'id',
      width: 260,
      render: (_: string, record: DataPermissionModuleItem) => (
        <Select
          key={`${selectedSystem}-${record.id}`}
          allowClear
          className={styles.scopeSelect}
          disabled={readOnly}
          placeholder="请选择数据范围"
          suffixIcon={<IconDown />}
          value={currentPermissionConfig.dataPermissionModuleScopes[record.id]}
          onChange={(value) =>
            onDataViewScopeChange?.(
              selectedSystem,
              record.id,
              value as EnterpriseRoleDataViewScope | undefined
            )
          }
        >
          {dataViewScopeOptions.map((option) => (
            <Option key={`${record.id}-${option.value}`} value={option.value}>
              {option.label}
            </Option>
          ))}
        </Select>
      ),
    },
  ];

  return (
    <div className={styles.layout}>
      <div className={styles.sidebar}>
        <Typography.Text className={styles.sidebarTitle}>应用系统</Typography.Text>
        <Menu
          className={styles.systemMenu}
          selectedKeys={[selectedSystem]}
          onClickMenuItem={(key) =>
            onSelectedSystemChange(key as MerchantRolePermissionSystem)
          }
        >
          {MERCHANT_ROLE_PERMISSION_SYSTEM_OPTIONS.map((option) => {
            return (
              <MenuItem key={option.value}>
                <span className={styles.systemMenuLabel}>
                  <span>{option.label}</span>
                </span>
              </MenuItem>
            );
          })}
        </Menu>
      </div>

      <div className={styles.content}>
        <Tabs
          activeTab={activeTab}
          className={styles.tabs}
          onChange={(value) => onActiveTabChange(value as MerchantPermissionConfigTabKey)}
        >
          <TabPane key="function" title="功能权限">
            <div className={treePanelClassName}>
              <Tree
                blockNode
                checkable
                checkedKeys={currentPermissionConfig.functionPermissionKeys}
                defaultExpandedKeys={defaultExpandedKeys}
                selectable={false}
                showLine
                treeData={treeData}
                onCheck={
                  readOnly || !onFunctionPermissionChange
                    ? undefined
                    : (checkedKeys) =>
                        onFunctionPermissionChange(
                          selectedSystem,
                          normalizeCheckedKeys(checkedKeys)
                        )
                }
              />
            </div>
          </TabPane>

          <TabPane key="data" title="数据权限">
            <div className={styles.dataPanel}>
              {dataPermissionModules.length ? (
                <Table
                  border
                  className={styles.dataTable}
                  columns={dataColumns}
                  data={dataPermissionModules}
                  pagination={false}
                  rowKey="id"
                  scroll={{ y: 460 }}
                />
              ) : (
                <div className={styles.dataEmptyState}>
                  <Empty description="当前系统暂无可配置的数据权限模块" />
                </div>
              )}
            </div>
          </TabPane>
        </Tabs>
      </div>
    </div>
  );
}

export default MerchantPermissionConfigCard;
