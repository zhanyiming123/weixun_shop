import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PRODUCT_CATALOG_ATTRIBUTE_TEMPLATES,
  buildProductCatalogAttributesFromTemplate,
  getEnabledProductCatalogAttributeTemplateByCatalogId,
  isProductCatalogAttributeTemplateCatalogDuplicated,
  normalizeProductCatalogAttributeTemplateItems,
} from './data';

describe('product catalog attribute template helpers', () => {
  it('normalizes templates, deduplicates catalogs and drops missing attributes', () => {
    expect(
      normalizeProductCatalogAttributeTemplateItems(
        [
          {
            id: ' template_1 ',
            name: ' 模板1 ',
            catalogIds: ['international', ' international ', 'thesis'],
            entries: [
              { attributeId: ' attr_a ', required: true, sort: 2 },
              { attributeId: 'attr_a', required: false, sort: 1 },
              { attributeId: 'attr_missing', required: true, sort: 3 },
            ],
            enabled: true,
            createdAt: '2026-05-18 11:00:00',
          },
        ],
        [
          {
            id: 'attr_a',
            name: '字段A',
            type: 'text',
            values: [],
            sort: 1,
            enabled: true,
            createdAt: '',
          },
        ]
      )
    ).toEqual([
      {
        id: 'template_1',
        name: '模板1',
        catalogIds: ['international', 'thesis'],
        entries: [{ attributeId: 'attr_a', required: true, sort: 1 }],
        enabled: true,
        createdAt: '2026-05-18 11:00:00',
      },
    ]);
  });

  it('detects duplicate category bindings across templates', () => {
    expect(
      isProductCatalogAttributeTemplateCatalogDuplicated(
        [
          {
            id: 'template_1',
            name: '模板1',
            catalogIds: ['international'],
            entries: [{ attributeId: 'attr_a', required: true, sort: 1 }],
            enabled: true,
            createdAt: '',
          },
        ],
        ['international']
      )
    ).toBe(true);
  });

  it('returns enabled template by catalog id', () => {
    expect(
      getEnabledProductCatalogAttributeTemplateByCatalogId(
        [
          {
            id: 'template_1',
            name: '模板1',
            catalogIds: ['international'],
            entries: [{ attributeId: 'attr_a', required: true, sort: 1 }],
            enabled: true,
            createdAt: '',
          },
          {
            id: 'template_2',
            name: '模板2',
            catalogIds: ['thesis'],
            entries: [{ attributeId: 'attr_b', required: true, sort: 1 }],
            enabled: false,
            createdAt: '',
          },
        ],
        'international'
      )?.id
    ).toBe('template_1');
  });

  it('builds resolved attributes in template order and skips disabled fields', () => {
    expect(
      buildProductCatalogAttributesFromTemplate(
        {
          id: 'template_1',
          name: '模板1',
          catalogIds: ['international'],
          entries: [
            { attributeId: 'attr_b', required: false, sort: 1 },
            { attributeId: 'attr_a', required: true, sort: 2 },
          ],
          enabled: true,
          createdAt: '',
        },
        [
          {
            id: 'attr_a',
            name: '字段A',
            type: 'text',
            values: [],
            sort: 1,
            enabled: true,
            createdAt: '',
          },
          {
            id: 'attr_b',
            name: '字段B',
            type: 'single',
            values: ['选项1'],
            sort: 2,
            enabled: false,
            createdAt: '',
          },
        ]
      )
    ).toEqual([
      {
        id: 'attr_a',
        name: '字段A',
        type: 'text',
        values: [],
        sort: 1,
        enabled: true,
        createdAt: '',
        textMaxLength: undefined,
        numberMode: undefined,
        numberPrecision: undefined,
        required: true,
        templateSort: 2,
      },
    ]);
  });

  it('provides default mock templates for international, planning and thesis catalogs', () => {
    expect(
      DEFAULT_PRODUCT_CATALOG_ATTRIBUTE_TEMPLATES.map((item) => item.catalogIds[0])
    ).toEqual(['international', 'planning', 'thesis', 'service']);
    expect(
      DEFAULT_PRODUCT_CATALOG_ATTRIBUTE_TEMPLATES.map((item) => item.name)
    ).toEqual([
      '国际课程属性模板',
      '升学规划属性模板',
      '论文文书属性模板',
      '服务费属性模板',
    ]);
  });
});
