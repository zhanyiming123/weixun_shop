import usePersistentState, {
  readPersistentValue,
} from '@/utils/usePersistentState';

export type ProductCatalogConfigItem = {
  id: string;
  name: string;
  parentId: string | null;
  hasSkuSpec?: boolean;
};

export type ProductCatalogTreeNode = {
  id: string;
  label: string;
  hasSkuSpec?: boolean;
  children?: ProductCatalogTreeNode[];
};

export type ProductCatalogLeafItem = {
  id: string;
  label: string;
  labelPath: string[];
  path: string[];
  hasSkuSpec: boolean;
};

export type ProductCatalogCascaderOption = {
  value: string;
  label: string;
  children?: ProductCatalogCascaderOption[];
};

const STORAGE_KEY = 'product-catalog-config-items';

export const DEFAULT_PRODUCT_CATALOG_ITEMS: ProductCatalogConfigItem[] = [
  { id: 'weixun-course', name: '唯寻课程', parentId: null },
  {
    id: 'international',
    name: '国际课程',
    parentId: 'weixun-course',
    hasSkuSpec: true,
  },
  {
    id: 'planning',
    name: '升学规划',
    parentId: 'weixun-course',
    hasSkuSpec: false,
  },
  {
    id: 'thesis',
    name: '论文文书',
    parentId: 'weixun-course',
    hasSkuSpec: false,
  },
  {
    id: 'service',
    name: '服务费',
    parentId: 'weixun-course',
    hasSkuSpec: false,
  },
];

export function readProductCatalogItems() {
  return readPersistentValue(STORAGE_KEY, DEFAULT_PRODUCT_CATALOG_ITEMS);
}

export function useProductCatalogItems() {
  return usePersistentState(STORAGE_KEY, DEFAULT_PRODUCT_CATALOG_ITEMS);
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
    (childrenMap.get(parentId) || []).map((item) => {
      const children = buildNodes(item.id);
      return {
        id: item.id,
        label: item.name,
        hasSkuSpec: item.hasSkuSpec,
        children: children.length ? children : undefined,
      };
    });

  return buildNodes(null);
}

function flattenProductCatalogLeaves(
  nodes: ProductCatalogTreeNode[],
  parentPath: string[] = [],
  parentLabelPath: string[] = []
): ProductCatalogLeafItem[] {
  return nodes.flatMap((node) => {
    const path = [...parentPath, node.id];
    const labelPath = [...parentLabelPath, node.label];

    if (!node.children?.length) {
      return [
        {
          id: node.id,
          label: node.label,
          labelPath,
          path,
          hasSkuSpec: Boolean(node.hasSkuSpec),
        },
      ];
    }

    return flattenProductCatalogLeaves(node.children, path, labelPath);
  });
}

export function buildProductCatalogLeafItems(
  items: ProductCatalogConfigItem[] = DEFAULT_PRODUCT_CATALOG_ITEMS
) {
  return flattenProductCatalogLeaves(buildProductCatalogTree(items));
}

function toProductCatalogCascaderOptions(
  nodes: ProductCatalogTreeNode[]
): ProductCatalogCascaderOption[] {
  return nodes.map((node) => ({
    value: node.id,
    label: node.label,
    children: node.children?.length
      ? toProductCatalogCascaderOptions(node.children)
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
