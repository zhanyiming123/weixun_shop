import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ORGANIZATION_CAPABILITIES,
  DEFAULT_ORGANIZATION_ITEMS,
  normalizeOrganizationCapabilities,
} from './data';

describe('organization data helpers', () => {
  it('migrates legacy customProductInfo capability to selfBuiltMarketingActivity', () => {
    expect(
      normalizeOrganizationCapabilities({
        selfBuiltProduct: true,
        customProductInfo: true,
      })
    ).toEqual({
      selfBuiltProduct: true,
      selfBuiltMarketingActivity: true,
    });
  });

  it('uses the new capability defaults for organization seeds', () => {
    expect(DEFAULT_ORGANIZATION_CAPABILITIES).toEqual({
      selfBuiltProduct: false,
      selfBuiltMarketingActivity: false,
    });

    const storeItems = DEFAULT_ORGANIZATION_ITEMS.filter(
      (item) => item.type === 'store'
    );

    expect(
      storeItems.every(
        (item) =>
          typeof item.capabilities.selfBuiltProduct === 'boolean' &&
          typeof item.capabilities.selfBuiltMarketingActivity === 'boolean'
      )
    ).toBe(true);

    expect(storeItems.map((item) => item.name)).toEqual([
      '唯寻橡沐店铺',
      '唯寻青少店铺',
      '唯寻北京店铺',
      '唯寻苏州店铺',
      '唯寻广州店铺',
      '唯寻深圳店铺',
      '唯寻未来学院店铺',
      '唯寻成都店铺',
      '唯寻西安店铺',
      '唯寻上海店铺',
    ]);
  });
});
