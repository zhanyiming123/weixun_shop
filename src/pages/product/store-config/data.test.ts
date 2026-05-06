import { describe, expect, it } from 'vitest';
import { DEFAULT_PRODUCT_STORE_ITEMS } from './data';

describe('product store seeds', () => {
  it('uses the requested 10 demo stores', () => {
    const storeNames = DEFAULT_PRODUCT_STORE_ITEMS.filter(
      (item) => item.type === 'store'
    ).map((item) => item.name);

    expect(storeNames).toEqual([
      '唯寻橡沐店铺',
      '唯寻青少店铺',
      '唯寻北京店铺',
      '唯寻苏州店铺',
      '唯寻深圳店铺',
      '唯寻广州店铺',
      '唯寻未来学院店铺',
      '唯寻成都店铺',
      '唯寻西安店铺',
      '唯寻上海店铺',
    ]);
  });
});
