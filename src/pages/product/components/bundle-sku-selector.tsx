import React, { useMemo } from 'react';
import { Select, Typography } from '@arco-design/web-react';
import { formatPriceNumber } from '@/lib/format';
import type { ProductBundleComponentItem, ProductListItem } from '@/types/product';
import styles from './bundle-sku-selector.module.less';

type BundleSkuSelectorProps = {
  products: ProductListItem[];
  value: ProductBundleComponentItem[];
  disabled?: boolean;
  onChange: (value: ProductBundleComponentItem[]) => void;
};

type BundleSkuOption = {
  optionKey: string;
  productId: string;
  skuId: string;
  label: string;
};

function toOptionKey(productId: string, skuId: string) {
  return `${productId}::${skuId}`;
}

function parseOptionKey(optionKey?: string) {
  if (!optionKey) {
    return undefined;
  }

  const [productId, skuId] = optionKey.split('::');
  if (!productId || !skuId) {
    return undefined;
  }

  return {
    productId,
    skuId,
  };
}

function BundleSkuSelector({
  products,
  value,
  disabled = false,
  onChange,
}: BundleSkuSelectorProps) {
  const skuOptions = useMemo<BundleSkuOption[]>(() => {
    return products.flatMap((product) =>
      (product.skus || []).map((sku, index) => ({
        optionKey: toOptionKey(product.id, sku.id),
        productId: product.id,
        skuId: sku.id,
        label: `${product.name} / ${
          sku.specText || (index === 0 ? '默认规格' : `规格${index + 1}`)
        } / ¥${formatPriceNumber(sku.price)} / 库存${sku.stock}`,
      }))
    );
  }, [products]);

  const firstValue = value[0] ? toOptionKey(value[0].productId, value[0].skuId) : undefined;
  const secondValue = value[1] ? toOptionKey(value[1].productId, value[1].skuId) : undefined;

  function patchValue(index: 0 | 1, optionKey?: string) {
    const next = [...value];
    const parsed = parseOptionKey(optionKey);

    if (!parsed) {
      next.splice(index, 1);
    } else {
      next[index] = parsed;
    }

    const normalized = next.filter(Boolean).slice(0, 2);
    const deduplicated = normalized.filter((item, targetIndex) => {
      const key = toOptionKey(item.productId, item.skuId);
      return normalized.findIndex((candidate) => toOptionKey(candidate.productId, candidate.skuId) === key) === targetIndex;
    });

    onChange(deduplicated);
  }

  return (
    <div className={styles.panel}>
      <div className={styles.row}>
        <span className={styles.label}>组件 1</span>
        <Select
          allowClear
          className={styles.select}
          disabled={disabled}
          placeholder="请选择第一个组件 SKU"
          value={firstValue}
          onChange={(nextValue) => patchValue(0, nextValue)}
        >
          {skuOptions.map((item) => (
            <Select.Option
              key={item.optionKey}
              value={item.optionKey}
              disabled={item.optionKey === secondValue}
            >
              {item.label}
            </Select.Option>
          ))}
        </Select>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>组件 2</span>
        <Select
          allowClear
          className={styles.select}
          disabled={disabled}
          placeholder="请选择第二个组件 SKU"
          value={secondValue}
          onChange={(nextValue) => patchValue(1, nextValue)}
        >
          {skuOptions.map((item) => (
            <Select.Option
              key={item.optionKey}
              value={item.optionKey}
              disabled={item.optionKey === firstValue}
            >
              {item.label}
            </Select.Option>
          ))}
        </Select>
      </div>

      <Typography.Text className={styles.hint}>
        套餐固定为 1+1 组合，不支持选择套餐商品作为组件。
      </Typography.Text>
    </div>
  );
}

export default BundleSkuSelector;
