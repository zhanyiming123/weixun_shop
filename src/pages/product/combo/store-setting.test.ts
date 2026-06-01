import { describe, expect, it } from 'vitest';
import {
  buildComboStoreSettingSections,
  canEditComboStoreSettingDefaultSelected,
  canEditComboStoreSettingListed,
  COMBO_STORE_SETTING_EDITABLE_FIELDS,
  COMBO_STORE_SETTING_DEFAULT_SELECTED_LIMIT_ERROR_MESSAGE,
  COMBO_STORE_SETTING_LISTED_LIMIT_ERROR_MESSAGE,
  validateComboStoreSettingDefaultSelectedCount,
  validateComboStoreSettingListedChange,
} from './store-setting';

describe('combo store setting helpers', () => {
  it('builds readonly section metadata as text output', () => {
    const sections = buildComboStoreSettingSections([
      {
        id: 'option_1',
        title: '冲刺课程',
        optionType: 'selective',
        required: true,
        selectionLimit: 1,
        items: [
          {
            productId: 'product_1',
            skuId: 'sku_1',
            productName: '托福听力提分班',
            specText: '单规格',
            originalPrice: 699,
            comboPrice: 599,
            quantity: 2,
            required: false,
            listed: true,
            defaultSelected: true,
          },
        ],
      },
    ]);

    expect(sections).toEqual([
      {
        optionId: 'option_1',
        title: '选项1',
        fields: [
          {
            key: 'title',
            label: '选项标题',
            value: '冲刺课程',
            displayMode: 'text',
          },
          {
            key: 'optionType',
            label: '选项类型',
            value: '选购项',
            displayMode: 'text',
          },
          {
            key: 'selectionLimit',
            label: '选择限制',
            value: '选 1 份',
            displayMode: 'text',
          },
        ],
        rows: [
          {
            key: 'option_1:sku_1',
            optionId: 'option_1',
            optionType: 'selective',
            selectionLimit: 1,
            productId: 'product_1',
            skuId: 'sku_1',
            productName: '托福听力提分班',
            specText: '单规格',
            originalPrice: 699,
            comboPrice: 599,
            quantity: 2,
            subtotal: 1198,
            defaultSelected: true,
            defaultSelectedText: '是',
            listed: true,
          },
        ],
      },
    ]);
  });

  it('exposes combo price, listed and default selected as editable fields', () => {
    expect(COMBO_STORE_SETTING_EDITABLE_FIELDS).toEqual([
      'comboPrice',
      'listed',
      'defaultSelected',
    ]);
  });

  it('resolves edit permissions by option type', () => {
    expect(canEditComboStoreSettingListed('must_buy')).toBe(false);
    expect(canEditComboStoreSettingListed('selective')).toBe(true);
    expect(canEditComboStoreSettingListed('add_on')).toBe(true);

    expect(canEditComboStoreSettingDefaultSelected('must_buy')).toBe(false);
    expect(canEditComboStoreSettingDefaultSelected('selective')).toBe(true);
    expect(canEditComboStoreSettingDefaultSelected('add_on')).toBe(false);
  });

  it('prevents down-listing below the selection limit', () => {
    const sections = buildComboStoreSettingSections([
      {
        id: 'option_1',
        title: '冲刺课程',
        optionType: 'selective',
        required: true,
        selectionLimit: 2,
        items: [
          {
            productId: 'product_1',
            skuId: 'sku_1',
            productName: '托福听力提分班',
            specText: '单规格',
            originalPrice: 699,
            comboPrice: 599,
            quantity: 1,
            required: false,
            listed: true,
            defaultSelected: true,
          },
          {
            productId: 'product_2',
            skuId: 'sku_2',
            productName: 'SAT写作冲刺营',
            specText: '单规格',
            originalPrice: 899,
            comboPrice: 799,
            quantity: 1,
            required: false,
            listed: true,
            defaultSelected: true,
          },
        ],
      },
    ]);

    expect(
      validateComboStoreSettingListedChange(sections[0].rows, 'sku_1', false)
    ).toBe(COMBO_STORE_SETTING_LISTED_LIMIT_ERROR_MESSAGE);
  });

  it('requires selective default selected count to equal the selection limit', () => {
    const sections = buildComboStoreSettingSections([
      {
        id: 'option_1',
        title: '冲刺课程',
        optionType: 'selective',
        required: true,
        selectionLimit: 2,
        items: [
          {
            productId: 'product_1',
            skuId: 'sku_1',
            productName: '托福听力提分班',
            specText: '单规格',
            originalPrice: 699,
            comboPrice: 599,
            quantity: 1,
            required: false,
            listed: true,
            defaultSelected: true,
          },
          {
            productId: 'product_2',
            skuId: 'sku_2',
            productName: 'SAT写作冲刺营',
            specText: '单规格',
            originalPrice: 899,
            comboPrice: 799,
            quantity: 1,
            required: false,
            listed: true,
            defaultSelected: false,
          },
        ],
      },
    ]);

    expect(validateComboStoreSettingDefaultSelectedCount(sections[0].rows)).toBe(
      COMBO_STORE_SETTING_DEFAULT_SELECTED_LIMIT_ERROR_MESSAGE
    );
  });
});
