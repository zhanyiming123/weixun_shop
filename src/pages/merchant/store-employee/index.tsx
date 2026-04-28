import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Message,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tree,
  Typography,
} from '@arco-design/web-react';
import { IconCheckCircleFill } from '@arco-design/web-react/icon';
import {
  readOrganizationItems,
} from '@/pages/enterprise/organization/data';
import { readEnterpriseDepartmentItems } from '@/pages/enterprise/department/data';
import {
  cleanupStoreEmployeePermissionConfigs,
  readStoreEmployeePermissionConfigItems,
} from '@/pages/store-config/employee/data';
import {
  buildStoreOrgReferenceDepartmentNodeKey,
  buildStoreOrgReferenceEmployeeNodeKey,
  buildStoreOrgReferenceSelectionTree,
  buildStoreReferencedEmployees,
  getStoreOrgReferenceConfigByStoreId,
  parseStoreOrgReferenceCheckedKeys,
  readHrEmployeeItems,
  readStoreOrgReferenceConfigs,
  sanitizeStoreOrgReferenceConfig,
  StoreOrgReferenceTreeNode,
  upsertStoreOrgReferenceConfig,
} from '@/pages/store-config/org-reference/data';
import styles from './index.module.less';

const TabPane = Tabs.TabPane;
const Option = Select.Option;

function normalizeCheckedKeys(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (
    value &&
    typeof value === 'object' &&
    Array.isArray((value as { checked?: unknown }).checked)
  ) {
    return (value as { checked: unknown[] }).checked.filter(
      (item): item is string => typeof item === 'string'
    );
  }

  return [];
}

function collectDefaultExpandedKeys(nodes: StoreOrgReferenceTreeNode[]) {
  return nodes.flatMap((node) => [
    node.key,
    ...(node.children || [])
      .filter((child) => child.nodeType === 'department')
      .map((child) => child.key),
  ]);
}

function MerchantStoreEmployeePage() {
  const organizationItems = useMemo(() => readOrganizationItems(), []);
  const departmentItems = useMemo(() => readEnterpriseDepartmentItems(), []);
  const hrEmployees = useMemo(
    () => readHrEmployeeItems(departmentItems, organizationItems),
    [departmentItems, organizationItems]
  );
  const treeData = useMemo(
    () =>
      buildStoreOrgReferenceSelectionTree(
        organizationItems,
        departmentItems,
        hrEmployees
      ),
    [departmentItems, hrEmployees, organizationItems]
  );
  const defaultExpandedKeys = useMemo(
    () => collectDefaultExpandedKeys(treeData),
    [treeData]
  );
  const storeOptions = useMemo(
    () =>
      organizationItems
        .filter((item) => item.type === 'store' && item.status === 'enabled')
        .map((item) => ({
          value: item.id,
          label: item.name,
        })),
    [organizationItems]
  );

  const [activeTab, setActiveTab] = useState('orgReference');
  const [configItems, setConfigItems] = useState(() => readStoreOrgReferenceConfigs());
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  useEffect(() => {
    if (!storeOptions.length) {
      setSelectedStoreId('');
      return;
    }

    if (!storeOptions.some((item) => item.value === selectedStoreId)) {
      setSelectedStoreId(storeOptions[0].value);
    }
  }, [selectedStoreId, storeOptions]);

  const selectedStoreName = useMemo(
    () => storeOptions.find((item) => item.value === selectedStoreId)?.label || '',
    [selectedStoreId, storeOptions]
  );
  const savedConfig = useMemo(
    () =>
      selectedStoreId
        ? getStoreOrgReferenceConfigByStoreId(selectedStoreId, configItems)
        : undefined,
    [configItems, selectedStoreId]
  );

  useEffect(() => {
    setSelectedDepartmentIds(savedConfig?.selectedDepartmentIds || []);
    setSelectedEmployeeIds(savedConfig?.selectedEmployeeIds || []);
  }, [savedConfig, selectedStoreId]);

  const draftConfig = useMemo(() => {
    if (!selectedStoreId) {
      return null;
    }

    return {
      storeId: selectedStoreId,
      selectedDepartmentIds,
      selectedEmployeeIds,
      subordinateRelations: savedConfig?.subordinateRelations || [],
      updatedAt: savedConfig?.updatedAt || '',
    };
  }, [savedConfig, selectedDepartmentIds, selectedEmployeeIds, selectedStoreId]);

  const sanitizedDraftConfig = useMemo(() => {
    if (!draftConfig) {
      return null;
    }

    return sanitizeStoreOrgReferenceConfig(draftConfig, hrEmployees);
  }, [draftConfig, hrEmployees]);

  useEffect(() => {
    if (!sanitizedDraftConfig) {
      return;
    }

    const nextDepartmentIds = sanitizedDraftConfig.selectedDepartmentIds;
    const nextEmployeeIds = sanitizedDraftConfig.selectedEmployeeIds;

    if (JSON.stringify(nextDepartmentIds) !== JSON.stringify(selectedDepartmentIds)) {
      setSelectedDepartmentIds(nextDepartmentIds);
    }
    if (JSON.stringify(nextEmployeeIds) !== JSON.stringify(selectedEmployeeIds)) {
      setSelectedEmployeeIds(nextEmployeeIds);
    }
  }, [sanitizedDraftConfig, selectedDepartmentIds, selectedEmployeeIds]);

  const checkedKeys = useMemo(
    () => [
      ...selectedDepartmentIds.map((item) =>
        buildStoreOrgReferenceDepartmentNodeKey(item)
      ),
      ...selectedEmployeeIds.map((item) => buildStoreOrgReferenceEmployeeNodeKey(item)),
    ],
    [selectedDepartmentIds, selectedEmployeeIds]
  );

  const previewEmployees = useMemo(() => {
    if (!selectedStoreId || !sanitizedDraftConfig) {
      return [];
    }

    return buildStoreReferencedEmployees(
      selectedStoreId,
      sanitizedDraftConfig,
      hrEmployees
    );
  }, [hrEmployees, sanitizedDraftConfig, selectedStoreId]);

  const syncedEmployees = useMemo(() => {
    if (!selectedStoreId) {
      return [];
    }

    return buildStoreReferencedEmployees(selectedStoreId, savedConfig, hrEmployees);
  }, [hrEmployees, savedConfig, selectedStoreId]);

  const previewColumns = [
    {
      title: '员工姓名',
      dataIndex: 'name',
      width: 140,
      render: (value: string) => (
        <Typography.Text className={styles.primaryText}>{value}</Typography.Text>
      ),
    },
    {
      title: '员工账号',
      dataIndex: 'account',
      width: 240,
    },
    {
      title: '联系方式',
      dataIndex: 'contactPhone',
      width: 160,
    },
    {
      title: '来源组织/部门',
      dataIndex: 'sourceDepartmentPath',
      render: (value: string[]) => value.join(' / '),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (value: 'enabled' | 'disabled') => (
        <Tag color={value === 'enabled' ? 'green' : 'orange'}>
          {value === 'enabled' ? '在职' : '停用'}
        </Tag>
      ),
    },
  ];

  function handleTreeCheck(nextCheckedKeys: unknown) {
    const normalizedCheckedKeys = normalizeCheckedKeys(nextCheckedKeys);
    const parsed = parseStoreOrgReferenceCheckedKeys(normalizedCheckedKeys);
    setSelectedDepartmentIds(parsed.selectedDepartmentIds);
    setSelectedEmployeeIds(parsed.selectedEmployeeIds);
  }

  function handleReset() {
    setSelectedDepartmentIds(savedConfig?.selectedDepartmentIds || []);
    setSelectedEmployeeIds(savedConfig?.selectedEmployeeIds || []);
    Message.info('已恢复为当前已保存配置');
  }

  function handleSave() {
    if (!selectedStoreId) {
      return;
    }

    readStoreEmployeePermissionConfigItems();
    const latestConfigItems = readStoreOrgReferenceConfigs(hrEmployees);
    const nextConfigs = upsertStoreOrgReferenceConfig(
      {
        storeId: selectedStoreId,
        selectedDepartmentIds,
        selectedEmployeeIds,
        subordinateRelations: savedConfig?.subordinateRelations || [],
        updatedAt: savedConfig?.updatedAt || '',
      },
      latestConfigItems,
      hrEmployees
    );
    const nextSavedConfig = getStoreOrgReferenceConfigByStoreId(
      selectedStoreId,
      nextConfigs
    );
    const nextReferencedEmployees = buildStoreReferencedEmployees(
      selectedStoreId,
      nextSavedConfig,
      hrEmployees
    );

    cleanupStoreEmployeePermissionConfigs(
      selectedStoreId,
      nextReferencedEmployees,
      readStoreEmployeePermissionConfigItems()
    );

    setConfigItems(nextConfigs);
    setSelectedDepartmentIds(nextSavedConfig?.selectedDepartmentIds || []);
    setSelectedEmployeeIds(nextSavedConfig?.selectedEmployeeIds || []);
    Message.success('店铺员工配置已保存');
  }

  if (!storeOptions.length) {
    return (
      <Card>
        <Empty description="暂无可配置的启用店铺，请先到店铺管理中启用店铺。" />
      </Card>
    );
  }

  return (
    <div className={styles.page}>
      <Card className={styles.headerCard}>
        <div className={styles.headerTop}>
          <Space direction="vertical" size={8}>
            <Typography.Title heading={4} className={styles.pageTitle}>
              店铺员工
            </Typography.Title>
            <Typography.Text type="secondary">
              按店铺引用集团组织架构中的部门或个人，保存后会同步到对应店铺系统。
            </Typography.Text>
          </Space>
          <div className={styles.storeField}>
            <span className={styles.storeLabel}>选择店铺</span>
            <Select
              className={styles.storeSelect}
              value={selectedStoreId}
              onChange={(value) => setSelectedStoreId(String(value))}
            >
              {storeOptions.map((item) => (
                <Option key={item.value} value={item.value}>
                  {item.label}
                </Option>
              ))}
            </Select>
          </div>
        </div>

        <div className={styles.metaRow}>
          <Space size={20}>
            <span>当前店铺：{selectedStoreName || '-'}</span>
            <span>已勾选部门：{selectedDepartmentIds.length}</span>
            <span>已勾选个人：{selectedEmployeeIds.length}</span>
            <span>同步人员预览：{previewEmployees.length} 人</span>
          </Space>
        </div>
      </Card>

      <Card className={styles.contentCard}>
        <Tabs
          activeTab={activeTab}
          className={styles.tabs}
          type="line"
          onChange={(value) => setActiveTab(String(value))}
        >
          <TabPane key="orgReference" title="组织架构引用">
            <div className={styles.tabGrid}>
              <Card
                className={styles.treeCard}
                title={
                  <div className={styles.cardTitle}>
                    <span>集团组织架构</span>
                    <span className={styles.cardDesc}>
                      支持独立勾选部门和人员，最终按并集同步到当前店铺。
                    </span>
                  </div>
                }
              >
                <Tree
                  checkable
                  blockNode
                  checkStrictly
                  checkedKeys={checkedKeys}
                  className={styles.tree}
                  defaultExpandedKeys={defaultExpandedKeys}
                  treeData={treeData}
                  onCheck={handleTreeCheck}
                />
              </Card>

              <Card
                className={styles.previewCard}
                title={
                  <div className={styles.cardTitle}>
                    <span>同步人员预览</span>
                    <span className={styles.cardDesc}>
                      实时展示当前选择会带入店铺的人员名单。
                    </span>
                  </div>
                }
              >
                {previewEmployees.length ? (
                  <Table
                    border={false}
                    columns={previewColumns}
                    data={previewEmployees}
                    pagination={false}
                    rowKey="id"
                    scroll={{ x: 980 }}
                  />
                ) : (
                  <Empty description="请先在左侧勾选需要同步的部门或个人。" />
                )}
              </Card>
            </div>

            <div className={styles.actions}>
              <Button onClick={handleReset}>恢复已保存配置</Button>
              <Button type="primary" onClick={handleSave}>
                保存配置
              </Button>
            </div>
          </TabPane>

          <TabPane key="storeConfig" title="店铺员工配置">
            <Card
              className={styles.resultCard}
              title={
                <div className={styles.cardTitle}>
                  <span>当前店铺已同步员工</span>
                  <span className={styles.cardDesc}>
                    该列表用于确认保存后的同步结果，不在此页编辑角色和数据权限。
                  </span>
                </div>
              }
            >
              {syncedEmployees.length ? (
                <Table
                  border={false}
                  columns={[
                    ...previewColumns,
                    {
                      title: '同步标记',
                      dataIndex: 'sourceType',
                      width: 130,
                      render: () => (
                        <Tag color="arcoblue" icon={<IconCheckCircleFill />}>
                          已同步
                        </Tag>
                      ),
                    },
                  ]}
                  data={syncedEmployees}
                  pagination={false}
                  rowKey="id"
                  scroll={{ x: 1100 }}
                />
              ) : (
                <Empty description="当前店铺暂无同步员工，请先在“组织架构引用”中保存配置。" />
              )}
            </Card>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
}

export default MerchantStoreEmployeePage;
