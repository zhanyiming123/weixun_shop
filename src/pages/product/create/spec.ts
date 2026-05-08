import type { ProductCatalogSpecItem } from '../spec/data';
import type {
  ProductCarouselImage,
  ProductSkuItem,
  ProductStatus,
} from '@/types/product';

export type ProductSpecPair = {
  name: string;
  value: string;
};

export type ProductCreateSpecItem = {
  id: string;
  name: string;
  value: string;
  specPairs: ProductSpecPair[];
};

export type ProductSpecDimension = {
  key: string;
  label: string;
  values: string[];
  named: boolean;
};

export type ProductSkuAttributeDraftItem = {
  price?: number;
  stock?: number;
  status?: ProductStatus;
  image?: ProductCarouselImage;
  isDefaultSelected?: boolean;
};

export type ProductSkuAttributeRow = {
  key: string;
  specText: string;
  specPairs: ProductSpecPair[];
  specValueMap: Record<string, string>;
  price?: number;
  stock?: number;
  status: ProductStatus;
  image?: ProductCarouselImage;
  isDefaultSelected: boolean;
};

export type ProductSkuBatchPatch = {
  price?: number;
  stock?: number;
  image?: ProductCarouselImage;
};

const SPEC_TEXT_SEGMENT_SPLIT_PATTERN = /\s*[\/／]\s*/;

function buildSpecValueMap(specPairs: ProductSpecPair[]) {
  return specPairs.reduce<Record<string, string>>((result, pair, index) => {
    result[`spec_${index}`] = pair.value;
    return result;
  }, {});
}

function uniqueTrimmedValues(values: string[] = []) {
  const seenValues = new Set<string>();

  return values.reduce<string[]>((result, item) => {
    const value = item.trim();

    if (!value || seenValues.has(value)) {
      return result;
    }

    seenValues.add(value);
    return [...result, value];
  }, []);
}

function splitSpecTextSegments(specText: string) {
  return specText
    .split(SPEC_TEXT_SEGMENT_SPLIT_PATTERN)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeSelectedProductSpecValues(values: string[] = []) {
  return uniqueTrimmedValues(values);
}

export function normalizeSelectedProductSpecIds(
  selectedSpecIds: string[] = [],
  specs: Pick<ProductCatalogSpecItem, 'id'>[] = []
) {
  const availableSpecIdSet = new Set(specs.map((item) => item.id));
  const seenSpecIds = new Set<string>();

  return selectedSpecIds.reduce<string[]>((result, item) => {
    const specId = item.trim();

    if (!specId || seenSpecIds.has(specId) || !availableSpecIdSet.has(specId)) {
      return result;
    }

    seenSpecIds.add(specId);
    return [...result, specId];
  }, []);
}

export function buildDefaultSelectedProductSpecIds(
  specs: Pick<ProductCatalogSpecItem, 'id'>[] = []
) {
  const seenSpecIds = new Set<string>();

  return specs.reduce<string[]>((result, item) => {
    const specId = item.id.trim();

    if (!specId || seenSpecIds.has(specId)) {
      return result;
    }

    seenSpecIds.add(specId);
    return [...result, specId];
  }, []);
}

export function getSelectableProductSpecsForRow(
  specs: ProductCatalogSpecItem[] = [],
  selectedSpecIds: string[] = [],
  rowIndex: number
) {
  const currentSpecId = selectedSpecIds[rowIndex]?.trim() || '';
  const occupiedSpecIdSet = new Set(
    selectedSpecIds
      .map((item, index) => (index === rowIndex ? '' : item.trim()))
      .filter(Boolean)
  );

  return specs.filter(
    (item) => item.id === currentSpecId || !occupiedSpecIdSet.has(item.id)
  );
}

export function buildProductCreateSpecItems(
  selectedSpecs: ProductCatalogSpecItem[] = [],
  selectedValueMap: Record<string, string[]> = {}
) {
  const normalizedSpecs = selectedSpecs
    .map((item) => ({
      ...item,
      values: normalizeSelectedProductSpecValues(
        (selectedValueMap[item.id] || []).filter((value) => item.values.includes(value))
      ),
    }))
    .filter((item) => item.values.length > 0)
    .sort((left, right) => left.sort - right.sort);

  if (!normalizedSpecs.length || normalizedSpecs.length !== selectedSpecs.length) {
    return [] as ProductCreateSpecItem[];
  }

  const result: ProductCreateSpecItem[] = [];

  function walk(specIndex: number, currentPairs: ProductSpecPair[]) {
    if (specIndex >= normalizedSpecs.length) {
      const specPairs = currentPairs.map((item) => ({
        name: item.name,
        value: item.value,
      }));

      result.push({
        id: specPairs.map((item) => `${item.name}:${item.value}`).join('|'),
        name: specPairs.length === 1 ? specPairs[0].name : '',
        value: specPairs.length === 1 ? specPairs[0].value : '',
        specPairs,
      });
      return;
    }

    const currentSpec = normalizedSpecs[specIndex];

    currentSpec.values.forEach((value) => {
      walk(specIndex + 1, [
        ...currentPairs,
        {
          name: currentSpec.name,
          value,
        },
      ]);
    });
  }

  walk(0, []);
  return result;
}

export function formatProductCreateSpecText(
  item: Pick<ProductCreateSpecItem, 'name' | 'value' | 'specPairs'>,
  index: number
) {
  if (item.specPairs?.length) {
    return item.specPairs
      .map((pair) => `${pair.name.trim()}：${pair.value.trim()}`)
      .join(' / ');
  }

  return [item.name.trim(), item.value.trim()].filter(Boolean).join('：') || `规格${index + 1}`;
}

export function hasProductSpecSelectionDraft(
  selectedSpecIds: string[],
  selectedValueMap: Record<string, string[]>
) {
  if (selectedSpecIds.length > 0) {
    return true;
  }

  return Object.values(selectedValueMap).some((values) =>
    normalizeSelectedProductSpecValues(values).length > 0
  );
}

export function parseProductSpecText(
  specText: string,
  fallbackLabel = '规格'
) {
  const segments = splitSpecTextSegments(specText.trim());

  if (!segments.length) {
    return [] as ProductSpecPair[];
  }

  const parsedPairs = segments.map((segment) => {
    const separatorIndex = segment.includes('：')
      ? segment.indexOf('：')
      : segment.indexOf(':');

    if (separatorIndex <= 0) {
      return null;
    }

    const name = segment.slice(0, separatorIndex).trim();
    const value = segment.slice(separatorIndex + 1).trim();

    if (!name || !value) {
      return null;
    }

    return {
      name,
      value,
    };
  });

  if (parsedPairs.every(Boolean)) {
    return parsedPairs as ProductSpecPair[];
  }

  return [
    {
      name: fallbackLabel,
      value: specText.trim(),
    },
  ];
}

export function buildProductSpecDimensionsFromCatalogSpecs(
  specs: ProductCatalogSpecItem[] = [],
  selectedValueMap: Record<string, string[]> = {}
) {
  return specs.map((item, index) => ({
    key: `spec_${index}`,
    label: item.name,
    values: normalizeSelectedProductSpecValues(
      (selectedValueMap[item.id] || []).filter((value) => item.values.includes(value))
    ),
    named: true,
  }));
}

export function buildProductSpecDimensionsFromSkus(
  skus: Array<Pick<ProductSkuItem, 'specText'>> = []
) {
  const parsedRowPairs = skus
    .map((item) => parseProductSpecText(item.specText || ''))
    .filter((pairs) => pairs.length > 0);

  if (!parsedRowPairs.length) {
    return [] as ProductSpecDimension[];
  }

  const firstPairs = parsedRowPairs[0];
  const hasConsistentNamedPairs = parsedRowPairs.every(
    (pairs) =>
      pairs.length === firstPairs.length &&
      pairs.every((pair, index) => pair.name === firstPairs[index].name)
  );

  if (!hasConsistentNamedPairs) {
    return [
      {
        key: 'spec_0',
        label: '规格',
        values: uniqueTrimmedValues(parsedRowPairs.map((pairs) => pairs[0]?.value || '')),
        named: false,
      },
    ];
  }

  return firstPairs.map((pair, index) => ({
    key: `spec_${index}`,
    label: pair.name,
    values: uniqueTrimmedValues(parsedRowPairs.map((pairs) => pairs[index]?.value || '')),
    named: true,
  }));
}

export function normalizeProductSkuAttributeRows(
  rows: ProductSkuAttributeRow[] = []
) {
  let hasDefaultSelected = false;

  return rows.map((row) => {
    const isVisible = row.status !== 'off';
    const isDefaultSelected =
      row.isDefaultSelected === true && isVisible && !hasDefaultSelected;

    if (isDefaultSelected) {
      hasDefaultSelected = true;
    }

    return {
      ...row,
      isDefaultSelected,
    };
  });
}

export function buildProductSkuAttributeRowsFromSpecItems(
  specItems: ProductCreateSpecItem[] = [],
  draftMap: Record<string, ProductSkuAttributeDraftItem> = {}
) {
  const rows: ProductSkuAttributeRow[] = specItems.map((item, index) => {
    const draft = draftMap[String(item.id)] || {};
    const specPairs = item.specPairs.map((pair) => ({
      name: pair.name,
      value: pair.value,
    }));
    const isHidden =
      draft.status === 'off' ||
      ('disabled' in draft && (draft as ProductSkuAttributeDraftItem & { disabled?: boolean }).disabled === true);

    return {
      key: String(item.id),
      specText: formatProductCreateSpecText(item, index),
      specPairs,
      specValueMap: buildSpecValueMap(specPairs),
      price: draft.price,
      stock: draft.stock,
      status: isHidden ? 'off' : 'on',
      ...(draft.image ? { image: draft.image } : {}),
      isDefaultSelected: draft.isDefaultSelected === true,
    };
  });

  return normalizeProductSkuAttributeRows(rows);
}

export function buildProductSkuAttributeRowsFromSkus(
  skus: ProductSkuItem[] = [],
  draftMap: Record<string, ProductSkuAttributeDraftItem> = {}
) {
  const rows: ProductSkuAttributeRow[] = skus.map((sku) => {
    const draft = draftMap[sku.id] || {};
    const specPairs = parseProductSpecText(sku.specText || '');

    return {
      key: sku.id,
      specText: sku.specText,
      specPairs,
      specValueMap: buildSpecValueMap(specPairs),
      price:
        typeof draft.price === 'number' && Number.isFinite(draft.price)
          ? draft.price
          : sku.price,
      stock:
        typeof draft.stock === 'number' && Number.isFinite(draft.stock)
          ? draft.stock
          : sku.stock,
      status: draft.status === 'off' ? 'off' : draft.status === 'on' ? 'on' : sku.status,
      ...(draft.image || sku.image ? { image: draft.image || sku.image } : {}),
      isDefaultSelected:
        draft.isDefaultSelected === true ||
        (draft.isDefaultSelected !== false && sku.isDefaultSelected === true),
    };
  });

  return normalizeProductSkuAttributeRows(rows);
}

function matchesBatchFilters(
  row: ProductSkuAttributeRow,
  filters: Record<string, string>
) {
  return Object.entries(filters).every(
    ([key, value]) => !value || row.specValueMap[key] === value
  );
}

export function applyProductSkuBatchPatch(
  rows: ProductSkuAttributeRow[] = [],
  filters: Record<string, string> = {},
  patch: ProductSkuBatchPatch = {}
) {
  return normalizeProductSkuAttributeRows(
    rows.map((row) => {
      if (row.status === 'off' || !matchesBatchFilters(row, filters)) {
        return row;
      }

      return {
        ...row,
        price:
          typeof patch.price === 'number' && Number.isFinite(patch.price)
            ? patch.price
            : row.price,
        stock:
          typeof patch.stock === 'number' && Number.isFinite(patch.stock)
            ? patch.stock
            : row.stock,
        image: patch.image || row.image,
      };
    })
  );
}
