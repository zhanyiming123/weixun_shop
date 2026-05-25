import { describe, expect, it } from 'vitest';
import {
  canRemoveComboOptionProduct,
  canEnableComboOptionProductRequired,
  createComboOptionProductItem,
  DEFAULT_COMBO_OPTION_PRODUCT_LISTED,
  DEFAULT_COMBO_OPTION_PRODUCT_REQUIRED,
  getComboOptionSelectionLimitError,
  getDisableComboOptionProductListedError,
  normalizeComboOptionSelectionLimit,
  preserveNonRemovableComboOptionSkuIds,
  syncComboOptionProductRequiredState,
} from './combo-product-config-card.utils';

describe('combo product config card helpers', () => {
  it('creates added combo products with source price as combo price by default', () => {
    expect(DEFAULT_COMBO_OPTION_PRODUCT_REQUIRED).toBe(false);
    expect(DEFAULT_COMBO_OPTION_PRODUCT_LISTED).toBe(true);
    expect(createComboOptionProductItem('product_1', 'sku_1', 199)).toEqual({
      productId: 'product_1',
      skuId: 'sku_1',
      comboPrice: 199,
      quantity: 1,
      required: false,
      listed: true,
    });
  });

  it('blocks removing source combo products in edit mode', () => {
    expect(canRemoveComboOptionProduct('sku_1', ['sku_1', 'sku_2'])).toBe(false);
    expect(canRemoveComboOptionProduct('sku_3', ['sku_1', 'sku_2'])).toBe(true);
  });

  it('preserves source combo products when selector confirmation omits them', () => {
    expect(
      preserveNonRemovableComboOptionSkuIds(['sku_3'], ['sku_1', 'sku_3', 'sku_2'])
    ).toEqual(['sku_3', 'sku_1', 'sku_2']);
  });

  it('forces child required state to false when the parent option is optional', () => {
    expect(
      syncComboOptionProductRequiredState(false, [
        {
          productId: 'product_1',
          skuId: 'sku_1',
          comboPrice: 100,
          quantity: 1,
          required: true,
          listed: true,
        },
        {
          productId: 'product_2',
          skuId: 'sku_2',
          comboPrice: 120,
          quantity: 2,
          required: false,
          listed: true,
        },
      ])
    ).toEqual([
      {
        productId: 'product_1',
        skuId: 'sku_1',
        comboPrice: 100,
        quantity: 1,
        required: false,
        listed: true,
      },
      {
        productId: 'product_2',
        skuId: 'sku_2',
        comboPrice: 120,
        quantity: 2,
        required: false,
        listed: true,
      },
    ]);
  });

  it('keeps child required state unchanged when the parent option is required', () => {
    expect(
      syncComboOptionProductRequiredState(true, [
        {
          productId: 'product_1',
          skuId: 'sku_1',
          comboPrice: 100,
          quantity: 1,
          required: true,
          listed: true,
        },
        {
          productId: 'product_2',
          skuId: 'sku_2',
          comboPrice: 120,
          quantity: 2,
          required: false,
          listed: true,
        },
      ])
    ).toEqual([
      {
        productId: 'product_1',
        skuId: 'sku_1',
        comboPrice: 100,
        quantity: 1,
        required: true,
        listed: true,
      },
      {
        productId: 'product_2',
        skuId: 'sku_2',
        comboPrice: 120,
        quantity: 2,
        required: false,
        listed: true,
      },
    ]);
  });

  it('does not restore child required state after toggling back to required', () => {
    const optionalItems = syncComboOptionProductRequiredState(false, [
      {
        productId: 'product_1',
        skuId: 'sku_1',
        comboPrice: 100,
        quantity: 1,
        required: true,
        listed: true,
      },
    ]);

    expect(syncComboOptionProductRequiredState(true, optionalItems)).toEqual([
      {
        productId: 'product_1',
        skuId: 'sku_1',
        comboPrice: 100,
        quantity: 1,
        required: false,
        listed: true,
      },
    ]);
  });

  it('blocks enabling required when the current option would exceed its selection limit', () => {
    expect(
      canEnableComboOptionProductRequired(
        {
          selectionLimit: 2,
          items: [
            {
              productId: 'product_1',
              skuId: 'sku_1',
              comboPrice: 100,
              quantity: 1,
              required: true,
              listed: true,
            },
            {
              productId: 'product_2',
              skuId: 'sku_2',
              comboPrice: 120,
              quantity: 2,
              required: false,
              listed: true,
            },
          ],
        },
        'sku_2'
      )
    ).toBe(false);
  });

  it('allows enabling required when the current option stays within its selection limit', () => {
    expect(
      canEnableComboOptionProductRequired(
        {
          selectionLimit: 3,
          items: [
            {
              productId: 'product_1',
              skuId: 'sku_1',
              comboPrice: 100,
              quantity: 1,
              required: true,
              listed: true,
            },
            {
              productId: 'product_2',
              skuId: 'sku_2',
              comboPrice: 120,
              quantity: 2,
              required: false,
              listed: true,
            },
          ],
        },
        'sku_2'
      )
    ).toBe(true);
  });

  it('blocks switching selection limit when listed product count is insufficient', () => {
    expect(
      getComboOptionSelectionLimitError(
        {
          items: [
            {
              productId: 'product_1',
              skuId: 'sku_1',
              comboPrice: 100,
              quantity: 1,
              required: true,
              listed: true,
            },
            {
              productId: 'product_2',
              skuId: 'sku_2',
              comboPrice: 120,
              quantity: 1,
              required: false,
              listed: false,
            },
          ],
        },
        2
      )
    ).toBe('当前上架商品数量不足');
  });

  it('blocks switching selection limit when required quantity is too large', () => {
    expect(
      getComboOptionSelectionLimitError(
        {
          items: [
            {
              productId: 'product_1',
              skuId: 'sku_1',
              comboPrice: 100,
              quantity: 2,
              required: true,
              listed: true,
            },
            {
              productId: 'product_2',
              skuId: 'sku_2',
              comboPrice: 120,
              quantity: 1,
              required: false,
              listed: true,
            },
          ],
        },
        1
      )
    ).toBe('当前必选商品数量过多');
  });

  it('allows switching selection limit when listed and required quantities are valid', () => {
    expect(
      getComboOptionSelectionLimitError(
        {
          items: [
            {
              productId: 'product_1',
              skuId: 'sku_1',
              comboPrice: 100,
              quantity: 1,
              required: true,
              listed: true,
            },
            {
              productId: 'product_2',
              skuId: 'sku_2',
              comboPrice: 120,
              quantity: 1,
              required: false,
              listed: true,
            },
          ],
        },
        1
      )
    ).toBe('');
  });

  it('blocks disabling listed for required combo products', () => {
    expect(
      getDisableComboOptionProductListedError(
        {
          selectionLimit: 1,
          items: [
            {
              productId: 'product_1',
              skuId: 'sku_1',
              comboPrice: 100,
              quantity: 1,
              required: true,
              listed: true,
            },
          ],
        },
        'sku_1'
      )
    ).toBe('必选商品不允许下架');
  });

  it('blocks disabling listed when listed product count would drop below selection limit', () => {
    expect(
      getDisableComboOptionProductListedError(
        {
          selectionLimit: 2,
          items: [
            {
              productId: 'product_1',
              skuId: 'sku_1',
              comboPrice: 100,
              quantity: 1,
              required: false,
              listed: true,
            },
            {
              productId: 'product_2',
              skuId: 'sku_2',
              comboPrice: 120,
              quantity: 1,
              required: false,
              listed: true,
            },
          ],
        },
        'sku_2'
      )
    ).toBe('当前上架商品数量不可小于选择限制数量');
  });

  it('allows disabling listed when there are enough remaining listed products', () => {
    expect(
      getDisableComboOptionProductListedError(
        {
          selectionLimit: 2,
          items: [
            {
              productId: 'product_1',
              skuId: 'sku_1',
              comboPrice: 100,
              quantity: 1,
              required: false,
              listed: true,
            },
            {
              productId: 'product_2',
              skuId: 'sku_2',
              comboPrice: 120,
              quantity: 1,
              required: false,
              listed: true,
            },
            {
              productId: 'product_3',
              skuId: 'sku_3',
              comboPrice: 140,
              quantity: 1,
              required: false,
              listed: true,
            },
          ],
        },
        'sku_3'
      )
    ).toBe('');
  });

  it('clamps selection limit to the remaining listed product count', () => {
    expect(
      normalizeComboOptionSelectionLimit({
        selectionLimit: 3,
        items: [
          {
            productId: 'product_1',
            skuId: 'sku_1',
            comboPrice: 100,
            quantity: 1,
            required: false,
            listed: true,
          },
          {
            productId: 'product_2',
            skuId: 'sku_2',
            comboPrice: 120,
            quantity: 1,
            required: false,
            listed: false,
          },
        ],
      })
    ).toBe(1);
  });
});
