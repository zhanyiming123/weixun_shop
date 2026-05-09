import { describe, expect, it } from 'vitest';
import {
  applyProductSkuBatchPatch,
  buildDefaultSelectedProductSpecIds,
  buildProductCreateSpecItems,
  buildProductSkuAttributeRowsFromSkus,
  buildProductSkuAttributeRowsFromSpecItems,
  buildProductSpecDimensionsFromCatalogSpecs,
  formatProductCreateSpecText,
  getSelectableProductSpecsForRow,
  hasProductSpecSelectionDraft,
  normalizeSelectedProductSpecValues,
  normalizeSelectedProductSpecIds,
  parseProductSpecText,
} from './spec';

describe('product create spec helpers', () => {
  it('deduplicates selected spec values', () => {
    expect(
      normalizeSelectedProductSpecValues([' 红色 ', '蓝色', '红色', '', '  '])
    ).toEqual(['红色', '蓝色']);
  });

  it('deduplicates selected spec ids and drops invalid ids', () => {
    expect(
      normalizeSelectedProductSpecIds(
        [' spec_grade ', '', 'spec_system', 'spec_grade', 'spec_missing'],
        [
          { id: 'spec_grade' },
          { id: 'spec_system' },
        ]
      )
    ).toEqual(['spec_grade', 'spec_system']);
  });

  it('prefills all bound catalog specs in order for create page selection', () => {
    expect(
      buildDefaultSelectedProductSpecIds([
        { id: ' spec_grade ' },
        { id: 'spec_system' },
        { id: 'spec_grade' },
        { id: ' ' },
      ])
    ).toEqual(['spec_grade', 'spec_system']);
  });

  it('keeps current row option selectable while excluding specs chosen in other rows', () => {
    const specs = [
      {
        id: 'spec_grade',
        catalogIds: ['catalog_1'],
        name: '年级',
        values: ['10年级'],
        enabled: true,
        createdAt: '',
      },
      {
        id: 'spec_system',
        catalogIds: ['catalog_1'],
        name: '课程体系',
        values: ['IB'],
        enabled: true,
        createdAt: '',
      },
      {
        id: 'spec_mode',
        catalogIds: ['catalog_1'],
        name: '授课形式',
        values: ['直播'],
        enabled: true,
        createdAt: '',
      },
    ];

    expect(
      getSelectableProductSpecsForRow(
        specs,
        ['spec_grade', 'spec_system', ''],
        2
      ).map((item) => item.id)
    ).toEqual(['spec_mode']);

    expect(
      getSelectableProductSpecsForRow(
        specs,
        ['spec_grade', 'spec_system', ''],
        1
      ).map((item) => item.id)
    ).toEqual(['spec_system', 'spec_mode']);
  });

  it('builds sku combos for a single dimension', () => {
    const result = buildProductCreateSpecItems(
      [
        {
          id: 'spec_class_type',
          catalogIds: ['international'],
          name: '班型',
          values: ['1v1', '1v4'],
          enabled: true,
          createdAt: '2026-05-04 10:00:00',
        },
      ],
      {
        spec_class_type: ['1v1', '1v4'],
      }
    );

    expect(result).toEqual([
      {
        id: '班型:1v1',
        name: '班型',
        value: '1v1',
        specPairs: [{ name: '班型', value: '1v1' }],
      },
      {
        id: '班型:1v4',
        name: '班型',
        value: '1v4',
        specPairs: [{ name: '班型', value: '1v4' }],
      },
    ]);
  });

  it('builds cartesian sku combos for multiple dimensions', () => {
    const result = buildProductCreateSpecItems(
      [
        {
          id: 'spec_color',
          catalogIds: ['catalog_1'],
          name: '颜色',
          values: ['红色', '蓝色'],
          enabled: true,
          createdAt: '2026-05-04 10:00:00',
        },
        {
          id: 'spec_size',
          catalogIds: ['catalog_1'],
          name: '尺码',
          values: ['M', 'L'],
          enabled: true,
          createdAt: '2026-05-04 10:05:00',
        },
      ],
      {
        spec_color: ['红色', '蓝色'],
        spec_size: ['M', 'L'],
      }
    );

    expect(result.map((item) => formatProductCreateSpecText(item, 0))).toEqual([
      '颜色：红色 / 尺码：M',
      '颜色：红色 / 尺码：L',
      '颜色：蓝色 / 尺码：M',
      '颜色：蓝色 / 尺码：L',
    ]);
  });

  it('returns no sku combos when any selected spec has no chosen value', () => {
    expect(
      buildProductCreateSpecItems(
        [
          {
            id: 'spec_color',
            catalogIds: ['catalog_1'],
            name: '颜色',
            values: ['红色'],
            enabled: true,
            createdAt: '2026-05-04 10:00:00',
          },
          {
            id: 'spec_size',
            catalogIds: ['catalog_1'],
            name: '尺码',
            values: ['M'],
            enabled: true,
            createdAt: '2026-05-04 10:05:00',
          },
        ],
        {
          spec_color: ['红色'],
          spec_size: [],
        }
      )
    ).toEqual([]);
  });

  it('detects whether the current multi-spec draft should be cleared', () => {
    expect(hasProductSpecSelectionDraft([], {})).toBe(false);
    expect(hasProductSpecSelectionDraft(['spec_color'], {})).toBe(true);
    expect(hasProductSpecSelectionDraft([], { spec_color: ['红色'] })).toBe(true);
  });

  it('builds fixed spec dimensions from catalog presets and selected values', () => {
    expect(
      buildProductSpecDimensionsFromCatalogSpecs(
        [
          {
            id: 'spec_grade',
            catalogIds: ['catalog_1'],
            name: '年级',
            values: ['10年级', '11年级'],
            enabled: true,
            createdAt: '2026-05-04 10:00:00',
          },
          {
            id: 'spec_system',
            catalogIds: ['catalog_1'],
            name: '课程体系',
            values: ['IB', 'IG'],
            enabled: true,
            createdAt: '2026-05-04 10:05:00',
          },
        ],
        {
          spec_grade: ['10年级'],
          spec_system: ['IB', 'IG'],
        }
      )
    ).toEqual([
      {
        key: 'spec_0',
        label: '年级',
        values: ['10年级'],
        named: true,
      },
      {
        key: 'spec_1',
        label: '课程体系',
        values: ['IB', 'IG'],
        named: true,
      },
    ]);
  });

  it('parses named sku texts back into ordered spec pairs', () => {
    expect(parseProductSpecText('年级：10年级 / 课程体系：IB')).toEqual([
      {
        name: '年级',
        value: '10年级',
      },
      {
        name: '课程体系',
        value: 'IB',
      },
    ]);
  });

  it('builds create-page attribute rows and keeps only one visible default sku', () => {
    const rows = buildProductSkuAttributeRowsFromSpecItems(
      [
        {
          id: '年级:10年级|课程体系:IB',
          name: '',
          value: '',
          specPairs: [
            { name: '年级', value: '10年级' },
            { name: '课程体系', value: 'IB' },
          ],
        },
        {
          id: '年级:10年级|课程体系:IG',
          name: '',
          value: '',
          specPairs: [
            { name: '年级', value: '10年级' },
            { name: '课程体系', value: 'IG' },
          ],
        },
      ],
      {
        '年级:10年级|课程体系:IB': {
          price: 999,
          stock: 10,
          status: 'off',
          isDefaultSelected: true,
        },
        '年级:10年级|课程体系:IG': {
          price: 1299,
          stock: 8,
          status: 'on',
          isDefaultSelected: true,
        },
      }
    );

    expect(rows).toEqual([
      {
        key: '年级:10年级|课程体系:IB',
        specText: '年级：10年级 / 课程体系：IB',
        specPairs: [
          { name: '年级', value: '10年级' },
          { name: '课程体系', value: 'IB' },
        ],
        specValueMap: {
          spec_0: '10年级',
          spec_1: 'IB',
        },
        price: 999,
        stock: 10,
        status: 'off',
        isDefaultSelected: false,
      },
      {
        key: '年级:10年级|课程体系:IG',
        specText: '年级：10年级 / 课程体系：IG',
        specPairs: [
          { name: '年级', value: '10年级' },
          { name: '课程体系', value: 'IG' },
        ],
        specValueMap: {
          spec_0: '10年级',
          spec_1: 'IG',
        },
        price: 1299,
        stock: 8,
        status: 'on',
        isDefaultSelected: true,
      },
    ]);
  });

  it('applies batch changes only to matched visible sku rows', () => {
    const rows = buildProductSkuAttributeRowsFromSpecItems(
      [
        {
          id: 'sku_ib',
          name: '',
          value: '',
          specPairs: [
            { name: '年级', value: '10年级' },
            { name: '课程体系', value: 'IB' },
          ],
        },
        {
          id: 'sku_ig',
          name: '',
          value: '',
          specPairs: [
            { name: '年级', value: '10年级' },
            { name: '课程体系', value: 'IG' },
          ],
        },
      ],
      {
        sku_ib: {
          price: 100,
          stock: 1,
          status: 'on',
        },
        sku_ig: {
          price: 200,
          stock: 2,
          status: 'off',
        },
      }
    );

    expect(
      applyProductSkuBatchPatch(
        rows,
        {
          spec_0: '10年级',
          spec_1: 'IB',
        },
        {
          price: 888,
          stock: 9,
        }
      )
    ).toEqual([
      expect.objectContaining({
        key: 'sku_ib',
        price: 888,
        stock: 9,
      }),
      expect.objectContaining({
        key: 'sku_ig',
        price: 200,
        stock: 2,
        status: 'off',
      }),
    ]);
  });

  it('rebuilds edit rows from persisted sku images and default flags', () => {
    const rows = buildProductSkuAttributeRowsFromSkus([
      {
        id: 'sku_1',
        specText: '年级：10年级 / 课程体系：IB',
        price: 100,
        stock: 10,
        status: 'on',
        image: {
          id: 'image_1',
          name: 'IB图',
          url: 'https://example.com/ib.png',
        },
        isDefaultSelected: true,
      },
      {
        id: 'sku_2',
        specText: '年级：10年级 / 课程体系：IG',
        price: 120,
        stock: 8,
        status: 'off',
        isDefaultSelected: true,
      },
    ]);

    expect(rows).toEqual([
      expect.objectContaining({
        key: 'sku_1',
        image: {
          id: 'image_1',
          name: 'IB图',
          url: 'https://example.com/ib.png',
        },
        isDefaultSelected: true,
      }),
      expect.objectContaining({
        key: 'sku_2',
        status: 'off',
        isDefaultSelected: false,
      }),
    ]);
  });
});
