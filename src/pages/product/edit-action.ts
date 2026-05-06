export const PRODUCT_EDIT_PRD_MESSAGE = '该编辑功能请参照 PRD 即可';

export function handleUnavailableProductEdit(showMessage: (text: string) => void) {
  showMessage(PRODUCT_EDIT_PRD_MESSAGE);
}
