import React, { useMemo, useState } from 'react';
import {
  Button,
  Empty,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Switch,
  Table,
  Tag,
  Typography,
} from '@arco-design/web-react';
import { IconPlus } from '@arco-design/web-react/icon';
import type {
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
import styles from './combo-product-config-card.module.less';

const MAX_OPTION_COUNT = 5;
const SELECTION_LIMIT_OPTIONS = Array.from({ length: 10 }, (_, index) => index + 1);

type ComboProductConfigCardProps = {
  products: ProductListItem[];
  value: ProductComboOptionItem[];
  onChange: (value: ProductComboOptionItem[]) => void;
};

type OptionTableRow = {
  key: string;
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
};

function createOptionId() {
  return `option_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultComboOption(optionIndex: number): ProductComboOptionItem {
  return {
    id: createOptionId(),
    title: `选项${optionIndex}`,
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
  const [activeOptionId, setActiveOptionId] = useState<string>();

  const activeOption = useMemo(
    () => value.find((item) => item.id === activeOptionId),
    [activeOptionId, value]
  );
  const currentSelectedSkuIds = useMemo(
    () => activeOption?.items.map((item) => item.skuId) || [],
    [activeOption]
  );
  const currentSelectedSkuIdSet = useMemo(
    () => new Set(currentSelectedSkuIds),
    [currentSelectedSkuIds]
  );
  const lockedSkuIdSet = useMemo(
    () =>
      new Set(
        value
          .filter((item) => item.id !== activeOptionId)
          .flatMap((item) => item.items.map((productItem) => productItem.skuId))
      ),
    [activeOptionId, value]
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

  function patchOptions(
    updater: (previous: ProductComboOptionItem[]) => ProductComboOptionItem[]
  ) {
    onChange(updater(value));
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
    if (value.length >= MAX_OPTION_COUNT) {
      return;
    }

    onChange([...value, createDefaultComboOption(value.length + 1)]);
  }

  function handleDeleteOption(optionId: string) {
    if (value.length <= 1) {
      return;
    }

    const targetOption = value.find((option) => option.id === optionId);

    Modal.confirm({
      title: '确认删除选项',
      content: `删除后将同步清空「${targetOption?.title || '当前选项'}」下已配置的商品，是否继续？`,
      okText: '确认删除',
      cancelText: '取消',
      onOk: () => {
        onChange(value.filter((option) => option.id !== optionId));
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

    patchOption(activeOptionId, (option) => {
      const nextSkuIdSet = new Set(nextSkuIds);
      const keptItems = option.items.filter((item) => nextSkuIdSet.has(item.skuId));
      const keptSkuIdSet = new Set(keptItems.map((item) => item.skuId));
      const addedItems = nextSkuIds
        .filter((skuId) => !keptSkuIdSet.has(skuId))
        .flatMap((skuId) => {
          const matchedEntry = skuLookupById.get(skuId);

          if (!matchedEntry) {
            return [];
          }

          return [
            {
              productId: matchedEntry.product.id,
              skuId: matchedEntry.sku.id,
              comboPrice: undefined,
              quantity: 1,
              required: option.required,
            },
          ];
        });
      const nextItems = [...keptItems, ...addedItems];

      return {
        ...option,
        selectionLimit: nextItems.length
          ? Math.min(option.selectionLimit, nextItems.length)
          : 1,
        items: nextItems,
      };
    });

    setSelectorVisible(false);
  }

  const optionTables = useMemo(() => {
    return value.reduce<Record<string, OptionTableRow[]>>((result, option) => {
      result[option.id] = option.items.map((item) => {
        const matchedEntry = productSkuMap.get(`${item.productId}:${item.skuId}`);
        const product = matchedEntry?.product || productMap.get(item.productId);
        const sku = matchedEntry?.sku || product?.skus.find((candidate) => candidate.id === item.skuId);

        return {
          key: `${item.productId}:${item.skuId}`,
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
        };
      });
      return result;
    }, {});
  }, [productMap, productSkuMap, value]);

  function getColumns(optionId: string) {
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
        title: '单价',
        dataIndex: 'sourcePrice',
        width: 120,
        render: (price: number) => (
          <span className={styles.priceText}>{formatPrice(price)}</span>
        ),
      },
      {
        title: '套餐售卖单价',
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
              patchOption(optionId, (option) => ({
                ...option,
                items: option.items.map((item) =>
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
              patchOption(optionId, (option) => ({
                ...option,
                items: option.items.map((item) =>
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
        title: '是否必选',
        dataIndex: 'required',
        width: 120,
        render: (required: boolean, record: OptionTableRow) => (
          <Switch
            checked={required}
            checkedText="必选"
            uncheckedText="非必选"
            onChange={(checked) => {
              patchOption(optionId, (option) => ({
                ...option,
                items: option.items.map((item) =>
                  item.skuId === record.skuId
                    ? { ...item, required: checked }
                    : item
                ),
              }));
            }}
          />
        ),
      },
      {
        title: '操作',
        dataIndex: 'actions',
        width: 88,
        render: (_: unknown, record: OptionTableRow) => (
          <Button
            type="text"
            size="small"
            className={styles.removeButton}
            onClick={() => {
              patchOption(optionId, (option) => {
                const nextItems = option.items.filter((item) => item.skuId !== record.skuId);
                return {
                  ...option,
                  selectionLimit: nextItems.length
                    ? Math.min(option.selectionLimit, nextItems.length)
                    : 1,
                  items: nextItems,
                };
              });
            }}
          >
            移除
          </Button>
        ),
      },
    ];
  }

  return (
    <div className={styles.container}>
      {value.map((option, index) => {
        const tableRows = optionTables[option.id] || [];

        return (
          <div key={option.id} className={styles.optionCard}>
            <div className={styles.optionHeader}>
              <Typography.Title className={styles.optionHeading} heading={6}>
                选项{index + 1}
              </Typography.Title>
              {value.length > 1 && (
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
                <span className={styles.fieldLabel}>是否必选</span>
                <Radio.Group
                  type="button"
                  value={option.required ? 'required' : 'optional'}
                  onChange={(nextValue) =>
                    patchOption(option.id, (previous) => ({
                      ...previous,
                      required: nextValue === 'required',
                    }))
                  }
                >
                  <Radio value="required">必选</Radio>
                  <Radio value="optional">非必选</Radio>
                </Radio.Group>
              </div>

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
                <span className={styles.fieldLabel}>选择限制</span>
                <div className={styles.limitField}>
                  <span className={styles.limitPrefix}>选择</span>
                  <Select
                    className={styles.limitSelect}
                    value={option.selectionLimit}
                    onChange={(nextValue) =>
                      patchOption(option.id, (previous) => ({
                        ...previous,
                        selectionLimit: Number(nextValue) || 1,
                      }))
                    }
                  >
                    {SELECTION_LIMIT_OPTIONS.map((count) => (
                      <Select.Option key={count} value={count}>
                        {count} 份
                      </Select.Option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>

            <div className={styles.optionActions}>
              <Button type="outline" icon={<IconPlus />} onClick={() => handleAddProducts(option.id)}>
                添加商品
              </Button>
            </div>

            <Table
              className={styles.table}
              rowKey="key"
              columns={getColumns(option.id)}
              data={tableRows}
              pagination={false}
              scroll={{ x: 980 }}
              noDataElement={
                <Empty
                  description="暂无配置商品，请点击“添加商品”"
                  className={styles.tableEmpty}
                />
              }
            />
          </div>
        );
      })}

      <div className={styles.footer}>
        <Button
          type="outline"
          icon={<IconPlus />}
          disabled={value.length >= MAX_OPTION_COUNT}
          onClick={handleAddOption}
        >
          新增选项（{value.length}/{MAX_OPTION_COUNT}）
        </Button>
      </div>

      <MarketingProductSelector
        visible={selectorVisible}
        title="选择商品"
        selectedSkuIds={currentSelectedSkuIds}
        data={selectorData}
        onCancel={() => setSelectorVisible(false)}
        onConfirm={handleSelectorConfirm}
      />
    </div>
  );
}
