import React, { useEffect, useMemo, useState } from 'react';
import qs from 'query-string';
import {
  Button,
  Card,
  Empty,
  Message,
  Select,
  Space,
  Tag,
  Tree,
  Typography,
} from '@arco-design/web-react';
import { useHistory, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { readEnterpriseDepartmentItems } from '@/pages/enterprise/department/data';
import { useEnterpriseRoleItems } from '@/pages/enterprise/role/data';
import { buildStoreReferencedEmployees } from '@/pages/store-config/org-reference/data';
import {
  buildStoreEmployeeSourceEmployees,
  buildStoreEmployeePermissionTree,
  buildStoreManagedEmployees,
  collectTreeKeys,
  getStoreEmployeePermissionConfigByEmployeeId,
  getStoreRoleSelectionSummary,
  readStoreEmployeePermissionConfigItems,
  readStoreExternalEmployeeItems,
  upsertStoreEmployeePermissionConfig,
} from '@/pages/store-config/employee/data';
import { GlobalState } from '@/store';
import { getEmployeeListPath } from '@/utils/demo-route';
import styles from './index.module.less';

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function getSingleQueryValue(
  value: string | (string | null)[] | null | undefined
): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

function StoreEmployeeEditPage() {
  const history = useHistory();
  const location = useLocation();
  const { currentOrganization, demoContext } = useSelector(
    (state: GlobalState) => state
  );
  const [configItems, setConfigItems] = useState(() =>
    readStoreEmployeePermissionConfigItems()
  );
  const departmentItems = useMemo(() => readEnterpriseDepartmentItems(), []);
  const [roleItems] = useEnterpriseRoleItems();
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [manualIncludedEmployeeIds, setManualIncludedEmployeeIds] = useState<string[]>([]);
  const [manualExcludedEmployeeIds, setManualExcludedEmployeeIds] = useState<string[]>([]);

  const currentStoreId =
    currentOrganization?.scope === 'store' ? currentOrganization.id : undefined;
  const currentStoreName = currentOrganization?.name || '当前店铺';
  const locationQuery = useMemo(() => qs.parse(location.search), [location.search]);
  const employeeId = getSingleQueryValue(locationQuery.id);
  const referencedEmployees = useMemo(
    () => (currentStoreId ? buildStoreReferencedEmployees(currentStoreId) : []),
    [currentStoreId]
  );
  const externalEmployees = useMemo(
    () =>
      currentStoreId ? readStoreExternalEmployeeItems(currentStoreId) : [],
    [currentStoreId]
  );
  const sourceEmployees = useMemo(
    () =>
      currentStoreId
        ? buildStoreEmployeeSourceEmployees(
            currentStoreId,
            referencedEmployees,
            externalEmployees
          )
        : [],
    [currentStoreId, externalEmployees, referencedEmployees]
  );
  const managedEmployees = useMemo(
    () =>
      currentStoreId
        ? buildStoreManagedEmployees(
            currentStoreId,
            referencedEmployees,
            configItems,
            roleItems,
            departmentItems,
            externalEmployees
          )
        : [],
    [
      configItems,
      currentStoreId,
      departmentItems,
      externalEmployees,
      referencedEmployees,
      roleItems,
    ]
  );
  const currentEmployee = useMemo(
    () => managedEmployees.find((item) => item.id === employeeId),
    [employeeId, managedEmployees]
  );
  const currentConfig = useMemo(
    () =>
      currentStoreId && employeeId
        ? getStoreEmployeePermissionConfigByEmployeeId(
            currentStoreId,
            employeeId,
            configItems
          )
        : undefined,
    [configItems, currentStoreId, employeeId]
  );
  const storeRoleItems = useMemo(
    () =>
      roleItems
        .filter((item) => item.scope === 'store')
        .sort((left, right) => {
          if (left.isDefault !== right.isDefault) {
            return Number(right.isDefault) - Number(left.isDefault);
          }

          return left.name.localeCompare(right.name, 'zh-CN');
        }),
    [roleItems]
  );
  const roleSelectionSummary = useMemo(
    () => getStoreRoleSelectionSummary(roleIds, roleItems),
    [roleIds, roleItems]
  );
  const selectedRoles = roleSelectionSummary?.selectedRoles || [];
  const selectedRolePermissionTitles =
    roleSelectionSummary?.functionPermissionTitles || [];
  const employeeNameMap = useMemo(
    () => new Map(managedEmployees.map((item) => [item.id, item.name] as const)),
    [managedEmployees]
  );
  const autoVisibleEmployeeIds = currentEmployee?.autoVisibleEmployeeIds || [];
  const effectiveVisibleEmployeeIds = useMemo(
    () => {
      const visibleSet = new Set(autoVisibleEmployeeIds);

      manualIncludedEmployeeIds.forEach((employeeId) => visibleSet.add(employeeId));
      manualExcludedEmployeeIds.forEach((employeeId) => visibleSet.delete(employeeId));

      return Array.from(visibleSet);
    },
    [autoVisibleEmployeeIds, manualExcludedEmployeeIds, manualIncludedEmployeeIds]
  );
  const selectedEmployeeNames = useMemo(
    () =>
      effectiveVisibleEmployeeIds
        .map((item) => employeeNameMap.get(item))
        .filter((item): item is string => Boolean(item)),
    [effectiveVisibleEmployeeIds, employeeNameMap]
  );
  const permissionTreeData = useMemo(
    () =>
      currentEmployee
        ? buildStoreEmployeePermissionTree(managedEmployees, currentEmployee.id)
        : [],
    [currentEmployee, managedEmployees]
  );
  const defaultExpandedKeys = useMemo(
    () => collectTreeKeys(permissionTreeData),
    [permissionTreeData]
  );

  useEffect(() => {
    setRoleIds(currentConfig?.roleIds || []);
    setManualIncludedEmployeeIds(currentConfig?.manualIncludedEmployeeIds || []);
    setManualExcludedEmployeeIds(currentConfig?.manualExcludedEmployeeIds || []);
  }, [
    currentConfig?.manualExcludedEmployeeIds,
    currentConfig?.manualIncludedEmployeeIds,
    currentConfig?.roleIds,
  ]);

  function handleBack() {
    history.push(getEmployeeListPath(location.pathname));
  }

  function handleReset() {
    setRoleIds(currentConfig?.roleIds || []);
    setManualIncludedEmployeeIds(currentConfig?.manualIncludedEmployeeIds || []);
    setManualExcludedEmployeeIds(currentConfig?.manualExcludedEmployeeIds || []);
    Message.info('已恢复为当前已保存配置');
  }

  function handleSave() {
    if (!currentStoreId || !currentEmployee) {
      return;
    }

    if (!roleIds.length) {
      Message.error('请至少选择一个店铺角色包');
      return;
    }

    const nextItems = upsertStoreEmployeePermissionConfig(
      {
        storeId: currentStoreId,
        employeeId: currentEmployee.id,
        roleIds,
        manualIncludedEmployeeIds,
        manualExcludedEmployeeIds,
      },
      configItems,
      sourceEmployees,
      roleItems,
      departmentItems
    );

    setConfigItems(nextItems);
    Message.success('员工权限配置已保存');
  }

  function handleTreeCheck(nextCheckedKeys: unknown) {
    if (!currentEmployee) {
      return;
    }

    const validEmployeeIdSet = new Set(managedEmployees.map((item) => item.id));
    const nextCheckedEmployeeIds = normalizeStringArray(nextCheckedKeys).filter(
      (item) => item !== currentEmployee.id && validEmployeeIdSet.has(item)
    );
    const autoVisibleEmployeeIdSet = new Set(autoVisibleEmployeeIds);

    setManualIncludedEmployeeIds(
      nextCheckedEmployeeIds.filter((item) => !autoVisibleEmployeeIdSet.has(item))
    );
    setManualExcludedEmployeeIds(
      autoVisibleEmployeeIds.filter((item) => !nextCheckedEmployeeIds.includes(item))
    );
  }

  if (!currentStoreId) {
    return (
      <Card>
        <Empty description="当前未切换到具体店铺视角，暂无法编辑店铺员工权限。" />
        <div className={styles.emptyAction}>
          <Button type="primary" onClick={handleBack}>
            返回店铺员工
          </Button>
        </div>
      </Card>
    );
  }

  if (!employeeId || !currentEmployee) {
    return (
      <Card>
        <Empty description="未找到当前员工，可能该员工已不在当前店铺同步名单中。" />
        <div className={styles.emptyAction}>
          <Button type="primary" onClick={handleBack}>
            返回店铺员工
          </Button>
        </div>
      </Card>
    );
  }

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
              编辑店铺员工
            </Typography.Title>
            <Typography.Paragraph className={styles.heroMeta} type="secondary">
              员工基础资料来自组织架构引用，仅支持查看；当前页可为该员工分配多个店铺角色包，并单独配置个人数据查看权限。
            </Typography.Paragraph>
          </Space>

          <div className={styles.heroSide}>
            <span className={styles.heroSideLabel}>当前员工</span>
            <span className={styles.heroSideValue}>{currentEmployee.name}</span>
            <span className={styles.heroSideMeta}>
              {currentEmployee.sourceDepartmentPath.join(' / ')}
            </span>
            {currentEmployee.isManagement && (
              <Tag color="orange" className={styles.managementTag}>
                管理岗默认带出本部门整棵树
              </Tag>
            )}
          </div>
        </div>
      </Card>

      <Card
        className={styles.infoCard}
        title={
          <div className={styles.cardTitle}>
            <span>员工信息</span>
            <span className={styles.cardTitleDesc}>
              以下资料由组织架构引用同步，当前页面仅提供查看。
            </span>
          </div>
        }
      >
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>员工姓名</span>
            <span className={styles.infoValue}>{currentEmployee.name}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>账号</span>
            <span className={styles.infoValue}>{currentEmployee.account}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>联系方式</span>
            <span className={styles.infoValue}>{currentEmployee.contactPhone}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>状态</span>
            <span className={styles.infoValue}>
              <Tag color={currentEmployee.status === 'enabled' ? 'green' : 'orange'}>
                {currentEmployee.status === 'enabled' ? '在职' : '离职'}
              </Tag>
            </span>
          </div>
          <div className={`${styles.infoItem} ${styles.infoItemWide}`}>
            <span className={styles.infoLabel}>来源组织/部门</span>
            <span className={styles.infoValue}>
              {currentEmployee.sourceDepartmentPath.join(' / ')}
            </span>
          </div>
        </div>
      </Card>

      <Card
        className={styles.sectionCard}
        title={
          <div className={styles.cardTitle}>
            <span>店铺角色包</span>
            <span className={styles.cardTitleDesc}>
              支持给同一员工叠加多个店铺角色包，功能权限按并集预览，数据权限按所选角色中的更高范围说明展示。
            </span>
          </div>
        }
      >
        <Select
          mode="multiple"
          allowClear
          className={styles.roleSelect}
          placeholder="请选择店铺角色包"
          value={roleIds}
          onChange={(value) => setRoleIds(normalizeStringArray(value))}
        >
          {storeRoleItems.map((role) => (
            <Select.Option key={role.id} value={role.id}>
              {role.name}
              {role.isDefault ? '（默认角色）' : ''}
            </Select.Option>
          ))}
        </Select>

        <div className={styles.permissionCard}>
          <div className={styles.permissionHeader}>
            <Typography.Text className={styles.permissionTitle}>
              角色包权限预览
            </Typography.Text>
            {selectedRoles.length > 0 && (
              <Typography.Text className={styles.permissionRoleName}>
                已选 {selectedRoles.length} 个角色包
              </Typography.Text>
            )}
          </div>

          {selectedRoles.length ? (
            <div className={styles.permissionContent}>
              <div className={styles.permissionSection}>
                <span className={styles.permissionSectionTitle}>已选角色包</span>
                <div className={styles.permissionTags}>
                  {selectedRoles.map((role) => (
                    <Tag key={role.id} size="small" color="arcoblue">
                      {role.name}
                    </Tag>
                  ))}
                </div>
              </div>

              <div className={styles.permissionSection}>
                <span className={styles.permissionSectionTitle}>合并后数据权限</span>
                <div className={styles.permissionItem}>
                  <span className={styles.permissionItemTitle}>
                    {roleSelectionSummary?.dataPermissionLabel}
                  </span>
                  <span className={styles.permissionItemDescription}>
                    {roleSelectionSummary?.dataPermissionDescription}
                  </span>
                </div>
              </div>

              <div className={styles.permissionSection}>
                <span className={styles.permissionSectionTitle}>功能权限</span>
                {selectedRolePermissionTitles.length ? (
                  <div className={styles.permissionTags}>
                    {selectedRolePermissionTitles.map((title) => (
                      <Tag key={title} size="small">
                        {title}
                      </Tag>
                    ))}
                  </div>
                ) : (
                  <span className={styles.permissionEmpty}>当前角色包未配置功能权限</span>
                )}
              </div>

              <div className={styles.permissionSection}>
                <span className={styles.permissionSectionTitle}>角色包说明</span>
                <div className={styles.roleDescriptionList}>
                  {selectedRoles.map((role) => (
                    <div key={role.id} className={styles.roleDescriptionItem}>
                      <span className={styles.roleDescriptionTitle}>{role.name}</span>
                      <span className={styles.permissionDescription}>
                        {role.description || '暂无角色说明'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.permissionPlaceholder}>
              选择店铺角色包后，将在这里展示合并后的数据权限和功能权限。
            </div>
          )}
        </div>
      </Card>

      <Card
        className={styles.sectionCard}
        title={
          <div className={styles.cardTitle}>
            <span>个人数据权限</span>
            <span className={styles.cardTitleDesc}>
              从当前店铺已同步员工中勾选人员。保存后，当前员工将额外获得这些被勾选员工的业务数据查看权限。
              {currentEmployee.isManagement
                ? ' 管理岗会默认带出当前部门整棵树成员，仍可继续手工补充或取消。'
                : ''}
            </span>
          </div>
        }
      >
        <div className={styles.permissionSummary}>
          <span className={styles.permissionSummaryLabel}>当前已勾选</span>
          {selectedEmployeeNames.length ? (
            <Space wrap>
              {selectedEmployeeNames.map((item) => (
                <Tag key={item}>{item}</Tag>
              ))}
            </Space>
          ) : (
            <Typography.Text type="secondary">未配置</Typography.Text>
          )}
        </div>

        {currentEmployee.isManagement && (
          <Typography.Text className={styles.managementSummary} type="secondary">
            系统默认 {autoVisibleEmployeeIds.length} 人，人工补充{' '}
            {manualIncludedEmployeeIds.length} 人，人工排除 {manualExcludedEmployeeIds.length}{' '}
            人。
          </Typography.Text>
        )}

        <div className={styles.treeWrap}>
          <Tree
            checkable
            blockNode
            checkedKeys={effectiveVisibleEmployeeIds}
            className={styles.tree}
            defaultExpandedKeys={defaultExpandedKeys}
            treeData={permissionTreeData}
            onCheck={handleTreeCheck}
          />
        </div>
      </Card>

      <div className={styles.actions}>
        <Button onClick={handleBack}>返回列表</Button>
        <Button onClick={handleReset}>恢复已保存配置</Button>
        <Button type="primary" onClick={handleSave}>
          保存配置
        </Button>
      </div>
    </div>
  );
}

export default StoreEmployeeEditPage;
