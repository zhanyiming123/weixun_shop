import { describe, expect, it } from 'vitest';
import {
  buildProductOwnershipCascaderOptions,
  buildProductOwnershipLeafItems,
  getProductOwnershipLeafById,
  normalizeProductOwnershipItems,
  type ProductOwnershipConfigItem,
} from './data';

describe('product ownership data helpers', () => {
  it('defaults legacy ownership items to enabled and assigns fallback sort order', () => {
    const items = normalizeProductOwnershipItems([
      {
        id: 'root',
        name: '总部',
        parentId: null,
      },
    ] as ProductOwnershipConfigItem[]);

    expect(items).toEqual([
      {
        id: 'root',
        name: '总部',
        parentId: null,
        sort: 1,
        enabled: true,
      },
    ]);
  });

  it('sorts by sort value descending and marks descendants as unavailable when parent ownership is disabled', () => {
    const items: ProductOwnershipConfigItem[] = [
      {
        id: 'root_disabled',
        name: '停用分类',
        parentId: null,
        sort: 2,
        enabled: false,
      },
      {
        id: 'child_enabled',
        name: '仍启用的子分类',
        parentId: 'root_disabled',
        sort: 1,
        enabled: true,
      },
      {
        id: 'root_enabled',
        name: '正常分类',
        parentId: null,
        sort: 1,
        enabled: true,
      },
      {
        id: 'leaf_enabled',
        name: '正常叶子分类',
        parentId: 'root_enabled',
        sort: 1,
        enabled: true,
      },
    ];

    expect(buildProductOwnershipLeafItems(items)).toEqual([
      {
        id: 'child_enabled',
        label: '仍启用的子分类',
        labelPath: ['停用分类', '仍启用的子分类'],
        path: ['root_disabled', 'child_enabled'],
        enabled: false,
      },
      {
        id: 'leaf_enabled',
        label: '正常叶子分类',
        labelPath: ['正常分类', '正常叶子分类'],
        path: ['root_enabled', 'leaf_enabled'],
        enabled: true,
      },
    ]);

    expect(buildProductOwnershipCascaderOptions(items)).toEqual([
      {
        value: 'root_disabled',
        label: '停用分类',
        disabled: true,
        children: [
          {
            value: 'child_enabled',
            label: '仍启用的子分类',
            disabled: true,
          },
        ],
      },
      {
        value: 'root_enabled',
        label: '正常分类',
        disabled: false,
        children: [
          {
            value: 'leaf_enabled',
            label: '正常叶子分类',
            disabled: false,
          },
        ],
      },
    ]);

    expect(getProductOwnershipLeafById('child_enabled', items)).toEqual({
      id: 'child_enabled',
      label: '仍启用的子分类',
      labelPath: ['停用分类', '仍启用的子分类'],
      path: ['root_disabled', 'child_enabled'],
      enabled: false,
    });
  });
});
