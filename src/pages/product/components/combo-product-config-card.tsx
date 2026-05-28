import React, { useMemo, useState } from 'react';
import {
  Button,
  Empty,
  Input,
  InputNumber,
  Message,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from '@arco-design/web-react';
import {
  IconArrowDown,
  IconArrowUp,
  IconDelete,
  IconPlus,
  IconQuestionCircle,
} from '@arco-design/web-react/icon';
import type {
  ProductComboOptionType,
  ProductComboOptionItem,
  ProductListItem,
} from '@/types/product';
import type { ProductStatus } from '@/pages/product/list/data';
import type { MarketingProductSelectorSpuItem } from '@/pages/marketing/center/components/product-selector/types';
import MarketingProductSelector from '@/pages/marketing/center/components/product-selector';
import {
  readProductCatalogItems,
  getProductCatalogPathById,
} from '@/pages/product/catalog/data';
import {
  readProductOwnershipItems,
  getProductOwnershipPathById,
} from '@/pages/product/category/data';
import {
  buildComboTrialResult,
  buildComboTrialTableRows,
  canRemoveComboOptionProduct,
  getComboTrialDefaultSelectionError,
  getComboOptionRequiredByType,
  getComboOptionType,
  isMustBuyComboOption,
  type ComboTrialTableRow,
  createComboOptionProductItem,
  getComboOptionSelectionLimitError,
  getDisableComboOptionProductListedError,
  moveComboOptionProductItem,
  normalizeComboOptionSelectionLimit,
  preserveNonRemovableComboOptionSkuIds,
  syncComboOptionItemsByType,
} from './combo-product-config-card.utils';
import styles from './combo-product-config-card.module.less';

const MAX_OPTION_COUNT = 5;
const SELECTION_LIMIT_OPTIONS = Array.from({ length: 10 }, (_, index) => index + 1);
const COMBO_OPTION_TYPE_OPTIONS: Array<{
  label: string;
  value: ProductComboOptionType;
}> = [
  {
    label: '必购项',
    value: 'must_buy',
  },
  {
    label: '选构项',
    value: 'selective',
  },
  {
    label: '加购项',
    value: 'add_on',
  },
];

type ComboProductConfigCardProps = {
  allowDeleteOption?: boolean;
  nonRemovableSkuIds?: string[];
  products: ProductListItem[];
  value: ProductComboOptionItem[];
  onChange: (value: ProductComboOptionItem[]) => void;
};

type OptionTableRow = {
  key: string;
  rowIndex: number;
  productId: string;
  skuId: string;
  productName: string;
  imageUrl: string;
  status: ProductStatus;
  specText: string;
  sourcePrice: number;
  comboPrice?: number;
  quantity: number;
  required: boolean;
  defaultSelected: boolean;
  listed: boolean;
};

function createOptionId() {
  return `option_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultComboOption(optionIndex: number): ProductComboOptionItem {
  return {
    id: createOptionId(),
    title: `选项${optionIndex}`,
    optionType: 'selective',
    required: true,
    selectionLimit: 1,
    items: [],
  };
}

function getStatusLabel(status: ProductStatus) {
  return status === 'on' ? '在售' : '仓库';
}

function getStatusColor(status: ProductStatus) {
  return status === 'on' ? 'green' : 'arcoblue';
}

function formatPrice(price: number) {
  return `¥${price.toFixed(2)}`;
}

function buildSelectorData(
  products: ProductListItem[],
  lockedSkuIdSet: Set<string>,
  currentSelectedSkuIdSet: Set<string>,
  catalogItems: ReturnType<typeof readProductCatalogItems>,
  ownershipItems: ReturnType<typeof readProductOwnershipItems>
): MarketingProductSelectorSpuItem[] {
  return products.map((product) => {
    const catalogPath = getProductCatalogPathById(product.productCatalogId, catalogItems);
    const ownershipPath = getProductOwnershipPathById(product.productOwnershipId, ownershipItems);
    const catalogLabel = catalogPath[catalogPath.length - 1] || '';
    const ownershipLabel = ownershipPath[ownershipPath.length - 1] || '';

    const children = product.skus.map((sku) => {
      const isLocked =
        lockedSkuIdSet.has(sku.id) && !currentSelectedSkuIdSet.has(sku.id);

      return {
        key: sku.id,
        rowType: 'sku' as const,
        productId: product.id,
        productName: product.name,
        productCatalogId: product.productCatalogId,
        productCatalogLabel: catalogLabel,
        productOwnershipId: product.productOwnershipId,
        productOwnershipLabel: ownershipLabel,
        skuId: sku.id,
        specText: product.specMode === 'multi' ? sku.specText : '',
        specSummary: product.specMode === 'multi' ? sku.specText || '默认规格' : '单规格',
        price: sku.price,
        stock: sku.stock,
        status: product.status,
        selectable: !isLocked,
        disabledReason: isLocked ? '该 SKU 已在其他选项中配置' : '',
      };
    });

    const hasSelectableSku = children.some((item) => item.selectable);
    return {
      key: `spu-${product.id}`,
      rowType: 'spu' as const,
      productId: product.id,
      productName: product.name,
      productCatalogId: product.productCatalogId,
      productCatalogLabel: catalogLabel,
      productOwnershipId: product.productOwnershipId,
      productOwnershipLabel: ownershipLabel,
      specSummary: product.specMode === 'multi' ? `共 ${product.skus.length} 个规格` : '单规格',
      price: product.price,
      stock: product.stock,
      status: product.status,
      selectable: hasSelectableSku,
      disabledReason: hasSelectableSku ? '' : '该商品下无可选 SKU',
      children,
    };
  });
}

export default function ComboProductConfigCard({
  allowDeleteOption = true,
  nonRemovableSkuIds = [],
  products,
  value,
  onChange,
}: ComboProductConfigCardProps) {
  const catalogItems = useMemo(() => readProductCatalogItems(), []);
  const ownershipItems = useMemo(() => readProductOwnershipItems(), []);
  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );
  const productSkuMap = useMemo(() => {
    const map = new Map<string, { product: ProductListItem; sku: ProductListItem['skus'][number] }>();

    products.forEach((product) => {
      product.skus.forEach((sku) => {
        map.set(`${product.id}:${sku.id}`, {
          product,
          sku,
        });
      });
    });

    return map;
  }, [products]);
  const skuLookupById = useMemo(() => {
    const map = new Map<string, { product: ProductListItem; sku: ProductListItem['skus'][number] }>();

    products.forEach((product) => {
      product.skus.forEach((sku) => {
        map.set(sku.id, {
          product,
          sku,
        });
      });
    });

    return map;
  }, [products]);
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [trialVisible, setTrialVisible] = useState(false);
  const [activeOptionId, setActiveOptionId] = useState<string>();
  const normalizedValue = useMemo(
    () =>
      value.map((option) => ({
        ...option,
        optionType: getComboOptionType(option),
        required: getComboOptionRequiredByType(getComboOptionType(option)),
        items: syncComboOptionItemsByType(getComboOptionType(option), option.items),
      })),
    [value]
  );

  const activeOption = useMemo(
    () => normalizedValue.find((item) => item.id === activeOptionId),
    [activeOptionId, normalizedValue]
  );
  const nonRemovableSkuIdSet = useMemo(
    () => new Set(nonRemovableSkuIds),
    [nonRemovableSkuIds]
  );
  const currentSelectedSkuIds = useMemo(
    () => activeOption?.items.map((item) => item.skuId) || [],
    [activeOption]
  );
  const currentOptionNonRemovableSkuIds = useMemo(
    () =>
      activeOption?.items
        .map((item) => item.skuId)
        .filter((skuId) => nonRemovableSkuIdSet.has(skuId)) || [],
    [activeOption, nonRemovableSkuIdSet]
  );
  const currentSelectedSkuIdSet = useMemo(
    () => new Set(currentSelectedSkuIds),
    [currentSelectedSkuIds]
  );
  const lockedSkuIdSet = useMemo(
    () =>
      new Set(
        normalizedValue
          .filter((item) => item.id !== activeOptionId)
          .flatMap((item) => item.items.map((productItem) => productItem.skuId))
      ),
    [activeOptionId, normalizedValue]
  );
  const selectorData = useMemo(
    () =>
      buildSelectorData(
        products,
        lockedSkuIdSet,
        currentSelectedSkuIdSet,
        catalogItems,
        ownershipItems
      ),
    [products, lockedSkuIdSet, currentSelectedSkuIdSet, catalogItems, ownershipItems]
  );
  const comboTrialResult = useMemo(
    () => buildComboTrialResult(normalizedValue, products),
    [normalizedValue, products]
  );
  const comboTrialTableRows = useMemo(
    () => buildComboTrialTableRows(comboTrialResult.rows),
    [comboTrialResult.rows]
  );

  function patchOptions(
    updater: (previous: ProductComboOptionItem[]) => ProductComboOptionItem[]
  ) {
    onChange(updater(normalizedValue));
  }

  function patchOption(
    optionId: string,
    updater: (previous: ProductComboOptionItem) => ProductComboOptionItem
  ) {
    patchOptions((previous) =>
      previous.map((option) => (option.id === optionId ? updater(option) : option))
    );
  }

  function handleAddOption() {
    if (normalizedValue.length >= MAX_OPTION_COUNT) {
      return;
    }

    onChange([
      ...normalizedValue,
      createDefaultComboOption(normalizedValue.length + 1),
    ]);
  }

  function handleOpenTrial() {
    const defaultSelectionError = getComboTrialDefaultSelectionError(normalizedValue);

    if (defaultSelectionError) {
      Message.warning(defaultSelectionError);
      return;
    }

    setTrialVisible(true);
  }

  function handleDeleteOption(optionId: string) {
    if (normalizedValue.length <= 1) {
      return;
    }

    const targetOption = normalizedValue.find((option) => option.id === optionId);

    Modal.confirm({
      title: '确认删除选项',
      content: `删除后将同步清空「${targetOption?.title || '当前选项'}」下已配置的商品，是否继续？`,
      okText: '确认删除',
      cancelText: '取消',
      onOk: () => {
        onChange(normalizedValue.filter((option) => option.id !== optionId));
        if (activeOptionId === optionId) {
          setActiveOptionId(undefined);
          setSelectorVisible(false);
        }
      },
    });
  }

  function handleAddProducts(optionId: string) {
    setActiveOptionId(optionId);
    setSelectorVisible(true);
  }

  function handleSelectorConfirm(nextSkuIds: string[]) {
    if (!activeOptionId) {
      setSelectorVisible(false);
      return;
    }

    const normalizedNextSkuIds = preserveNonRemovableComboOptionSkuIds(
      nextSkuIds,
      currentOptionNonRemovableSkuIds
    );

    patchOption(activeOptionId, (option) => {
      const nextSkuIdSet = new Set(normalizedNextSkuIds);
      const keptItems = option.items.filter((item) => nextSkuIdSet.has(item.skuId));
      const keptSkuIdSet = new Set(keptItems.map((item) => item.skuId));
      const addedItems = normalizedNextSkuIds
        .filter((skuId) => !keptSkuIdSet.has(skuId))
        .flatMap((skuId) => {
          const matchedEntry = skuLookupById.get(skuId);

          if (!matchedEntry) {
            return [];
          }

          return [
            createComboOptionProductItem(
              matchedEntry.product.id,
              matchedEntry.sku.id,
              matchedEntry.sku.price
            ),
          ];
        });
      const nextItems = [...keptItems, ...addedItems];

      return {
        ...option,
        selectionLimit: normalizeComboOptionSelectionLimit({
          ...option,
          items: nextItems,
        }),
        items: nextItems,
      };
    });

    setSelectorVisible(false);
  }

  const optionTables = useMemo(() => {
    return normalizedValue.reduce<Record<string, OptionTableRow[]>>((result, option) => {
      result[option.id] = option.items.map((item, rowIndex) => {
        const matchedEntry = productSkuMap.get(`${item.productId}:${item.skuId}`);
        const product = matchedEntry?.product || productMap.get(item.productId);
        const sku = matchedEntry?.sku || product?.skus.find((candidate) => candidate.id === item.skuId);

        return {
          key: `${item.productId}:${item.skuId}`,
          rowIndex,
          productId: item.productId,
          skuId: item.skuId,
          productName: product?.name || '商品已失效',
          imageUrl: product?.carouselImages?.[0]?.url || '',
          status: product?.status || 'off',
          specText:
            product?.specMode === 'multi' ? sku?.specText || '默认规格' : '单规格',
          sourcePrice: sku?.price ?? 0,
          comboPrice: item.comboPrice,
          quantity: item.quantity,
          required: item.required,
          defaultSelected: item.required || item.defaultSelected === true,
          listed: item.listed !== false,
        };
      });
      return result;
    }, {});
  }, [normalizedValue, productMap, productSkuMap]);

  function moveOptionItem(
    optionId: string,
    skuId: string,
    direction: 'up' | 'down'
  ) {
    patchOption(optionId, (currentOption) => ({
      ...currentOption,
      items: moveComboOptionProductItem(currentOption.items, skuId, direction),
    }));
  }

  function columnTitle(label: string, tip: string) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        <Tooltip content={tip}>
          <IconQuestionCircle style={{ color: 'var(--color-text-3)', cursor: 'default' }} />
        </Tooltip>
      </span>
    );
  }

  function getColumns(option: ProductComboOptionItem) {
    return [
      {
        title: '商品信息',
        dataIndex: 'productName',
        render: (_: string, record: OptionTableRow) => (
          <div className={styles.productCell}>
            {record.imageUrl ? (
              <img className={styles.productImage} src={record.imageUrl} alt="" />
            ) : (
              <div className={styles.productImagePlaceholder} />
            )}
            <div className={styles.productInfo}>
              <div className={styles.productTitleRow}>
                <Tag bordered={false} color={getStatusColor(record.status)} size="small">
                  {getStatusLabel(record.status)}
                </Tag>
                <span className={styles.productName}>{record.productName}</span>
              </div>
              <div className={styles.productMeta}>SKU编码：{record.skuId}</div>
              <div className={styles.productMeta}>{record.specText}</div>
            </div>
          </div>
        ),
      },
      {
        title: '原单价',
        dataIndex: 'sourcePrice',
        width: 120,
        render: (price: number) => (
          <span className={styles.priceText}>{formatPrice(price)}</span>
        ),
      },
      {
        title: '组合售卖单价',
        dataIndex: 'comboPrice',
        width: 180,
        render: (price: number | undefined, record: OptionTableRow) => (
          <InputNumber
            className={styles.priceInput}
            min={0}
            precision={2}
            placeholder="请输入"
            value={price}
            onChange={(nextValue) => {
              const normalizedValue =
                typeof nextValue === 'number' &&
                Number.isFinite(nextValue) &&
                nextValue >= 0
                  ? nextValue
                  : undefined;
              patchOption(option.id, (currentOption) => ({
                ...currentOption,
                items: currentOption.items.map((item) =>
                  item.skuId === record.skuId
                    ? { ...item, comboPrice: normalizedValue }
                    : item
                ),
              }));
            }}
          />
        ),
      },
      {
        title: '数量',
        dataIndex: 'quantity',
        width: 120,
        render: (quantity: number, record: OptionTableRow) => (
          <InputNumber
            className={styles.quantityInput}
            min={1}
            precision={0}
            value={quantity}
            onChange={(nextValue) => {
              const normalizedValue =
                typeof nextValue === 'number' &&
                Number.isFinite(nextValue) &&
                nextValue > 0
                  ? Math.max(1, Math.floor(nextValue))
                  : 1;
              patchOption(option.id, (currentOption) => ({
                ...currentOption,
                items: currentOption.items.map((item) =>
                  item.skuId === record.skuId
                    ? { ...item, quantity: normalizedValue }
                    : item
                ),
              }));
            }}
          />
        ),
      },
      {
        title: '总价',
        dataIndex: 'comboPrice',
        width: 120,
        render: (price: number | undefined, record: OptionTableRow) => {
          if (price == null) return '—';
          const total = price * record.quantity;
          return <span className={styles.priceText}>{total.toFixed(2)}</span>;
        },
      },
      {
        title: columnTitle('默认选中', '开启后用户进入组合商品页时该商品默认处于选中状态，可节省用户操作步骤。默认选中数量不可超过该选项的选择限制数量。'),
        dataIndex: 'defaultSelected',
        width: 120,
        render: (defaultSelected: boolean, record: OptionTableRow) => (
          <Switch
            checked={defaultSelected}
            disabled={record.required}
            onChange={(checked) => {
              if (checked) {
                const currentCount = option.items.filter(
                  (item) => item.skuId !== record.skuId && item.defaultSelected === true
                ).length;
                if (currentCount >= option.selectionLimit) {
                  Message.warning('默认选中的数量不可超过选择限制数量');
                  return;
                }
              }

              patchOption(option.id, (currentOption) => ({
                ...currentOption,
                items: currentOption.items.map((item) =>
                  item.skuId === record.skuId
                    ? { ...item, defaultSelected: checked }
                    : item
                ),
              }));
            }}
          />
        ),
      },
      {
        title: columnTitle('上架', '控制该子商品在组合中是否对用户展示。关闭后用户在购买页中看不到该商品，但不影响组合本身的可售状态。必选商品无法下架。'),
        dataIndex: 'listed',
        width: 120,
        render: (listed: boolean, record: OptionTableRow) => (
          <Switch
            checked={listed}
            checkedText="上架"
            uncheckedText="下架"
            onChange={(checked) => {
              if (!checked) {
                const errorMessage = getDisableComboOptionProductListedError(
                  option,
                  record.skuId
                );

                if (errorMessage) {
                  Message.warning(errorMessage);
                  return;
                }
              }

              patchOption(option.id, (currentOption) => ({
                ...currentOption,
                items: currentOption.items.map((item) =>
                  item.skuId === record.skuId ? { ...item, listed: checked } : item
                ),
              }));
            }}
          />
        ),
      },
      {
        title: '操作',
        dataIndex: 'actions',
        width: 140,
        render: (_: unknown, record: OptionTableRow) => (
          <div className={styles.rowActions}>
            <div className={styles.sortActions}>
              <Tooltip content="上移">
                <span>
                  <Button
                    type="text"
                    size="mini"
                    className={styles.sortButton}
                    disabled={record.rowIndex === 0}
                    icon={<IconArrowUp />}
                    onClick={() => moveOptionItem(option.id, record.skuId, 'up')}
                  />
                </span>
              </Tooltip>
              <Tooltip content="下移">
                <span>
                  <Button
                    type="text"
                    size="mini"
                    className={styles.sortButton}
                    disabled={record.rowIndex === option.items.length - 1}
                    icon={<IconArrowDown />}
                    onClick={() => moveOptionItem(option.id, record.skuId, 'down')}
                  />
                </span>
              </Tooltip>
            </div>
            <Popconfirm
              focusLock
              title="确认移除该子商品吗？"
              onOk={() => {
                patchOption(option.id, (currentOption) => {
                  const nextItems = currentOption.items.filter(
                    (item) => item.skuId !== record.skuId
                  );
                  return {
                    ...currentOption,
                    selectionLimit: normalizeComboOptionSelectionLimit({
                      ...currentOption,
                      items: nextItems,
                    }),
                    items: nextItems,
                  };
                });
              }}
            >
              <Tooltip content="移除">
                <span>
                  <Button
                    type="text"
                    size="mini"
                    className={styles.removeButton}
                    disabled={!canRemoveComboOptionProduct(record.skuId, nonRemovableSkuIds)}
                    icon={<IconDelete />}
                  />
                </span>
              </Tooltip>
            </Popconfirm>
          </div>
        ),
      },
    ];
  }

  const comboTrialColumns = useMemo(
    () => [
      {
        title: '组合序号',
        dataIndex: 'comboIndex',
        width: 100,
        render: (value: number, record: ComboTrialTableRow) => ({
          children: (
            <div className={styles.trialIndexCell}>
              <span className={styles.priceText}>{value}</span>
              {record.isDefaultCombination && (
                <Tag size="small" color="arcoblue" bordered={false}>
                  默认组合
                </Tag>
              )}
            </div>
          ),
          props: {
            rowSpan: record.rowSpan,
          },
        }),
      },
      {
        title: '商品名称',
        dataIndex: 'productName',
        width: 280,
        render: (_: string, record: ComboTrialTableRow) => (
          <div className={styles.trialCell}>
            <div className={styles.productName}>{record.productName}</div>
            <div className={styles.productMeta}>{record.specText}</div>
          </div>
        ),
      },
      {
        title: '商品单价',
        dataIndex: 'unitPrice',
        width: 140,
        render: (price: number) => (
          <span className={styles.priceText}>{formatPrice(price)}</span>
        ),
      },
      {
        title: '商品数量',
        dataIndex: 'quantity',
        width: 140,
      },
      {
        title: '商品总价',
        dataIndex: 'subtotal',
        width: 160,
        render: (price: number) => (
          <span className={styles.priceText}>{formatPrice(price)}</span>
        ),
      },
      {
        title: '组合总价',
        dataIndex: 'totalPrice',
        width: 160,
        render: (price: number, record: ComboTrialTableRow) => ({
          children: <span className={styles.priceText}>{formatPrice(price)}</span>,
          props: {
            rowSpan: record.rowSpan,
          },
        }),
      },
    ],
    []
  );

  return (
    <div className={styles.container}>
      {normalizedValue.map((option, index) => {
        const tableRows = optionTables[option.id] || [];
        const optionType = getComboOptionType(option);

        return (
          <div key={option.id} className={styles.optionCard}>
            <div className={styles.optionHeader}>
              <Typography.Title className={styles.optionHeading} heading={6}>
                选项{index + 1}
              </Typography.Title>
              {allowDeleteOption && normalizedValue.length > 1 && (
                <Button
                  status="danger"
                  type="text"
                  className={styles.deleteOptionButton}
                  onClick={() => handleDeleteOption(option.id)}
                >
                  删除
                </Button>
              )}
            </div>

            <div className={styles.optionMetaGrid}>
              <div className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>选项标题</span>
                <Input
                  className={styles.titleInput}
                  maxLength={20}
                  value={option.title}
                  onChange={(nextValue) =>
                    patchOption(option.id, (previous) => ({
                      ...previous,
                      title: nextValue,
                    }))
                  }
                />
              </div>

              <div className={styles.fieldGroup}>
                <span className={styles.fieldLabelWithTip}>
                  <span className={styles.fieldLabel}>选项类型</span>
                  <Tooltip content="必购项：用户必须购买，不可取消；可选购项：用户从中选择 N 件商品；可加购项：用户自主决定是否加购">
                    <IconQuestionCircle
                      style={{ color: 'var(--color-text-3)', cursor: 'default' }}
                    />
                  </Tooltip>
                </span>
                <div className={styles.optionTypeField}>
                  <Radio.Group
                    type="button"
                    value={optionType}
                    onChange={(nextValue) => {
                      const nextOptionType = nextValue as ProductComboOptionType;

                      patchOption(option.id, (previous) => {
                        const nextItems = syncComboOptionItemsByType(
                          nextOptionType,
                          previous.items
                        );

                        return {
                          ...previous,
                          optionType: nextOptionType,
                          required: getComboOptionRequiredByType(nextOptionType),
                          selectionLimit:
                            nextOptionType === 'must_buy'
                              ? nextItems.length || 1
                              : normalizeComboOptionSelectionLimit({
                                  ...previous,
                                  selectionLimit: previous.selectionLimit,
                                  items: nextItems,
                                }),
                          items: nextItems,
                        };
                      });
                    }}
                  >
                    {COMBO_OPTION_TYPE_OPTIONS.map((item) => (
                      <Radio key={item.value} value={item.value}>
                        {item.label}
                      </Radio>
                    ))}
                  </Radio.Group>
                </div>
              </div>

              {!isMustBuyComboOption(option) && (
                <div className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>选择限制</span>
                  <div className={styles.limitField}>
                    <span className={styles.limitPrefix}>选择</span>
                    <Select
                      className={styles.limitSelect}
                      value={option.selectionLimit}
                      onChange={(nextValue) => {
                        const nextSelectionLimit = Number(nextValue) || 1;
                        const validationError = getComboOptionSelectionLimitError(
                          option,
                          nextSelectionLimit
                        );

                        if (validationError) {
                          Message.warning(validationError);
                          return;
                        }

                        patchOption(option.id, (previous) => ({
                          ...previous,
                          selectionLimit: nextSelectionLimit,
                        }));
                      }}
                    >
                      {SELECTION_LIMIT_OPTIONS.map((count) => (
                        <Select.Option key={count} value={count}>
                          {count} 份
                        </Select.Option>
                      ))}
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.optionActions}>
              <Button type="outline" icon={<IconPlus />} onClick={() => handleAddProducts(option.id)}>
                添加商品
              </Button>
            </div>

            <Table
              className={styles.table}
              rowKey="key"
              columns={getColumns(option)}
              data={tableRows}
              pagination={false}
              scroll={{ x: 980 }}
              noDataElement={
                <Empty
                  description={'暂无配置商品，请点击"添加商品"'}
                  className={styles.tableEmpty}
                />
              }
            />
          </div>
        );
      })}

      <div className={styles.footer}>
        <div className={styles.footerActions}>
          <Button
            type="outline"
            icon={<IconPlus />}
            disabled={normalizedValue.length >= MAX_OPTION_COUNT}
            onClick={handleAddOption}
          >
            新增选项（{normalizedValue.length}/{MAX_OPTION_COUNT}）
          </Button>
          <Button type="outline" onClick={handleOpenTrial}>
            组合试算
          </Button>
        </div>
      </div>

      <MarketingProductSelector
        visible={selectorVisible}
        title="选择商品"
        selectedSkuIds={currentSelectedSkuIds}
        data={selectorData}
        onCancel={() => setSelectorVisible(false)}
        onConfirm={handleSelectorConfirm}
      />

      <Modal
        title="组合试算"
        visible={trialVisible}
        autoFocus={false}
        focusLock
        footer={null}
        style={{ width: 980 }}
        onCancel={() => setTrialVisible(false)}
      >
        <div className={styles.trialModalContent}>
          <div className={styles.trialSummary}>
            <div className={styles.trialHint}>当前仅支持 2 个选项卡且每组选 1 份的组合试算</div>
            {comboTrialResult.supported && (
              <div className={styles.trialCount}>共 {comboTrialResult.rows.length} 个组合</div>
            )}
          </div>

          {comboTrialResult.supported ? (
            <Table
              rowKey="key"
              className={styles.table}
              columns={comboTrialColumns}
              data={comboTrialTableRows}
              pagination={false}
              scroll={{ x: 800 }}
            />
          ) : (
            <Empty
              description={comboTrialResult.reason || '当前配置暂不支持试算'}
              className={styles.trialEmpty}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
