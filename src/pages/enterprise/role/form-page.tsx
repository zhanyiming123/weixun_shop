import React, { useEffect, useMemo, useRef, useState } from 'react';
import qs from 'query-string';
import {
  Button,
  Card,
  Form,
  Input,
  Message,
  Modal,
  Radio,
  Select,
  Tree,
  Typography,
} from '@arco-design/web-react';
import { useHistory, useLocation } from 'react-router-dom';
import styles from './form-page.module.less';
import {
  areEnterpriseRolePermissionStatesEqual,
  cloneEnterpriseRolePermissionState,
  createEnterpriseRoleId,
  DEFAULT_ENTERPRISE_ROLE_DATA_PERMISSIONS,
  EnterpriseRoleDataViewScope,
  EnterpriseRoleItem,
  EnterpriseRolePermissionMode,
  EnterpriseRolePermissionState,
  EnterpriseRoleScope,
  getEnterpriseRoleDataViewScopeOptions,
  ENTERPRISE_ROLE_SCOPE_LABEL_MAP,
  formatEnterpriseRoleDateTime,
  getEnterpriseRolePermissionRootKeys,
  getEnterpriseRolePermissionTree,
  getMerchantRolePermissionRootKeys,
  getMerchantRolePermissionSystemKeys,
  getMerchantRolePermissionTree,
  MERCHANT_ROLE_PERMISSION_SYSTEM_OPTIONS,
  MerchantRolePermissionSystem,
  normalizeEnterpriseRoleScope,
  replaceMerchantRolePermissionSystemKeys,
  useEnterpriseRoleItems,
  writeEnterpriseRoleItems,
} from './data';
import {
  getRoleCreatePath,
  getRoleEditPath,
  getRoleListPath,
} from '@/utils/demo-route';

const { useForm } = Form;
const TextArea = Input.TextArea;
const Option = Select.Option;

type RoleFormMode = 'create' | 'edit';

type EnterpriseRoleFormPageProps = {
  mode: RoleFormMode;
};

function getSingleQueryValue(
  value: string | (string | null)[] | null | undefined
): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

function buildEmptyPermissionState(
  scope: EnterpriseRoleScope,
  mode: EnterpriseRolePermissionMode = 'default'
): EnterpriseRolePermissionState {
  return cloneEnterpriseRolePermissionState({
    dataPermissions: DEFAULT_ENTERPRISE_ROLE_DATA_PERMISSIONS,
    functionPermissionKeys: [],
  }, scope, mode);
}

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

function EnterpriseRoleFormPage({ mode }: EnterpriseRoleFormPageProps) {
  const history = useHistory();
  const location = useLocation();
  const [roleItems, setRoleItems] = useEnterpriseRoleItems();
  const [permissionState, setPermissionState] =
    useState<EnterpriseRolePermissionState>(() => buildEmptyPermissionState('headquarter'));
  const [referenceRoleId, setReferenceRoleId] = useState<string | undefined>();
  const [form] = useForm();

  const redirectHandledRef = useRef(false);
  const formInitializedKeyRef = useRef('');
  const permissionBaselineRef = useRef<EnterpriseRolePermissionState>(
    buildEmptyPermissionState('headquarter')
  );

  const isCreateMode = mode === 'create';
  const isMerchantRolePage = location.pathname.startsWith('/merchant/role');
  const rolePermissionMode: EnterpriseRolePermissionMode = isMerchantRolePage
    ? 'merchant'
    : 'default';
  const [activeMerchantPermissionSystem, setActiveMerchantPermissionSystem] =
    useState<MerchantRolePermissionSystem>('store');
  const visibleScopes = useMemo<EnterpriseRoleScope[]>(() => {
    if (location.pathname.startsWith('/store-config/role')) {
      return ['store'];
    }

    if (location.pathname.startsWith('/merchant/role')) {
      return ['headquarter', 'region'];
    }

    return ['headquarter', 'region', 'store'];
  }, [location.pathname]);
  const locationQuery = useMemo(() => qs.parse(location.search), [location.search]);
  const queryRoleId = getSingleQueryValue(locationQuery.id);
  const activeTab = useMemo<EnterpriseRoleScope>(
    () => {
      const nextScope = normalizeEnterpriseRoleScope(locationQuery.tab);
      return visibleScopes.includes(nextScope) ? nextScope : visibleScopes[0];
    },
    [locationQuery.tab, visibleScopes]
  );
  const editingRole = useMemo(
    () =>
      !isCreateMode && queryRoleId
        ? roleItems.find((item) => item.id === queryRoleId) || null
        : null,
    [isCreateMode, queryRoleId, roleItems]
  );
  const pageScope = editingRole?.scope || activeTab;
  const scopeLabel = ENTERPRISE_ROLE_SCOPE_LABEL_MAP[pageScope];
  const permissionTree = useMemo(
    () => getEnterpriseRolePermissionTree(pageScope),
    [pageScope]
  );
  const permissionRootKeys = useMemo(
    () => getEnterpriseRolePermissionRootKeys(pageScope),
    [pageScope]
  );
  const merchantPermissionTree = useMemo(
    () => getMerchantRolePermissionTree(activeMerchantPermissionSystem),
    [activeMerchantPermissionSystem]
  );
  const merchantPermissionRootKeys = useMemo(
    () => getMerchantRolePermissionRootKeys(activeMerchantPermissionSystem),
    [activeMerchantPermissionSystem]
  );
  const activeMerchantPermissionKeys = useMemo(() => {
    const systemKeySet = new Set(
      getMerchantRolePermissionSystemKeys(activeMerchantPermissionSystem)
    );

    return permissionState.functionPermissionKeys.filter((key) =>
      systemKeySet.has(key)
    );
  }, [activeMerchantPermissionSystem, permissionState.functionPermissionKeys]);
  const dataViewScopeOptions = useMemo(
    () => getEnterpriseRoleDataViewScopeOptions(pageScope, rolePermissionMode),
    [pageScope, rolePermissionMode]
  );

  const referenceRoleOptions = useMemo(
    () =>
      roleItems.filter(
        (item) => item.scope === pageScope && (!editingRole || item.id !== editingRole.id)
      ),
    [editingRole, pageScope, roleItems]
  );

  const currentPermissionDirty = useMemo(
    () =>
      !areEnterpriseRolePermissionStatesEqual(
        permissionState,
        permissionBaselineRef.current,
        pageScope,
        rolePermissionMode
      ),
    [pageScope, permissionState, rolePermissionMode]
  );

  useEffect(() => {
    redirectHandledRef.current = false;
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (isCreateMode) {
      if (locationQuery.tab !== activeTab) {
        history.replace(getRoleCreatePath(location.pathname, activeTab));
      }
      return;
    }

    if (!queryRoleId) {
      if (!redirectHandledRef.current) {
        redirectHandledRef.current = true;
        Message.warning('未找到可编辑的角色');
        history.replace(getRoleListPath(location.pathname, activeTab));
      }
      return;
    }

    if (!editingRole) {
      if (!redirectHandledRef.current) {
        redirectHandledRef.current = true;
        Message.warning('未找到可编辑的角色');
        history.replace(getRoleListPath(location.pathname, activeTab));
      }
      return;
    }

    if (editingRole.isDefault && !isMerchantRolePage) {
      if (!redirectHandledRef.current) {
        redirectHandledRef.current = true;
        Message.warning('默认角色暂不支持编辑');
        history.replace(getRoleListPath(location.pathname, editingRole.scope));
      }
      return;
    }

    if (editingRole.scope !== activeTab || locationQuery.tab !== editingRole.scope) {
      history.replace(
        getRoleEditPath(location.pathname, editingRole.id, editingRole.scope)
      );
    }
  }, [
    activeTab,
    editingRole,
    history,
    isCreateMode,
    location.pathname,
    locationQuery.tab,
    queryRoleId,
  ]);

  useEffect(() => {
    if (isCreateMode) {
      const initKey = `create:${pageScope}:${rolePermissionMode}`;
      if (formInitializedKeyRef.current === initKey) {
        return;
      }

      form.resetFields();
      form.setFieldsValue({
        name: '',
        description: '',
      });
      setReferenceRoleId(undefined);
      const emptyState = buildEmptyPermissionState(pageScope, rolePermissionMode);
      setPermissionState(emptyState);
      permissionBaselineRef.current = cloneEnterpriseRolePermissionState(
        emptyState,
        pageScope,
        rolePermissionMode
      );
      formInitializedKeyRef.current = initKey;
      return;
    }

    if (!editingRole) {
      return;
    }

    const initKey = `edit:${editingRole.id}:${editingRole.updatedAt}:${rolePermissionMode}`;
    if (formInitializedKeyRef.current === initKey) {
      return;
    }

    form.resetFields();
    form.setFieldsValue({
      name: editingRole.name,
      description: editingRole.description,
    });

    const nextPermissionState = cloneEnterpriseRolePermissionState({
      dataPermissions: editingRole.dataPermissions,
      functionPermissionKeys: editingRole.functionPermissionKeys,
    }, pageScope, rolePermissionMode);

    setPermissionState(nextPermissionState);
    permissionBaselineRef.current =
      cloneEnterpriseRolePermissionState(
        nextPermissionState,
        pageScope,
        rolePermissionMode
      );

    const nextReferenceRoleId = referenceRoleOptions.some(
      (item) => item.id === editingRole.referenceRoleId
    )
      ? editingRole.referenceRoleId
      : undefined;
    setReferenceRoleId(nextReferenceRoleId);
    formInitializedKeyRef.current = initKey;
  }, [
    editingRole,
    form,
    isCreateMode,
    pageScope,
    referenceRoleOptions,
    rolePermissionMode,
  ]);

  function handleCancel() {
    history.push(getRoleListPath(location.pathname, pageScope));
  }

  function patchPermissionState(value: Partial<EnterpriseRolePermissionState>) {
    setPermissionState((prev) =>
      cloneEnterpriseRolePermissionState({
        dataPermissions:
          'dataPermissions' in value ? value.dataPermissions : prev.dataPermissions,
        functionPermissionKeys:
          'functionPermissionKeys' in value
            ? value.functionPermissionKeys
            : prev.functionPermissionKeys,
      }, pageScope, rolePermissionMode)
    );
  }

  function applyReferenceRole(role: EnterpriseRoleItem) {
    const nextPermissionState = cloneEnterpriseRolePermissionState({
      dataPermissions: role.dataPermissions,
      functionPermissionKeys: role.functionPermissionKeys,
    }, pageScope, rolePermissionMode);

    setReferenceRoleId(role.id);
    setPermissionState(nextPermissionState);
    permissionBaselineRef.current =
      cloneEnterpriseRolePermissionState(
        nextPermissionState,
        pageScope,
        rolePermissionMode
      );
  }

  function handleReferenceRoleChange(value?: string) {
    if (!value) {
      setReferenceRoleId(undefined);
      return;
    }

    if (value === referenceRoleId) {
      return;
    }

    const nextRole = referenceRoleOptions.find((item) => item.id === value);
    if (!nextRole) {
      return;
    }

    if (currentPermissionDirty) {
      Modal.confirm({
        title: '切换参考角色',
        content: '当前已调整的权限配置会被新的参考角色覆盖，确认继续吗？',
        onOk: () => applyReferenceRole(nextRole),
      });
      return;
    }

    applyReferenceRole(nextRole);
  }

  async function handleSubmit() {
    try {
      const values = await form.validate();
      const now = formatEnterpriseRoleDateTime(new Date());
      const name = values.name.trim();
      const description = values.description.trim();
      const normalizedPermissionState =
        cloneEnterpriseRolePermissionState(
          permissionState,
          pageScope,
          rolePermissionMode
        );
      let nextItems = roleItems;

      if (isCreateMode) {
        nextItems = [
          {
            id: createEnterpriseRoleId(pageScope),
            scope: pageScope,
            name,
            description,
            employeeCount: 0,
            isDefault: false,
            referenceRoleId,
            dataPermissions: normalizedPermissionState.dataPermissions,
            functionPermissionKeys: normalizedPermissionState.functionPermissionKeys,
            createdAt: now,
            updatedAt: now,
          },
          ...roleItems,
        ];
        Message.success('角色创建成功');
      } else if (editingRole) {
        nextItems = roleItems.map((item) =>
          item.id === editingRole.id
            ? {
                ...item,
                name,
                description,
                referenceRoleId,
                dataPermissions: normalizedPermissionState.dataPermissions,
                functionPermissionKeys: normalizedPermissionState.functionPermissionKeys,
                updatedAt: now,
              }
            : item
        );
        Message.success('角色保存成功');
      }

      setRoleItems(nextItems);
      writeEnterpriseRoleItems(nextItems);
      history.push(getRoleListPath(location.pathname, pageScope));
    } catch (_) {
      // validation error
    }
  }

  const pageTitle = isCreateMode ? `新增${scopeLabel}` : `编辑${scopeLabel}`;
  const pageDescription = isCreateMode
    ? `为${scopeLabel}配置基础信息、参考角色和权限范围。`
    : `更新${scopeLabel}的基础信息与权限配置，保存后将直接作用于当前角色。`;

  if (!isCreateMode && !editingRole) {
    return null;
  }

  return (
    <div className={styles.page}>
      {!isMerchantRolePage && (
        <Card>
          <div className={styles.headerContent}>
            <Typography.Title heading={4} style={{ margin: 0 }}>
              {pageTitle}
            </Typography.Title>
            <Typography.Paragraph
              type="secondary"
              style={{ marginTop: 8, marginBottom: 0 }}
            >
              {pageDescription}
            </Typography.Paragraph>
            <span className={styles.scopeBadge}>{scopeLabel}</span>
          </div>
        </Card>
      )}

      <Card className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <Typography.Title heading={6} className={styles.sectionTitle}>
            角色信息
          </Typography.Title>
        </div>

        <Form form={form} layout="vertical" className={styles.form}>
          <div className={styles.infoGrid}>
            <Form.Item
              field="name"
              label="角色名称"
              rules={[
                { required: true, message: '请输入角色名称' },
                {
                  validator: (value, callback) => {
                    if (typeof value === 'string' && value.trim()) {
                      callback();
                      return;
                    }
                    callback('请输入角色名称');
                  },
                },
              ]}
            >
              <Input
                className={styles.input}
                placeholder="请输入角色名称"
                maxLength={20}
                showWordLimit
              />
            </Form.Item>

            <Form.Item
              field="description"
              label="角色描述"
              className={styles.fullWidth}
              rules={[
                { required: true, message: '请输入角色描述' },
                {
                  validator: (value, callback) => {
                    if (typeof value === 'string' && value.trim()) {
                      callback();
                      return;
                    }
                    callback('请输入角色描述');
                  },
                },
              ]}
            >
              <TextArea
                className={styles.textarea}
                placeholder="至多输入50个汉字"
                maxLength={50}
                showWordLimit
                autoSize={{ minRows: 4, maxRows: 6 }}
              />
            </Form.Item>

            <div className={styles.fullWidth}>
              <Typography.Text className={styles.formLabel}>参考角色</Typography.Text>
              <Select
                allowClear
                className={styles.select}
                disabled={!referenceRoleOptions.length}
                placeholder={
                  referenceRoleOptions.length
                    ? '请选择参考角色'
                    : '当前角色类型下暂无可参考角色'
                }
                value={referenceRoleId}
                onChange={(value) => handleReferenceRoleChange(value || undefined)}
              >
                {referenceRoleOptions.map((item) => (
                  <Option key={item.id} value={item.id}>
                    {item.name}
                    {item.isDefault ? '（默认）' : ''}
                  </Option>
                ))}
              </Select>
              <Typography.Text type="secondary" className={styles.fieldHint}>
                选择后只会带入数据权限和功能权限，不会覆盖当前填写的角色名称和角色描述。
              </Typography.Text>
            </div>
          </div>
        </Form>
      </Card>

      {isMerchantRolePage ? (
        <>
          <Card className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <Typography.Title heading={6} className={styles.sectionTitle}>
                数据权限
              </Typography.Title>
            </div>

            <div className={styles.permissionContent}>
              <Radio.Group
                direction="vertical"
                className={styles.viewScopeGroup}
                value={permissionState.dataPermissions.viewScope}
                onChange={(value) =>
                  patchPermissionState({
                    dataPermissions: {
                      viewScope: value as EnterpriseRoleDataViewScope,
                    },
                  })
                }
              >
                {dataViewScopeOptions.map((option) => (
                  <Radio key={option.value} value={option.value}>
                    <span className={styles.viewScopeOptionContent}>
                      <span className={styles.viewScopeTitle}>{option.label}</span>
                      <span className={styles.viewScopeDescription}>
                        {option.description}
                      </span>
                    </span>
                  </Radio>
                ))}
              </Radio.Group>
              <Typography.Text type="secondary" className={styles.permissionHelp}>
                数据查看范围用于控制该角色在当前业务权限下可访问的记录层级。
              </Typography.Text>
            </div>
          </Card>

          <Card className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <Typography.Title heading={6} className={styles.sectionTitle}>
                功能权限
              </Typography.Title>
            </div>

            <Typography.Text type="secondary" className={styles.permissionHelp}>
              用于配置员工角色在不同系统里的页面查看、编辑和业务功能使用范围。
            </Typography.Text>

            <div className={styles.merchantPermissionLayout}>
              <div className={styles.permissionSystemList}>
                {MERCHANT_ROLE_PERMISSION_SYSTEM_OPTIONS.map((option) => {
                  const active = activeMerchantPermissionSystem === option.value;
                  const buttonClassName = [
                    styles.permissionSystemButton,
                    active && styles.permissionSystemButtonActive,
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={buttonClassName}
                      onClick={() => setActiveMerchantPermissionSystem(option.value)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <div className={styles.permissionTreePanel}>
                <div className={styles.treeWrapper}>
                  <Tree
                    key={activeMerchantPermissionSystem}
                    blockNode
                    checkable
                    checkedKeys={activeMerchantPermissionKeys}
                    defaultExpandedKeys={merchantPermissionRootKeys}
                    treeData={merchantPermissionTree}
                    showLine
                    selectable={false}
                    onCheck={(checkedKeys) =>
                      patchPermissionState({
                        functionPermissionKeys:
                          replaceMerchantRolePermissionSystemKeys(
                            permissionState.functionPermissionKeys,
                            activeMerchantPermissionSystem,
                            normalizeCheckedKeys(checkedKeys)
                          ),
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </Card>
        </>
      ) : (
        <Card className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <Typography.Title heading={6} className={styles.sectionTitle}>
              角色权限
            </Typography.Title>
          </div>

          <div className={styles.permissionSection}>
            <div className={styles.permissionRow}>
              <div className={styles.permissionLabel}>数据权限</div>
              <div className={styles.permissionContent}>
                <Radio.Group
                  direction="vertical"
                  className={styles.viewScopeGroup}
                  value={permissionState.dataPermissions.viewScope}
                  onChange={(value) =>
                    patchPermissionState({
                      dataPermissions: {
                        viewScope: value as EnterpriseRoleDataViewScope,
                      },
                    })
                  }
                >
                  {dataViewScopeOptions.map((option) => (
                    <Radio key={option.value} value={option.value}>
                      <span className={styles.viewScopeOptionContent}>
                        <span className={styles.viewScopeTitle}>{option.label}</span>
                        <span className={styles.viewScopeDescription}>
                          {option.description}
                        </span>
                      </span>
                    </Radio>
                  ))}
                </Radio.Group>
                <Typography.Text type="secondary" className={styles.permissionHelp}>
                  数据查看范围用于控制该角色在当前业务权限下可访问的记录层级。
                </Typography.Text>
              </div>
            </div>

            <div className={styles.permissionRow}>
              <div className={styles.permissionLabel}>功能权限</div>
              <div className={styles.permissionContent}>
                <Typography.Text type="secondary" className={styles.permissionHelp}>
                  用于配置员工角色在页面上的查看、编辑和业务功能使用范围。
                </Typography.Text>
                <div className={styles.treeWrapper}>
                  <Tree
                    key={pageScope}
                    blockNode
                    checkable
                    checkedKeys={permissionState.functionPermissionKeys}
                    defaultExpandedKeys={permissionRootKeys}
                    treeData={permissionTree}
                    showLine
                    selectable={false}
                    onCheck={(checkedKeys) =>
                      patchPermissionState({
                        functionPermissionKeys: normalizeCheckedKeys(checkedKeys),
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className={styles.footerCard}>
        <div className={styles.footerActions}>
          <Button onClick={handleCancel}>取消</Button>
          <Button type="primary" onClick={handleSubmit}>
            {isCreateMode ? '提交' : '保存'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default EnterpriseRoleFormPage;
