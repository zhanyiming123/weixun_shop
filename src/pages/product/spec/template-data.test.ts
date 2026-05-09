import { describe, expect, it } from 'vitest';
import {
  buildSelectedCatalogSpecIdsFromTemplate,
  buildSelectedCatalogSpecValueMapFromTemplate,
  getEnabledSpecTemplatesByCatalogId,
  normalizeProductCatalogSpecTemplateItems,
} from './template-data';

describe('product spec template helpers', () => {
  it('normalizes template entries and removes duplicate values', () => {
    expect(
      normalizeProductCatalogSpecTemplateItems([
        {
          id: ' template_1 ',
          catalogId: ' international ',
          name: ' 常用模板 ',
          entries: [
            {
              specId: ' spec_a ',
              values: [' 直播 ', '直播', '', '录播'],
            },
          ],
          enabled: true,
          createdAt: '2026-05-04 11:00:00',
        },
      ])
    ).toEqual([
      {
        id: 'template_1',
        catalogId: 'international',
        name: '常用模板',
        entries: [
          {
            specId: 'spec_a',
            values: ['直播', '录播'],
          },
        ],
        enabled: true,
        createdAt: '2026-05-04 11:00:00',
      },
    ]);
  });

  it('filters enabled templates by catalog id', () => {
    expect(
      getEnabledSpecTemplatesByCatalogId(
        [
          {
            id: 'template_a',
            catalogId: 'catalog_1',
            name: '模板A',
            entries: [{ specId: 'spec_a', values: ['A'] }],
            enabled: true,
            createdAt: '',
          },
          {
            id: 'template_b',
            catalogId: 'catalog_1',
            name: '模板B',
            entries: [{ specId: 'spec_a', values: ['B'] }],
            enabled: false,
            createdAt: '',
          },
        ],
        'catalog_1'
      )
    ).toEqual([
      {
        id: 'template_a',
        catalogId: 'catalog_1',
        name: '模板A',
        entries: [{ specId: 'spec_a', values: ['A'] }],
        enabled: true,
        createdAt: '',
      },
    ]);
  });

  it('builds spec value map from a template and filters values not in the catalog spec', () => {
    expect(
      buildSelectedCatalogSpecValueMapFromTemplate(
        {
          id: 'template_1',
          catalogId: 'catalog_1',
          name: '模板1',
          entries: [
            {
              specId: 'spec_grade',
              values: ['10年级', '12年级'],
            },
            {
              specId: 'spec_system',
              values: ['IB'],
            },
          ],
          enabled: true,
          createdAt: '',
        },
        [
          {
            id: 'spec_grade',
            catalogIds: ['catalog_1'],
            name: '年级',
            values: ['10年级', '11年级'],
            enabled: true,
            createdAt: '',
          },
          {
            id: 'spec_system',
            catalogIds: ['catalog_1'],
            name: '课程体系',
            values: ['IB', 'IG'],
            enabled: true,
            createdAt: '',
          },
        ]
      )
    ).toEqual({
      spec_grade: ['10年级'],
      spec_system: ['IB'],
    });
  });

  it('builds selected spec ids from a template in catalog spec order', () => {
    expect(
      buildSelectedCatalogSpecIdsFromTemplate(
        {
          id: 'template_1',
          catalogId: 'catalog_1',
          name: '模板1',
          entries: [
            {
              specId: 'spec_system',
              values: ['IB'],
            },
            {
              specId: 'spec_grade',
              values: ['10年级'],
            },
          ],
          enabled: true,
          createdAt: '',
        },
        [
          {
            id: 'spec_grade',
            catalogIds: ['catalog_1'],
            name: '年级',
            values: ['10年级', '11年级'],
            enabled: true,
            createdAt: '',
          },
          {
            id: 'spec_system',
            catalogIds: ['catalog_1'],
            name: '课程体系',
            values: ['IB', 'IG'],
            enabled: true,
            createdAt: '',
          },
        ]
      )
    ).toEqual(['spec_grade', 'spec_system']);
  });
});
