import React, { useMemo, useState } from 'react';
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
  Typography,
} from '@arco-design/web-react';
import { useHistory } from 'react-router-dom';
import styles from './index.module.less';
import {
  buildCouponProductCategoryOptions,
  buildCouponSpus,
  CategoryConditionScope,
  COUPON_DISCOUNT_OPTIONS,
  CouponDiscountType,
  CouponFormValues,
  CouponProductScope,
  CouponProductTableItem,
  CouponValidityType,
  DEFAULT_COUPON_FORM_VALUES,
  filterCouponProducts,
  formatCouponPriceRange,
  formatCurrency,
  MOCK_CAMPUSES,
  MOCK_CATEGORY_SPEC_OPTIONS,
  PRODUCT_SCOPE_OPTIONS,
  VALIDITY_TYPE_OPTIONS,
} from '../data';
import {
  buildProductCatalogLeafItems,
  readProductCatalogItems,
} from '@/pages/product/catalog/data';
import {
  buildProductOwnershipCascaderOptions,
  readProductOwnershipItems,
} from '@/pages/product/category/data';

const Option = Select.Option;
const RangePicker = DatePicker.RangePicker;
const MultiCascader = Cascader as any;

type CouponErrorKey =
  | 'discountConfig'
  | 'campusIds'
  | 'productScope'
  | 'conditionScopes'
  | 'selectedSkuIds'
  | 'name'
  | 'couponQuantity'
  | 'receiveTimeRange'
  | 'validityConfig';

type CouponFormErrors = Partial<Record<CouponErrorKey, string>>;

function CouponCreatePage() {
  const history = useHistory();
  const catalogItems = useMemo(() => readProductCatalogItems(), []);
  const ownershipItems = useMemo(() => readProductOwnershipItems(), []);
  const couponCategories = useMemo(
    () => buildProductCatalogLeafItems(catalogItems),
    [catalogItems]
  );
  const couponProductCategoryOptions = useMemo(
    () => buildCouponProductCategoryOptions(couponCategories),
    [couponCategories]
  );
  const couponOwnershipOptions = useMemo(
    () => buildProductOwnershipCascaderOptions(ownershipItems),
    [ownershipItems]
  );
  const couponSpus = useMemo(() => buildCouponSpus(couponCategories), [couponCategories]);
  const [formValues, setFormValues] = useState<CouponFormValues>(
    DEFAULT_COUPON_FORM_VALUES
  );
  const [formErrors, setFormErrors] = useState<CouponFormErrors>({});
  const [skuModalVisible, setSkuModalVisible] = useState(false);
  const [skuKeyword, setSkuKeyword] = useState('');
  const [productCategoryValue, setProductCategoryValue] = useState<string>();
  const [draftSelectedSkuIds, setDraftSelectedSkuIds] = useState<string[]>([]);

  const filteredProductData = useMemo(
    () =>
      filterCouponProducts(
        couponSpus,
        skuKeyword,
        productCategoryValue || undefined
      ),
    [couponSpus, productCategoryValue, skuKeyword]
  );

  const selectedConditionCategoryIds = useMemo(
    () => formValues.conditionScopes.map((scope) => scope.categoryId),
    [formValues.conditionScopes]
  );

  const selectedSkuCount = formValues.selectedSkuIds.length;
  const filteredSpuCount = filteredProductData.length;
  const filteredSkuCount = filteredProductData.reduce(
    (count, item) => count + item.children.length,
    0
  );

  function patchFormValues(patch: Partial<CouponFormValues>) {
    setFormValues((previous) => ({
      ...previous,
      ...patch,
    }));
  }

  function patchConditionScopes(
    updater: (previous: CategoryConditionScope[]) => CategoryConditionScope[]
  ) {
    setFormValues((previous) => ({
      ...previous,
      conditionScopes: updater(previous.conditionScopes),
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
    patchFormValues({
      discountType: value as CouponDiscountType,
      fullReductionThreshold: undefined,
      fullReductionAmount: undefined,
      directReductionAmount: undefined,
      discountRate: undefined,
    });
    clearErrors('discountConfig');
  }

  function handleCampusChange(value: string[]) {
    patchFormValues({ campusIds: value || [] });
    clearErrors('campusIds');
  }

  function handleProductScopeChange(value: string) {
    const nextScope = value as CouponProductScope;
    patchFormValues({
      productScope: nextScope,
    });
    clearErrors('productScope', 'conditionScopes', 'selectedSkuIds');
  }

  function handleOrgPathsChange(categoryId: string, value: string[][]) {
    patchConditionScopes((previous) =>
      previous.map((scope) =>
        scope.categoryId === categoryId
          ? { ...scope, selectedOrgPaths: value }
          : scope
      )
    );
    clearErrors('conditionScopes');
  }

  function handleSpecValuesChange(categoryId: string, value: string[]) {
    patchConditionScopes((previous) =>
      previous.map((scope) =>
        scope.categoryId === categoryId
          ? { ...scope, selectedSpecValues: value }
          : scope
      )
    );
    clearErrors('conditionScopes');
  }

  function handleReceiveTimeChange(dateString: string[]) {
    patchFormValues({
      receiveTimeRange:
        Array.isArray(dateString) && dateString[0] && dateString[1]
          ? [dateString[0], dateString[1]]
          : [],
    });
    clearErrors('receiveTimeRange');
  }

  function handleValidityTypeChange(value: string) {
    patchFormValues({
      validityType: value as CouponValidityType,
      customUseTimeRange: [],
      validDays:
        value === 'afterReceiveDays' ? formValues.validDays || 1 : formValues.validDays,
    });
    clearErrors('validityConfig');
  }

  function handleCustomUseTimeChange(dateString: string[]) {
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

  function openSkuModal() {
    setDraftSelectedSkuIds(formValues.selectedSkuIds);
    setSkuKeyword('');
    setProductCategoryValue(undefined);
    setSkuModalVisible(true);
  }

  function handleSkuModalConfirm() {
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

  function validateForm() {
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

    if (formValues.productScope === 'condition') {
      if (!formValues.conditionScopes.length) {
        errors.conditionScopes = '请至少选择一个类目';
      }
    }

    if (
      formValues.productScope === 'specific' &&
      !formValues.selectedSkuIds.length
    ) {
      errors.selectedSkuIds = '请选择至少 1 个 SKU';
    }

    if (!formValues.name.trim()) {
      errors.name = '请输入券名称';
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
    const nextErrors = validateForm();
    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      Message.error('请完善必填项后再创建');
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

  return (
    <div className={styles.page}>
      <Typography.Title className={styles.pageTitle} heading={4}>
        创建优惠券
      </Typography.Title>

      <Card className={styles.formCard}>
        <Form layout="vertical">
          <div className={styles.sectionBlock}>
            <Typography.Title className={styles.sectionTitle} heading={5}>
              优惠信息
            </Typography.Title>

            <Form.Item required label="优惠方式">
              <div className={styles.inlineField}>
                <Select
                  className={styles.discountTypeSelect}
                  value={formValues.discountType}
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
                      prefix="¥"
                      placeholder="0.00"
                      value={formValues.fullReductionThreshold}
                      onChange={(value) =>
                        updateNumberField(
                          'fullReductionThreshold',
                          typeof value === 'number' ? value : undefined
                        )
                      }
                    />
                    <span className={styles.inlineText}>减</span>
                    <InputNumber
                      className={styles.moneyInput}
                      min={0}
                      precision={2}
                      prefix="¥"
                      placeholder="0.00"
                      value={formValues.fullReductionAmount}
                      onChange={(value) =>
                        updateNumberField(
                          'fullReductionAmount',
                          typeof value === 'number' ? value : undefined
                        )
                      }
                    />
                  </>
                )}

                {formValues.discountType === 'directReduction' && (
                  <>
                    <span className={styles.inlineText}>立减</span>
                    <InputNumber
                      className={styles.moneyInput}
                      min={0}
                      precision={2}
                      prefix="¥"
                      placeholder="0.00"
                      value={formValues.directReductionAmount}
                      onChange={(value) =>
                        updateNumberField(
                          'directReductionAmount',
                          typeof value === 'number' ? value : undefined
                        )
                      }
                    />
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
              <Select
                allowClear
                mode="multiple"
                placeholder="请选择适用校区"
                value={formValues.campusIds}
                onChange={handleCampusChange}
              >
                {MOCK_CAMPUSES.map((item) => (
                  <Option key={item.value} value={item.value}>
                    {item.label}
                  </Option>
                ))}
              </Select>
              {formErrors.campusIds && (
                <div className={styles.fieldError}>{formErrors.campusIds}</div>
              )}
            </Form.Item>

            <Form.Item required label="选择商品">
              <div className={styles.scopeBlock}>
                <Radio.Group
                  value={formValues.productScope}
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
                    {/* Step 1: 选择商品类目（下拉多选） */}
                    <div className={styles.conditionFieldItem}>
                      <span className={styles.conditionFieldLabel}>商品类目</span>
                      <Select
                        allowClear
                        mode="multiple"
                        className={styles.categorySelect}
                        placeholder="请选择适用的商品类目（可多选）"
                        value={selectedConditionCategoryIds}
                        onChange={(values: string[]) => {
                          const next = values || [];
                          // 新增的类目追加 scope，去掉的类目移除 scope
                          patchConditionScopes((previous) => {
                            const removed = previous.filter(
                              (s) => !next.includes(s.categoryId)
                            );
                            const added = next
                              .filter(
                                (id) =>
                                  !previous.some((s) => s.categoryId === id)
                              )
                              .map((id) => ({
                                categoryId: id,
                                selectedOrgPaths: [],
                                selectedSpecValues: [],
                              }));
                            return [
                              ...previous.filter((s) =>
                                next.includes(s.categoryId)
                              ),
                              ...added,
                            ];
                          });
                          clearErrors('conditionScopes');
                        }}
                      >
                        {couponCategories.map((category) => (
                          <Option key={category.id} value={category.id}>
                            {category.label}
                          </Option>
                        ))}
                      </Select>
                    </div>

                    {formValues.conditionScopes.map((scope) => {
                      const catalogItem = couponCategories.find(
                        (c) => c.id === scope.categoryId
                      );
                      const specOptions =
                        MOCK_CATEGORY_SPEC_OPTIONS[scope.categoryId] || [];

                      return (
                        <div
                          className={styles.categorySection}
                          key={scope.categoryId}
                        >
                          <div className={styles.categorySectionHeader}>
                            <Typography.Text bold>
                              {catalogItem?.label || scope.categoryId}
                            </Typography.Text>
                          </div>

                          <div className={styles.conditionFields}>
                            {/* 商品归属：多选级联选择器，事业部 → 课程体系 → 课程项 */}
                            <div className={styles.conditionFieldItem}>
                              <span className={styles.conditionFieldLabel}>
                                商品归属
                              </span>
                              <MultiCascader
                                multiple
                                allowClear
                                changeOnSelect
                                expandTrigger="hover"
                                className={styles.orgCascader}
                                placeholder="可选任意层级（事业部 / 课程体系 / 课程项），不选则全部适用"
                                options={couponOwnershipOptions}
                                value={scope.selectedOrgPaths}
                                onChange={(value) =>
                                  handleOrgPathsChange(
                                    scope.categoryId,
                                    (value as string[][]) || []
                                  )
                                }
                              />
                            </div>

                            {/* SKU 规格（班型）：仅对 hasSkuSpec=true 的类目显示 */}
                            {catalogItem?.hasSkuSpec && specOptions.length > 0 && (
                              <div className={styles.conditionFieldItem}>
                                <span className={styles.conditionFieldLabel}>
                                  班型规格
                                </span>
                                <Select
                                  allowClear
                                  mode="multiple"
                                  className={styles.specSelect}
                                  placeholder="可多选，不选则全部班型适用"
                                  value={scope.selectedSpecValues}
                                  onChange={(value) =>
                                    handleSpecValuesChange(
                                      scope.categoryId,
                                      Array.isArray(value) ? value.map(String) : []
                                    )
                                  }
                                >
                                  {specOptions.map((item) => (
                                    <Option key={item.value} value={item.value}>
                                      {item.label}
                                    </Option>
                                  ))}
                                </Select>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {formValues.productScope === 'specific' && (
                  <div className={styles.scopeActionRow}>
                    <Button type="outline" onClick={openSkuModal}>
                      选择商品
                    </Button>
                    <Typography.Text type="secondary">
                      {selectedSkuCount
                        ? `已选 ${selectedSkuCount} 个 SKU`
                        : '暂未选择 SKU'}
                    </Typography.Text>
                  </div>
                )}
              </div>
              {(formErrors.productScope ||
                formErrors.conditionScopes ||
                formErrors.selectedSkuIds) && (
                <div className={styles.fieldError}>
                  {formErrors.productScope ||
                    formErrors.conditionScopes ||
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
                placeholder="请输入券名称"
                value={formValues.name}
                onChange={(value) => {
                  patchFormValues({ name: value });
                  clearErrors('name');
                }}
              />
              {formErrors.name && (
                <div className={styles.fieldError}>{formErrors.name}</div>
              )}
            </Form.Item>

            <Form.Item required label="券数量">
              <div className={styles.inlineField}>
                <span className={styles.inlineText}>发放张数</span>
                <InputNumber
                  className={styles.countInput}
                  min={0}
                  precision={0}
                  value={formValues.issueCount}
                  onChange={(value) =>
                    updateNumberField(
                      'issueCount',
                      typeof value === 'number' ? value : undefined
                    )
                  }
                />
                <span className={styles.inlineText}>张</span>
                <span className={styles.inlineText}>每人限领</span>
                <InputNumber
                  className={styles.countInput}
                  min={1}
                  precision={0}
                  value={formValues.limitPerUser}
                  onChange={(value) =>
                    updateNumberField(
                      'limitPerUser',
                      typeof value === 'number' ? value : undefined
                    )
                  }
                />
                <span className={styles.inlineText}>张</span>
              </div>
              {formErrors.couponQuantity && (
                <div className={styles.fieldError}>{formErrors.couponQuantity}</div>
              )}
            </Form.Item>

            <Form.Item required label="领取时间">
              <RangePicker
                className={styles.rangePicker}
                placeholder={['开始日期', '结束日期']}
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
            取消
          </Button>
          <Button type="primary" onClick={handleSubmit}>
            创建
          </Button>
        </div>
      </Card>

      <Modal
        title="选择商品"
        visible={skuModalVisible}
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
            共 {filteredSpuCount} 个 SPU / {filteredSkuCount} 条 SKU
          </Typography.Text>
        </div>

        <Table
          rowKey="key"
          columns={productColumns}
          data={filteredProductData}
          noDataElement="暂无可选商品"
          defaultExpandAllRows
          pagination={{
            pageSize: 6,
            sizeCanChange: false,
          }}
          rowSelection={{
            selectedRowKeys: draftSelectedSkuIds,
            checkStrictly: false,
            columnWidth: 48,
            preserveSelectedRowKeys: true,
            onChange: (_, selectedRows) =>
              setDraftSelectedSkuIds(
                collectSelectedSkuIds(selectedRows as CouponProductTableItem[])
              ),
          }}
          scroll={{ x: 1240 }}
          tableLayoutFixed
        />
      </Modal>
    </div>
  );
}

export default CouponCreatePage;
