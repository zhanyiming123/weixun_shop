import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Cascader,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Message,
  Radio,
  Select,
  Space,
  Tag,
  Typography,
} from '@arco-design/web-react';
import { IconShareAlt, IconShareInternal } from '@arco-design/web-react/icon';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import styles from './index.module.less';
import {
  buildCouponFormValuesFromRecord,
  buildMarketingProductSelectorSpus,
  buildCreateValuesFromCoupon,
  COUPON_DISCOUNT_OPTIONS,
  CouponDetailRecord,
  CouponDiscountType,
  CouponFormValues,
  CouponOwnershipScope,
  CouponPageMode,
  CouponProductScope,
  CouponValidityType,
  DEFAULT_COUPON_FORM_VALUES,
  isAllCouponStoresSelected,
  normalizeCouponStoreIds,
  PRODUCT_SCOPE_OPTIONS,
  readCouponById,
  updateCouponById,
  VALIDITY_TYPE_OPTIONS,
} from '../data';
import {
  buildProductCatalogCascaderOptions,
  buildProductCatalogLeafItems,
  ProductCatalogLeafItem,
  readProductCatalogItems,
} from '@/pages/product/catalog/data';
import {
  getEnabledAttributesByCatalogId,
  ProductCatalogAttributeItem,
  readProductCatalogAttributes,
} from '@/pages/product/attribute/data';
import {
  buildProductOwnershipCascaderOptions,
  buildProductOwnershipLeafItems,
  readProductOwnershipItems,
} from '@/pages/product/category/data';
import { readProductStoreItems } from '@/pages/product/store-config/data';
import { GlobalState } from '@/store';
import MarketingProductSelector from '../../components/product-selector';
import CouponStoreSelector from '../../components/store-selector';

const Option = Select.Option;
const RangePicker = DatePicker.RangePicker;

type CouponFormPageProps = {
  mode?: CouponPageMode;
};

type CouponErrorKey =
  | 'discountConfig'
  | 'storeIds'
  | 'productScope'
  | 'conditionCategoryPaths'
  | 'selectedSkuIds'
  | 'name'
  | 'couponQuantity'
  | 'receiveTimeRange'
  | 'validityConfig';

type CouponFormErrors = Partial<Record<CouponErrorKey, string>>;

function createDefaultFormValues(): CouponFormValues {
  return {
    ...DEFAULT_COUPON_FORM_VALUES,
    storeIds: [],
    conditionCategoryPaths: [],
    conditionOwnershipSelections: [],
    selectedSkuIds: [],
    receiveTimeRange: [],
    customUseTimeRange: [],
  };
}

function normalizeCascaderMultipleValues(
  value: Array<string | string[]> | undefined
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string[] => Array.isArray(item));
}

function getPathKey(path: string[]) {
  return path.join('__');
}

function isPathPrefix(prefix: string[], target: string[]) {
  return prefix.every((value, index) => target[index] === value);
}

const FORM_CONFIG_ITEM_OFFSET_STYLE: React.CSSProperties = {
  marginLeft: 24,
};

type CouponConditionSelection = CouponFormValues['conditionOwnershipSelections'][number];
type ConditionSpecOption = {
  label: string;
  value: string;
  values: string[];
};

function createEmptyConditionSelection(catalogPath: string[]): CouponConditionSelection {
  return {
    catalogPath: [...catalogPath],
    ownershipPaths: [],
  };
}

function hasConditionSelectionContent(selection: CouponConditionSelection) {
  return Boolean(
    selection.ownershipPaths.length || selection.specAttributeId || selection.specValue
  );
}

function buildConditionSpecOptions(
  catalogPath: string[],
  catalogLeafItems: ProductCatalogLeafItem[],
  catalogAttributes: ProductCatalogAttributeItem[]
): ConditionSpecOption[] {
  const matchedCatalogLeaves = catalogLeafItems.filter((item) =>
    isPathPrefix(catalogPath, item.path)
  );

  if (!matchedCatalogLeaves.length) {
    return [];
  }

  const shouldAppendCatalogLabel = matchedCatalogLeaves.length > 1;

  return matchedCatalogLeaves.flatMap((catalogItem) =>
    getEnabledAttributesByCatalogId(catalogAttributes, catalogItem.id)
      .filter(
        (attribute) =>
          (attribute.type === 'single' || attribute.type === 'multi') &&
          attribute.name === '班型'
      )
      .map((attribute) => ({
        label: shouldAppendCatalogLabel
          ? `${attribute.name}（${catalogItem.label}）`
          : attribute.name,
        value: attribute.id,
        values: [...attribute.values],
      }))
  );
}

function sanitizeConditionSelection(
  selection: CouponConditionSelection,
  specOptions: ConditionSpecOption[]
): CouponConditionSelection {
  const matchedSpecOption = specOptions.find(
    (item) => item.value === selection.specAttributeId
  );

  return {
    ...selection,
    specAttributeId: matchedSpecOption?.value,
    specValue:
      matchedSpecOption &&
        selection.specValue &&
        matchedSpecOption.values.includes(selection.specValue)
        ? selection.specValue
        : undefined,
  };
}

export function CouponFormPage({ mode = 'create' }: CouponFormPageProps) {
  const history = useHistory();
  const location = useLocation();
  const currentOrganization = useSelector(
    (state: GlobalState) => state.currentOrganization
  );
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const sourceId = query.get('sourceId')?.trim() || '';
  const couponId = query.get('id')?.trim() || '';
  const visibleStoreIds =
    currentOrganization?.scope === 'headquarter'
      ? undefined
      : currentOrganization?.storeIds || [];

  const catalogItems = useMemo(() => readProductCatalogItems(), []);
  const couponCategories = useMemo(
    () => buildProductCatalogLeafItems(catalogItems),
    [catalogItems]
  );
  const catalogAttributes = useMemo(() => readProductCatalogAttributes(), []);
  const ownershipItems = useMemo(() => readProductOwnershipItems(), []);
  const storeItems = useMemo(() => readProductStoreItems(), []);
  const ownershipLeafItems = useMemo(
    () => buildProductOwnershipLeafItems(ownershipItems),
    [ownershipItems]
  );
  const couponCatalogOptions = useMemo(
    () => buildProductCatalogCascaderOptions(catalogItems),
    [catalogItems]
  );
  const couponOwnershipOptions = useMemo(
    () => buildProductOwnershipCascaderOptions(ownershipItems),
    [ownershipItems]
  );
  const selectorSpuData = useMemo(
    () =>
      buildMarketingProductSelectorSpus(
        couponCategories,
        ownershipLeafItems,
        visibleStoreIds
      ),
    [couponCategories, ownershipLeafItems, visibleStoreIds]
  );
  const [formValues, setFormValues] = useState<CouponFormValues>(createDefaultFormValues);
  const [loadedRecord, setLoadedRecord] = useState<CouponDetailRecord | null>(null);

  // 根据当前可见门店计算该券的归属类型（仅详情模式下有意义）
  const couponOwnershipScope = useMemo((): CouponOwnershipScope | null => {
    if (!loadedRecord) return null;
    const visibleSet = visibleStoreIds ? new Set(visibleStoreIds) : null;
    // 总部视角（visibleSet 为 null）或创建者门店在可见范围内 → 本店创建
    if (!visibleSet || visibleSet.has(loadedRecord.ownershipStoreId)) {
      return loadedRecord.sharedToStoreIds.length > 0 ? 'shared_out' : 'own';
    }
    return 'shared_in';
  }, [loadedRecord, visibleStoreIds]);

  // 已分享门店的名称映射（用于详情展示）
  const storeNameMap = useMemo(
    () => new Map(storeItems.map((s) => [s.id, s.name])),
    [storeItems]
  );

  const conditionOwnershipSections = useMemo(
    () =>
      formValues.conditionCategoryPaths.map((catalogPath) => {
        const matchedCatalogLeaves = couponCategories.filter((item) =>
          isPathPrefix(catalogPath, item.path)
        );
        const labelPath =
          matchedCatalogLeaves[0]?.labelPath.slice(0, catalogPath.length) || catalogPath;

        return {
          key: getPathKey(catalogPath),
          catalogPath,
          labelPath,
          specOptions: buildConditionSpecOptions(
            catalogPath,
            couponCategories,
            catalogAttributes
          ),
        };
      }),
    [catalogAttributes, couponCategories, formValues.conditionCategoryPaths]
  );

  const [formErrors, setFormErrors] = useState<CouponFormErrors>({});
  const [skuModalVisible, setSkuModalVisible] = useState(false);
  const [storeModalVisible, setStoreModalVisible] = useState(false);

  const isCreateMode = mode === 'create';
  const isEditMode = mode === 'edit';
  const isDetailMode = mode === 'detail';
  const canEditCoupon = isCreateMode || isEditMode;

  useEffect(() => {
    if (isCreateMode) {
      if (!sourceId) {
        setFormValues(createDefaultFormValues());
        setLoadedRecord(null);
        setFormErrors({});
        return;
      }
      const sourceValues = buildCreateValuesFromCoupon(sourceId, visibleStoreIds);
      if (!sourceValues) {
        Message.error('复制来源优惠券不存在');
        history.replace('/marketing/center/coupon/list');
        return;
      }
      setFormValues(sourceValues);
      setLoadedRecord(null);
      setFormErrors({});
      return;
    }

    if (!couponId) {
      Message.error('缺少优惠券 ID');
      history.replace('/marketing/center/coupon/list');
      return;
    }

    const record = readCouponById(couponId, visibleStoreIds);
    if (!record) {
      Message.error('优惠券不存在或已删除');
      history.replace('/marketing/center/coupon/list');
      return;
    }

    const isOwner =
      typeof visibleStoreIds === 'undefined' ||
      visibleStoreIds.includes(record.ownershipStoreId);
    if (isEditMode && !isOwner) {
      history.replace(`/marketing/center/coupon/detail?id=${record.id}`);
      return;
    }

    setFormValues(buildCouponFormValuesFromRecord(record));
    setLoadedRecord(record);
    setFormErrors({});
  }, [couponId, history, isCreateMode, isEditMode, sourceId, visibleStoreIds]);

  const selectedSkuCount = formValues.selectedSkuIds.length;
  const selectedStoreIds = useMemo(
    () =>
      normalizeCouponStoreIds(
        formValues.storeIds,
        storeItems.map((item) => item.id)
      ),
    [formValues.storeIds, storeItems]
  );
  const selectedStoreNames = useMemo(() => {
    const nameMap = new Map(storeItems.map((item) => [item.id, item.name]));

    return selectedStoreIds
      .map((item) => nameMap.get(item))
      .filter((item): item is string => Boolean(item));
  }, [selectedStoreIds, storeItems]);
  const storeSummaryTitle = useMemo(() => {
    if (!selectedStoreIds.length) {
      return '未选择门店';
    }

    return isAllCouponStoresSelected(
      selectedStoreIds,
      storeItems.map((item) => item.id)
    )
      ? '全部门店'
      : `已选 ${selectedStoreIds.length} 家门店`;
  }, [selectedStoreIds, storeItems]);
  const storeSummaryDescription = useMemo(() => {
    if (!selectedStoreIds.length) {
      return '点击右侧按钮选择优惠券可使用的门店';
    }

    if (
      isAllCouponStoresSelected(
        selectedStoreIds,
        storeItems.map((item) => item.id)
      )
    ) {
      return `当前共覆盖 ${storeItems.length} 家门店`;
    }

    return selectedStoreNames.join('、');
  }, [selectedStoreIds, selectedStoreNames, storeItems]);

  function patchFormValues(patch: Partial<CouponFormValues>) {
    setFormValues((previous) => ({
      ...previous,
      ...patch,
    }));
  }

  function clearErrors(...keys: CouponErrorKey[]) {
    if (!keys.length) {
      return;
    }

    setFormErrors((previous) => {
      const next = { ...previous };
      keys.forEach((key) => {
        delete next[key];
      });
      return next;
    });
  }

  function updateConditionSelection(
    catalogPath: string[],
    updater: (selection: CouponConditionSelection) => CouponConditionSelection
  ) {
    setFormValues((previous) => {
      const targetPathKey = getPathKey(catalogPath);
      const currentSelection =
        previous.conditionOwnershipSelections.find(
          (item) => getPathKey(item.catalogPath) === targetPathKey
        ) || createEmptyConditionSelection(catalogPath);
      const nextSelections = previous.conditionOwnershipSelections.filter(
        (item) => getPathKey(item.catalogPath) !== targetPathKey
      );
      const nextSelection = updater(currentSelection);

      if (hasConditionSelectionContent(nextSelection)) {
        nextSelections.push(nextSelection);
      }

      nextSelections.sort((left, right) => {
        const leftIndex = previous.conditionCategoryPaths.findIndex(
          (path) => getPathKey(path) === getPathKey(left.catalogPath)
        );
        const rightIndex = previous.conditionCategoryPaths.findIndex(
          (path) => getPathKey(path) === getPathKey(right.catalogPath)
        );

        return leftIndex - rightIndex;
      });

      return {
        ...previous,
        conditionOwnershipSelections: nextSelections,
      };
    });
  }

  function handleDiscountTypeChange(value: string) {
    if (!canEditCoupon) {
      return;
    }

    patchFormValues({
      discountType: value as CouponDiscountType,
      fullReductionThreshold: undefined,
      fullReductionAmount: undefined,
      directReductionAmount: undefined,
      discountRate: undefined,
    });
    clearErrors('discountConfig');
  }

  function handleProductScopeChange(value: string) {
    if (!canEditCoupon) {
      return;
    }

    const nextScope = value as CouponProductScope;
    patchFormValues({
      productScope: nextScope,
    });
    clearErrors('productScope', 'conditionCategoryPaths', 'selectedSkuIds');
  }

  function handleConditionCategoryChange(
    value: Array<string | string[]> | undefined
  ) {
    if (!canEditCoupon) {
      return;
    }

    const nextCategoryPaths = normalizeCascaderMultipleValues(value);
    const nextCategoryPathKeys = new Set(nextCategoryPaths.map(getPathKey));

    setFormValues((previous) => ({
      ...previous,
      conditionCategoryPaths: nextCategoryPaths,
      conditionOwnershipSelections: previous.conditionOwnershipSelections
        .filter((item) => nextCategoryPathKeys.has(getPathKey(item.catalogPath)))
        .map((item) => {
          const nextCatalogPath =
            nextCategoryPaths.find(
              (path) => getPathKey(path) === getPathKey(item.catalogPath)
            ) || item.catalogPath;

          return sanitizeConditionSelection(
            {
              ...item,
              catalogPath: nextCatalogPath,
            },
            buildConditionSpecOptions(
              nextCatalogPath,
              couponCategories,
              catalogAttributes
            )
          );
        })
        .filter(hasConditionSelectionContent),
    }));
    clearErrors('conditionCategoryPaths');
  }

  function handleConditionOwnershipChange(
    catalogPath: string[],
    value: Array<string | string[]> | undefined
  ) {
    if (!canEditCoupon) {
      return;
    }

    const nextOwnershipPaths = normalizeCascaderMultipleValues(value);
    updateConditionSelection(catalogPath, (currentSelection) => ({
      ...currentSelection,
      catalogPath: [...catalogPath],
      ownershipPaths: nextOwnershipPaths,
    }));
  }

  function handleConditionSpecAttributeChange(
    catalogPath: string[],
    value: string | undefined
  ) {
    if (!canEditCoupon) {
      return;
    }

    const specOptions = buildConditionSpecOptions(
      catalogPath,
      couponCategories,
      catalogAttributes
    );

    updateConditionSelection(catalogPath, (currentSelection) => {
      const matchedSpecOption = specOptions.find((item) => item.value === value);

      return {
        ...currentSelection,
        catalogPath: [...catalogPath],
        specAttributeId: matchedSpecOption?.value,
        specValue:
          matchedSpecOption &&
            currentSelection.specValue &&
            matchedSpecOption.values.includes(currentSelection.specValue)
            ? currentSelection.specValue
            : undefined,
      };
    });
  }

  function handleConditionSpecValueChange(
    catalogPath: string[],
    value: string | undefined
  ) {
    if (!canEditCoupon) {
      return;
    }

    updateConditionSelection(catalogPath, (currentSelection) => {
      const specOptions = buildConditionSpecOptions(
        catalogPath,
        couponCategories,
        catalogAttributes
      );
      const matchedSpecOption = specOptions.find(
        (item) => item.value === currentSelection.specAttributeId
      );

      return {
        ...currentSelection,
        catalogPath: [...catalogPath],
        specValue:
          matchedSpecOption &&
            value &&
            matchedSpecOption.values.includes(value)
            ? value
            : undefined,
      };
    });
  }

  function getConditionSelection(catalogPath: string[]) {
    return formValues.conditionOwnershipSelections.find(
      (item) => getPathKey(item.catalogPath) === getPathKey(catalogPath)
    );
  }

  function handleReceiveTimeChange(dateString: string[]) {
    if (!canEditCoupon) {
      return;
    }

    patchFormValues({
      receiveTimeRange:
        Array.isArray(dateString) && dateString[0] && dateString[1]
          ? [dateString[0], dateString[1]]
          : [],
    });
    clearErrors('receiveTimeRange');
  }

  function handleValidityTypeChange(value: string) {
    if (!canEditCoupon) {
      return;
    }

    patchFormValues({
      validityType: value as CouponValidityType,
      customUseTimeRange: [],
      validDays:
        value === 'afterReceiveDays'
          ? formValues.validDays || 1
          : formValues.validDays,
    });
    clearErrors('validityConfig');
  }

  function handleCustomUseTimeChange(dateString: string[]) {
    if (!canEditCoupon) {
      return;
    }

    patchFormValues({
      customUseTimeRange:
        Array.isArray(dateString) && dateString[0] && dateString[1]
          ? [dateString[0], dateString[1]]
          : [],
    });
    clearErrors('validityConfig');
  }

  function updateNumberField(
    field:
      | 'fullReductionThreshold'
      | 'fullReductionAmount'
      | 'directReductionAmount'
      | 'discountRate'
      | 'issueCount'
      | 'limitPerUser'
      | 'validDays',
    value: number | undefined
  ) {
    if (!canEditCoupon) {
      return;
    }

    patchFormValues({
      [field]: typeof value === 'number' ? value : undefined,
    } as Partial<CouponFormValues>);

    if (
      field === 'fullReductionThreshold' ||
      field === 'fullReductionAmount' ||
      field === 'directReductionAmount' ||
      field === 'discountRate'
    ) {
      clearErrors('discountConfig');
    }

    if (field === 'issueCount' || field === 'limitPerUser') {
      clearErrors('couponQuantity');
    }

    if (field === 'validDays') {
      clearErrors('validityConfig');
    }
  }

  function openSelectSkuModal() {
    if (!canEditCoupon) {
      return;
    }
    setSkuModalVisible(true);
  }

  function openStoreModal() {
    setStoreModalVisible(true);
  }

  function handleStoreModalConfirm(nextStoreIds: string[]) {
    patchFormValues({
      storeIds: normalizeCouponStoreIds(
        nextStoreIds,
        storeItems.map((item) => item.id)
      ),
    });
    clearErrors('storeIds');
    setStoreModalVisible(false);
  }

  function openReadonlySkuModal() {
    setSkuModalVisible(true);
  }

  function handleSkuModalConfirm(selectedSkuIds: string[]) {
    if (!canEditCoupon) {
      setSkuModalVisible(false);
      return;
    }

    patchFormValues({
      selectedSkuIds,
    });
    clearErrors('selectedSkuIds');
    setSkuModalVisible(false);
  }

  function validateCreateForm() {
    const errors: CouponFormErrors = {};

    if (formValues.discountType === 'fullReduction') {
      if (
        !formValues.fullReductionThreshold ||
        formValues.fullReductionThreshold <= 0 ||
        !formValues.fullReductionAmount ||
        formValues.fullReductionAmount <= 0
      ) {
        errors.discountConfig = '请填写正确的满减规则';
      }
    }

    if (formValues.discountType === 'directReduction') {
      if (
        !formValues.directReductionAmount ||
        formValues.directReductionAmount <= 0
      ) {
        errors.discountConfig = '请填写正确的直减金额';
      }
    }

    if (formValues.discountType === 'discount') {
      if (
        !formValues.discountRate ||
        formValues.discountRate <= 0 ||
        formValues.discountRate >= 10
      ) {
        errors.discountConfig = '请填写 0-10 之间的折扣值';
      }
    }

    if (!formValues.storeIds.length) {
      errors.storeIds = '请选择适用门店';
    }

    if (!formValues.productScope) {
      errors.productScope = '请选择商品范围';
    }

    if (
      formValues.productScope === 'condition' &&
      !formValues.conditionCategoryPaths.length
    ) {
      errors.conditionCategoryPaths = '请至少选择一个类目';
    }

    if (formValues.productScope === 'specific' && !formValues.selectedSkuIds.length) {
      errors.selectedSkuIds = '请选择至少 1 个 SKU';
    }

    const trimmedName = formValues.name.trim();

    if (!trimmedName) {
      errors.name = '请输入券名称';
    } else if (trimmedName.length > 15) {
      errors.name = '券名称支持 15 个字以内';
    }

    if (
      !formValues.issueCount ||
      formValues.issueCount <= 0 ||
      !formValues.limitPerUser ||
      formValues.limitPerUser <= 0
    ) {
      errors.couponQuantity = '请填写正确的发放张数和每人限领数量';
    }

    if (formValues.receiveTimeRange.length !== 2) {
      errors.receiveTimeRange = '请选择领取时间';
    }

    if (formValues.validityType === 'afterReceiveDays') {
      if (!formValues.validDays || formValues.validDays <= 0) {
        errors.validityConfig = '请填写领取后有效天数';
      }
    }

    if (formValues.validityType === 'custom') {
      if (formValues.customUseTimeRange.length !== 2) {
        errors.validityConfig = '请选择自定义使用时间';
      }
    }

    return errors;
  }

  function handleSubmit() {
    if (isDetailMode) {
      return;
    }

    const nextErrors = validateCreateForm();
    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      Message.error(isEditMode ? '请完善必填项后再保存' : '请完善必填项后再创建');
      return;
    }

    if (isEditMode) {
      if (!couponId) {
        Message.error('缺少优惠券 ID');
        return;
      }
      const updated = updateCouponById(couponId, formValues);
      if (!updated) {
        Message.error('优惠券不存在或已删除');
        return;
      }
      Message.success('保存成功');
      history.push('/marketing/center/coupon/list');
      return;
    }

    Message.success('创建成功');
    history.push('/marketing/center/coupon/list');
  }

  const pageTitle = isCreateMode
    ? '创建优惠券'
    : isEditMode
      ? '修改优惠券'
      : '优惠券详情';
  const primaryButtonText = isEditMode ? '保存' : '创建';

  return (
    <div className={styles.page}>
      <Typography.Title className={styles.pageTitle} heading={4}>
        {pageTitle}
      </Typography.Title>

      <Card className={styles.formCard}>
        <Form
          className={styles.couponForm}
          labelCol={{ span: 3 }}
          wrapperCol={{ span: 21 }}
        >
          {/* 分享/来源信息 - 仅在详情模式且有分享属性时展示 */}
          {isDetailMode && loadedRecord && couponOwnershipScope && couponOwnershipScope !== 'own' && (
            <div className={styles.sectionBlock}>
              <Typography.Title className={styles.sectionTitle} heading={5}>
                {couponOwnershipScope === 'shared_in' ? '券来源' : '分享信息'}
              </Typography.Title>

              {couponOwnershipScope === 'shared_in' && (
                <Form.Item label="来源门店">
                  <Space>
                    <IconShareInternal style={{ color: 'var(--color-success-6)' }} />
                    <Typography.Text>
                      {storeNameMap.get(loadedRecord.ownershipStoreId) || loadedRecord.ownershipStoreId}
                    </Typography.Text>
                    <Tag color="green" size="small">接收分享</Tag>
                  </Space>
                  <div style={{ marginTop: 4 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      此券由来源门店统一管理，本店无法修改内容。
                    </Typography.Text>
                  </div>
                </Form.Item>
              )}

              {couponOwnershipScope === 'shared_out' && (
                <Form.Item label="已分享至">
                  <Space wrap>
                    <IconShareAlt style={{ color: 'var(--color-primary-6)' }} />
                    {loadedRecord.sharedToStoreIds.map((storeId) => (
                      <Tag key={storeId} color="arcoblue" size="small">
                        {storeNameMap.get(storeId) || storeId}
                      </Tag>
                    ))}
                  </Space>
                </Form.Item>
              )}

              <Form.Item label="配额说明">
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  全局发行量 {loadedRecord.issueCount} 张&nbsp;·&nbsp;
                  全局已领取 {loadedRecord.receivedCount} 张&nbsp;·&nbsp;
                  本店已领取 {loadedRecord.localReceivedCount} 张
                </Typography.Text>
              </Form.Item>
            </div>
          )}

          <div className={styles.sectionBlock}>
            <Typography.Title className={styles.sectionTitle} heading={5}>
              优惠信息
            </Typography.Title>

            <Form.Item required label="优惠方式">
              <div className={styles.inlineField}>
                <Select
                  className={styles.discountTypeSelect}
                  value={formValues.discountType}
                  disabled={!canEditCoupon}
                  onChange={handleDiscountTypeChange}
                >
                  {COUPON_DISCOUNT_OPTIONS.map((item) => (
                    <Option key={item.value} value={item.value}>
                      {item.label}
                    </Option>
                  ))}
                </Select>

                {formValues.discountType === 'fullReduction' && (
                  <>
                    <span className={styles.inlineText}>满</span>
                    <InputNumber
                      className={styles.moneyInput}
                      min={0}
                      precision={2}
                      placeholder="0.00"
                      disabled={!canEditCoupon}
                      value={formValues.fullReductionThreshold}
                      onChange={(value) =>
                        updateNumberField(
                          'fullReductionThreshold',
                          typeof value === 'number' ? value : undefined
                        )
                      }
                    />
                    <span className={styles.inlineUnit}>元</span>
                    <span className={styles.inlineText}>减</span>
                    <InputNumber
                      className={styles.moneyInput}
                      min={0}
                      precision={2}
                      placeholder="0.00"
                      disabled={!canEditCoupon}
                      value={formValues.fullReductionAmount}
                      onChange={(value) =>
                        updateNumberField(
                          'fullReductionAmount',
                          typeof value === 'number' ? value : undefined
                        )
                      }
                    />
                    <span className={styles.inlineUnit}>元</span>
                  </>
                )}

                {formValues.discountType === 'directReduction' && (
                  <>
                    <span className={styles.inlineText}>立减</span>
                    <InputNumber
                      className={styles.moneyInput}
                      min={0}
                      precision={2}
                      placeholder="0.00"
                      disabled={!canEditCoupon}
                      value={formValues.directReductionAmount}
                      onChange={(value) =>
                        updateNumberField(
                          'directReductionAmount',
                          typeof value === 'number' ? value : undefined
                        )
                      }
                    />
                    <span className={styles.inlineUnit}>元</span>
                  </>
                )}

                {formValues.discountType === 'discount' && (
                  <>
                    <span className={styles.inlineText}>打</span>
                    <InputNumber
                      className={styles.discountInput}
                      min={0}
                      max={9.9}
                      precision={1}
                      placeholder="8.5"
                      disabled={!canEditCoupon}
                      value={formValues.discountRate}
                      onChange={(value) =>
                        updateNumberField(
                          'discountRate',
                          typeof value === 'number' ? value : undefined
                        )
                      }
                    />
                    <span className={styles.inlineText}>折</span>
                  </>
                )}
              </div>
              {formErrors.discountConfig && (
                <div className={styles.fieldError}>{formErrors.discountConfig}</div>
              )}
            </Form.Item>

            <Form.Item required label="适用门店">
              <div className={styles.storeSelectorTrigger}>
                <div className={styles.storeSelectorSummary}>
                  <div
                    className={`${styles.storeSelectorTitle} ${selectedStoreIds.length ? '' : styles.storeSelectorTitleEmpty
                      }`}
                  >
                    {storeSummaryTitle}
                  </div>
                  <div className={styles.storeSelectorDescription}>
                    {storeSummaryDescription}
                  </div>
                </div>

                <Button type="outline" onClick={openStoreModal}>
                  {canEditCoupon ? '选择门店' : '查看门店'}
                </Button>
              </div>
              {formErrors.storeIds && (
                <div className={styles.fieldError}>{formErrors.storeIds}</div>
              )}
            </Form.Item>

            <Form.Item required label="选择商品">
              <div className={styles.scopeBlock}>
                <Radio.Group
                  value={formValues.productScope}
                  disabled={!canEditCoupon}
                  onChange={handleProductScopeChange}
                >
                  {PRODUCT_SCOPE_OPTIONS.map((item) => (
                    <Radio key={item.value} value={item.value}>
                      {item.label}
                    </Radio>
                  ))}
                </Radio.Group>

                {formValues.productScope === 'condition' && (
                  <div
                    className={styles.conditionScopePanel}
                    style={FORM_CONFIG_ITEM_OFFSET_STYLE}
                  >
                    <div className={styles.conditionFieldItem}>
                      <span className={styles.conditionFieldLabel}>商品类目</span>
                      <Cascader
                        mode="multiple"
                        allowClear
                        checkedStrategy="parent"
                        expandTrigger="hover"
                        className={styles.orgCascader}
                        placeholder="请选择适用的商品类目（可多选）"
                        options={couponCatalogOptions}
                        showSearch={{ retainInputValueWhileSelect: true }}
                        disabled={!canEditCoupon}
                        value={formValues.conditionCategoryPaths}
                        onChange={handleConditionCategoryChange}
                      />
                    </div>

                    {conditionOwnershipSections.length > 0 && (
                      <div className={styles.conditionFieldItem}>
                        <span className={styles.conditionFieldLabel}>商品分类</span>
                        <div className={styles.conditionFields}>
                          {conditionOwnershipSections.map((section) => {
                            const conditionSelection = getConditionSelection(
                              section.catalogPath
                            );
                            const selectedSpecOption = section.specOptions.find(
                              (item) =>
                                item.value === conditionSelection?.specAttributeId
                            );

                            return (
                              <div key={section.key} className={styles.categorySection}>
                                <div className={styles.categorySectionHeader}>
                                  <Typography.Text>
                                    {section.labelPath.join(' / ')}
                                  </Typography.Text>
                                </div>

                                <div className={styles.categorySectionFilters}>
                                  <div className={styles.categorySectionField}>
                                    <span className={styles.categorySectionFieldLabel}>
                                      商品分类
                                    </span>
                                    <Cascader
                                      mode="multiple"
                                      allowClear
                                      checkedStrategy="parent"
                                      expandTrigger="hover"
                                      className={styles.categorySelect}
                                      placeholder="请选择商品分类（可多选）"
                                      options={couponOwnershipOptions}
                                      showSearch={{ retainInputValueWhileSelect: true }}
                                      disabled={
                                        !canEditCoupon || !couponOwnershipOptions.length
                                      }
                                      value={conditionSelection?.ownershipPaths || []}
                                      onChange={(value) =>
                                        handleConditionOwnershipChange(
                                          section.catalogPath,
                                          value
                                        )
                                      }
                                    />
                                  </div>

                                  <div className={styles.categorySectionField}>
                                    <span className={styles.categorySectionFieldLabel}>
                                      规格项
                                    </span>
                                    <Select
                                      allowClear
                                      className={styles.specSelect}
                                      placeholder={
                                        section.specOptions.length
                                          ? '请选择规格项'
                                          : '当前类目暂无规格项'
                                      }
                                      disabled={
                                        !canEditCoupon || !section.specOptions.length
                                      }
                                      value={conditionSelection?.specAttributeId}
                                      onChange={(value) =>
                                        handleConditionSpecAttributeChange(
                                          section.catalogPath,
                                          typeof value === 'string'
                                            ? value
                                            : undefined
                                        )
                                      }
                                    >
                                      {section.specOptions.map((item) => (
                                        <Option key={item.value} value={item.value}>
                                          {item.label}
                                        </Option>
                                      ))}
                                    </Select>
                                  </div>

                                  <div className={styles.categorySectionField}>
                                    <span className={styles.categorySectionFieldLabel}>
                                      规格值
                                    </span>
                                    <Select
                                      allowClear
                                      className={styles.specSelect}
                                      placeholder={
                                        selectedSpecOption
                                          ? '请选择规格值'
                                          : '请先选择规格项'
                                      }
                                      disabled={!canEditCoupon || !selectedSpecOption}
                                      value={conditionSelection?.specValue}
                                      onChange={(value) =>
                                        handleConditionSpecValueChange(
                                          section.catalogPath,
                                          typeof value === 'string'
                                            ? value
                                            : undefined
                                        )
                                      }
                                    >
                                      {(selectedSpecOption?.values || []).map((item) => (
                                        <Option key={item} value={item}>
                                          {item}
                                        </Option>
                                      ))}
                                    </Select>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {formValues.productScope === 'specific' && (
                  <div
                    className={styles.scopeActionRow}
                    style={FORM_CONFIG_ITEM_OFFSET_STYLE}
                  >
                    {canEditCoupon && (
                      <Button type="outline" onClick={openSelectSkuModal}>
                        选择商品
                      </Button>
                    )}

                    {!canEditCoupon && (
                      <Button
                        type="outline"
                        disabled={!selectedSkuCount}
                        onClick={openReadonlySkuModal}
                      >
                        查看商品
                      </Button>
                    )}

                    <Typography.Text type="secondary">
                      {selectedSkuCount
                        ? `已选 ${selectedSkuCount} 个 SKU`
                        : '暂未选择 SKU'}
                    </Typography.Text>
                  </div>
                )}
              </div>
              {(formErrors.productScope ||
                formErrors.conditionCategoryPaths ||
                formErrors.selectedSkuIds) && (
                  <div className={styles.fieldError}>
                    {formErrors.productScope ||
                      formErrors.conditionCategoryPaths ||
                      formErrors.selectedSkuIds}
                  </div>
                )}
            </Form.Item>
          </div>

          <Divider className={styles.sectionDivider} />

          <div className={styles.sectionBlock}>
            <Typography.Title className={styles.sectionTitle} heading={5}>
              基础信息
            </Typography.Title>

            <Form.Item required label="名称">
              <Input
                className={styles.formControl}
                placeholder="请输入券名称"
                maxLength={15}
                showWordLimit
                disabled={!canEditCoupon}
                value={formValues.name}
                onChange={(value) => {
                  if (!canEditCoupon) {
                    return;
                  }
                  patchFormValues({ name: value });
                  clearErrors('name');
                }}
              />
              {formErrors.name && <div className={styles.fieldError}>{formErrors.name}</div>}
            </Form.Item>

            <Form.Item required label="券数量">
              <div className={styles.inlineField}>
                <span className={styles.inlineText}>发放张数</span>
                <InputNumber
                  className={styles.countInput}
                  min={0}
                  precision={0}
                  disabled={isDetailMode}
                  value={formValues.issueCount}
                  onChange={(value) =>
                    updateNumberField(
                      'issueCount',
                      typeof value === 'number' ? value : undefined
                    )
                  }
                />
                <span className={styles.inlineUnit}>张</span>
                <span className={styles.inlineText}>每人限领</span>
                <InputNumber
                  className={styles.countInput}
                  min={1}
                  precision={0}
                  disabled={isDetailMode}
                  value={formValues.limitPerUser}
                  onChange={(value) =>
                    updateNumberField(
                      'limitPerUser',
                      typeof value === 'number' ? value : undefined
                    )
                  }
                />
                <span className={styles.inlineUnit}>张</span>
              </div>
              {formErrors.couponQuantity && (
                <div className={styles.fieldError}>{formErrors.couponQuantity}</div>
              )}
            </Form.Item>

            <Form.Item required label="领取时间">
              <RangePicker
                className={styles.rangePicker}
                placeholder={['开始日期', '结束日期']}
                disabled={!canEditCoupon}
                value={
                  formValues.receiveTimeRange.length
                    ? formValues.receiveTimeRange
                    : undefined
                }
                onChange={handleReceiveTimeChange}
              />
              {formErrors.receiveTimeRange && (
                <div className={styles.fieldError}>{formErrors.receiveTimeRange}</div>
              )}
            </Form.Item>

            <Form.Item required label="使用时间">
              <div className={styles.validityBlock}>
                <Radio.Group
                  value={formValues.validityType}
                  disabled={!canEditCoupon}
                  onChange={handleValidityTypeChange}
                >
                  {VALIDITY_TYPE_OPTIONS.map((item) => (
                    <Radio key={item.value} value={item.value}>
                      {item.label}
                    </Radio>
                  ))}
                </Radio.Group>

                {formValues.validityType === 'afterReceiveDays' && (
                  <div
                    className={styles.validityActionRow}
                    style={FORM_CONFIG_ITEM_OFFSET_STYLE}
                  >
                    <InputNumber
                      className={styles.validDaysInput}
                      min={1}
                      precision={0}
                      disabled={!canEditCoupon}
                      value={formValues.validDays}
                      onChange={(value) =>
                        updateNumberField(
                          'validDays',
                          typeof value === 'number' ? value : undefined
                        )
                      }
                    />
                    <span className={styles.inlineText}>天内有效</span>
                  </div>
                )}

                {formValues.validityType === 'custom' && (
                  <div style={FORM_CONFIG_ITEM_OFFSET_STYLE}>
                    <RangePicker
                      className={styles.rangePicker}
                      format="YYYY-MM-DD HH:mm:ss"
                      placeholder={['开始时间', '结束时间']}
                      showTime
                      disabled={!canEditCoupon}
                      value={
                        formValues.customUseTimeRange.length
                          ? formValues.customUseTimeRange
                          : undefined
                      }
                      onChange={handleCustomUseTimeChange}
                    />
                  </div>
                )}
              </div>
              {formErrors.validityConfig && (
                <div className={styles.fieldError}>{formErrors.validityConfig}</div>
              )}
            </Form.Item>
          </div>
        </Form>
      </Card>

      <Card className={styles.actionCard}>
        <div className={styles.actionRow}>
          <Button onClick={() => history.push('/marketing/center/coupon/list')}>
            {isDetailMode ? '返回列表' : '取消'}
          </Button>
          {!isDetailMode && (
            <Button type="primary" onClick={handleSubmit}>
              {primaryButtonText}
            </Button>
          )}
        </div>
      </Card>

      <MarketingProductSelector
        visible={skuModalVisible}
        title={canEditCoupon ? '选择商品' : '查看商品'}
        readonly={!canEditCoupon}
        selectedSkuIds={formValues.selectedSkuIds}
        data={selectorSpuData}
        onCancel={() => setSkuModalVisible(false)}
        onConfirm={handleSkuModalConfirm}
      />

      <CouponStoreSelector
        visible={storeModalVisible}
        readonly={!canEditCoupon}
        title="选择门店"
        entityLabel="门店"
        simple
        selectedStoreIds={selectedStoreIds}
        onCancel={() => setStoreModalVisible(false)}
        onConfirm={handleStoreModalConfirm}
      />
    </div>
  );
}

function CouponCreatePage() {
  return <CouponFormPage mode="create" />;
}

export default CouponCreatePage;
