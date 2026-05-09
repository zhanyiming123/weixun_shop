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
        catalogIds: ['international', ' thesis ', '', 'international'],
        name: '班型',
        values: ['标准班', '标准班', ''],
        enabled: true,
        createdAt: '2026-05-04 10:00:00',
      },
      {
        id: 'spec_2',
        catalogId: 'international',
        name: '空值规格',
        values: [' ', ''],
        enabled: true,
        createdAt: '2026-05-04 10:05:00',
      },
    ] as ProductCatalogSpecItem[]);

    expect(normalized).toEqual([
      {
        id: 'spec_1',
        catalogIds: ['international', 'thesis'],
        name: '班型',
        values: ['标准班'],
        enabled: true,
        createdAt: '2026-05-04 10:00:00',
      },
    ]);
  });

  it('keeps legacy single-catalog data compatible during normalization', () => {
    const normalized = normalizeProductCatalogSpecs([
      {
        id: 'spec_legacy',
        catalogId: ' international ',
        name: ' 班型 ',
        values: ['标准班'],
        enabled: true,
        createdAt: '2026-05-04 10:00:00',
      } as unknown as ProductCatalogSpecItem,
    ]);

    expect(normalized).toEqual([
      {
        id: 'spec_legacy',
        catalogIds: ['international'],
        name: '班型',
        values: ['标准班'],
        enabled: true,
        createdAt: '2026-05-04 10:00:00',
      },
    ]);
  });

  it('returns only enabled specs for the selected catalog', () => {
    const specs: ProductCatalogSpecItem[] = [
      {
        id: 'spec_1',
        catalogIds: ['international', 'thesis'],
        name: '班型',
        values: ['标准班'],
        enabled: true,
        createdAt: '2026-05-04 10:00:00',
      },
      {
        id: 'spec_2',
        catalogIds: ['international'],
        name: '授课形式',
        values: ['直播'],
        enabled: false,
        createdAt: '2026-05-04 10:05:00',
      },
      {
        id: 'spec_3',
        catalogIds: ['service'],
        name: '服务等级',
        values: ['标准版'],
        enabled: true,
        createdAt: '2026-05-04 10:10:00',
      },
    ];

    expect(getEnabledSpecsByCatalogId(specs, 'international')).toEqual([
      {
        id: 'spec_1',
        catalogIds: ['international', 'thesis'],
        name: '班型',
        values: ['标准班'],
        enabled: true,
        createdAt: '2026-05-04 10:00:00',
      },
    ]);

    expect(getEnabledSpecsByCatalogId(specs, 'thesis')).toEqual([
      {
        id: 'spec_1',
        catalogIds: ['international', 'thesis'],
        name: '班型',
        values: ['标准班'],
        enabled: true,
        createdAt: '2026-05-04 10:00:00',
      },
    ]);
  });

  it('detects duplicated spec names inside overlapping catalogs', () => {
    const specs: ProductCatalogSpecItem[] = [
      {
        id: 'spec_1',
        catalogIds: ['international', 'thesis'],
        name: '班型',
        values: ['标准班'],
        enabled: true,
        createdAt: '2026-05-04 10:00:00',
      },
    ];

    expect(
      isProductCatalogSpecNameDuplicated(specs, ['international'], '班型')
    ).toBe(true);
    expect(
      isProductCatalogSpecNameDuplicated(specs, ['thesis'], '班型', 'spec_1')
    ).toBe(false);
    expect(
      isProductCatalogSpecNameDuplicated(specs, ['service'], '班型')
    ).toBe(false);
    expect(
      isProductCatalogSpecNameDuplicated(specs, ['service', 'thesis'], '班型')
    ).toBe(true);
  });

  it('keeps spec name immutable while editing', () => {
    expect(
      resolveProductCatalogSpecIdentity(' 收费模式 ', {
        name: '班型',
      })
    ).toBe('班型');
  });

  it('trims spec name while creating', () => {
    expect(resolveProductCatalogSpecIdentity(' 班型 ')).toBe('班型');
  });
});
