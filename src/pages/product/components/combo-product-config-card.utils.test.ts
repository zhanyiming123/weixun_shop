import { describe, expect, it } from 'vitest';
import type { ProductListItem } from '@/types/product';
import {
  buildComboTrialResult,
  buildComboTrialTableRows,
  canRemoveComboOptionProduct,
  canEnableComboOptionProductRequired,
  createComboOptionProductItem,
  DEFAULT_COMBO_OPTION_PRODUCT_LISTED,
  DEFAULT_COMBO_OPTION_PRODUCT_REQUIRED,
  getComboOptionDefaultSelectedCount,
  getComboTrialDefaultSelectionError,
  getComboOptionSelectionLimitError,
  getDisableComboOptionProductListedError,
  moveComboOptionProductItem,
  normalizeComboOptionSelectionLimit,
  preserveNonRemovableComboOptionSkuIds,
  syncComboOptionItemsByType,
  syncComboOptionProductRequiredState,
} from './combo-product-config-card.utils';

function createProductListItem(
  overrides: Partial<ProductListItem> = {}
): ProductListItem {
  return {
    id: 'product_default',
    name: '测试商品',
    productKind: 'standard',
    productCatalogId: 'catalog_1',
    productOwnershipId: 'ownership_1',
    productType: 'virtual',
    inventoryUnit: '份',
    specMode: 'single',
    skus: [
      {
        id: 'sku_default',
        specText: '',
        price: 100,
        stock: 10,
        status: 'on',
      },
    ],
    status: 'on',
    price: 100,
    stock: 10,
    createdAt: '2026-05-28 10:00:00',
    sourceType: 'store',
    storeConfigs: [],
    storeView: {} as ProductListItem['storeView'],
    ...overrides,
  };
}

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

  it('moves a combo product up by one row', () => {
    expect(
      moveComboOptionProductItem(
        [
          createComboOptionProductItem('product_1', 'sku_1', 100),
          createComboOptionProductItem('product_2', 'sku_2', 200),
          createComboOptionProductItem('product_3', 'sku_3', 300),
        ],
        'sku_2',
        'up'
      ).map((item) => item.skuId)
    ).toEqual(['sku_2', 'sku_1', 'sku_3']);
  });

  it('moves a combo product down by one row', () => {
    expect(
      moveComboOptionProductItem(
        [
          createComboOptionProductItem('product_1', 'sku_1', 100),
          createComboOptionProductItem('product_2', 'sku_2', 200),
          createComboOptionProductItem('product_3', 'sku_3', 300),
        ],
        'sku_2',
        'down'
      ).map((item) => item.skuId)
    ).toEqual(['sku_1', 'sku_3', 'sku_2']);
  });

  it('keeps combo product order unchanged when moving beyond list bounds', () => {
    const items = [
      createComboOptionProductItem('product_1', 'sku_1', 100),
      createComboOptionProductItem('product_2', 'sku_2', 200),
    ];

    expect(moveComboOptionProductItem(items, 'sku_1', 'up')).toEqual(items);
    expect(moveComboOptionProductItem(items, 'sku_2', 'down')).toEqual(items);
  });

  it('keeps combo product order unchanged when sku id is invalid', () => {
    const items = [
      createComboOptionProductItem('product_1', 'sku_1', 100),
      createComboOptionProductItem('product_2', 'sku_2', 200),
    ];

    expect(moveComboOptionProductItem(items, 'sku_3', 'up')).toEqual(items);
    expect(moveComboOptionProductItem(items, 'sku_3', 'down')).toEqual(items);
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

  it('allows enabling required when a single sku quantity exceeds the limit but sku type count does not', () => {
    expect(
      canEnableComboOptionProductRequired(
        {
          selectionLimit: 1,
          items: [
            {
              productId: 'product_1',
              skuId: 'sku_1',
              comboPrice: 100,
              quantity: 5,
              required: false,
              listed: true,
            },
          ],
        },
        'sku_1'
      )
    ).toBe(true);
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

  it('blocks switching selection limit when required sku type count is too large', () => {
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
              quantity: 5,
              required: true,
              listed: true,
            },
          ],
        },
        1
      )
    ).toBe('当前必选商品种类过多');
  });

  it('allows switching selection limit when only required quantity is large', () => {
    expect(
      getComboOptionSelectionLimitError(
        {
          items: [
            {
              productId: 'product_1',
              skuId: 'sku_1',
              comboPrice: 100,
              quantity: 5,
              required: true,
              listed: true,
            },
          ],
        },
        1
      )
    ).toBe('');
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
          optionType: 'selective',
          required: true,
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

  it('allows disabling listed for must-buy combo products', () => {
    expect(
      getDisableComboOptionProductListedError(
        {
          optionType: 'must_buy',
          required: true,
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
              quantity: 1,
              required: true,
              listed: true,
            },
          ],
        },
        'sku_2'
      )
    ).toBe('');
  });

  it('blocks disabling listed when listed product count would drop below selection limit', () => {
    expect(
      getDisableComboOptionProductListedError(
        {
          required: false,
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
          required: false,
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

  it('builds all supported two-option combo trial rows and totals', () => {
    const products = [
      createProductListItem({
        id: 'product_1',
        name: '主课 A',
        specMode: 'single',
        skus: [
          {
            id: 'sku_1',
            specText: '',
            price: 100,
            stock: 10,
            status: 'on',
          },
        ],
      }),
      createProductListItem({
        id: 'product_2',
        name: '主课 B',
        specMode: 'single',
        skus: [
          {
            id: 'sku_2',
            specText: '',
            price: 200,
            stock: 10,
            status: 'on',
          },
        ],
      }),
      createProductListItem({
        id: 'product_3',
        name: '加购课',
        specMode: 'multi',
        skus: [
          {
            id: 'sku_3',
            specText: '直播版',
            price: 60,
            stock: 10,
            status: 'on',
          },
        ],
      }),
    ];

    expect(
      buildComboTrialResult(
        [
          {
            id: 'option_1',
            title: '选项1',
            required: true,
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
              {
                productId: 'product_2',
                skuId: 'sku_2',
                comboPrice: 200,
                quantity: 1,
                required: false,
                listed: true,
              },
            ],
          },
          {
            id: 'option_2',
            title: '选项2',
            required: true,
            selectionLimit: 1,
            items: [
              {
                productId: 'product_3',
                skuId: 'sku_3',
                comboPrice: 50,
                quantity: 2,
                required: false,
                listed: true,
                defaultSelected: true,
              },
            ],
          },
        ],
        products
      )
    ).toEqual({
      supported: true,
      rows: [
        {
          key: 'sku_1__sku_3',
          leftSkuId: 'sku_1',
          rightSkuId: 'sku_3',
          leftProductName: '主课 A',
          rightProductName: '加购课',
          leftSpecText: '单规格',
          rightSpecText: '直播版',
          leftUnitPrice: 100,
          rightUnitPrice: 50,
          leftQuantity: 1,
          rightQuantity: 2,
          leftSubtotal: 100,
          rightSubtotal: 100,
          totalPrice: 200,
          isDefaultCombination: true,
        },
        {
          key: 'sku_2__sku_3',
          leftSkuId: 'sku_2',
          rightSkuId: 'sku_3',
          leftProductName: '主课 B',
          rightProductName: '加购课',
          leftSpecText: '单规格',
          rightSpecText: '直播版',
          leftUnitPrice: 200,
          rightUnitPrice: 50,
          leftQuantity: 1,
          rightQuantity: 2,
          leftSubtotal: 200,
          rightSubtotal: 100,
          totalPrice: 300,
          isDefaultCombination: false,
        },
      ],
    });
  });

  it('filters unlisted products from combo trial rows', () => {
    const products = [
      createProductListItem({
        id: 'product_1',
        name: '必看主课',
        skus: [
          {
            id: 'sku_1',
            specText: '',
            price: 100,
            stock: 10,
            status: 'on',
          },
        ],
      }),
      createProductListItem({
        id: 'product_2',
        name: '候选主课',
        skus: [
          {
            id: 'sku_2',
            specText: '',
            price: 120,
            stock: 10,
            status: 'on',
          },
        ],
      }),
      createProductListItem({
        id: 'product_3',
        name: '加购课',
        skus: [
          {
            id: 'sku_3',
            specText: '',
            price: 80,
            stock: 10,
            status: 'on',
          },
        ],
      }),
    ];

    expect(
      buildComboTrialResult(
        [
          {
            id: 'option_1',
            title: '选项1',
            required: true,
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
          {
            id: 'option_2',
            title: '选项2',
            required: true,
            selectionLimit: 1,
            items: [
              {
                productId: 'product_3',
                skuId: 'sku_3',
                comboPrice: 80,
                quantity: 1,
                required: false,
                listed: true,
              },
            ],
          },
        ],
        products
      ).rows.map((row) => row.leftSkuId)
    ).toEqual(['sku_1']);
  });

  it('rejects combo trial when selection limits are not one-per-option', () => {
    expect(
      buildComboTrialResult(
        [
          {
            id: 'option_1',
            title: '选项1',
            required: true,
            selectionLimit: 2,
            items: [],
          },
          {
            id: 'option_2',
            title: '选项2',
            required: true,
            selectionLimit: 1,
            items: [],
          },
        ],
        []
      )
    ).toEqual({
      supported: false,
      reason: '当前仅支持每个选项卡选择 1 份的试算',
      rows: [],
    });
  });

  it('rejects combo trial when an option has multiple required products', () => {
    expect(
      buildComboTrialResult(
        [
          {
            id: 'option_1',
            title: '选项1',
            required: true,
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
              {
                productId: 'product_2',
                skuId: 'sku_2',
                comboPrice: 120,
                quantity: 1,
                required: true,
                listed: true,
              },
            ],
          },
          {
            id: 'option_2',
            title: '选项2',
            required: true,
            selectionLimit: 1,
            items: [
              {
                productId: 'product_3',
                skuId: 'sku_3',
                comboPrice: 80,
                quantity: 1,
                required: false,
                listed: true,
              },
            ],
          },
        ],
        []
      )
    ).toEqual({
      supported: false,
      reason: '选项1存在多个必选商品，暂不支持试算',
      rows: [],
    });
  });

  it('counts listed required and default-selected items toward default selection validation', () => {
    expect(
      getComboOptionDefaultSelectedCount({
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
            defaultSelected: true,
          },
          {
            productId: 'product_3',
            skuId: 'sku_3',
            comboPrice: 150,
            quantity: 1,
            required: false,
            listed: false,
            defaultSelected: true,
          },
        ],
      })
    ).toBe(2);
  });

  it('keeps listed state when syncing must-buy option items by type', () => {
    expect(
      syncComboOptionItemsByType('must_buy', [
        {
          productId: 'product_1',
          skuId: 'sku_1',
          comboPrice: 100,
          quantity: 1,
          required: false,
          listed: false,
        },
      ])
    ).toEqual([
      {
        productId: 'product_1',
        skuId: 'sku_1',
        comboPrice: 100,
        quantity: 1,
        required: true,
        listed: false,
        defaultSelected: true,
      },
    ]);
  });

  it('returns an error when any option default-selected count does not match its selection limit', () => {
    expect(
      getComboTrialDefaultSelectionError([
        {
          id: 'option_1',
          title: '选项1',
          required: true,
          selectionLimit: 1,
          items: [
            {
              productId: 'product_1',
              skuId: 'sku_1',
              comboPrice: 100,
              quantity: 1,
              required: false,
              listed: true,
            },
          ],
        },
        {
          id: 'option_2',
          title: '选项2',
          required: true,
          selectionLimit: 1,
          items: [
            {
              productId: 'product_2',
              skuId: 'sku_2',
              comboPrice: 120,
              quantity: 1,
              required: false,
              listed: true,
              defaultSelected: true,
            },
          ],
        },
      ])
    ).toBe('请配置全部选项卡的默认选中商品');
  });

  it('flattens each combo trial into two table rows with shared sequence and total price', () => {
    expect(
      buildComboTrialTableRows([
        {
          key: 'sku_1__sku_3',
          leftSkuId: 'sku_1',
          rightSkuId: 'sku_3',
          leftProductName: '主课 A',
          rightProductName: '加购课',
          leftSpecText: '单规格',
          rightSpecText: '直播版',
          leftUnitPrice: 100,
          rightUnitPrice: 50,
          leftQuantity: 1,
          rightQuantity: 2,
          leftSubtotal: 100,
          rightSubtotal: 100,
          totalPrice: 200,
          isDefaultCombination: true,
        },
      ])
    ).toEqual([
      {
        key: 'sku_1__sku_3__left',
        comboIndex: 1,
        productName: '主课 A',
        skuId: 'sku_1',
        specText: '单规格',
        unitPrice: 100,
        quantity: 1,
        subtotal: 100,
        totalPrice: 200,
        rowSpan: 2,
        isSummaryRow: true,
        isDefaultCombination: true,
      },
      {
        key: 'sku_1__sku_3__right',
        comboIndex: 1,
        productName: '加购课',
        skuId: 'sku_3',
        specText: '直播版',
        unitPrice: 50,
        quantity: 2,
        subtotal: 100,
        totalPrice: 200,
        rowSpan: 0,
        isSummaryRow: false,
        isDefaultCombination: true,
      },
    ]);
  });
});
