export const COMBO_CREATE_STORE_CHANNEL_PRODUCT_POOL_SHOW_SELLABLE_SKU =
  false;

export function buildComboCreateStoreChannelProductPoolVisibleColumns<
  T extends { dataIndex?: string }
>(columns: T[]) {
  if (COMBO_CREATE_STORE_CHANNEL_PRODUCT_POOL_SHOW_SELLABLE_SKU) {
    return columns;
  }

  return columns.filter((column) => column.dataIndex !== 'sellableSkuKeys');
}
