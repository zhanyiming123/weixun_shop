import React, { useEffect, useMemo, useRef, useState } from 'react';
import qs from 'query-string';
import {
  Button,
  Card,
  Cascader,
  Checkbox,
  Form,
  Input,
  Link,
  Message,
  Modal,
  Radio,
  Space,
  Steps,
  Switch,
  Tooltip,
  Typography,
} from '@arco-design/web-react';
import {
  IconInfoCircleFill,
  IconQuestionCircle,
} from '@arco-design/web-react/icon';
import { useHistory, useLocation } from 'react-router-dom';
import {
  buildProductCatalogLeafItems,
  readProductCatalogItems,
} from '@/pages/product/catalog/data';
import {
  buildProductOwnershipCascaderOptions,
  buildProductOwnershipLeafItems,
  getProductOwnershipFullLabel,
  getProductOwnershipIdFromPath,
  readProductOwnershipItems,
} from '@/pages/product/category/data';
import CouponStoreSelector from '@/pages/marketing/center/components/store-selector';
import MarketingProductSelector from '@/pages/marketing/center/components/product-selector';
import { buildMarketingProductSelectorSpus } from '@/pages/marketing/center/coupon/data';
import {
  MarketingProductSelectorSpuItem,
  MarketingProductSelectorSkuItem,
} from '@/pages/marketing/center/components/product-selector/types';
import styles from './index.module.less';
import {
  createOrganizationCustomRuleId,
  createOrganizationId,
  createTempOrganizationCode,
  DEFAULT_ORGANIZATION_CAPABILITIES,
  formatOrganizationDateTime,
  getOrganizationRegionLabel,
  getOrganizationSelectedStoreNames,
  ORGANIZATION_REGION_OPTIONS,
  ORGANIZATION_TYPE_LABEL_MAP,
  OrganizationCapabilityConfig,
  OrganizationCustomFieldKey,
  OrganizationCustomProductRule,
  OrganizationCustomRuleScope,
  OrganizationItem,
  OrganizationType,
  normalizeOrganizationSelectedStoreIds,
  readOrganizationSelectableStoreItems,
  useOrganizationItems,
  writeOrganizationItems,
} from '../data';

const { Step } = Steps;
const { useForm } = Form;
const PHONE_PATTERN = /^[\d-]{7,20}$/;

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

type CapabilityFieldKey = keyof OrganizationCapabilityConfig;

type RuleErrorState = {
  section?: string;
  byRule: Record<
    string,
    {
      fieldKeys?: string;
      selectedSkuIds?: string;
      selectedCategoryPath?: string;
    }
  >;
};

const CUSTOM_FIELD_OPTIONS: Array<{
  key: OrganizationCustomFieldKey;
  label: string;
  tooltip?: string;
}> = [
  {
    key: 'productPrice',
    label: '商品价格',
    tooltip: '允许组织对商品价格进行独立设置，不跟随总部同步。',
  },
  {
    key: 'specStatus',
    label: '规格启/禁用',
  },
];

const RULE_SCOPE_OPTIONS: Array<{
  label: string;
  value: OrganizationCustomRuleScope;
}> = [
  {
    label: '全部商品',
    value: 'allProducts',
  },
  {
    label: '指定商品',
    value: 'specificProducts',
  },
  {
    label: '指定商品分类',
    value: 'specificCategory',
  },
];

const CAPABILITY_SECTIONS: Array<{
  title: string;
  items: Array<{
    key: CapabilityFieldKey;
    title: string;
    description: string;
  }>;
}> = [
  {
    title: '店铺相关',
    items: [
      {
        key: 'shopIsolation',
        title: '网店隔离',
        description: '开启后，该组织拥有独立的网店配置和数据隔离能力。',
      },
      {
        key: 'shopStatus',
        title: '网店状态',
        description: '控制该组织的网店是否处于可运营状态。',
      },
    ],
  },
  {
    title: '商品相关',
    items: [
      {
        key: 'selfBuiltProduct',
        title: '自建商品',
        description: '允许该组织独立创建和维护自己的商品。',
      },
      {
        key: 'customProductInfo',
        title: '自定义商品信息',
        description: '允许该组织定制商品展示字段和扩展信息。',
      },
    ],
  },
];

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

function createEmptyCustomRule(): OrganizationCustomProductRule {
  return {
    id: createOrganizationCustomRuleId(),
    fieldKeys: [],
    applyScope: 'allProducts',
    selectedSkuIds: [],
    selectedCategoryPath: [],
  };
}

function cloneCustomRules(rules: OrganizationCustomProductRule[]) {
  return rules.map((rule) => ({
    ...rule,
    fieldKeys: [...rule.fieldKeys],
    selectedSkuIds: [...rule.selectedSkuIds],
    selectedCategoryPath: [...rule.selectedCategoryPath],
  }));
}

function getCustomFieldLabels(fieldKeys: OrganizationCustomFieldKey[]) {
  return CUSTOM_FIELD_OPTIONS.filter((item) => fieldKeys.includes(item.key)).map(
    (item) => item.label
  );
}

function buildEmptyRuleErrors(): RuleErrorState {
  return {
    section: undefined,
    byRule: {},
  };
}

function getUniqueProductSummary(
  selectedSkuIds: string[],
  skuMetaMap: Map<string, { productId: string; productName: string }>
) {
  const productMap = new Map<string, string>();

  selectedSkuIds.forEach((skuId) => {
    const matched = skuMetaMap.get(skuId);
    if (!matched) {
      return;
    }

    productMap.set(matched.productId, matched.productName);
  });

  return {
    productCount: productMap.size,
    skuCount: selectedSkuIds.length,
    productNames: Array.from(productMap.values()),
  };
}

export function EnterpriseOrganizationFormPage({
  mode = 'create',
}: OrganizationFormPageProps) {
  const history = useHistory();
  const location = useLocation();
  const [organizationItems, setOrganizationItems] = useOrganizationItems();
  const [currentStep, setCurrentStep] = useState(0);
  const [capabilities, setCapabilities] = useState<OrganizationCapabilityConfig>(
    DEFAULT_ORGANIZATION_CAPABILITIES
  );
  const [organizationInfo, setOrganizationInfo] = useState<CreateFormValues>(
    buildInitialFormValues(createTempOrganizationCode('store'))
  );
  const [customRules, setCustomRules] = useState<OrganizationCustomProductRule[]>([]);
  const [ruleErrors, setRuleErrors] = useState<RuleErrorState>(buildEmptyRuleErrors());
  const [fieldModalVisible, setFieldModalVisible] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState('');
  const [draftFieldKeys, setDraftFieldKeys] = useState<OrganizationCustomFieldKey[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [storeSelectionError, setStoreSelectionError] = useState('');
  const [storeModalVisible, setStoreModalVisible] = useState(false);
  const [skuModalVisible, setSkuModalVisible] = useState(false);
  const [activeProductRuleId, setActiveProductRuleId] = useState('');
  const missingEditHandledRef = useRef(false);
  const [form] = useForm();
  const locationQuery = useMemo(() => qs.parse(location.search), [location.search]);
  const queryType = useMemo<OrganizationType>(
    () => (locationQuery.type === 'partner' ? 'partner' : 'store'),
    [locationQuery.type]
  );
  const organizationId =
    typeof locationQuery.id === 'string' ? locationQuery.id.trim() : '';
  const entrySection = locationQuery.section === 'capability' ? 'capability' : 'basic';
  const editingItem = useMemo(
    () =>
      mode === 'edit'
        ? organizationItems.find((item) => item.id === organizationId)
        : undefined,
    [mode, organizationId, organizationItems]
  );
  const pageType = editingItem?.type || queryType;
  const hasCapabilityStep = pageType === 'store';
  const initialStep = hasCapabilityStep && entrySection === 'capability' ? 1 : 0;
  const tempCode = useMemo(() => createTempOrganizationCode(pageType), [pageType]);
  const currentCode = editingItem?.code || tempCode;
  const isCreateMode = mode === 'create';
  const isEditMode = mode === 'edit';
  const typeLabel = ORGANIZATION_TYPE_LABEL_MAP[pageType];
  const nameLabel = pageType === 'store' ? '店铺名称' : '区域名称';
  const codeLabel = pageType === 'store' ? '店铺编号' : '区域编号';
  const regionFieldLabel = pageType === 'partner' ? '区域' : '所属区域';
  const pageTitle = `${isCreateMode ? '新建' : '编辑'}${typeLabel}`;
  const pageDescription = hasCapabilityStep
    ? isCreateMode
      ? '通过两步完成组织信息录入和能力配置，新建完成后将自动回到对应列表页。'
      : '支持修改基础信息与组织能力，保存后将同步更新对应列表数据。'
    : isCreateMode
      ? '填写区域基础信息并圈选门店，新建完成后将自动回到对应列表页。'
      : '支持修改区域基础信息和圈选门店，保存后将同步更新对应列表数据。';
  const selectableStoreItems = useMemo(() => readOrganizationSelectableStoreItems(), []);
  const catalogItems = useMemo(() => readProductCatalogItems(), []);
  const ownershipItems = useMemo(() => readProductOwnershipItems(), []);
  const catalogLeafItems = useMemo(
    () => buildProductCatalogLeafItems(catalogItems),
    [catalogItems]
  );
  const ownershipLeafItems = useMemo(
    () => buildProductOwnershipLeafItems(ownershipItems),
    [ownershipItems]
  );
  const ownershipOptions = useMemo(
    () => buildProductOwnershipCascaderOptions(ownershipItems),
    [ownershipItems]
  );
  const selectorSpuData = useMemo(
    () => buildMarketingProductSelectorSpus(catalogLeafItems, ownershipLeafItems),
    [catalogLeafItems, ownershipLeafItems]
  );
  const skuMetaMap = useMemo(() => {
    const map = new Map<string, { productId: string; productName: string }>();

    selectorSpuData.forEach((spu: MarketingProductSelectorSpuItem) => {
      spu.children.forEach((sku: MarketingProductSelectorSkuItem) => {
        map.set(sku.key, {
          productId: sku.productId,
          productName: sku.productName,
        });
      });
    });

    return map;
  }, [selectorSpuData]);
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
      return '未圈选门店';
    }

    if (normalizedSelectedStoreIds.length === selectableStoreItems.length) {
      return '已圈选全部门店';
    }

    return `已圈选 ${normalizedSelectedStoreIds.length} 家门店`;
  }, [normalizedSelectedStoreIds, selectableStoreItems.length]);
  const storeSummaryDescription = useMemo(() => {
    if (!normalizedSelectedStoreIds.length) {
      return '点击右侧按钮圈选当前区域覆盖的门店';
    }

    if (normalizedSelectedStoreIds.length === selectableStoreItems.length) {
      return `当前共覆盖 ${selectableStoreItems.length} 家门店`;
    }

    return selectedStoreNames.join('、');
  }, [normalizedSelectedStoreIds, selectableStoreItems.length, selectedStoreNames]);

  useEffect(() => {
    if (isCreateMode && locationQuery.type !== pageType) {
      history.replace(`/enterprise/organization/create?type=${pageType}`);
    }
  }, [history, isCreateMode, locationQuery.type, pageType]);

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
    history.replace(`/enterprise/organization?tab=${queryType}`);
  }, [editingItem, history, isEditMode, organizationId, queryType]);

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
    const initialRules =
      isEditMode && editingItem ? cloneCustomRules(editingItem.customProductInfoRules) : [];

    setOrganizationInfo(initialValues);
    setCapabilities(initialCapabilities);
    setCustomRules(initialRules);
    setRuleErrors(buildEmptyRuleErrors());
    setSelectedStoreIds(
      isEditMode && editingItem
        ? normalizeOrganizationSelectedStoreIds(
            editingItem.selectedStoreIds,
            selectableStoreItems
          )
        : []
    );
    setStoreSelectionError('');
    setCurrentStep(isEditMode ? initialStep : 0);
    setEditingRuleId('');
    setDraftFieldKeys([]);
    setFieldModalVisible(false);
    setStoreModalVisible(false);
    setActiveProductRuleId('');
    setSkuModalVisible(false);
    form.resetFields();
    form.setFieldsValue(initialValues);
  }, [currentCode, editingItem, form, initialStep, isEditMode, selectableStoreItems]);

  function handleCancel() {
    history.push(`/enterprise/organization?tab=${pageType}`);
  }

  async function syncOrganizationInfoFromForm() {
    try {
      const values = (await form.validate()) as CreateFormValues;
      const nextInfo = {
        ...values,
        code: values.code || currentCode,
        regionPath: [...(values.regionPath || [])],
      };

      setOrganizationInfo(nextInfo);
      return nextInfo;
    } catch (_) {
      return null;
    }
  }

  async function handleNextStep() {
    const nextInfo = await syncOrganizationInfoFromForm();
    if (!nextInfo) {
      return;
    }

    setCurrentStep(1);
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

    const nextError = '请至少圈选 1 家门店';
    setStoreSelectionError(nextError);
    Message.error(nextError);
    return false;
  }

  function clearRuleError(
    ruleId: string,
    key?: 'fieldKeys' | 'selectedSkuIds' | 'selectedCategoryPath'
  ) {
    setRuleErrors((previous) => {
      if (!previous.byRule[ruleId] && !previous.section) {
        return previous;
      }

      const nextByRule = {
        ...previous.byRule,
      };

      if (!key) {
        delete nextByRule[ruleId];
      } else if (nextByRule[ruleId]) {
        const nextRuleErrors = {
          ...nextByRule[ruleId],
        };
        delete nextRuleErrors[key];
        if (Object.keys(nextRuleErrors).length) {
          nextByRule[ruleId] = nextRuleErrors;
        } else {
          delete nextByRule[ruleId];
        }
      }

      return {
        section: previous.section,
        byRule: nextByRule,
      };
    });
  }

  function updateCapability(key: CapabilityFieldKey, checked: boolean) {
    setCapabilities((prev) => ({
      ...prev,
      [key]: checked,
    }));

    if (key === 'customProductInfo') {
      if (checked && !customRules.length) {
        setCustomRules([createEmptyCustomRule()]);
      }

      setRuleErrors(buildEmptyRuleErrors());
    }
  }

  function handlePrevStep() {
    form.setFieldsValue(organizationInfo);
    setCurrentStep(0);
  }

  function addCustomRule() {
    setCustomRules((previous) => [...previous, createEmptyCustomRule()]);
    setRuleErrors((previous) => ({
      section: undefined,
      byRule: previous.byRule,
    }));
  }

  function removeCustomRule(ruleId: string) {
    setCustomRules((previous) => previous.filter((item) => item.id !== ruleId));
    clearRuleError(ruleId);
  }

  function patchCustomRule(
    ruleId: string,
    patch: Partial<OrganizationCustomProductRule>
  ) {
    setCustomRules((previous) =>
      previous.map((item) =>
        item.id === ruleId
          ? {
              ...item,
              ...patch,
            }
          : item
      )
    );
  }

  function openFieldModal(ruleId: string) {
    const matchedRule = customRules.find((item) => item.id === ruleId);
    setEditingRuleId(ruleId);
    setDraftFieldKeys(matchedRule?.fieldKeys || []);
    setFieldModalVisible(true);
  }

  function handleFieldModalConfirm() {
    if (!draftFieldKeys.length) {
      Message.error('请至少选择 1 个自定义字段');
      return;
    }

    patchCustomRule(editingRuleId, {
      fieldKeys: draftFieldKeys,
    });
    clearRuleError(editingRuleId, 'fieldKeys');
    setFieldModalVisible(false);
    setEditingRuleId('');
  }

  function handleRuleScopeChange(
    ruleId: string,
    scope: OrganizationCustomRuleScope
  ) {
    patchCustomRule(ruleId, {
      applyScope: scope,
    });
    clearRuleError(ruleId, 'selectedSkuIds');
    clearRuleError(ruleId, 'selectedCategoryPath');
  }

  function openProductSelector(ruleId: string) {
    setActiveProductRuleId(ruleId);
    setSkuModalVisible(true);
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

  function handleProductSelectorConfirm(selectedSkuIds: string[]) {
    if (!activeProductRuleId) {
      setSkuModalVisible(false);
      return;
    }

    patchCustomRule(activeProductRuleId, {
      selectedSkuIds,
    });
    clearRuleError(activeProductRuleId, 'selectedSkuIds');
    setSkuModalVisible(false);
    setActiveProductRuleId('');
  }

  function validateCustomRules() {
    if (!capabilities.customProductInfo) {
      setRuleErrors(buildEmptyRuleErrors());
      return true;
    }

    if (!customRules.length) {
      setRuleErrors({
        section: '请至少新增 1 条自定义商品信息规则',
        byRule: {},
      });
      Message.error('请至少新增 1 条自定义商品信息规则');
      return false;
    }

    const nextErrors: RuleErrorState = {
      section: undefined,
      byRule: {},
    };

    customRules.forEach((rule) => {
      const currentRuleErrors: RuleErrorState['byRule'][string] = {};

      if (!rule.fieldKeys.length) {
        currentRuleErrors.fieldKeys = '请选择自定义字段';
      }

      if (rule.applyScope === 'specificProducts' && !rule.selectedSkuIds.length) {
        currentRuleErrors.selectedSkuIds = '请选择指定商品';
      }

      if (
        rule.applyScope === 'specificCategory' &&
        !rule.selectedCategoryPath.length
      ) {
        currentRuleErrors.selectedCategoryPath = '请选择商品分类';
      }

      if (Object.keys(currentRuleErrors).length) {
        nextErrors.byRule[rule.id] = currentRuleErrors;
      }
    });

    if (Object.keys(nextErrors.byRule).length) {
      setRuleErrors(nextErrors);
      Message.error('请完善自定义商品信息规则');
      return false;
    }

    setRuleErrors(buildEmptyRuleErrors());
    return true;
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
      customProductInfoRules: capabilities.customProductInfo
        ? cloneCustomRules(customRules)
        : [],
      createdAt: editingItem?.createdAt || now,
      updatedAt: now,
    };
  }

  function persistOrganization(
    baseInfo: CreateFormValues,
    options: {
      validateRules: boolean;
      successMessage: string;
    }
  ) {
    if (options.validateRules && !validateCustomRules()) {
      return;
    }

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
    Message.success(options.successMessage);
    history.push(`/enterprise/organization?tab=${pageType}`);
  }

  async function handleSaveBasicInfo() {
    const nextInfo = await syncOrganizationInfoFromForm();
    if (!nextInfo) {
      return;
    }

    if (!validateSelectedStores()) {
      return;
    }

    persistOrganization(nextInfo, {
      validateRules: false,
      successMessage: `${typeLabel}基础信息已更新`,
    });
  }

  function handleSubmit() {
    persistOrganization(organizationInfo, {
      validateRules: true,
      successMessage: isCreateMode ? `${typeLabel}创建成功` : `${typeLabel}组织能力已更新`,
    });
  }

  async function handleSingleStepSubmit() {
    const nextInfo = await syncOrganizationInfoFromForm();
    if (!nextInfo) {
      return;
    }

    if (!validateSelectedStores()) {
      return;
    }

    persistOrganization(nextInfo, {
      validateRules: false,
      successMessage: isCreateMode ? `${typeLabel}创建成功` : `${typeLabel}基础信息已更新`,
    });
  }

  const activeProductRule = customRules.find((item) => item.id === activeProductRuleId);

  if (isEditMode && !editingItem) {
    return null;
  }

  return (
    <div className={styles.page}>
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

      <Card className={styles.stepsCard}>
        <Steps current={currentStep}>
          <Step title={hasCapabilityStep ? '组织信息' : '基础信息'} />
          {hasCapabilityStep && <Step title="组织能力" />}
        </Steps>
      </Card>

      <Card className={styles.formCard}>
        <Form form={form} layout="vertical">
          {currentStep === 0 ? (
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
                label="地址"
                rules={[{ required: true, message: '请输入地址' }]}
              >
                <Input.TextArea
                  autoSize={{ minRows: 3, maxRows: 5 }}
                  placeholder="请输入详细地址"
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
                <Form.Item className={styles.fullWidth} required label="圈选门店">
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
                      圈选门店
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
          ) : (
            <div className={styles.capabilitySections}>
              {CAPABILITY_SECTIONS.map((section) => (
                <Card key={section.title} className={styles.capabilityCard}>
                  <Typography.Title heading={6} className={styles.sectionTitle}>
                    {section.title}
                  </Typography.Title>
                  <div className={styles.capabilityGrid}>
                    {section.items.map((item) => (
                      <div key={item.key} className={styles.capabilityRow}>
                        <div className={styles.capabilityMeta}>
                          <Typography.Text className={styles.capabilityName}>
                            {item.title}
                          </Typography.Text>
                          <Typography.Text
                            type="secondary"
                            className={styles.capabilityDescription}
                          >
                            {item.description}
                          </Typography.Text>
                        </div>
                        <Switch
                          checked={capabilities[item.key]}
                          checkedText="开启"
                          uncheckedText="关闭"
                          onChange={(checked) => updateCapability(item.key, checked)}
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              ))}

              {capabilities.customProductInfo && (
                <Card className={styles.ruleConfigCard}>
                  <div className={styles.ruleConfigHeader}>
                    <div>
                      <Typography.Title heading={6} className={styles.sectionTitle}>
                        规则配置
                      </Typography.Title>
                      <Typography.Paragraph
                        type="secondary"
                        className={styles.ruleConfigDescription}
                      >
                        为当前组织配置可自定义字段范围和适用商品规则。
                      </Typography.Paragraph>
                    </div>
                  </div>

                  {ruleErrors.section && (
                    <Typography.Text className={styles.errorText}>
                      {ruleErrors.section}
                    </Typography.Text>
                  )}

                  <div className={styles.ruleList}>
                    {customRules.map((rule, index) => {
                      const fieldLabels = getCustomFieldLabels(rule.fieldKeys);
                      const ruleError = ruleErrors.byRule[rule.id];
                      const categoryLabel = rule.selectedCategoryPath.length
                        ? getProductOwnershipFullLabel(
                            getProductOwnershipIdFromPath(
                              rule.selectedCategoryPath,
                              ownershipItems
                            ),
                            ownershipItems
                          )
                        : '';
                      const selectedProductSummary = getUniqueProductSummary(
                        rule.selectedSkuIds,
                        skuMetaMap
                      );

                      return (
                        <div key={rule.id} className={styles.ruleBlock}>
                          <div className={styles.ruleBlockHeader}>
                            <Typography.Text className={styles.ruleBlockTitle}>
                              规则{index + 1}
                            </Typography.Text>
                            <Link onClick={() => removeCustomRule(rule.id)}>删除</Link>
                          </div>

                          <div className={styles.ruleBody}>
                            <div className={styles.ruleLine}>
                              <div className={styles.ruleLabel}>
                                <span className={styles.requiredMark}>*</span>
                                自定义字段：
                              </div>
                              <div className={styles.ruleContent}>
                                {fieldLabels.length ? (
                                  <div className={styles.fieldSummary}>
                                    <Typography.Text>
                                      {fieldLabels.join('、')}
                                    </Typography.Text>
                                    <Link onClick={() => openFieldModal(rule.id)}>
                                      重新选择
                                    </Link>
                                  </div>
                                ) : (
                                  <Link onClick={() => openFieldModal(rule.id)}>
                                    选择自定义字段
                                  </Link>
                                )}
                                {ruleError?.fieldKeys && (
                                  <Typography.Text className={styles.errorText}>
                                    {ruleError.fieldKeys}
                                  </Typography.Text>
                                )}
                              </div>
                            </div>

                            <div className={styles.ruleLine}>
                              <div className={styles.ruleLabel}>
                                <span className={styles.requiredMark}>*</span>
                                适用商品：
                              </div>
                              <div className={styles.ruleContent}>
                                <Radio.Group
                                  value={rule.applyScope}
                                  onChange={(value) =>
                                    handleRuleScopeChange(
                                      rule.id,
                                      value as OrganizationCustomRuleScope
                                    )
                                  }
                                >
                                  {RULE_SCOPE_OPTIONS.map((option) => (
                                    <Radio key={option.value} value={option.value}>
                                      {option.label}
                                    </Radio>
                                  ))}
                                </Radio.Group>

                                {rule.applyScope === 'specificProducts' && (
                                  <div className={styles.selectorRow}>
                                    <Button
                                      type="outline"
                                      onClick={() => openProductSelector(rule.id)}
                                    >
                                      选择商品
                                    </Button>
                                    {!!selectedProductSummary.productCount && (
                                      <Typography.Text type="secondary">
                                        已选 {selectedProductSummary.productCount} 个商品 /{' '}
                                        {selectedProductSummary.skuCount} 个 SKU
                                      </Typography.Text>
                                    )}
                                  </div>
                                )}

                                {rule.applyScope === 'specificCategory' && (
                                  <div className={styles.selectorRow}>
                                    <Cascader
                                      allowClear
                                      className={styles.categoryCascader}
                                      options={ownershipOptions}
                                      placeholder="请选择商品分类"
                                      value={
                                        rule.selectedCategoryPath.length
                                          ? rule.selectedCategoryPath
                                          : undefined
                                      }
                                      onChange={(value) => {
                                        patchCustomRule(rule.id, {
                                          selectedCategoryPath: normalizePath(value),
                                        });
                                        clearRuleError(rule.id, 'selectedCategoryPath');
                                      }}
                                    />
                                    {!!categoryLabel && (
                                      <Typography.Text type="secondary">
                                        当前已选：{categoryLabel}
                                      </Typography.Text>
                                    )}
                                  </div>
                                )}

                                {(ruleError?.selectedSkuIds ||
                                  ruleError?.selectedCategoryPath) && (
                                  <Typography.Text className={styles.errorText}>
                                    {ruleError.selectedSkuIds ||
                                      ruleError.selectedCategoryPath}
                                  </Typography.Text>
                                )}

                                <div className={styles.scopeHint}>
                                  选择全部商品表示当前组织所有商品以上字段都可自定义，总部修改商品库不会同步到该组织；
                                  选择指定商品表示所选商品以上字段可自定义，其余商品仍保持跟总部同步。
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className={styles.addRuleRow}>
                    <Link onClick={addCustomRule}>新增规则</Link>
                  </div>
                </Card>
              )}
            </div>
          )}
        </Form>

        <div className={styles.footerActions}>
          {!hasCapabilityStep ? (
            <>
              <Button onClick={handleCancel}>取消</Button>
              <Button type="primary" onClick={handleSingleStepSubmit}>
                {isCreateMode ? '提交' : '保存'}
              </Button>
            </>
          ) : currentStep === 0 ? (
            <>
              <Button onClick={handleCancel}>取消</Button>
              {isEditMode && (
                <Button onClick={handleSaveBasicInfo}>保存</Button>
              )}
              <Button type="primary" onClick={handleNextStep}>
                下一步
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handlePrevStep}>上一步</Button>
              <Button onClick={handleCancel}>取消</Button>
              <Button type="primary" onClick={handleSubmit}>
                {isCreateMode ? '提交' : '保存'}
              </Button>
            </>
          )}
        </div>
      </Card>

      <CouponStoreSelector
        visible={storeModalVisible}
        title="圈选门店"
        entityLabel="门店"
        allowedStoreTypes={['store']}
        selectedStoreIds={normalizedSelectedStoreIds}
        onCancel={() => setStoreModalVisible(false)}
        onConfirm={handleStoreModalConfirm}
      />

      <Modal
        title="选择自定义字段"
        visible={fieldModalVisible}
        onOk={handleFieldModalConfirm}
        onCancel={() => {
          setFieldModalVisible(false);
          setEditingRuleId('');
        }}
      >
        <div className={styles.fieldModalContent}>
          <div className={styles.fieldModalTip}>
            <IconInfoCircleFill className={styles.fieldModalTipIcon} />
            <div>
              勾选，表示组织可以自定义以下信息，总部修改所选信息不会同步到该组织
              <br />
              取消勾选，表示组织不可自定义以下信息，总部修改所选信息会同步到该组织
            </div>
          </div>

          <div className={styles.fieldOptionRow}>
            <div className={styles.ruleLabel}>自定义字段：</div>
            <Checkbox.Group
              value={draftFieldKeys}
              onChange={(value) =>
                setDraftFieldKeys(value as OrganizationCustomFieldKey[])
              }
            >
              <Space wrap size={24}>
                {CUSTOM_FIELD_OPTIONS.map((item) => (
                  <Checkbox key={item.key} value={item.key}>
                    <span className={styles.fieldCheckboxLabel}>
                      {item.label}
                      {item.tooltip && (
                        <Tooltip content={item.tooltip}>
                          <IconQuestionCircle className={styles.fieldHelpIcon} />
                        </Tooltip>
                      )}
                    </span>
                  </Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          </div>
        </div>
      </Modal>

      <MarketingProductSelector
        visible={skuModalVisible}
        title="选择商品"
        selectedSkuIds={activeProductRule?.selectedSkuIds || []}
        data={selectorSpuData}
        onCancel={() => {
          setSkuModalVisible(false);
          setActiveProductRuleId('');
        }}
        onConfirm={handleProductSelectorConfirm}
      />
    </div>
  );
}

function EnterpriseOrganizationCreatePage() {
  return <EnterpriseOrganizationFormPage mode="create" />;
}

export default EnterpriseOrganizationCreatePage;
