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
  Modal,
  Radio,
  Select,
  Table,
  Tag,
  TreeSelect,
  Typography,
} from '@arco-design/web-react';
import { useHistory, useLocation } from 'react-router-dom';
import styles from './index.module.less';
import {
  buildCouponCampusTreeValue,
  buildCouponFormValuesFromRecord,
  buildCouponProductCategoryOptions,
  buildCouponSpus,
  buildCreateValuesFromCoupon,
  COUPON_CAMPUS_TREE_DATA,
  COUPON_DISCOUNT_OPTIONS,
  CouponDiscountType,
  CouponFormValues,
  CouponPageMode,
  CouponProductScope,
  CouponProductTableItem,
  CouponSpuItem,
  CouponValidityType,
  DEFAULT_COUPON_FORM_VALUES,
  filterCouponProducts,
  formatCouponPriceRange,
  formatCurrency,
  normalizeCouponCampusIds,
  PRODUCT_SCOPE_OPTIONS,
  readCouponById,
  updateCouponQuota,
  VALIDITY_TYPE_OPTIONS,
} from '../data';
import {
  buildProductCatalogCascaderOptions,
  buildProductCatalogLeafItems,
  readProductCatalogItems,
} from '@/pages/product/catalog/data';

const Option = Select.Option;
const RangePicker = DatePicker.RangePicker;

type CouponFormPageProps = {
  mode?: CouponPageMode;
};

type CouponErrorKey =
  | 'discountConfig'
  | 'campusIds'
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
    campusIds: [],
    conditionCategoryPaths: [],
    selectedSkuIds: [],
    receiveTimeRange: [],
    customUseTimeRange: [],
  };
}

function normalizeTreeSelectValues(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  return typeof value === 'string' ? [value] : [];
}

function normalizeCascaderMultipleValues(
  value: Array<string | string[]> | undefined
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string[] => Array.isArray(item));
}

function buildSelectedSpuTree(data: CouponSpuItem[], selectedSkuIds: string[]) {
  if (!selectedSkuIds.length) {
    return [];
  }

  const selectedSet = new Set(selectedSkuIds);
  return data
    .map((spu) => {
      const matchedChildren = spu.children.filter((sku) => selectedSet.has(sku.key));
      if (!matchedChildren.length) {
        return null;
      }
      return {
        ...spu,
        skuSpecText: `共 ${matchedChildren.length} 个 SKU`,
        minPrice: Math.min(...matchedChildren.map((item) => item.price)),
        maxPrice: Math.max(...matchedChildren.map((item) => item.price)),
        children: matchedChildren,
      };
    })
    .filter(Boolean) as CouponSpuItem[];
}

export function CouponFormPage({ mode = 'create' }: CouponFormPageProps) {
  const history = useHistory();
  const location = useLocation();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const sourceId = query.get('sourceId')?.trim() || '';
  const couponId = query.get('id')?.trim() || '';

  const catalogItems = useMemo(() => readProductCatalogItems(), []);
  const couponCategories = useMemo(
    () => buildProductCatalogLeafItems(catalogItems),
    [catalogItems]
  );
  const couponCatalogOptions = useMemo(
    () => buildProductCatalogCascaderOptions(catalogItems),
    [catalogItems]
  );
  const couponProductCategoryOptions = useMemo(
    () => buildCouponProductCategoryOptions(couponCategories),
    [couponCategories]
  );
  const couponSpus = useMemo(() => buildCouponSpus(couponCategories), [couponCategories]);

  const [formValues, setFormValues] = useState<CouponFormValues>(createDefaultFormValues);
  const [formErrors, setFormErrors] = useState<CouponFormErrors>({});
  const [skuModalVisible, setSkuModalVisible] = useState(false);
  const [skuKeyword, setSkuKeyword] = useState('');
  const [productCategoryValue, setProductCategoryValue] = useState<string>();
  const [draftSelectedSkuIds, setDraftSelectedSkuIds] = useState<string[]>([]);

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
      const sourceValues = buildCreateValuesFromCoupon(sourceId);
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

    const record = readCouponById(couponId);
    if (!record) {
      Message.error('优惠券不存在或已删除');
      history.replace('/marketing/center/coupon/list');
      return;
    }

    setFormValues(buildCouponFormValuesFromRecord(record));
    setFormErrors({});
  }, [couponId, history, isCreateMode, sourceId]);

  const selectedSkuCount = formValues.selectedSkuIds.length;
  const selectedCampusTreeValue = useMemo(
    () => buildCouponCampusTreeValue(formValues.campusIds),
    [formValues.campusIds]
  );

  const filteredProductData = useMemo(
    () =>
      filterCouponProducts(couponSpus, skuKeyword, productCategoryValue || undefined),
    [couponSpus, productCategoryValue, skuKeyword]
  );

  const selectedSpuData = useMemo(
    () => buildSelectedSpuTree(couponSpus, formValues.selectedSkuIds),
    [couponSpus, formValues.selectedSkuIds]
  );

  const filteredReadonlyProductData = useMemo(
    () =>
      filterCouponProducts(
        selectedSpuData,
        skuKeyword,
        productCategoryValue || undefined
      ),
    [selectedSpuData, productCategoryValue, skuKeyword]
  );

  const modalData = isCreateMode ? filteredProductData : filteredReadonlyProductData;
  const modalSpuCount = modalData.length;
  const modalSkuCount = modalData.reduce((count, item) => count + item.children.length, 0);

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

  function handleCampusChange(value: string | string[] | undefined) {
    if (!isCreateMode) {
      return;
    }

    patchFormValues({
      campusIds: normalizeCouponCampusIds(normalizeTreeSelectValues(value)),
    });
    clearErrors('campusIds');
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

    patchFormValues({
      conditionCategoryPaths: normalizeCascaderMultipleValues(value),
    });
    clearErrors('conditionCategoryPaths');
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
    setDraftSelectedSkuIds(formValues.selectedSkuIds);
    setSkuKeyword('');
    setProductCategoryValue(undefined);
    setSkuModalVisible(true);
  }

  function openReadonlySkuModal() {
    setSkuKeyword('');
    setProductCategoryValue(undefined);
    setSkuModalVisible(true);
  }

  function handleSkuModalConfirm() {
    if (!isCreateMode) {
      setSkuModalVisible(false);
      return;
    }

    patchFormValues({
      selectedSkuIds: draftSelectedSkuIds,
    });
    clearErrors('selectedSkuIds');
    setSkuModalVisible(false);
  }

  function collectSelectedSkuIds(rows: CouponProductTableItem[]) {
    const skuIds = new Set<string>();

    function travel(items: CouponProductTableItem[]) {
      items.forEach((item) => {
        if (item.rowType === 'sku') {
          skuIds.add(item.key);
          return;
        }

        if (item.children?.length) {
          travel(item.children);
        }
      });
    }

    travel(rows);
    return Array.from(skuIds);
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

    if (!formValues.campusIds.length) {
      errors.campusIds = '请选择适用校区';
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

  const productColumns = [
    {
      title: '商品名称',
      dataIndex: 'productName',
      width: 260,
      ellipsis: true,
      render: (value: string, record: CouponProductTableItem) => (
        <div className={styles.nameCell}>
          <span className={styles.namePrimary}>{value}</span>
          <span className={styles.nameMeta}>
            {record.rowType === 'spu' ? 'SPU' : `SKU：${record.skuId}`}
          </span>
        </div>
      ),
    },
    {
      title: '商品类目',
      dataIndex: 'productCategory',
      width: 140,
    },
    {
      title: '商品 ID',
      dataIndex: 'productId',
      width: 220,
    },
    {
      title: 'SKU ID',
      dataIndex: 'skuId',
      width: 160,
      render: (value: string, record: CouponProductTableItem) =>
        record.rowType === 'spu' ? '-' : value,
    },
    {
      title: 'SKU 规格',
      dataIndex: 'skuSpecText',
      width: 150,
    },
    {
      title: '商品类型',
      dataIndex: 'productType',
      width: 120,
      render: (value: string) => <Tag>{value}</Tag>,
    },
    {
      title: '售价',
      dataIndex: 'price',
      width: 180,
      render: (_: number, record: CouponProductTableItem) =>
        record.rowType === 'spu'
          ? formatCouponPriceRange(record.minPrice, record.maxPrice)
          : formatCurrency(record.price),
    },
  ];

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

            <Form.Item required label="适用校区">
              <TreeSelect
                allowClear
                multiple
                treeCheckable
                treeCheckStrictly={false}
                treeCheckedStrategy="parent"
                treeData={COUPON_CAMPUS_TREE_DATA}
                showSearch
                className={styles.formControl}
                placeholder="请选择适用校区"
                disabled={!isCreateMode}
                value={selectedCampusTreeValue}
                onChange={handleCampusChange}
              />
              {formErrors.campusIds && (
                <div className={styles.fieldError}>{formErrors.campusIds}</div>
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
                  <div className={styles.conditionScopePanel}>
                    <div className={styles.conditionFieldItem}>
                      <span className={styles.conditionFieldLabel}>商品类目</span>
                      <Cascader
                        mode="multiple"
                        allowClear
                        changeOnSelect
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
                  </div>
                )}

                {formValues.productScope === 'specific' && (
                  <div className={styles.scopeActionRow}>
                    {isCreateMode && (
                      <Button type="outline" onClick={openSelectSkuModal}>
                        选择商品
                      </Button>
                    )}

                    {isDetailMode && (
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
                  <div className={styles.validityActionRow}>
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

      <Modal
        title={isCreateMode ? '选择商品' : '查看商品'}
        visible={skuModalVisible}
        footer={isCreateMode ? undefined : null}
        onOk={handleSkuModalConfirm}
        onCancel={() => setSkuModalVisible(false)}
        okText="确定"
        cancelText="取消"
        style={{ width: 1180 }}
      >
        <div className={styles.modalSearchRow}>
          <div className={styles.modalFilters}>
            <Input
              allowClear
              className={styles.modalSearchInput}
              placeholder="请输入商品名称 / 商品ID / SKU ID"
              value={skuKeyword}
              onChange={setSkuKeyword}
            />
            <Select
              allowClear
              className={styles.modalCategorySelect}
              placeholder="请选择商品类目"
              value={productCategoryValue}
              onChange={(value) =>
                setProductCategoryValue(typeof value === 'string' ? value : undefined)
              }
            >
              {couponProductCategoryOptions.map((item) => (
                <Option key={item.value} value={item.value}>
                  {item.label}
                </Option>
              ))}
            </Select>
          </div>
          <Typography.Text type="secondary">
            共 {modalSpuCount} 个 SPU / {modalSkuCount} 条 SKU
          </Typography.Text>
        </div>

        <Table
          rowKey="key"
          columns={productColumns}
          data={modalData}
          noDataElement={isCreateMode ? '暂无可选商品' : '暂无商品范围数据'}
          defaultExpandAllRows
          pagination={{
            pageSize: 6,
            sizeCanChange: false,
          }}
          rowSelection={
            isCreateMode
              ? {
                  selectedRowKeys: draftSelectedSkuIds,
                  checkStrictly: false,
                  columnWidth: 48,
                  preserveSelectedRowKeys: true,
                  onChange: (_, selectedRows) =>
                    setDraftSelectedSkuIds(
                      collectSelectedSkuIds(selectedRows as CouponProductTableItem[])
                    ),
                }
              : undefined
          }
          scroll={{ x: 1240 }}
          tableLayoutFixed
        />
      </Modal>
    </div>
  );
}

function CouponCreatePage() {
  return <CouponFormPage mode="create" />;
}

export default CouponCreatePage;
