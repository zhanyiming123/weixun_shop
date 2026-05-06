import { describe, expect, it } from 'vitest';
import {
  buildStoreSettingGeneratedLocalSkuCombos,
  buildStoreSettingLocalSkuSpecText,
  buildStoreSettingSpecDimensions,
  buildStoreSettingSpecFields,
  getStoreSettingLocalSkuSpecValidationError,
  normalizeStoreSettingLocalSkuSpecText,
  parseStoreSettingLocalSkuSpecValues,
  resolveStoreSettingSourceSkuConfigState,
  restoreStoreSettingLocalSkuState,
  syncStoreSettingLocalSkuRows,
  type StoreSettingLocalSkuDraftRow,
} from './store-setting';

type SpecTextItem = {
  specText: string;
};

describe('product list store setting helpers', () => {
  it('shows source sku price config only when the store can manage independent price', () => {
    expect(resolveStoreSettingSourceSkuConfigState(true)).toEqual({
      mode: 'price',
      hint: '源 SKU 保持只读，仅支持调整独立售价。',
    });
    expect(resolveStoreSettingSourceSkuConfigState(false)).toEqual({
      mode: 'empty',
      emptyText: '该商品无自定义配置项。',
    });
  });

  it('infers named spec fields from consistent source sku texts', () => {
    expect(
      buildStoreSettingSpecFields([
        {
          specText: '颜色：红色 / 尺码：M',
        },
        {
          specText: '颜色：蓝色 / 尺码：L',
        },
      ] as SpecTextItem[])
    ).toEqual([
      {
        key: 'spec_0',
        label: '颜色',
        named: true,
      },
      {
        key: 'spec_1',
        label: '尺码',
        named: true,
      },
    ]);
  });

  it('falls back to a generic spec field when source sku texts are plain labels', () => {
    expect(
      buildStoreSettingSpecFields([
        {
          specText: '标准版',
        },
        {
          specText: 'VIP版',
        },
      ] as SpecTextItem[])
    ).toEqual([
      {
        key: 'spec_0',
        label: '规格值',
        named: false,
      },
    ]);
  });

  it('parses and rebuilds named local sku spec values', () => {
    const specFields = buildStoreSettingSpecFields([
      {
        specText: '颜色：红色 / 尺码：M',
      },
    ] as SpecTextItem[]);

    expect(
      parseStoreSettingLocalSkuSpecValues('颜色：蓝色 / 尺码：L', specFields)
    ).toEqual(['蓝色', 'L']);
    expect(
      buildStoreSettingLocalSkuSpecText(['蓝色', 'L'], specFields)
    ).toBe('颜色：蓝色 / 尺码：L');
  });

  it('normalizes equivalent named spec texts to the same canonical format', () => {
    const specFields = buildStoreSettingSpecFields([
      {
        specText: '颜色：红色 / 尺码：M',
      },
    ] as SpecTextItem[]);

    expect(
      normalizeStoreSettingLocalSkuSpecText('颜色: 红色/尺码: M', specFields)
    ).toBe('颜色：红色 / 尺码：M');
  });

  it('returns field-aware validation messages for missing spec values', () => {
    const specFields = buildStoreSettingSpecFields([
      {
        specText: '颜色：红色 / 尺码：M',
      },
    ] as SpecTextItem[]);

    expect(
      getStoreSettingLocalSkuSpecValidationError(['红色', ''], specFields)
    ).toBe('请填写尺码');
    expect(
      getStoreSettingLocalSkuSpecValidationError(
        [''],
        buildStoreSettingSpecFields([] as SpecTextItem[])
      )
    ).toBe('请输入规格值');
  });

  it('builds source spec dimensions with unique source and local values', () => {
    expect(
      buildStoreSettingSpecDimensions(
        [
          {
            specText: '年级：10年级 / 课程体系：ALEVEL',
          },
          {
            specText: '年级：10年级 / 课程体系：IB',
          },
          {
            specText: '年级：11年级 / 课程体系：ALEVEL',
          },
        ],
        {
          spec_0: ['12年级', '10年级', '12年级'],
          spec_1: ['IP', 'IB'],
        }
      )
    ).toEqual([
      {
        key: 'spec_0',
        label: '年级',
        named: true,
        sourceValues: ['10年级', '11年级'],
        localValues: ['12年级'],
      },
      {
        key: 'spec_1',
        label: '课程体系',
        named: true,
        sourceValues: ['ALEVEL', 'IB'],
        localValues: ['IP'],
      },
    ]);
  });

  it('generates only new combinations that include at least one local value', () => {
    const sourceSkus = [
      {
        specText: '年级：10年级 / 课程体系：ALEVEL',
      },
      {
        specText: '年级：10年级 / 课程体系：IB',
      },
    ];
    const dimensions = buildStoreSettingSpecDimensions(sourceSkus, {
      spec_0: ['11年级'],
      spec_1: ['IP'],
    });

    expect(
      buildStoreSettingGeneratedLocalSkuCombos(dimensions, sourceSkus)
    ).toEqual([
      {
        specText: '年级：10年级 / 课程体系：IP',
        specValues: ['10年级', 'IP'],
      },
      {
        specText: '年级：11年级 / 课程体系：ALEVEL',
        specValues: ['11年级', 'ALEVEL'],
      },
      {
        specText: '年级：11年级 / 课程体系：IB',
        specValues: ['11年级', 'IB'],
      },
      {
        specText: '年级：11年级 / 课程体系：IP',
        specValues: ['11年级', 'IP'],
      },
    ]);
  });

  it('preserves unaffected generated row inputs while pruning removed combinations', () => {
    const previousRows: StoreSettingLocalSkuDraftRow[] = [
      {
        skuId: 'local_1',
        specText: '年级：10年级 / 课程体系：IP',
        specValues: ['10年级', 'IP'],
        price: 199,
        stock: 10,
        sellStatus: 'sellable',
        status: 'on',
        image: {
          id: 'image_1',
          name: 'IP图',
          url: 'https://example.com/ip.png',
        },
        isDefaultSelected: true,
      },
      {
        skuId: 'local_2',
        specText: '年级：11年级 / 课程体系：ALEVEL',
        specValues: ['11年级', 'ALEVEL'],
        price: 299,
        stock: 8,
        sellStatus: 'sellable',
        status: 'on',
      },
    ];

    expect(
      syncStoreSettingLocalSkuRows(
        [
          {
            specText: '年级：10年级 / 课程体系：IP',
            specValues: ['10年级', 'IP'],
          },
          {
            specText: '年级：11年级 / 课程体系：IB',
            specValues: ['11年级', 'IB'],
          },
        ],
        previousRows,
        (specText) => `generated:${specText}`
      )
    ).toEqual([
      {
        skuId: 'local_1',
        specText: '年级：10年级 / 课程体系：IP',
        specValues: ['10年级', 'IP'],
        price: 199,
        stock: 10,
        sellStatus: 'sellable',
        status: 'on',
        image: {
          id: 'image_1',
          name: 'IP图',
          url: 'https://example.com/ip.png',
        },
        isDefaultSelected: true,
      },
      {
        skuId: 'generated:年级：11年级 / 课程体系：IB',
        specText: '年级：11年级 / 课程体系：IB',
        specValues: ['11年级', 'IB'],
        price: undefined,
        stock: undefined,
        sellStatus: 'sellable',
        status: 'on',
      },
    ]);
  });

  it('restores parseable local skus into local values and generated rows', () => {
    const sourceSkus = [
      {
        specText: '年级：10年级 / 课程体系：ALEVEL',
      },
      {
        specText: '年级：10年级 / 课程体系：IB',
      },
    ];

    expect(
      restoreStoreSettingLocalSkuState(sourceSkus, [
        {
          skuId: 'local_1',
          specText: '年级：11年级 / 课程体系：ALEVEL',
          price: 199,
          stock: 10,
          sellStatus: 'sellable',
          status: 'on',
          image: {
            id: 'image_1',
            name: 'ALEVEL图',
            url: 'https://example.com/alevel.png',
          },
          isDefaultSelected: true,
        },
      ])
    ).toEqual({
      localSpecValuesByField: {
        spec_0: ['11年级'],
        spec_1: [],
      },
      localSkuRows: [
        {
          skuId: 'local_1',
          specText: '年级：11年级 / 课程体系：ALEVEL',
          specValues: ['11年级', 'ALEVEL'],
          price: 199,
          stock: 10,
          sellStatus: 'sellable',
          status: 'on',
          image: {
            id: 'image_1',
            name: 'ALEVEL图',
            url: 'https://example.com/alevel.png',
          },
          isDefaultSelected: true,
        },
      ],
      legacyIssues: [],
    });
  });

  it('marks unparseable legacy local skus as blocking issues', () => {
    const sourceSkus = [
      {
        specText: '年级：10年级 / 课程体系：ALEVEL',
      },
    ];

    expect(
      restoreStoreSettingLocalSkuState(sourceSkus, [
        {
          skuId: 'local_1',
          specText: '红色',
          price: 199,
          stock: 10,
          sellStatus: 'sellable',
          status: 'on',
        },
      ])
    ).toEqual({
      localSpecValuesByField: {
        spec_0: [],
        spec_1: [],
      },
      localSkuRows: [],
      legacyIssues: [
        {
          skuId: 'local_1',
          specText: '红色',
          specValues: ['红色', ''],
          price: 199,
          stock: 10,
          sellStatus: 'sellable',
          status: 'on',
          reason: '无法按当前源规格结构解析',
        },
      ],
    });
  });
});
