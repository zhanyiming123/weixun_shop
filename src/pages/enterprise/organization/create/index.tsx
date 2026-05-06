import React, { useEffect, useMemo, useRef, useState } from 'react';
import qs from 'query-string';
import {
  Button,
  Card,
  Cascader,
  Form,
  Input,
  Message,
  Space,
  Typography,
} from '@arco-design/web-react';
import { useHistory, useLocation } from 'react-router-dom';
import CouponStoreSelector from '@/pages/marketing/center/components/store-selector';
import styles from './index.module.less';
import {
  createOrganizationId,
  createTempOrganizationCode,
  DEFAULT_ORGANIZATION_CAPABILITIES,
  formatOrganizationDateTime,
  getOrganizationRegionLabel,
  getOrganizationSelectedStoreNames,
  ORGANIZATION_REGION_OPTIONS,
  ORGANIZATION_TYPE_LABEL_MAP,
  OrganizationCapabilityConfig,
  OrganizationItem,
  OrganizationType,
  normalizeOrganizationSelectedStoreIds,
  readOrganizationSelectableStoreItems,
  useOrganizationItems,
  writeOrganizationItems,
} from '../data';
import {
  getOrganizationCreatePath,
  getOrganizationListPath,
} from '@/utils/demo-route';

const { useForm } = Form;
const PHONE_PATTERN = /^[\d-]{7,20}$/;
const STORE_FORM_LAYOUT = {
  layout: 'horizontal' as const,
  labelCol: { flex: '120px' },
  wrapperCol: { flex: '1' },
};

type OrganizationFormMode = 'create' | 'edit';

type OrganizationFormPageProps = {
  mode?: OrganizationFormMode;
};

type CreateFormValues = {
  name: string;
  code: string;
  regionPath: string[];
  address: string;
  contactPhone: string;
  managerName: string;
  managerPhone: string;
};

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

function buildInitialFormValues(code: string): CreateFormValues {
  return {
    name: '',
    code,
    regionPath: [],
    address: '',
    contactPhone: '',
    managerName: '',
    managerPhone: '',
  };
}

function buildFormValuesFromOrganization(item: OrganizationItem): CreateFormValues {
  return {
    name: item.name,
    code: item.code,
    regionPath: [...item.regionPath],
    address: item.address,
    contactPhone: item.contactPhone,
    managerName: item.managerName,
    managerPhone: item.managerPhone,
  };
}


export function EnterpriseOrganizationFormPage({
  mode = 'create',
}: OrganizationFormPageProps) {
  const history = useHistory();
  const location = useLocation();
  const [organizationItems, setOrganizationItems] = useOrganizationItems();
  const [capabilities, setCapabilities] = useState<OrganizationCapabilityConfig>(
    DEFAULT_ORGANIZATION_CAPABILITIES
  );
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [storeSelectionError, setStoreSelectionError] = useState('');
  const [storeModalVisible, setStoreModalVisible] = useState(false);
  const missingEditHandledRef = useRef(false);
  const [form] = useForm();
  const locationQuery = useMemo(() => qs.parse(location.search), [location.search]);
  const queryType = useMemo<OrganizationType>(
    () => (locationQuery.type === 'partner' ? 'partner' : 'store'),
    [locationQuery.type]
  );
  const organizationId =
    typeof locationQuery.id === 'string' ? locationQuery.id.trim() : '';
  const editingItem = useMemo(
    () =>
      mode === 'edit'
        ? organizationItems.find((item) => item.id === organizationId)
        : undefined,
    [mode, organizationId, organizationItems]
  );
  const pageType = editingItem?.type || queryType;
  const isStorePage = pageType === 'store';
  const tempCode = useMemo(() => createTempOrganizationCode(pageType), [pageType]);
  const currentCode = editingItem?.code || tempCode;
  const isCreateMode = mode === 'create';
  const isEditMode = mode === 'edit';
  const typeLabel = ORGANIZATION_TYPE_LABEL_MAP[pageType];
  const nameLabel = pageType === 'store' ? '店铺名称' : '区域名称';
  const codeLabel = pageType === 'store' ? '店铺编号' : '区域编号';
  const regionFieldLabel = pageType === 'partner' ? '区域' : '所属区域';
  const pageTitle = `${isCreateMode ? '新建' : '编辑'}${typeLabel}`;
  const pageDescription = isStorePage
    ? isCreateMode
      ? '填写店铺基础信息和组织能力配置，提交后将自动回到对应列表页。'
      : '支持一次性修改店铺基础信息与组织能力，保存后将同步更新对应列表数据。'
    : isCreateMode
      ? '填写区域基础信息并圈选店铺，新建完成后将自动回到对应列表页。'
      : '支持修改区域基础信息和圈选店铺，保存后将同步更新对应列表数据。';
  const selectableStoreItems = useMemo(() => readOrganizationSelectableStoreItems(), []);
  const normalizedSelectedStoreIds = useMemo(
    () =>
      normalizeOrganizationSelectedStoreIds(
        selectedStoreIds,
        selectableStoreItems
      ),
    [selectableStoreItems, selectedStoreIds]
  );
  const selectedStoreNames = useMemo(
    () =>
      getOrganizationSelectedStoreNames(
        normalizedSelectedStoreIds,
        selectableStoreItems
      ),
    [normalizedSelectedStoreIds, selectableStoreItems]
  );
  const storeSummaryTitle = useMemo(() => {
    if (!normalizedSelectedStoreIds.length) {
      return '未圈选店铺';
    }

    if (normalizedSelectedStoreIds.length === selectableStoreItems.length) {
      return '已圈选全部店铺';
    }

    return `已圈选 ${normalizedSelectedStoreIds.length} 家店铺`;
  }, [normalizedSelectedStoreIds, selectableStoreItems.length]);
  const storeSummaryDescription = useMemo(() => {
    if (!normalizedSelectedStoreIds.length) {
      return '点击右侧按钮圈选当前区域覆盖的店铺';
    }

    if (normalizedSelectedStoreIds.length === selectableStoreItems.length) {
      return `当前共覆盖 ${selectableStoreItems.length} 家店铺`;
    }

    return selectedStoreNames.join('、');
  }, [normalizedSelectedStoreIds, selectableStoreItems.length, selectedStoreNames]);

  useEffect(() => {
    if (isCreateMode && locationQuery.type !== pageType) {
      history.replace(getOrganizationCreatePath(location.pathname, pageType));
    }
  }, [history, isCreateMode, location.pathname, locationQuery.type, pageType]);

  useEffect(() => {
    if (!isEditMode) {
      missingEditHandledRef.current = false;
      return;
    }

    if (editingItem) {
      missingEditHandledRef.current = false;
      return;
    }

    if (missingEditHandledRef.current) {
      return;
    }

    missingEditHandledRef.current = true;
    Message.error(organizationId ? '当前组织不存在或已删除' : '缺少组织标识，无法编辑');
    history.replace(getOrganizationListPath(location.pathname, queryType));
  }, [editingItem, history, isEditMode, location.pathname, organizationId, queryType]);

  useEffect(() => {
    if (isEditMode && !editingItem) {
      return;
    }

    const initialValues =
      isEditMode && editingItem
        ? buildFormValuesFromOrganization(editingItem)
        : buildInitialFormValues(currentCode);
    const initialCapabilities =
      isEditMode && editingItem
        ? {
            ...editingItem.capabilities,
          }
        : DEFAULT_ORGANIZATION_CAPABILITIES;
    setCapabilities(initialCapabilities);
    setSelectedStoreIds(
      isEditMode && editingItem
        ? normalizeOrganizationSelectedStoreIds(
            editingItem.selectedStoreIds,
            selectableStoreItems
          )
        : []
    );
    setStoreSelectionError('');
    setStoreModalVisible(false);
    form.resetFields();
    form.setFieldsValue(initialValues);
  }, [currentCode, editingItem, form, isEditMode, selectableStoreItems]);

  function handleCancel() {
    history.push(getOrganizationListPath(location.pathname, pageType));
  }

  async function syncOrganizationInfoFromForm() {
    try {
      const values = (await form.validate()) as CreateFormValues;
      const nextInfo = {
        ...values,
        code: values.code || currentCode,
        regionPath: [...(values.regionPath || [])],
      };

      return nextInfo;
    } catch (_) {
      return null;
    }
  }

  function validateSelectedStores() {
    if (pageType !== 'partner') {
      setStoreSelectionError('');
      return true;
    }

    if (normalizedSelectedStoreIds.length) {
      setStoreSelectionError('');
      return true;
    }

    const nextError = '请至少圈选 1 家店铺';
    setStoreSelectionError(nextError);
    Message.error(nextError);
    return false;
  }

  function openStoreModal() {
    setStoreModalVisible(true);
  }

  function handleStoreModalConfirm(nextStoreIds: string[]) {
    setSelectedStoreIds(
      normalizeOrganizationSelectedStoreIds(nextStoreIds, selectableStoreItems)
    );
    setStoreSelectionError('');
    setStoreModalVisible(false);
  }

  function buildSavedItem(baseInfo: CreateFormValues): OrganizationItem {
    const now = formatOrganizationDateTime(new Date());

    return {
      id: editingItem?.id || createOrganizationId(pageType),
      type: pageType,
      name: baseInfo.name.trim(),
      code: baseInfo.code || currentCode,
      regionPath: [...baseInfo.regionPath],
      regionLabel: getOrganizationRegionLabel(baseInfo.regionPath),
      address: baseInfo.address.trim(),
      contactPhone: baseInfo.contactPhone.trim(),
      managerName: baseInfo.managerName.trim(),
      managerPhone: baseInfo.managerPhone.trim(),
      selectedStoreIds:
        pageType === 'partner'
          ? normalizeOrganizationSelectedStoreIds(
              normalizedSelectedStoreIds,
              selectableStoreItems
            )
          : [],
      status: editingItem?.status || 'enabled',
      capabilities: {
        ...capabilities,
      },
      customProductInfoRules: [],
      createdAt: editingItem?.createdAt || now,
      updatedAt: now,
    };
  }

  function persistOrganization(baseInfo: CreateFormValues, successMessage: string) {
    if (isEditMode && !editingItem) {
      Message.error('当前组织不存在或已删除');
      return;
    }

    const nextItem = buildSavedItem(baseInfo);
    const nextItems = editingItem
      ? organizationItems.map((item) => (item.id === nextItem.id ? nextItem : item))
      : [nextItem, ...organizationItems];

    writeOrganizationItems(nextItems);
    setOrganizationItems(nextItems);
    Message.success(successMessage);
    history.push(getOrganizationListPath(location.pathname, pageType));
  }

  async function handleSubmit() {
    const nextInfo = await syncOrganizationInfoFromForm();
    if (!nextInfo) {
      return;
    }

    if (!validateSelectedStores()) {
      return;
    }

    persistOrganization(
      nextInfo,
      isCreateMode ? `${typeLabel}创建成功` : `${typeLabel}保存成功`
    );
  }

  if (isEditMode && !editingItem) {
    return null;
  }

  return (
    <div className={styles.page}>
      {!isStorePage && (
        <Card className={styles.headerCard}>
          <Space
            direction="vertical"
            size={8}
            style={{ display: 'flex' }}
            className={styles.headerContent}
          >
            <Typography.Title heading={4} style={{ margin: 0 }}>
              {pageTitle}
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {pageDescription}
            </Typography.Paragraph>
          </Space>
        </Card>
      )}

      <Card className={styles.formCard}>
        <Form
          form={form}
          {...(isStorePage ? STORE_FORM_LAYOUT : { layout: 'vertical' as const })}
          className={isStorePage ? styles.storeForm : undefined}
        >
          {isStorePage ? (
            <div className={styles.storeFormBody}>
              <Form.Item
                field="name"
                label={nameLabel}
                rules={[{ required: true, message: `请输入${nameLabel}` }]}
              >
                <Input allowClear placeholder={`请输入${nameLabel}`} />
              </Form.Item>

              <Form.Item field="code" label={codeLabel}>
                <Input readOnly />
              </Form.Item>

              <Form.Item
                field="regionPath"
                label={regionFieldLabel}
                rules={[{ required: true, message: `请选择${regionFieldLabel}` }]}
              >
                <Cascader
                  options={ORGANIZATION_REGION_OPTIONS}
                  placeholder={`请选择${regionFieldLabel}`}
                  onChange={(value) =>
                    form.setFieldValue('regionPath', normalizePath(value))
                  }
                />
              </Form.Item>

              <Form.Item
                field="contactPhone"
                label="联系电话"
                rules={[
                  { required: true, message: '请输入联系电话' },
                  { match: PHONE_PATTERN, message: '请输入 7-20 位联系电话' },
                ]}
              >
                <Input allowClear placeholder="请输入联系电话" />
              </Form.Item>

              <Form.Item
                field="address"
                label="联系地址"
                rules={[{ required: true, message: '请输入联系地址' }]}
              >
                <Input.TextArea
                  autoSize={{ minRows: 2, maxRows: 4 }}
                  placeholder="请输入经营联系地址"
                />
              </Form.Item>

              <Form.Item
                field="managerName"
                label="负责人姓名"
                rules={[{ required: true, message: '请输入负责人姓名' }]}
              >
                <Input allowClear placeholder="请输入负责人姓名" />
              </Form.Item>

              <Form.Item
                field="managerPhone"
                label="负责人电话"
                rules={[
                  { required: true, message: '请输入负责人电话' },
                  { match: PHONE_PATTERN, message: '请输入 7-20 位负责人电话' },
                ]}
              >
                <Input allowClear placeholder="请输入负责人电话" />
              </Form.Item>
            </div>
          ) : (
            <div className={styles.formGrid}>
              <Form.Item
                field="name"
                label={nameLabel}
                rules={[{ required: true, message: `请输入${nameLabel}` }]}
              >
                <Input allowClear placeholder={`请输入${nameLabel}`} />
              </Form.Item>

              <Form.Item field="code" label={codeLabel}>
                <Input readOnly />
              </Form.Item>

              <Form.Item
                field="regionPath"
                label={regionFieldLabel}
                rules={[{ required: true, message: `请选择${regionFieldLabel}` }]}
              >
                <Cascader
                  options={ORGANIZATION_REGION_OPTIONS}
                  placeholder={`请选择${regionFieldLabel}`}
                  onChange={(value) =>
                    form.setFieldValue('regionPath', normalizePath(value))
                  }
                />
              </Form.Item>

              <Form.Item
                field="contactPhone"
                label="联系电话"
                rules={[
                  { required: true, message: '请输入联系电话' },
                  { match: PHONE_PATTERN, message: '请输入 7-20 位联系电话' },
                ]}
              >
                <Input allowClear placeholder="请输入联系电话" />
              </Form.Item>

              <Form.Item
                field="address"
                className={styles.fullWidth}
                label="联系地址"
                rules={[{ required: true, message: '请输入联系地址' }]}
              >
                <Input.TextArea
                  autoSize={{ minRows: 3, maxRows: 5 }}
                  placeholder="请输入经营联系地址"
                />
              </Form.Item>

              <Form.Item
                field="managerName"
                label="负责人姓名"
                rules={[{ required: true, message: '请输入负责人姓名' }]}
              >
                <Input allowClear placeholder="请输入负责人姓名" />
              </Form.Item>

              <Form.Item
                field="managerPhone"
                label="负责人电话"
                rules={[
                  { required: true, message: '请输入负责人电话' },
                  { match: PHONE_PATTERN, message: '请输入 7-20 位负责人电话' },
                ]}
              >
                <Input allowClear placeholder="请输入负责人电话" />
              </Form.Item>

              {pageType === 'partner' && (
                <Form.Item className={styles.fullWidth} required label="圈选店铺">
                  <div className={styles.storeSelectorTrigger}>
                    <div className={styles.storeSelectorSummary}>
                      <div
                        className={`${styles.storeSelectorTitle} ${
                          normalizedSelectedStoreIds.length
                            ? ''
                            : styles.storeSelectorTitleEmpty
                        }`}
                      >
                        {storeSummaryTitle}
                      </div>
                      <div className={styles.storeSelectorDescription}>
                        {storeSummaryDescription}
                      </div>
                    </div>

                    <Button type="outline" onClick={openStoreModal}>
                      圈选店铺
                    </Button>
                  </div>
                  {storeSelectionError && (
                    <Typography.Text className={styles.errorText}>
                      {storeSelectionError}
                    </Typography.Text>
                  )}
                </Form.Item>
              )}
            </div>
          )}
        </Form>

        <div className={styles.footerActions}>
          <Button onClick={handleCancel}>取消</Button>
          <Button type="primary" onClick={handleSubmit}>
            {isCreateMode ? '提交' : '保存'}
          </Button>
        </div>
      </Card>

      <CouponStoreSelector
        visible={storeModalVisible}
        title="圈选店铺"
        entityLabel="店铺"
        allowedStoreTypes={['store']}
        selectedStoreIds={normalizedSelectedStoreIds}
        onCancel={() => setStoreModalVisible(false)}
        onConfirm={handleStoreModalConfirm}
      />

    </div>
  );
}

function EnterpriseOrganizationCreatePage() {
  return <EnterpriseOrganizationFormPage mode="create" />;
}

export default EnterpriseOrganizationCreatePage;
