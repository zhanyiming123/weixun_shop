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
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import styles from './form-page.module.less';
import {
  areMerchantRolePermissionConfigsEqual,
  areEnterpriseRolePermissionStatesEqual,
  buildEnterpriseRoleCopyDraft,
  cloneEnterpriseRolePermissionState,
  createEnterpriseRoleId,
  DEFAULT_ENTERPRISE_ROLE_DATA_PERMISSIONS,
  EnterpriseRoleDataViewScope,
  EnterpriseRoleItem,
  EnterpriseRolePermissionMode,
  EnterpriseRolePermissionState,
  EnterpriseRoleScope,
  getDefaultMerchantRolePermissionConfigs,
  getEnterpriseRoleDataViewScopeOptions,
  ENTERPRISE_ROLE_SCOPE_LABEL_MAP,
  formatEnterpriseRoleDateTime,
  getEnterpriseRolePermissionRootKeys,
  getEnterpriseRolePermissionTree,
  getMerchantRoleLegacyPermissionState,
  getMerchantRolePermissionConfigs,
  MerchantRolePermissionConfigs,
  MerchantRolePermissionState,
  MerchantRolePermissionSystem,
  normalizeEnterpriseRoleScope,
  patchMerchantRolePermissionConfigs,
  useEnterpriseRoleItems,
  writeEnterpriseRoleItems,
} from './data';
import MerchantPermissionConfigCard, {
  MerchantPermissionConfigTabKey,
} from './merchant-permission-config-card';
import {
  getRoleCreatePath,
  getRoleEditPath,
  getRoleListPath,
  getRoleViewPath,
} from '@/utils/demo-route';
import {
  getMerchantRoleScopeByType,
  getMerchantRoleTypeByScope,
  MERCHANT_ROLE_TYPE_LABEL_MAP,
  MerchantRoleType,
} from '@/pages/merchant/role/tab-config';
import { GlobalState } from '@/store';
import { getDemoIdentityPreset } from '@/utils/demo';

const { useForm } = Form;
const TextArea = Input.TextArea;
const Option = Select.Option;

type RoleFormMode = 'create' | 'edit' | 'view';

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
  const currentDemoIdentity = useSelector(
    (state: GlobalState) => state.currentDemoIdentity
  );
  const [roleItems, setRoleItems] = useEnterpriseRoleItems();
  const [permissionState, setPermissionState] =
    useState<EnterpriseRolePermissionState>(() => buildEmptyPermissionState('headquarter'));
  const [merchantPermissionConfigs, setMerchantPermissionConfigs] =
    useState<MerchantRolePermissionConfigs>(() =>
      getDefaultMerchantRolePermissionConfigs('headquarter')
    );
  const [merchantRoleType, setMerchantRoleType] =
    useState<MerchantRoleType>('merchant');
  const [referenceRoleId, setReferenceRoleId] = useState<string | undefined>();
  const [form] = useForm();

  const redirectHandledRef = useRef(false);
  const formInitializedKeyRef = useRef('');
  const permissionBaselineRef = useRef<EnterpriseRolePermissionState>(
    buildEmptyPermissionState('headquarter')
  );
  const merchantPermissionBaselineRef = useRef<MerchantRolePermissionConfigs>(
    getDefaultMerchantRolePermissionConfigs('headquarter')
  );

  const isCreateMode = mode === 'create';
  const isEditMode = mode === 'edit';
  const isViewMode = mode === 'view';
  const isMerchantRolePage = location.pathname.startsWith('/merchant/role');
  const rolePermissionMode: EnterpriseRolePermissionMode = isMerchantRolePage
    ? 'merchant'
    : 'default';
  const [activeMerchantPermissionSystem, setActiveMerchantPermissionSystem] =
    useState<MerchantRolePermissionSystem>('merchant');
  const [activeMerchantPermissionTab, setActiveMerchantPermissionTab] =
    useState<MerchantPermissionConfigTabKey>('function');
  const visibleScopes = useMemo<EnterpriseRoleScope[]>(() => {
    if (location.pathname.startsWith('/store-config/role')) {
      return ['store'];
    }

    if (location.pathname.startsWith('/merchant/role')) {
      return ['headquarter', 'region', 'store'];
    }

    return ['headquarter', 'region', 'store'];
  }, [location.pathname]);
  const locationQuery = useMemo(() => qs.parse(location.search), [location.search]);
  const queryRoleId = getSingleQueryValue(locationQuery.id);
  const querySourceId = getSingleQueryValue(locationQuery.sourceId);
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
  const sourceRole = useMemo(
    () =>
      isCreateMode && querySourceId
        ? roleItems.find((item) => item.id === querySourceId) || null
        : null,
    [isCreateMode, querySourceId, roleItems]
  );
  const basePageScope = editingRole?.scope || activeTab;
  const pageScope = isMerchantRolePage
    ? isCreateMode
      ? getMerchantRoleScopeByType(merchantRoleType)
      : basePageScope
    : basePageScope;
  const isReadOnlyPage = isViewMode;
  const currentOperatorName = useMemo(
    () =>
      currentDemoIdentity
        ? getDemoIdentityPreset(currentDemoIdentity).displayName
        : '系统初始化',
    [currentDemoIdentity]
  );
  const scopeLabel = ENTERPRISE_ROLE_SCOPE_LABEL_MAP[pageScope];
  const permissionTree = useMemo(
    () => getEnterpriseRolePermissionTree(pageScope),
    [pageScope]
  );
  const permissionRootKeys = useMemo(
    () => getEnterpriseRolePermissionRootKeys(pageScope),
    [pageScope]
  );
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
      isMerchantRolePage
        ? !areMerchantRolePermissionConfigsEqual(
            merchantPermissionConfigs,
            merchantPermissionBaselineRef.current,
            pageScope
          )
        : !areEnterpriseRolePermissionStatesEqual(
            permissionState,
            permissionBaselineRef.current,
            pageScope,
            rolePermissionMode
          ),
    [
      isMerchantRolePage,
      merchantPermissionConfigs,
      pageScope,
      permissionState,
      rolePermissionMode,
    ]
  );

  useEffect(() => {
    redirectHandledRef.current = false;
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (isCreateMode) {
      const sourceCreateScope =
        sourceRole && isMerchantRolePage
          ? getMerchantRoleScopeByType(getMerchantRoleTypeByScope(sourceRole.scope))
          : sourceRole?.scope;

      if (sourceRole && sourceCreateScope && sourceCreateScope !== activeTab) {
        history.replace(
          getRoleCreatePath(location.pathname, sourceCreateScope, {
            sourceId: sourceRole.id,
          })
        );
        return;
      }

      if (locationQuery.tab !== activeTab) {
        history.replace(
          getRoleCreatePath(location.pathname, activeTab, {
            sourceId: querySourceId,
          })
        );
      }
      return;
    }

    if (!queryRoleId) {
      if (!redirectHandledRef.current) {
        redirectHandledRef.current = true;
        Message.warning(isViewMode ? '未找到可查看的角色' : '未找到可编辑的角色');
        history.replace(getRoleListPath(location.pathname, activeTab));
      }
      return;
    }

    if (!editingRole) {
      if (!redirectHandledRef.current) {
        redirectHandledRef.current = true;
        Message.warning(isViewMode ? '未找到可查看的角色' : '未找到可编辑的角色');
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
        isViewMode
          ? getRoleViewPath(location.pathname, editingRole.id, editingRole.scope)
          : getRoleEditPath(location.pathname, editingRole.id, editingRole.scope)
      );
    }
  }, [
    activeTab,
    editingRole,
    history,
    isCreateMode,
    isViewMode,
    location.pathname,
    locationQuery.tab,
    querySourceId,
    queryRoleId,
    sourceRole,
  ]);

  useEffect(() => {
    if (isCreateMode) {
      const initKey = `create:${activeTab}:${querySourceId || 'empty'}:${rolePermissionMode}`;
      if (formInitializedKeyRef.current === initKey) {
        return;
      }

      const copiedRoleDraft =
        sourceRole && isMerchantRolePage
          ? buildEnterpriseRoleCopyDraft(sourceRole)
          : undefined;
      const nextMerchantRoleType = isMerchantRolePage
        ? getMerchantRoleTypeByScope(copiedRoleDraft?.scope || activeTab)
        : 'merchant';
      form.resetFields();
      form.setFieldsValue({
        name: copiedRoleDraft?.name || '',
        description: copiedRoleDraft?.description || '',
        roleType: nextMerchantRoleType,
      });
      setReferenceRoleId(undefined);
      const initScope = isMerchantRolePage
        ? getMerchantRoleScopeByType(nextMerchantRoleType)
        : pageScope;
      const emptyState = copiedRoleDraft
        ? cloneEnterpriseRolePermissionState(
            {
              dataPermissions: copiedRoleDraft.dataPermissions,
              functionPermissionKeys: copiedRoleDraft.functionPermissionKeys,
            },
            initScope,
            rolePermissionMode
          )
        : buildEmptyPermissionState(initScope, rolePermissionMode);
      const emptyMerchantPermissionConfigs = copiedRoleDraft?.merchantPermissionConfigs
        ? copiedRoleDraft.merchantPermissionConfigs
        : getDefaultMerchantRolePermissionConfigs(initScope);
      setMerchantRoleType(nextMerchantRoleType);
      setPermissionState(emptyState);
      setMerchantPermissionConfigs(emptyMerchantPermissionConfigs);
      permissionBaselineRef.current = cloneEnterpriseRolePermissionState(
        emptyState,
        initScope,
        rolePermissionMode
      );
      merchantPermissionBaselineRef.current = emptyMerchantPermissionConfigs;
      setActiveMerchantPermissionSystem('merchant');
      setActiveMerchantPermissionTab('function');
      formInitializedKeyRef.current = initKey;
      return;
    }

    if (!editingRole) {
      return;
    }

    const initKey = `${mode}:${editingRole.id}:${editingRole.updatedAt}:${rolePermissionMode}`;
    if (formInitializedKeyRef.current === initKey) {
      return;
    }

    form.resetFields();
    form.setFieldsValue({
      name: editingRole.name,
      description: editingRole.description,
      roleType: isMerchantRolePage
        ? getMerchantRoleTypeByScope(editingRole.scope)
        : undefined,
    });
    if (isMerchantRolePage) {
      setMerchantRoleType(getMerchantRoleTypeByScope(editingRole.scope));
    }

    const nextPermissionState = cloneEnterpriseRolePermissionState({
      dataPermissions: editingRole.dataPermissions,
      functionPermissionKeys: editingRole.functionPermissionKeys,
    }, pageScope, rolePermissionMode);
    const nextMerchantPermissionConfigs = getMerchantRolePermissionConfigs(editingRole);

    setPermissionState(nextPermissionState);
    setMerchantPermissionConfigs(nextMerchantPermissionConfigs);
    permissionBaselineRef.current =
      cloneEnterpriseRolePermissionState(
        nextPermissionState,
        pageScope,
        rolePermissionMode
      );
    merchantPermissionBaselineRef.current = nextMerchantPermissionConfigs;
    setActiveMerchantPermissionSystem('merchant');
    setActiveMerchantPermissionTab('function');

    const nextReferenceRoleId =
      !isMerchantRolePage &&
      referenceRoleOptions.some((item) => item.id === editingRole.referenceRoleId)
        ? editingRole.referenceRoleId
        : undefined;
    setReferenceRoleId(nextReferenceRoleId);
    formInitializedKeyRef.current = initKey;
  }, [
    activeTab,
    editingRole,
    form,
    isMerchantRolePage,
    isCreateMode,
    mode,
    pageScope,
    querySourceId,
    referenceRoleOptions,
    rolePermissionMode,
    sourceRole,
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

  function patchMerchantPermissionConfig(
    system: MerchantRolePermissionSystem,
    value: Partial<MerchantRolePermissionState>
  ) {
    setMerchantPermissionConfigs((prev) =>
      patchMerchantRolePermissionConfigs(prev, system, value, pageScope)
    );
  }

  function handleMerchantDataViewScopeChange(
    system: MerchantRolePermissionSystem,
    moduleId: string,
    value?: EnterpriseRoleDataViewScope
  ) {
    const nextModuleScopes = {
      ...merchantPermissionConfigs[system].dataPermissionModuleScopes,
    };

    if (value) {
      nextModuleScopes[moduleId] = value;
    } else {
      delete nextModuleScopes[moduleId];
    }

    patchMerchantPermissionConfig(system, {
      dataPermissionModuleScopes: nextModuleScopes,
    });
  }

  function handleMerchantBatchDataViewScopeChange(
    system: MerchantRolePermissionSystem,
    nextModuleScopes: MerchantRolePermissionState['dataPermissionModuleScopes']
  ) {
    patchMerchantPermissionConfig(system, {
      dataPermissionModuleScopes: nextModuleScopes,
    });
  }

  function applyReferenceRole(role: EnterpriseRoleItem) {
    const nextPermissionState = cloneEnterpriseRolePermissionState({
      dataPermissions: role.dataPermissions,
      functionPermissionKeys: role.functionPermissionKeys,
    }, pageScope, rolePermissionMode);
    const nextMerchantPermissionConfigs = getMerchantRolePermissionConfigs(role);

    setReferenceRoleId(role.id);
    setPermissionState(nextPermissionState);
    setMerchantPermissionConfigs(nextMerchantPermissionConfigs);
    permissionBaselineRef.current =
      cloneEnterpriseRolePermissionState(
        nextPermissionState,
        pageScope,
        rolePermissionMode
      );
    merchantPermissionBaselineRef.current = nextMerchantPermissionConfigs;
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
      const normalizedPermissionState = cloneEnterpriseRolePermissionState(
        permissionState,
        pageScope,
        rolePermissionMode
      );
      const normalizedMerchantPermissionConfigs = isMerchantRolePage
        ? getMerchantRolePermissionConfigs({
            scope: pageScope,
            dataPermissions: normalizedPermissionState.dataPermissions,
            functionPermissionKeys: normalizedPermissionState.functionPermissionKeys,
            merchantPermissionConfigs,
          })
        : undefined;
      const merchantLegacyPermissionState = normalizedMerchantPermissionConfigs
        ? getMerchantRoleLegacyPermissionState(
            normalizedMerchantPermissionConfigs,
            pageScope
          )
        : undefined;
      const submitPermissionState =
        merchantLegacyPermissionState || normalizedPermissionState;
      const submitReferenceRoleId = isMerchantRolePage ? undefined : referenceRoleId;
      let nextItems = roleItems;

      if (isCreateMode) {
        const nextId =
          isMerchantRolePage && pageScope !== 'store'
            ? `role_merchant_${pageScope}_${Date.now()}`
            : createEnterpriseRoleId(pageScope);
        nextItems = [
          {
            id: nextId,
            scope: pageScope,
            name,
            description,
            employeeCount: 0,
            isDefault: false,
            updatedBy: currentOperatorName,
            referenceRoleId: submitReferenceRoleId,
            dataPermissions: submitPermissionState.dataPermissions,
            functionPermissionKeys: submitPermissionState.functionPermissionKeys,
            merchantPermissionConfigs: normalizedMerchantPermissionConfigs,
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
                updatedBy: currentOperatorName,
                referenceRoleId: submitReferenceRoleId,
                dataPermissions: submitPermissionState.dataPermissions,
                functionPermissionKeys: submitPermissionState.functionPermissionKeys,
                merchantPermissionConfigs: normalizedMerchantPermissionConfigs,
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

  const pageTitle = isCreateMode
    ? `新增${scopeLabel}`
    : isViewMode
      ? `查看${scopeLabel}`
      : `编辑${scopeLabel}`;
  const pageDescription = isCreateMode
    ? isMerchantRolePage
      ? `为${scopeLabel}配置基础信息与权限范围。`
      : `为${scopeLabel}配置基础信息、参考角色和权限范围。`
    : isViewMode
      ? `查看${scopeLabel}的基础信息与权限配置。`
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

        <Form
      form={form}
          layout={isMerchantRolePage ? 'horizontal' : 'vertical'}
          className={`${styles.form} ${isMerchantRolePage ? styles.merchantForm : ''}`}
          labelCol={isMerchantRolePage ? { flex: '96px' } : undefined}
          wrapperCol={isMerchantRolePage ? { flex: '1' } : undefined}
        >
          <div className={styles.infoGrid}>
            {isMerchantRolePage && (
              <Form.Item
                field="roleType"
                label="角色类型"
                className={styles.fullWidth}
                rules={[{ required: true, message: '请选择角色类型' }]}
              >
                <Select
                  className={styles.select}
                  disabled={!isCreateMode}
                  placeholder="请选择角色类型"
                  value={merchantRoleType}
                  onChange={(value) => {
                    setMerchantRoleType(value as MerchantRoleType);
                    form.setFieldValue('roleType', value);
                  }}
                >
                  {(Object.keys(MERCHANT_ROLE_TYPE_LABEL_MAP) as MerchantRoleType[]).map(
                    (type) => (
                      <Option key={type} value={type}>
                        {MERCHANT_ROLE_TYPE_LABEL_MAP[type]}
                      </Option>
                    )
                  )}
                </Select>
              </Form.Item>
            )}
            <Form.Item
              field="name"
              label="角色名称"
              className={isMerchantRolePage ? styles.fullWidth : undefined}
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
                disabled={isReadOnlyPage}
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
                disabled={isReadOnlyPage}
                placeholder="至多输入50个汉字"
                maxLength={50}
                showWordLimit
                autoSize={{ minRows: 4, maxRows: 6 }}
              />
            </Form.Item>

            {!isMerchantRolePage && (
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
                    <Select.Option key={item.id} value={item.id}>
                      {item.name}
                      {item.isDefault ? '（默认）' : ''}
                    </Select.Option>
                  ))}
                </Select>
                <Typography.Text type="secondary" className={styles.fieldHint}>
                  选择后只会带入数据权限和功能权限，不会覆盖当前填写的角色名称和角色描述。
                </Typography.Text>
              </div>
            )}
          </div>
        </Form>
      </Card>

      {isMerchantRolePage ? (
        <Card className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <Typography.Title heading={6} className={styles.sectionTitle}>
              权限配置
            </Typography.Title>
          </div>

          <MerchantPermissionConfigCard
            activeTab={activeMerchantPermissionTab}
            dataViewScopeOptions={dataViewScopeOptions}
            permissionConfigs={merchantPermissionConfigs}
            readOnly={isReadOnlyPage}
            selectedSystem={activeMerchantPermissionSystem}
            onActiveTabChange={setActiveMerchantPermissionTab}
            onBatchDataViewScopeChange={handleMerchantBatchDataViewScopeChange}
            onDataViewScopeChange={handleMerchantDataViewScopeChange}
            onFunctionPermissionChange={(system, checkedKeys) =>
              patchMerchantPermissionConfig(system, {
                functionPermissionKeys: checkedKeys,
              })
            }
            onSelectedSystemChange={setActiveMerchantPermissionSystem}
          />
        </Card>
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
          <Button onClick={handleCancel}>{isViewMode ? '返回' : '取消'}</Button>
          {!isViewMode && (
            <Button type="primary" onClick={handleSubmit}>
              {isCreateMode ? '提交' : '保存'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

export default EnterpriseRoleFormPage;
