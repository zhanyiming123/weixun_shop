import { describe, expect, it } from 'vitest';
import { getChannelStatusAction } from './channel-status-action';

describe('product list channel status action helper', () => {
  it('shows the on-shelf label for off products while toggling them on', () => {
    expect(getChannelStatusAction('off')).toEqual({
      label: '设为上架',
      nextStatus: 'on',
    });
  });

  it('shows the off-shelf label for on products while toggling them off', () => {
    expect(getChannelStatusAction('on')).toEqual({
      label: '设为下架',
      nextStatus: 'off',
    });
  });
});
