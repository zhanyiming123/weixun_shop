import { describe, expect, it } from 'vitest';
import {
  buildProductCatalogLeafItems,
  readProductCatalogItems,
} from '@/pages/product/catalog/data';
import {
  buildProductOwnershipLeafItems,
  readProductOwnershipItems,
} from '@/pages/product/category/data';
import { buildMarketingProductSelectorSpus } from './data';

describe('marketing product selector data', () => {
  it('marks archived products as unselectable with an archived reason', () => {
    const spus = buildMarketingProductSelectorSpus(
      buildProductCatalogLeafItems(readProductCatalogItems()),
      buildProductOwnershipLeafItems(readProductOwnershipItems())
    );
    const archivedSpu = spus.find(
      (item) => item.productId === 'G_1237036327413878784'
    );

    expect(archivedSpu).toBeTruthy();
    expect(archivedSpu).toMatchObject({
      status: 'off',
      selectable: false,
      disabledReason: '商品已下架',
    });
    expect(archivedSpu?.children).toHaveLength(2);
    expect(archivedSpu?.children.every((item) => !item.selectable)).toBe(true);
    expect(
      archivedSpu?.children.every((item) => item.disabledReason === '商品已下架')
    ).toBe(true);
    expect(archivedSpu?.children.every((item) => item.status === 'off')).toBe(true);
  });

  it('keeps active spus selectable while disabling only archived skus', () => {
    const spus = buildMarketingProductSelectorSpus(
      buildProductCatalogLeafItems(readProductCatalogItems()),
      buildProductOwnershipLeafItems(readProductOwnershipItems())
    );
    const mixedSpu = spus.find((item) => item.productId === 'G_1211793279398580224');

    expect(mixedSpu).toBeTruthy();
    expect(mixedSpu).toMatchObject({
      status: 'on',
      selectable: true,
      disabledReason: '',
    });
    expect(mixedSpu?.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          skuId: 'sku-G_1211793279398580224-1',
          status: 'on',
          selectable: true,
          disabledReason: '',
        }),
        expect.objectContaining({
          skuId: 'sku-G_1211793279398580224-2',
          status: 'off',
          selectable: false,
          disabledReason: '商品已下架',
        }),
      ])
    );
  });
});
