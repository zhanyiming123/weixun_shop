import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Message,
  Space,
  Table,
  Tag,
  Tree,
  Typography,
} from '@arco-design/web-react';
import { useSelector } from 'react-redux';
import { GlobalState } from '@/store';
import styles from './index.module.less';
import {
  cleanupStoreEmployeePermissionConfigs,
  readStoreEmployeePermissionConfigItems,
} from '@/pages/store-config/employee/data';
import {
  buildStoreOrgReferenceTree,
  buildStoreReferencedEmployees,
  getStoreOrgReferenceConfigByStoreId,
  readHrEmployeeItems,
  readStoreOrgReferenceConfigs,
  sanitizeStoreOrgReferenceConfig,
  upsertStoreOrgReferenceConfig,
} from './data';

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

type ExpandableTreeNode = {
  key: string;
  children?: ExpandableTreeNode[];
};

function collectTreeKeys(nodes: ExpandableTreeNode[]) {
  return nodes.flatMap((node) => [
    node.key,
    ...(Array.isArray(node.children) ? collectTreeKeys(node.children) : []),
  ]);
}

function StoreOrgReferencePage() {
  const { currentOrganization, demoContext } = useSelector(
    (state: GlobalState) => state
  );
  const [configItems, setConfigItems] = useState(() => readStoreOrgReferenceConfigs());
  const treeData = useMemo(() => buildStoreOrgReferenceTree(), []);
  const defaultExpandedKeys = useMemo(() => collectTreeKeys(treeData), [treeData]);
  const hrEmployees = useMemo(() => readHrEmployeeItems(), []);
  const currentStoreId =
    currentOrganization?.scope === 'store' ? currentOrganization.id : undefined;
  const currentStoreName = currentOrganization?.name || '当前店铺';

  const savedConfig = useMemo(
    () =>
      currentStoreId
        ? getStoreOrgReferenceConfigByStoreId(currentStoreId, configItems)
        : undefined,
    [configItems, currentStoreId]
  );
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  useEffect(() => {
    if (!currentStoreId) {
      setSelectedDepartmentIds([]);
      setSelectedEmployeeIds([]);
      return;
    }

    setSelectedDepartmentIds(savedConfig?.selectedDepartmentIds || []);
    setSelectedEmployeeIds(savedConfig?.selectedEmployeeIds || []);
  }, [currentStoreId, savedConfig]);

  const draftConfig = useMemo(() => {
    if (!currentStoreId) {
      return null;
    }

    return {
      storeId: currentStoreId,
      selectedDepartmentIds,
      selectedEmployeeIds,
      excludedEmployeeIds: savedConfig?.excludedEmployeeIds || [],
      subordinateRelations: savedConfig?.subordinateRelations || [],
      updatedAt: savedConfig?.updatedAt || '',
    };
  }, [
    currentStoreId,
    savedConfig?.subordinateRelations,
    savedConfig?.updatedAt,
    selectedDepartmentIds,
    selectedEmployeeIds,
  ]);

  const sanitizedDraftConfig = useMemo(() => {
    if (!draftConfig) {
      return null;
    }

    return sanitizeStoreOrgReferenceConfig(draftConfig, hrEmployees, treeData);
  }, [draftConfig, hrEmployees, treeData]);

  useEffect(() => {
    if (!sanitizedDraftConfig) {
      return;
    }

    const nextSelectedDepartmentIds = sanitizedDraftConfig.selectedDepartmentIds;
    const nextSelectedEmployeeIds = sanitizedDraftConfig.selectedEmployeeIds;
    const isDepartmentUnchanged =
      JSON.stringify(nextSelectedDepartmentIds) ===
      JSON.stringify(selectedDepartmentIds);
    const isEmployeeUnchanged =
      JSON.stringify(nextSelectedEmployeeIds) === JSON.stringify(selectedEmployeeIds);

    if (!isDepartmentUnchanged) {
      setSelectedDepartmentIds(nextSelectedDepartmentIds);
    }
    if (!isEmployeeUnchanged) {
      setSelectedEmployeeIds(nextSelectedEmployeeIds);
    }
  }, [sanitizedDraftConfig, selectedDepartmentIds, selectedEmployeeIds]);

  const referencedEmployees = useMemo(() => {
    if (!currentStoreId || !sanitizedDraftConfig) {
      return [];
    }

    return buildStoreReferencedEmployees(
      currentStoreId,
      sanitizedDraftConfig,
      hrEmployees,
      treeData
    );
  }, [currentStoreId, hrEmployees, sanitizedDraftConfig, treeData]);

  if (!currentStoreId) {
    return (
      <Card>
        <Empty description="当前未切换到具体店铺视角，暂无法配置组织架构引用。" />
      </Card>
    );
  }

  function handleTreeCheck(nextCheckedKeys: unknown) {
    setSelectedDepartmentIds(normalizeStringArray(nextCheckedKeys));
  }

  function handleSave() {
    readStoreEmployeePermissionConfigItems();
    const latestConfigItems = readStoreOrgReferenceConfigs(hrEmployees);
    const nextConfigs = upsertStoreOrgReferenceConfig(
      {
        storeId: currentStoreId,
        selectedDepartmentIds,
        selectedEmployeeIds,
        excludedEmployeeIds: savedConfig?.excludedEmployeeIds || [],
        subordinateRelations: savedConfig?.subordinateRelations || [],
        updatedAt: savedConfig?.updatedAt || '',
      },
      latestConfigItems,
      hrEmployees,
      treeData
    );
    const nextSavedConfig = getStoreOrgReferenceConfigByStoreId(currentStoreId, nextConfigs);
    const nextReferencedEmployees = buildStoreReferencedEmployees(
      currentStoreId,
      nextSavedConfig,
      hrEmployees,
      treeData
    );

    cleanupStoreEmployeePermissionConfigs(
      currentStoreId,
      nextReferencedEmployees,
      readStoreEmployeePermissionConfigItems()
    );

    setConfigItems(nextConfigs);
    setSelectedDepartmentIds(nextSavedConfig?.selectedDepartmentIds || []);
    setSelectedEmployeeIds(nextSavedConfig?.selectedEmployeeIds || []);
    Message.success('组织架构引用配置已保存');
  }

  function handleReset() {
    setSelectedDepartmentIds(savedConfig?.selectedDepartmentIds || []);
    setSelectedEmployeeIds(savedConfig?.selectedEmployeeIds || []);
    Message.info('已恢复为当前已保存配置');
  }

  const previewColumns = [
    {
      title: '人员姓名',
      dataIndex: 'name',
      width: 140,
      render: (value: string) => (
        <Typography.Text className={styles.primaryText}>{value}</Typography.Text>
      ),
    },
    {
      title: '账号',
      dataIndex: 'account',
      width: 230,
    },
    {
      title: '联系方式',
      dataIndex: 'contactPhone',
      width: 150,
    },
    {
      title: '来源组织/部门',
      dataIndex: 'sourceDepartmentPath',
      render: (value: string[]) => value.join(' / '),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: 'enabled' | 'disabled') => (
        <Tag color={value === 'enabled' ? 'green' : 'orange'}>
          {value === 'enabled' ? '在职' : '停用'}
        </Tag>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <Card className={styles.heroCard}>
        <div className={styles.heroHeader}>
          <Space direction="vertical" size={10} style={{ display: 'flex' }}>
            <Space wrap>
              <Tag color="arcoblue" size="large">
                {demoContext?.systemLabel || '店铺运营工作台'}
              </Tag>
              <Tag>{demoContext?.identityLabel || '区域管理员'}</Tag>
              <Tag color="green">{currentStoreName}</Tag>
            </Space>
            <Typography.Title heading={4} className={styles.heroTitle}>
              组织架构引用
            </Typography.Title>
            <Typography.Paragraph className={styles.heroMeta} type="secondary">
              只读引用人事组织架构，按组织节点动态同步店铺员工名单。员工角色和个人数据权限请前往店铺员工页按人配置。
            </Typography.Paragraph>
          </Space>

          <div className={styles.heroStatus}>
            <span className={styles.heroStatusLabel}>最近保存</span>
            <span className={styles.heroStatusValue}>
              {savedConfig?.updatedAt || '尚未保存'}
            </span>
          </div>
        </div>
      </Card>

      <div className={styles.summaryGrid}>
        <Card className={styles.summaryCard}>
          <span className={styles.summaryLabel}>已勾选组织节点</span>
          <span className={styles.summaryValue}>{selectedDepartmentIds.length}</span>
          <span className={styles.summaryHelper}>
            支持按父节点整体引用，勾选父节点后会自动覆盖其全部子节点人员。
          </span>
        </Card>
        <Card className={styles.summaryCard}>
          <span className={styles.summaryLabel}>同步人员数</span>
          <span className={styles.summaryValue}>{referencedEmployees.length}</span>
          <span className={styles.summaryHelper}>
            这批人员会同步显示到店铺员工页，后续权限配置以员工编辑页为准。
          </span>
        </Card>
        <Card className={styles.summaryCard}>
          <span className={styles.summaryLabel}>最近保存</span>
          <span className={styles.summaryValue}>{savedConfig?.updatedAt || '尚未保存'}</span>
          <span className={styles.summaryHelper}>
            保存后会同步清理已移出名单员工的店铺角色与个人数据权限配置。
          </span>
        </Card>
      </div>

      <div className={styles.contentGrid}>
        <Card
          className={styles.treeCard}
          title={
            <div className={styles.cardTitle}>
              <span>人事组织架构</span>
              <span className={styles.cardTitleDesc}>
                完整只读展示总部与店铺组织树，支持按组织节点勾选引用。
              </span>
            </div>
          }
        >
          <Tree
            checkable
            blockNode
            checkedKeys={selectedDepartmentIds}
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
              <span className={styles.cardTitleDesc}>
                实时展示当前店铺会被带入的人员名单，保存后店铺员工页将使用这份同步结果。
              </span>
            </div>
          }
        >
          {referencedEmployees.length ? (
            <Table
              border={false}
              columns={previewColumns}
              data={referencedEmployees}
              pagination={false}
              rowKey="id"
              scroll={{ x: 920 }}
            />
          ) : (
            <Empty description="当前还没有带入任何人员，请先勾选左侧组织节点。" />
          )}
        </Card>
      </div>

      <div className={styles.actions}>
        <Button onClick={handleReset}>恢复已保存配置</Button>
        <Button type="primary" onClick={handleSave}>
          保存配置
        </Button>
      </div>
    </div>
  );
}

export default StoreOrgReferencePage;
