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
  Typography,
} from '@arco-design/web-react';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import styles from './index.module.less';
import {
  buildCouponFormValuesFromRecord,
  buildMarketingProductSelectorSpus,
  buildCreateValuesFromCoupon,
  COUPON_DISCOUNT_OPTIONS,
  CouponDiscountType,
  CouponFormValues,
  CouponPageMode,
  CouponProductScope,
  CouponValidityType,
  DEFAULT_COUPON_FORM_VALUES,
  isAllCouponStoresSelected,
  normalizeCouponStoreIds,
  PRODUCT_SCOPE_OPTIONS,
  readCouponById,
  updateCouponQuota,
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
  const storeItems = useMemo(() => {
    const nextItems = readProductStoreItems();
    if (typeof visibleStoreIds === 'undefined') {
      return nextItems;
    }

    const visibleStoreIdSet = new Set(visibleStoreIds);
    return nextItems.filter((item) => visibleStoreIdSet.has(item.id));
  }, [visibleStoreIds]);
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

  useEffect(() => {
    if (isCreateMode) {
      if (!sourceId) {
        setFormValues(createDefaultFormValues());
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

    setFormValues(buildCouponFormValuesFromRecord(record, visibleStoreIds));
    setFormErrors({});
  }, [couponId, history, isCreateMode, sourceId, visibleStoreIds]);

  const selectedSkuCount = formValues.selectedSkuIds.length;
  const selectedStoreIds = useMemo(
    () =>
      normalizeCouponStoreIds(
        formValues.storeIds,
        visibleStoreIds || storeItems.map((item) => item.id)
      ),
    [formValues.storeIds, storeItems, visibleStoreIds]
  );
  const selectedStoreNames = useMemo(() => {
    const nameMap = new Map(storeItems.map((item) => [item.id, item.name]));

    return selectedStoreIds
      .map((item) => nameMap.get(item))
      .filter((item): item is string => Boolean(item));
  }, [selectedStoreIds, storeItems]);
  const storeSummaryTitle = useMemo(() => {
    if (!selectedStoreIds.length) {
      return '未选择店铺';
    }

    return isAllCouponStoresSelected(
      selectedStoreIds,
      visibleStoreIds || storeItems.map((item) => item.id)
    )
      ? '全部店铺'
      : `已选 ${selectedStoreIds.length} 家店铺`;
  }, [selectedStoreIds, storeItems, visibleStoreIds]);
  const storeSummaryDescription = useMemo(() => {
    if (!selectedStoreIds.length) {
      return '点击右侧按钮选择优惠券可使用的店铺';
    }

    if (
      isAllCouponStoresSelected(
        selectedStoreIds,
        visibleStoreIds || storeItems.map((item) => item.id)
      )
    ) {
      return `当前共覆盖 ${storeItems.length} 家店铺`;
    }

    return selectedStoreNames.join('、');
  }, [selectedStoreIds, selectedStoreNames, storeItems.length, visibleStoreIds]);

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
    if (!isCreateMode) {
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
    if (!isCreateMode) {
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
    if (!isCreateMode) {
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
    if (!isCreateMode) {
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
    if (!isCreateMode) {
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
    if (!isCreateMode) {
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
    if (!isCreateMode) {
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
    if (!isCreateMode) {
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
    if (!isCreateMode) {
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
    const canEditNumber =
      isCreateMode ||
      (isEditMode && (field === 'issueCount' || field === 'limitPerUser'));
    if (!canEditNumber) {
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
    if (!isCreateMode) {
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
        visibleStoreIds || storeItems.map((item) => item.id)
      ),
    });
    clearErrors('storeIds');
    setStoreModalVisible(false);
  }

  function openReadonlySkuModal() {
    setSkuModalVisible(true);
  }

  function handleSkuModalConfirm(selectedSkuIds: string[]) {
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
      errors.storeIds = '请选择适用店铺';
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

  function validateEditForm() {
    const errors: CouponFormErrors = {};
    if (
      !formValues.issueCount ||
      formValues.issueCount <= 0 ||
      !formValues.limitPerUser ||
      formValues.limitPerUser <= 0
    ) {
      errors.couponQuantity = '请填写正确的发放张数和每人限领数量';
    }
    return errors;
  }

  function handleSubmit() {
    if (isDetailMode) {
      return;
    }

    const nextErrors = isEditMode ? validateEditForm() : validateCreateForm();
    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      Message.error(isEditMode ? '请完善张数配置后再保存' : '请完善必填项后再创建');
      return;
    }

    if (isEditMode) {
      if (!couponId) {
        Message.error('缺少优惠券 ID');
        return;
      }
      const updated = updateCouponQuota(couponId, {
        issueCount: formValues.issueCount,
        limitPerUser: formValues.limitPerUser,
      });
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
          <div className={styles.sectionBlock}>
            <Typography.Title className={styles.sectionTitle} heading={5}>
              优惠信息
            </Typography.Title>

            <Form.Item required label="优惠方式">
              <div className={styles.inlineField}>
                <Select
                  className={styles.discountTypeSelect}
                  value={formValues.discountType}
                  disabled={!isCreateMode}
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
                      disabled={!isCreateMode}
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
                      disabled={!isCreateMode}
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
                      disabled={!isCreateMode}
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
                      disabled={!isCreateMode}
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

            <Form.Item required label="适用店铺">
              <div className={styles.storeSelectorTrigger}>
                <div className={styles.storeSelectorSummary}>
                  <div
                    className={`${styles.storeSelectorTitle} ${
                      selectedStoreIds.length ? '' : styles.storeSelectorTitleEmpty
                    }`}
                  >
                    {storeSummaryTitle}
                  </div>
                  <div className={styles.storeSelectorDescription}>
                    {storeSummaryDescription}
                  </div>
                </div>

                <Button type="outline" onClick={openStoreModal}>
                  {isCreateMode ? '选择店铺' : '查看店铺'}
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
                  disabled={!isCreateMode}
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
                        disabled={!isCreateMode}
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
                                        !isCreateMode || !couponOwnershipOptions.length
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
                                        !isCreateMode || !section.specOptions.length
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
                                      disabled={!isCreateMode || !selectedSpecOption}
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
                    {isCreateMode && (
                      <Button type="outline" onClick={openSelectSkuModal}>
                        选择商品
                      </Button>
                    )}

                    {!isCreateMode && (
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
                disabled={!isCreateMode}
                value={formValues.name}
                onChange={(value) => {
                  if (!isCreateMode) {
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
                disabled={!isCreateMode}
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
                  disabled={!isCreateMode}
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
                      disabled={!isCreateMode}
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
                      disabled={!isCreateMode}
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
        title={isCreateMode ? '选择商品' : '查看商品'}
        readonly={!isCreateMode}
        selectedSkuIds={formValues.selectedSkuIds}
        data={selectorSpuData}
        onCancel={() => setSkuModalVisible(false)}
        onConfirm={handleSkuModalConfirm}
      />

      <CouponStoreSelector
        visible={storeModalVisible}
        readonly={!isCreateMode}
        selectedStoreIds={selectedStoreIds}
        allowedStoreIds={visibleStoreIds}
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
