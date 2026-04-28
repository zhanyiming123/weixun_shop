import React, { useMemo, useState } from 'react';
import {
  Button,
  Input,
  InputNumber,
  Table,
  Tag,
  Typography,
} from '@arco-design/web-react';
import { IconSearch } from '@arco-design/web-react/icon';
import type { ProductListItem } from '@/types/product';
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
import styles from './bundle-product-table.module.less';

export type BundleProductItem = {
  productId: string;
  skuId: string;
  discountPrice?: number;
};

type SpuRow = {
  key: string;
  rowType: 'spu';
  productId: string;
  productName: string;
  imageUrl: string;
  status: ProductStatus;
  prices: number[];
  children: SkuRow[];
};

type SkuRow = {
  key: string;
  rowType: 'sku';
  productId: string;
  skuId: string;
  productName: string;
  imageUrl: string;
  status: ProductStatus;
  specText: string;
  price: number;
  discountPrice?: number;
};

type TableRow = SpuRow | SkuRow;

type BundleProductTableProps = {
  products: ProductListItem[];
  value: BundleProductItem[];
  onChange: (value: BundleProductItem[]) => void;
};

function getStatusLabel(status: ProductStatus) {
  return status === 'on' ? '在售' : '仓库';
}

function getStatusColor(status: ProductStatus) {
  return status === 'on' ? 'green' : 'arcoblue';
}

function formatPrice(price: number) {
  return `¥${price.toFixed(2)}`;
}

function formatPriceRange(prices: number[]) {
  if (!prices.length) return '-';
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatPrice(min) : `${min.toFixed(2)}-${max.toFixed(2)}`;
}

function buildSelectorData(
  products: ProductListItem[],
  catalogItems: ReturnType<typeof readProductCatalogItems>,
  ownershipItems: ReturnType<typeof readProductOwnershipItems>
): MarketingProductSelectorSpuItem[] {
  return products.map((product) => {
    const catalogPath = getProductCatalogPathById(product.productCatalogId, catalogItems);
    const ownershipPath = getProductOwnershipPathById(product.productOwnershipId, ownershipItems);
    const catalogLabel = catalogPath[catalogPath.length - 1] || '';
    const ownershipLabel = ownershipPath[ownershipPath.length - 1] || '';

    const children = product.skus.map((sku) => ({
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
      selectable: true,
      disabledReason: '',
    }));

    const hasSelectableSku = children.length > 0;
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

function buildTableRows(
  value: BundleProductItem[],
  products: ProductListItem[]
): SpuRow[] {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const grouped = new Map<string, BundleProductItem[]>();

  for (const item of value) {
    const list = grouped.get(item.productId) || [];
    list.push(item);
    grouped.set(item.productId, list);
  }

  const rows: SpuRow[] = [];
  for (const [productId, items] of Array.from(grouped)) {
    const product = productMap.get(productId);
    if (!product) continue;

    const imageUrl = product.carouselImages?.[0]?.url || '';
    const skuMap = new Map(product.skus.map((s) => [s.id, s]));

    const children: SkuRow[] = items.map((item) => {
      const sku = skuMap.get(item.skuId);
      return {
        key: item.skuId,
        rowType: 'sku',
        productId,
        skuId: item.skuId,
        productName: product.name,
        imageUrl,
        status: product.status,
        specText: sku
          ? product.specMode === 'multi'
            ? sku.specText || '默认规格'
            : '单规格'
          : '',
        price: sku?.price ?? 0,
        discountPrice: item.discountPrice,
      };
    });

    const prices = children.map((c) => c.price);
    rows.push({
      key: `spu-${productId}`,
      rowType: 'spu',
      productId,
      productName: product.name,
      imageUrl,
      status: product.status,
      prices,
      children,
    });
  }

  return rows;
}

export default function BundleProductTable({
  products,
  value,
  onChange,
}: BundleProductTableProps) {
  const catalogItems = useMemo(() => readProductCatalogItems(), []);
  const ownershipItems = useMemo(() => readProductOwnershipItems(), []);
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');

  const selectorData = useMemo(
    () => buildSelectorData(products, catalogItems, ownershipItems),
    [products, catalogItems, ownershipItems]
  );

  const selectedSkuIds = useMemo(() => value.map((item) => item.skuId), [value]);

  const tableRows = useMemo(() => buildTableRows(value, products), [value, products]);

  const spuCount = tableRows.length;
  const totalDiscountAmount = value.reduce((sum, item) => sum + (item.discountPrice || 0), 0);

  const priceRange = useMemo(() => {
    const allPrices = tableRows.flatMap((row) => row.children.map((c) => c.price - (c.discountPrice || 0)));
    if (!allPrices.length) return null;
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    return { min, max };
  }, [tableRows]);

  function handleSelectorConfirm(nextSkuIds: string[]) {
    const nextSkuIdSet = new Set(nextSkuIds);
    const kept = value.filter((item) => nextSkuIdSet.has(item.skuId));
    const keptIds = new Set(kept.map((item) => item.skuId));
    const added: BundleProductItem[] = nextSkuIds
      .filter((id) => !keptIds.has(id))
      .map((skuId) => {
        const product = products.find((p) => p.skus.some((s) => s.id === skuId));
        return {
          productId: product?.id || '',
          skuId,
          discountPrice: undefined,
        };
      })
      .filter((item) => item.productId);

    onChange([...kept, ...added]);
    setSelectorVisible(false);
  }

  function handleRemoveSku(skuId: string) {
    onChange(value.filter((item) => item.skuId !== skuId));
  }

  function handleDiscountPriceChange(skuId: string, price: number | undefined) {
    onChange(
      value.map((item) =>
        item.skuId === skuId ? { ...item, discountPrice: price } : item
      )
    );
  }

  const columns = [
    {
      title: '商品名称',
      dataIndex: 'productName',
      render: (_: string, record: TableRow) => {
        const isSpu = record.rowType === 'spu';
        const skuCode = !isSpu ? (record as SkuRow).skuId : null;
        const productCode = isSpu ? (record as SpuRow).productId : null;
        return (
          <div className={`${styles.productCell} ${isSpu ? '' : styles.skuProductCell}`}>
            {record.imageUrl ? (
              <img className={styles.productImage} src={record.imageUrl} alt="" />
            ) : (
              <div className={styles.productImagePlaceholder} />
            )}
            <div className={styles.productInfo}>
              <div className={styles.productTitleRow}>
                <Tag
                  bordered={false}
                  color={getStatusColor(record.status)}
                  size="small"
                >
                  {getStatusLabel(record.status)}
                </Tag>
                <span className={styles.productName}>{record.productName}</span>
              </div>
              <div className={styles.productCode}>
                {isSpu ? `商品编码：${productCode}` : `SKU编码：${skuCode}`}
              </div>
              {!isSpu && (
                <div className={styles.productCode}>{(record as SkuRow).specText}</div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: '原售价',
      dataIndex: 'price',
      width: 140,
      render: (_: unknown, record: TableRow) => {
        if (record.rowType === 'spu') {
          return <span className={styles.priceText}>{formatPriceRange(record.prices)}</span>;
        }
        return <span className={styles.priceText}>{(record as SkuRow).price.toFixed(2)}</span>;
      },
    },
    {
      title: (
        <span>
          <span className={styles.requiredMark}>*</span>优惠金额(直降金额)
        </span>
      ),
      dataIndex: 'discountPrice',
      width: 180,
      render: (_: unknown, record: TableRow) => {
        if (record.rowType === 'spu') return null;
        const sku = record as SkuRow;
        return (
          <InputNumber
            className={styles.discountInput}
            min={0}
            precision={1}
            placeholder="请输入"
            value={sku.discountPrice}
            onChange={(v) =>
              handleDiscountPriceChange(sku.skuId, typeof v === 'number' ? v : undefined)
            }
          />
        );
      },
    },
    {
      title: '操作',
      dataIndex: 'actions',
      width: 80,
      render: (_: unknown, record: TableRow) => {
        if (record.rowType === 'spu') return null;
        const sku = record as SkuRow;
        return (
          <Button
            className={styles.removeButton}
            type="text"
            size="small"
            onClick={() => handleRemoveSku(sku.skuId)}
          >
            撤出
          </Button>
        );
      },
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <Typography.Text className={styles.warningText} type="warning">
          <span className={styles.warningDot}>!</span>
          仅本店铺自建商品可组套餐包
        </Typography.Text>
        <div className={styles.toolbarRight}>
          <Input
            className={styles.searchInput}
            placeholder="请输入商品编码"
            prefix={<IconSearch />}
            value={searchKeyword}
            onChange={setSearchKeyword}
          />
          <Button type="outline" onClick={() => setSelectorVisible(true)}>
            在线选品
          </Button>
        </div>
      </div>

      <Table
        className={styles.table}
        rowKey="key"
        columns={columns}
        data={tableRows}
        indentSize={0}
        noDataElement="暂无商品，请点击「在线选品」添加"
        expandProps={{ strictTreeData: false }}
        pagination={false}
        scroll={{ x: 760 }}
        tableLayoutFixed
      />

      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          <Typography.Text type="secondary">（共{spuCount}个spu）</Typography.Text>
        </div>
        {spuCount > 0 && (
          <div className={styles.footerRight}>
            {priceRange && (
              <Typography.Text>
                套装促销价：
                <Typography.Text style={{ color: '#f53f3f' }}>
                  ¥{priceRange.min.toFixed(2)}
                  {priceRange.max !== priceRange.min ? `~${priceRange.max.toFixed(2)}` : ''}
                </Typography.Text>
              </Typography.Text>
            )}
            {totalDiscountAmount > 0 && (
              <Typography.Text>
                直降金额共计优惠{totalDiscountAmount.toFixed(2)}元
              </Typography.Text>
            )}
          </div>
        )}
      </div>

      <MarketingProductSelector
        visible={selectorVisible}
        title="选择商品"
        selectedSkuIds={selectedSkuIds}
        data={selectorData}
        onCancel={() => setSelectorVisible(false)}
        onConfirm={handleSelectorConfirm}
      />
    </div>
  );
}
