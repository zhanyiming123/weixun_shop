import { describe, expect, it } from 'vitest';
import {
  getEnabledSpecsByCatalogId,
  isProductCatalogSpecNameDuplicated,
  normalizeProductCatalogSpecValues,
  normalizeProductCatalogSpecs,
  resolveProductCatalogSpecIdentity,
  type ProductCatalogSpecItem,
} from './data';

describe('product catalog spec data helpers', () => {
  it('deduplicates and trims spec values', () => {
    expect(
      normalizeProductCatalogSpecValues([' 红色 ', '蓝色', '红色', '', '  '])
    ).toEqual(['红色', '蓝色']);
  });

  it('filters invalid spec items during normalization', () => {
    const normalized = normalizeProductCatalogSpecs([
      {
        id: 'spec_1',
        catalogId: 'international',
        name: '班型',
        values: ['标准班', '标准班', ''],
        sort: 3,
        enabled: true,
        createdAt: '2026-05-04 10:00:00',
      },
      {
        id: 'spec_2',
        catalogId: 'international',
        name: '空值规格',
        values: [' ', ''],
        sort: 2,
        enabled: true,
        createdAt: '2026-05-04 10:05:00',
      },
    ] as ProductCatalogSpecItem[]);

    expect(normalized).toEqual([
      {
        id: 'spec_1',
        catalogId: 'international',
        name: '班型',
        values: ['标准班'],
        sort: 3,
        enabled: true,
        createdAt: '2026-05-04 10:00:00',
      },
    ]);
  });

  it('returns only enabled specs for the selected catalog', () => {
    const specs: ProductCatalogSpecItem[] = [
      {
        id: 'spec_1',
        catalogId: 'international',
        name: '班型',
        values: ['标准班'],
        sort: 2,
        enabled: true,
        createdAt: '2026-05-04 10:00:00',
      },
      {
        id: 'spec_2',
        catalogId: 'international',
        name: '授课形式',
        values: ['直播'],
        sort: 1,
        enabled: false,
        createdAt: '2026-05-04 10:05:00',
      },
      {
        id: 'spec_3',
        catalogId: 'thesis',
        name: '服务等级',
        values: ['标准版'],
        sort: 1,
        enabled: true,
        createdAt: '2026-05-04 10:10:00',
      },
    ];

    expect(getEnabledSpecsByCatalogId(specs, 'international')).toEqual([
      {
        id: 'spec_1',
        catalogId: 'international',
        name: '班型',
        values: ['标准班'],
        sort: 2,
        enabled: true,
        createdAt: '2026-05-04 10:00:00',
      },
    ]);
  });

  it('detects duplicated spec names inside the same catalog', () => {
    const specs: ProductCatalogSpecItem[] = [
      {
        id: 'spec_1',
        catalogId: 'international',
        name: '班型',
        values: ['标准班'],
        sort: 1,
        enabled: true,
        createdAt: '2026-05-04 10:00:00',
      },
    ];

    expect(
      isProductCatalogSpecNameDuplicated(specs, 'international', '班型')
    ).toBe(true);
    expect(
      isProductCatalogSpecNameDuplicated(specs, 'international', '班型', 'spec_1')
    ).toBe(false);
    expect(
      isProductCatalogSpecNameDuplicated(specs, 'thesis', '班型')
    ).toBe(false);
  });

  it('keeps catalog and spec name immutable while editing', () => {
    expect(
      resolveProductCatalogSpecIdentity(
        {
          catalogId: 'service',
          name: '收费模式',
        },
        {
          catalogId: 'international',
          name: '班型',
        }
      )
    ).toEqual({
      catalogId: 'international',
      name: '班型',
    });
  });

  it('trims catalog and spec name while creating', () => {
    expect(
      resolveProductCatalogSpecIdentity({
        catalogId: ' international ',
        name: ' 班型 ',
      })
    ).toEqual({
      catalogId: 'international',
      name: '班型',
    });
  });
});
