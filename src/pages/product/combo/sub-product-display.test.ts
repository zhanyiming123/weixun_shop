import { describe, expect, it } from 'vitest';
import {
  formatComboStockDisplay,
  formatComboSubProductSummary,
} from './sub-product-display';

describe('combo sub-product display helpers', () => {
  it('formats combo sub-product summary text', () => {
    expect(
      formatComboSubProductSummary([
        {
          key: 'option_1',
          title: '选项卡标题名1',
          selectionLimit: 1,
          productNames: ['商品名1', '商品名2'],
        },
        {
          key: 'option_2',
          title: '选项卡标题名2',
          selectionLimit: 1,
          productNames: ['商品名3', '商品名4'],
        },
      ])
    ).toBe(
      '选项卡标题名1（选 1 份）：商品名1、商品名2；选项卡标题名2（选 1 份）：商品名3、商品名4'
    );
  });

  it('formats combo stock as unlimited', () => {
    expect(formatComboStockDisplay()).toBe('无限');
  });
});
