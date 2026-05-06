import { describe, expect, it, vi } from 'vitest';
import {
  handleUnavailableProductEdit,
  PRODUCT_EDIT_PRD_MESSAGE,
} from './edit-action';

describe('handleUnavailableProductEdit', () => {
  it('shows the PRD guidance message', () => {
    const showMessage = vi.fn();

    handleUnavailableProductEdit(showMessage);

    expect(showMessage).toHaveBeenCalledWith(PRODUCT_EDIT_PRD_MESSAGE);
  });
});
