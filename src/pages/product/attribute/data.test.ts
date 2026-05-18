import { describe, expect, it } from 'vitest';
import {
  getEnabledProductCatalogAttributes,
  getProductCatalogAttributeValueSummary,
  mergeDefaultProductCatalogAttributes,
  normalizeProductCatalogAttributes,
  DEFAULT_PRODUCT_CATALOG_ATTRIBUTES,
  type ProductCatalogAttributeItem,
} from './data';

describe('product catalog attribute data helpers', () => {
  it('ignores legacy catalog binding and required fields during normalization', () => {
    const normalized = normalizeProductCatalogAttributes([
      {
        id: ' attr_1 ',
        name: ' 班型 ',
        description: ' 记录班型适用范围 ',
        type: 'single',
        values: ['直播', ' 直播 ', '录播'],
        sort: 2,
        enabled: true,
        createdAt: '',
        catalogIds: ['international'],
        required: true,
      } as ProductCatalogAttributeItem & {
        catalogIds: string[];
        required: boolean;
      },
    ]);

    expect(normalized).toEqual([
      {
        id: 'attr_1',
        name: '班型',
        description: '记录班型适用范围',
        type: 'single',
        values: ['直播', '录播'],
        sort: 2,
        enabled: true,
        createdAt: '',
        textMaxLength: undefined,
        numberMode: undefined,
        numberPrecision: undefined,
      },
    ]);
  });

  it('drops blank description values during normalization', () => {
    const normalized = normalizeProductCatalogAttributes([
      {
        id: 'attr_1',
        name: '班型',
        description: '   ',
        type: 'text',
        values: [],
        sort: 1,
        enabled: true,
        createdAt: '',
      },
    ]);

    expect(normalized[0]?.description).toBeUndefined();
  });

  it('defaults legacy number attributes to integer mode', () => {
    const normalized = normalizeProductCatalogAttributes([
      {
        id: 'attr_1',
        name: '课时数',
        type: 'number',
        values: [],
        sort: 1,
        enabled: true,
        createdAt: '2026-05-09 10:00:00',
      },
    ] as ProductCatalogAttributeItem[]);

    expect(
      normalized.find((item) => item.id === 'attr_1')?.numberMode
    ).toBe('integer');
  });

  it('drops invalid text max length and number precision values', () => {
    const normalized = normalizeProductCatalogAttributes([
      {
        id: 'attr_text',
        name: '备注',
        type: 'text',
        values: [],
        textMaxLength: -1,
        sort: 1,
        enabled: true,
        createdAt: '',
      },
      {
        id: 'attr_number',
        name: '折扣',
        type: 'number',
        values: [],
        numberMode: 'decimalAllowed',
        numberPrecision: 1.5,
        sort: 2,
        enabled: true,
        createdAt: '',
      },
    ] as ProductCatalogAttributeItem[]);

    expect(
      normalized.find((item) => item.id === 'attr_text')?.textMaxLength
    ).toBeUndefined();
    expect(
      normalized.find((item) => item.id === 'attr_number')?.numberPrecision
    ).toBeUndefined();
  });

  it('merges missing default attributes into stored attribute data', () => {
    const merged = mergeDefaultProductCatalogAttributes([
      {
        id: 'custom_attr',
        name: '自定义字段',
        type: 'text',
        values: [],
        sort: 99,
        enabled: true,
        createdAt: '',
      },
    ]);

    expect(merged[0]?.id).toBe('custom_attr');
    expect(merged).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'custom_attr' }),
        expect.objectContaining({ id: DEFAULT_PRODUCT_CATALOG_ATTRIBUTES[0].id }),
        expect.objectContaining({ id: DEFAULT_PRODUCT_CATALOG_ATTRIBUTES[1].id }),
      ])
    );
  });

  it('returns enabled attributes ordered by sort then name', () => {
    expect(
      getEnabledProductCatalogAttributes([
        {
          id: 'attr_b',
          name: 'B',
          type: 'text',
          values: [],
          sort: 2,
          enabled: true,
          createdAt: '',
        },
        {
          id: 'attr_a',
          name: 'A',
          type: 'text',
          values: [],
          sort: 1,
          enabled: true,
          createdAt: '',
        },
        {
          id: 'attr_c',
          name: 'C',
          type: 'text',
          values: [],
          sort: 3,
          enabled: false,
          createdAt: '',
        },
      ])
    ).toMatchObject([{ id: 'attr_a' }, { id: 'attr_b' }]);
  });

  it('builds attribute value summaries for text and number constraints', () => {
    expect(
      getProductCatalogAttributeValueSummary({
        id: 'text_unlimited',
        name: '备注',
        type: 'text',
        values: [],
        sort: 1,
        enabled: true,
        createdAt: '',
      })
    ).toBe('自由填写');

    expect(
      getProductCatalogAttributeValueSummary({
        id: 'text_limited',
        name: '标题',
        type: 'text',
        values: [],
        textMaxLength: 20,
        sort: 1,
        enabled: true,
        createdAt: '',
      })
    ).toBe('自由填写 / 最多 20 字');

    expect(
      getProductCatalogAttributeValueSummary({
        id: 'number_integer',
        name: '数量',
        type: 'number',
        values: [],
        numberMode: 'integer',
        sort: 1,
        enabled: true,
        createdAt: '',
      })
    ).toBe('数字输入 / 整数');

    expect(
      getProductCatalogAttributeValueSummary({
        id: 'number_decimal_limited',
        name: '折扣',
        type: 'number',
        values: [],
        numberMode: 'decimalAllowed',
        numberPrecision: 2,
        sort: 1,
        enabled: true,
        createdAt: '',
      })
    ).toBe('数字输入 / 最多 2 位小数');
  });
});
