import { Dispatch, SetStateAction } from 'react';
import usePersistentState, {
  readPersistentValue,
} from '@/utils/usePersistentState';

export type ProductCatalogConfigItem = {
  id: string;
  name: string;
  parentId: string | null;
  hasSkuSpec?: boolean;
  sort?: number;
  enabled?: boolean;
};

export type ProductCatalogTreeNode = {
  id: string;
  label: string;
  hasSkuSpec?: boolean;
  enabled: boolean;
  children?: ProductCatalogTreeNode[];
};

export type ProductCatalogLeafItem = {
  id: string;
  label: string;
  labelPath: string[];
  path: string[];
  hasSkuSpec: boolean;
  enabled: boolean;
};

export type ProductCatalogCascaderOption = {
  value: string;
  label: string;
  disabled?: boolean;
  children?: ProductCatalogCascaderOption[];
};

const STORAGE_KEY = 'product-catalog-config-items';

function normalizeSortValue(value: unknown, fallbackValue: number) {
  if (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0
  ) {
    return value;
  }

  return fallbackValue;
}

export const DEFAULT_PRODUCT_CATALOG_ITEMS: ProductCatalogConfigItem[] = [
  { id: 'weixun-course', name: '唯寻课程', parentId: null, enabled: true },
  {
    id: 'international',
    name: '国际课程',
    parentId: 'weixun-course',
    hasSkuSpec: true,
    enabled: true,
  },
  {
    id: 'planning',
    name: '升学规划',
    parentId: 'weixun-course',
    hasSkuSpec: false,
    enabled: true,
  },
  {
    id: 'thesis',
    name: '论文文书',
    parentId: 'weixun-course',
    hasSkuSpec: false,
    enabled: true,
  },
  {
    id: 'service',
    name: '服务费',
    parentId: 'weixun-course',
    hasSkuSpec: false,
    enabled: true,
  },
];

export function normalizeProductCatalogItems(
  items: ProductCatalogConfigItem[] = DEFAULT_PRODUCT_CATALOG_ITEMS
) {
  const siblingCountMap = new Map<string | null, number>();
  const siblingIndexMap = new Map<string | null, number>();

  items.forEach((item) => {
    siblingCountMap.set(item.parentId, (siblingCountMap.get(item.parentId) || 0) + 1);
  });

  return items.map((item) => {
    const currentSiblingIndex = siblingIndexMap.get(item.parentId) || 0;
    const nextSiblingIndex = currentSiblingIndex + 1;
    siblingIndexMap.set(item.parentId, nextSiblingIndex);
    const siblingCount = siblingCountMap.get(item.parentId) || nextSiblingIndex;
    const fallbackSort = siblingCount - nextSiblingIndex + 1;

    return {
      ...item,
      sort: normalizeSortValue(item.sort, fallbackSort),
      enabled: item.enabled !== false,
    };
  });
}

export function readProductCatalogItems() {
  return normalizeProductCatalogItems(
    readPersistentValue(STORAGE_KEY, DEFAULT_PRODUCT_CATALOG_ITEMS)
  );
}

export function useProductCatalogItems() {
  const [items, setItems] = usePersistentState(STORAGE_KEY, DEFAULT_PRODUCT_CATALOG_ITEMS);

  const setNormalizedItems: Dispatch<SetStateAction<ProductCatalogConfigItem[]>> = (
    value
  ) => {
    setItems((prev) =>
      normalizeProductCatalogItems(
        typeof value === 'function'
          ? (
              value as (prevState: ProductCatalogConfigItem[]) => ProductCatalogConfigItem[]
            )(normalizeProductCatalogItems(prev))
          : value
      )
    );
  };

  return [normalizeProductCatalogItems(items), setNormalizedItems] as const;
}

export function buildProductCatalogTree(
  items: ProductCatalogConfigItem[] = DEFAULT_PRODUCT_CATALOG_ITEMS
): ProductCatalogTreeNode[] {
  const childrenMap = new Map<string | null, ProductCatalogConfigItem[]>();

  items.forEach((item) => {
    const key = item.parentId;
    const group = childrenMap.get(key) || [];
    group.push(item);
    childrenMap.set(key, group);
  });

  const buildNodes = (parentId: string | null): ProductCatalogTreeNode[] =>
    [...(childrenMap.get(parentId) || [])]
      .sort((left, right) => (right.sort || 0) - (left.sort || 0))
      .map((item) => {
      const children = buildNodes(item.id);
      return {
        id: item.id,
        label: item.name,
        hasSkuSpec: item.hasSkuSpec,
        enabled: item.enabled !== false,
        children: children.length ? children : undefined,
      };
      });

  return buildNodes(null);
}

function flattenProductCatalogLeaves(
  nodes: ProductCatalogTreeNode[],
  parentPath: string[] = [],
  parentLabelPath: string[] = [],
  parentEnabled = true
): ProductCatalogLeafItem[] {
  return nodes.flatMap((node) => {
    const path = [...parentPath, node.id];
    const labelPath = [...parentLabelPath, node.label];
    const enabled = parentEnabled && node.enabled;

    if (!node.children?.length) {
      return [
        {
          id: node.id,
          label: node.label,
          labelPath,
          path,
          hasSkuSpec: Boolean(node.hasSkuSpec),
          enabled,
        },
      ];
    }

    return flattenProductCatalogLeaves(node.children, path, labelPath, enabled);
  });
}

export function buildProductCatalogLeafItems(
  items: ProductCatalogConfigItem[] = DEFAULT_PRODUCT_CATALOG_ITEMS
) {
  return flattenProductCatalogLeaves(buildProductCatalogTree(items));
}

function toProductCatalogCascaderOptions(
  nodes: ProductCatalogTreeNode[],
  parentDisabled = false
): ProductCatalogCascaderOption[] {
  return nodes.map((node) => ({
    value: node.id,
    label: node.label,
    disabled: parentDisabled || !node.enabled,
    children: node.children?.length
      ? toProductCatalogCascaderOptions(
          node.children,
          parentDisabled || !node.enabled
        )
      : undefined,
  }));
}

export function buildProductCatalogCascaderOptions(
  items: ProductCatalogConfigItem[] = DEFAULT_PRODUCT_CATALOG_ITEMS
) {
  return toProductCatalogCascaderOptions(buildProductCatalogTree(items));
}

export function getProductCatalogLeafById(
  id?: string,
  items: ProductCatalogConfigItem[] = DEFAULT_PRODUCT_CATALOG_ITEMS
) {
  if (!id) {
    return undefined;
  }

  return buildProductCatalogLeafItems(items).find((item) => item.id === id);
}

export function getProductCatalogPathById(
  id?: string,
  items: ProductCatalogConfigItem[] = DEFAULT_PRODUCT_CATALOG_ITEMS
) {
  return getProductCatalogLeafById(id, items)?.path || [];
}

export function getProductCatalogLabelPathById(
  id?: string,
  items: ProductCatalogConfigItem[] = DEFAULT_PRODUCT_CATALOG_ITEMS
) {
  return getProductCatalogLeafById(id, items)?.labelPath || [];
}

export function getProductCatalogFullLabel(
  id?: string,
  items: ProductCatalogConfigItem[] = DEFAULT_PRODUCT_CATALOG_ITEMS
) {
  return getProductCatalogLabelPathById(id, items).join(' / ');
}

export function getProductCatalogIdFromPath(
  path: string[],
  items: ProductCatalogConfigItem[] = DEFAULT_PRODUCT_CATALOG_ITEMS
) {
  if (!path.length) {
    return undefined;
  }

  return buildProductCatalogLeafItems(items).find(
    (item) =>
      item.path.length === path.length &&
      item.path.every((value, index) => value === path[index])
  )?.id;
}

function isProductCatalogPathPrefix(path: string[], targetPath: string[]) {
  return (
    path.length > 0 &&
    path.length <= targetPath.length &&
    path.every((value, index) => value === targetPath[index])
  );
}

export function expandProductCatalogPathsToLeafIds(
  paths: string[][],
  items: ProductCatalogConfigItem[] = DEFAULT_PRODUCT_CATALOG_ITEMS
) {
  if (!paths.length) {
    return [];
  }

  const matchedLeafIdSet = new Set<string>();

  buildProductCatalogLeafItems(items).forEach((leafItem) => {
    if (paths.some((path) => isProductCatalogPathPrefix(path, leafItem.path))) {
      matchedLeafIdSet.add(leafItem.id);
    }
  });

  return Array.from(matchedLeafIdSet);
}
