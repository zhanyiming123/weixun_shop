import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { readPersistentValue, writePersistentValue } from '@/utils/usePersistentState';
import type { ProductCatalogAttributeItem } from '@/pages/product/attribute/data';
import { readProductCatalogAttributes } from '@/pages/product/attribute/data';

export type ProductCatalogAttributeTemplateEntry = {
  attributeId: string;
  required: boolean;
  sort: number;
};

export type ProductCatalogAttributeTemplateItem = {
  id: string;
  name: string;
  catalogIds: string[];
  entries: ProductCatalogAttributeTemplateEntry[];
  enabled: boolean;
  createdAt: string;
};

export type ProductCatalogTemplateResolvedAttribute = ProductCatalogAttributeItem & {
  required: boolean;
  templateSort: number;
};

const STORAGE_KEY = 'product-catalog-attribute-template-items-v1';

export const DEFAULT_PRODUCT_CATALOG_ATTRIBUTE_TEMPLATES: ProductCatalogAttributeTemplateItem[] =
  [
    {
      id: 'template_international_course',
      name: '国际课程属性模板',
      catalogIds: ['international'],
      entries: [
        { attributeId: 'attr_class_type', required: true, sort: 1 },
        { attributeId: 'attr_delivery_mode', required: true, sort: 2 },
        { attributeId: 'attr_semester_count', required: false, sort: 3 },
        { attributeId: 'attr_remark', required: false, sort: 4 },
      ],
      enabled: true,
      createdAt: '2026-05-18 11:00:00',
    },
    {
      id: 'template_planning_service',
      name: '升学规划属性模板',
      catalogIds: ['planning'],
      entries: [
        { attributeId: 'attr_service_level', required: true, sort: 1 },
        { attributeId: 'attr_charge_mode', required: false, sort: 2 },
        { attributeId: 'attr_remark', required: false, sort: 3 },
      ],
      enabled: true,
      createdAt: '2026-05-18 11:05:00',
    },
    {
      id: 'template_thesis_document',
      name: '论文文书属性模板',
      catalogIds: ['thesis'],
      entries: [
        { attributeId: 'attr_service_level', required: true, sort: 1 },
        { attributeId: 'attr_delivery_mode', required: false, sort: 2 },
        { attributeId: 'attr_remark', required: true, sort: 3 },
      ],
      enabled: true,
      createdAt: '2026-05-18 11:10:00',
    },
    {
      id: 'template_service_charge',
      name: '服务费属性模板',
      catalogIds: ['service'],
      entries: [
        { attributeId: 'attr_charge_mode', required: true, sort: 1 },
        { attributeId: 'attr_semester_count', required: true, sort: 2 },
      ],
      enabled: true,
      createdAt: '2026-05-18 11:15:00',
    },
  ];

function mergeDefaultTemplates(
  templates: ProductCatalogAttributeTemplateItem[] = [],
  defaults: ProductCatalogAttributeTemplateItem[] = DEFAULT_PRODUCT_CATALOG_ATTRIBUTE_TEMPLATES
) {
  if (!Array.isArray(templates) || !templates.length) {
    return defaults;
  }

  const existingIds = new Set(
    templates
      .filter((item) => item && typeof item.id === 'string' && item.id.trim())
      .map((item) => item.id.trim())
  );

  return [
    ...templates,
    ...defaults.filter((item) => !existingIds.has(item.id)),
  ];
}

function normalizePositiveInteger(value: unknown) {
  if (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value > 0
  ) {
    return value;
  }

  return undefined;
}

function uniqueTrimmedValues(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }

  const seenValues = new Set<string>();

  return values.reduce<string[]>((result, item) => {
    if (typeof item !== 'string') {
      return result;
    }

    const value = item.trim();

    if (!value || seenValues.has(value)) {
      return result;
    }

    seenValues.add(value);
    return [...result, value];
  }, []);
}

export function normalizeProductCatalogAttributeTemplateItems(
  templates: ProductCatalogAttributeTemplateItem[] = DEFAULT_PRODUCT_CATALOG_ATTRIBUTE_TEMPLATES,
  attributes: ProductCatalogAttributeItem[] = readProductCatalogAttributes()
) {
  const attributeIdSet = new Set(attributes.map((item) => item.id));

  return templates
    .filter(
      (item) =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        typeof item.name === 'string'
    )
    .map((item) => {
      const catalogIds = uniqueTrimmedValues(item.catalogIds);
      const seenAttributeIds = new Set<string>();
      const entries = Array.isArray(item.entries)
        ? item.entries
            .filter(
              (entry) =>
                entry &&
                typeof entry.attributeId === 'string' &&
                entry.attributeId.trim()
            )
            .map((entry, index) => ({
              attributeId: entry.attributeId.trim(),
              required: entry.required === true,
              sort: normalizePositiveInteger(entry.sort) || index + 1,
            }))
            .filter((entry) => attributeIdSet.has(entry.attributeId))
            .filter((entry) => {
              if (seenAttributeIds.has(entry.attributeId)) {
                return false;
              }

              seenAttributeIds.add(entry.attributeId);
              return true;
            })
            .sort((left, right) => left.sort - right.sort)
            .map((entry, index) => ({
              ...entry,
              sort: index + 1,
            }))
        : [];

      return {
        id: item.id.trim(),
        name: item.name.trim(),
        catalogIds,
        entries,
        enabled: item.enabled !== false,
        createdAt: item.createdAt || '',
      };
    })
    .filter((item) => item.id && item.name && item.catalogIds.length && item.entries.length)
    .sort((left, right) => {
      if (left.createdAt !== right.createdAt) {
        return left.createdAt.localeCompare(right.createdAt);
      }

      return left.name.localeCompare(right.name, 'zh-Hans-CN');
    });
}

export function readProductCatalogAttributeTemplates(
  attributes: ProductCatalogAttributeItem[] = readProductCatalogAttributes()
) {
  const stored = readPersistentValue(
    STORAGE_KEY,
    DEFAULT_PRODUCT_CATALOG_ATTRIBUTE_TEMPLATES
  );
  const normalized = normalizeProductCatalogAttributeTemplateItems(
    mergeDefaultTemplates(stored),
    attributes
  );

  if (JSON.stringify(stored) !== JSON.stringify(normalized)) {
    writePersistentValue(STORAGE_KEY, normalized);
  }

  return normalized;
}

export function useProductCatalogAttributeTemplates(
  attributes: ProductCatalogAttributeItem[] = readProductCatalogAttributes()
) {
  const [items, setItems] = useState<ProductCatalogAttributeTemplateItem[]>(() =>
    readProductCatalogAttributeTemplates(attributes)
  );

  useEffect(() => {
    setItems(readProductCatalogAttributeTemplates(attributes));
  }, [attributes]);

  useEffect(() => {
    writePersistentValue(STORAGE_KEY, items);
  }, [items]);

  return [items, setItems] as [
    ProductCatalogAttributeTemplateItem[],
    Dispatch<SetStateAction<ProductCatalogAttributeTemplateItem[]>>
  ];
}

export function isProductCatalogAttributeTemplateCatalogDuplicated(
  templates: ProductCatalogAttributeTemplateItem[],
  catalogIds: string[],
  excludeId?: string
) {
  const normalizedCatalogIds = new Set(uniqueTrimmedValues(catalogIds));

  return templates.some(
    (item) =>
      item.id !== excludeId &&
      item.catalogIds.some((catalogId) => normalizedCatalogIds.has(catalogId))
  );
}

export function getEnabledProductCatalogAttributeTemplateByCatalogId(
  templates: ProductCatalogAttributeTemplateItem[],
  catalogId?: string
) {
  if (!catalogId) {
    return undefined;
  }

  return templates.find((item) => item.enabled && item.catalogIds.includes(catalogId));
}

export function buildProductCatalogAttributesFromTemplate(
  template: ProductCatalogAttributeTemplateItem | undefined,
  attributes: ProductCatalogAttributeItem[]
) {
  if (!template) {
    return [];
  }

  const attributeMap = new Map(attributes.map((item) => [item.id, item]));

  return template.entries.flatMap<ProductCatalogTemplateResolvedAttribute>((entry) => {
    const matchedAttribute = attributeMap.get(entry.attributeId);

    if (!matchedAttribute || !matchedAttribute.enabled) {
      return [];
    }

    return [
      {
        ...matchedAttribute,
        required: entry.required,
        templateSort: entry.sort,
      },
    ];
  });
}
