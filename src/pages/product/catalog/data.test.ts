import { describe, expect, it } from 'vitest';
import {
  buildProductCatalogCascaderOptions,
  buildProductCatalogLeafItems,
  getProductCatalogLeafById,
  normalizeProductCatalogItems,
  type ProductCatalogConfigItem,
} from './data';

describe('product catalog data helpers', () => {
  it('defaults legacy catalog items to enabled and assigns fallback sort order', () => {
    const items = normalizeProductCatalogItems([
      {
        id: 'root',
        name: '课程类目',
        parentId: null,
        hasSkuSpec: false,
      },
    ] as ProductCatalogConfigItem[]);

    expect(items).toEqual([
      {
        id: 'root',
        name: '课程类目',
        parentId: null,
        hasSkuSpec: false,
        sort: 1,
        enabled: true,
      },
    ]);
  });

  it('sorts by sort value descending and marks descendants as unavailable when parent catalog is disabled', () => {
    const items: ProductCatalogConfigItem[] = [
      {
        id: 'root_disabled',
        name: '停用类目',
        parentId: null,
        sort: 2,
        enabled: false,
      },
      {
        id: 'child_enabled',
        name: '仍启用的子类目',
        parentId: 'root_disabled',
        hasSkuSpec: true,
        sort: 1,
        enabled: true,
      },
      {
        id: 'root_enabled',
        name: '正常类目',
        parentId: null,
        sort: 1,
        enabled: true,
      },
      {
        id: 'leaf_enabled',
        name: '正常叶子类目',
        parentId: 'root_enabled',
        hasSkuSpec: false,
        sort: 1,
        enabled: true,
      },
    ];

    expect(buildProductCatalogLeafItems(items)).toEqual([
      {
        id: 'child_enabled',
        label: '仍启用的子类目',
        labelPath: ['停用类目', '仍启用的子类目'],
        path: ['root_disabled', 'child_enabled'],
        hasSkuSpec: true,
        enabled: false,
      },
      {
        id: 'leaf_enabled',
        label: '正常叶子类目',
        labelPath: ['正常类目', '正常叶子类目'],
        path: ['root_enabled', 'leaf_enabled'],
        hasSkuSpec: false,
        enabled: true,
      },
    ]);

    expect(buildProductCatalogCascaderOptions(items)).toEqual([
      {
        value: 'root_disabled',
        label: '停用类目',
        disabled: true,
        children: [
          {
            value: 'child_enabled',
            label: '仍启用的子类目',
            disabled: true,
          },
        ],
      },
      {
        value: 'root_enabled',
        label: '正常类目',
        disabled: false,
        children: [
          {
            value: 'leaf_enabled',
            label: '正常叶子类目',
            disabled: false,
          },
        ],
      },
    ]);

    expect(getProductCatalogLeafById('child_enabled', items)).toEqual({
      id: 'child_enabled',
      label: '仍启用的子类目',
      labelPath: ['停用类目', '仍启用的子类目'],
      path: ['root_disabled', 'child_enabled'],
      hasSkuSpec: true,
      enabled: false,
    });
  });
});
