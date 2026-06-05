import type { ProductKind, ProductShareStatus } from '@/types/product';

export type SharePoolPageTab = Extract<ProductKind, 'standard' | 'combo'>;
export type SharePoolTableColumnKey =
  | 'name'
  | 'comboDisplayOptions'
  | 'productCatalogId'
  | 'productOwnershipId'
  | 'sourceStoreName'
  | 'sellStatus'
  | 'status'
  | 'price'
  | 'createdAt'
  | 'operations'
  | 'stock'
  | 'independent'
  | 'sharedAt';

type SharePoolViewConfig = {
  productKind: SharePoolPageTab;
  showShareStatusFilter: boolean;
  showSubProductFilters: boolean;
  showSellStatusFilter: boolean;
  showInventoryColumn: boolean;
  priceDisplayMode: 'range' | 'single';
};

const SHARE_POOL_VIEW_CONFIG_MAP: Record<SharePoolPageTab, SharePoolViewConfig> = {
  standard: {
    productKind: 'standard',
    showShareStatusFilter: true,
    showSubProductFilters: false,
    showSellStatusFilter: false,
    showInventoryColumn: true,
    priceDisplayMode: 'range',
  },
  combo: {
    productKind: 'combo',
    showShareStatusFilter: true,
    showSubProductFilters: true,
    showSellStatusFilter: true,
    showInventoryColumn: false,
    priceDisplayMode: 'single',
  },
};

const SHARE_POOL_TABLE_COLUMN_KEYS_MAP: Record<
  SharePoolPageTab,
  SharePoolTableColumnKey[]
> = {
  standard: [
    'name',
    'productCatalogId',
    'productOwnershipId',
    'sourceStoreName',
    'price',
    'stock',
    'independent',
    'createdAt',
    'sharedAt',
    'operations',
  ],
  combo: [
    'name',
    'comboDisplayOptions',
    'productCatalogId',
    'productOwnershipId',
    'sourceStoreName',
    'sellStatus',
    'price',
    'independent',
    'createdAt',
    'sharedAt',
    'operations',
  ],
};

export function getSharePoolViewConfig(tab: SharePoolPageTab): SharePoolViewConfig {
  return SHARE_POOL_VIEW_CONFIG_MAP[tab];
}

export function getSharePoolTableColumnKeys(tab: SharePoolPageTab) {
  return SHARE_POOL_TABLE_COLUMN_KEYS_MAP[tab];
}

export function getSharePoolQueryStatus(
  tab: SharePoolPageTab,
  status: 'all' | ProductShareStatus
) {
  if (status === 'all') {
    return undefined;
  }

  return status;
}
