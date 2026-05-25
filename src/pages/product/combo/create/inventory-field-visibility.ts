export type ProductCreateMode = 'create' | 'edit' | 'copy';

export function shouldShowComboInventoryFields(pageMode: ProductCreateMode) {
  return false;
}
