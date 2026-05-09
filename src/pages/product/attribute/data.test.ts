import { describe, expect, it } from 'vitest';
import {
  getProductCatalogAttributeValueSummary,
  normalizeProductCatalogAttributes,
  type ProductCatalogAttributeItem,
} from './data';

describe('product catalog attribute data helpers', () => {
  it('defaults legacy number attributes to integer mode', () => {
    const normalized = normalizeProductCatalogAttributes([
      {
        id: 'attr_1',
        catalogIds: ['international'],
        name: '课时数',
        type: 'number',
        values: [],
        required: true,
        sort: 1,
        enabled: true,
        createdAt: '2026-05-09 10:00:00',
      },
    ] as ProductCatalogAttributeItem[]);

    expect(
      normalized.find((item) => item.id === 'attr_1')?.numberMode
    ).toBe('integer');
  });

  it('drops invalid text max length values', () => {
    const normalized = normalizeProductCatalogAttributes([
      {
        id: 'attr_text_negative',
        catalogIds: ['international'],
        name: '备注',
        type: 'text',
        values: [],
        textMaxLength: -1,
        required: false,
        sort: 1,
        enabled: true,
        createdAt: '',
      },
      {
        id: 'attr_text_decimal',
        catalogIds: ['international'],
        name: '标题',
        type: 'text',
        values: [],
        textMaxLength: 12.5,
        required: false,
        sort: 2,
        enabled: true,
        createdAt: '',
      },
      {
        id: 'attr_text_valid',
        catalogIds: ['international'],
        name: '简介',
        type: 'text',
        values: [],
        textMaxLength: 20,
        required: false,
        sort: 3,
        enabled: true,
        createdAt: '',
      },
    ] as ProductCatalogAttributeItem[]);

    expect(
      normalized.find((item) => item.id === 'attr_text_negative')?.textMaxLength
    ).toBeUndefined();
    expect(
      normalized.find((item) => item.id === 'attr_text_decimal')?.textMaxLength
    ).toBeUndefined();
    expect(
      normalized.find((item) => item.id === 'attr_text_valid')?.textMaxLength
    ).toBe(20);
  });

  it('normalizes number precision and removes invalid values', () => {
    const normalized = normalizeProductCatalogAttributes([
      {
        id: 'attr_number_invalid',
        catalogIds: ['planning'],
        name: '折扣',
        type: 'number',
        values: [],
        numberMode: 'decimalAllowed',
        numberPrecision: 1.5,
        required: false,
        sort: 1,
        enabled: true,
        createdAt: '',
      },
      {
        id: 'attr_number_valid',
        catalogIds: ['planning'],
        name: '费率',
        type: 'number',
        values: [],
        numberMode: 'decimalAllowed',
        numberPrecision: 3,
        required: false,
        sort: 2,
        enabled: true,
        createdAt: '',
      },
    ] as ProductCatalogAttributeItem[]);

    expect(
      normalized.find((item) => item.id === 'attr_number_invalid')?.numberPrecision
    ).toBeUndefined();
    expect(
      normalized.find((item) => item.id === 'attr_number_valid')?.numberPrecision
    ).toBe(3);
  });

  it('clears stale constraints that do not match the current type', () => {
    const normalized = normalizeProductCatalogAttributes([
      {
        id: 'attr_single',
        catalogIds: ['international'],
        name: '班型',
        type: 'single',
        values: ['标准班'],
        textMaxLength: 10,
        numberMode: 'decimalAllowed',
        numberPrecision: 2,
        required: true,
        sort: 1,
        enabled: true,
        createdAt: '',
      },
    ] as ProductCatalogAttributeItem[]);

    expect(normalized.find((item) => item.id === 'attr_single')).toMatchObject({
      textMaxLength: undefined,
      numberMode: undefined,
      numberPrecision: undefined,
    });
  });

  it('keeps planning template constraints from matched items', () => {
    const normalized = normalizeProductCatalogAttributes([
      {
        id: 'planning_semester_count',
        catalogIds: ['planning'],
        name: '服务学期数',
        type: 'number',
        values: [],
        numberMode: 'decimalAllowed',
        numberPrecision: 2,
        required: true,
        sort: 4,
        enabled: false,
        createdAt: '2026-05-09 11:00:00',
      },
    ] as ProductCatalogAttributeItem[]);

    expect(
      normalized.find((item) => item.id === 'planning_semester_count')
    ).toMatchObject({
      numberMode: 'decimalAllowed',
      numberPrecision: 2,
      enabled: false,
      createdAt: '2026-05-09 11:00:00',
    });
  });

  it('builds attribute value summaries for text and number constraints', () => {
    expect(
      getProductCatalogAttributeValueSummary({
        id: 'text_unlimited',
        catalogIds: ['international'],
        name: '备注',
        type: 'text',
        values: [],
        required: false,
        sort: 1,
        enabled: true,
        createdAt: '',
      })
    ).toBe('自由填写');

    expect(
      getProductCatalogAttributeValueSummary({
        id: 'text_limited',
        catalogIds: ['international'],
        name: '标题',
        type: 'text',
        values: [],
        textMaxLength: 20,
        required: false,
        sort: 1,
        enabled: true,
        createdAt: '',
      })
    ).toBe('自由填写 / 最多 20 字');

    expect(
      getProductCatalogAttributeValueSummary({
        id: 'number_integer',
        catalogIds: ['planning'],
        name: '数量',
        type: 'number',
        values: [],
        numberMode: 'integer',
        required: false,
        sort: 1,
        enabled: true,
        createdAt: '',
      })
    ).toBe('数字输入 / 整数');

    expect(
      getProductCatalogAttributeValueSummary({
        id: 'number_decimal_limited',
        catalogIds: ['planning'],
        name: '折扣',
        type: 'number',
        values: [],
        numberMode: 'decimalAllowed',
        numberPrecision: 2,
        required: false,
        sort: 1,
        enabled: true,
        createdAt: '',
      })
    ).toBe('数字输入 / 最多 2 位小数');

    expect(
      getProductCatalogAttributeValueSummary({
        id: 'number_decimal_unlimited',
        catalogIds: ['planning'],
        name: '费率',
        type: 'number',
        values: [],
        numberMode: 'decimalAllowed',
        required: false,
        sort: 1,
        enabled: true,
        createdAt: '',
      })
    ).toBe('数字输入 / 可含小数');
  });
});
