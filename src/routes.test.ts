import { describe, expect, it } from 'vitest';
import { findFirstNavigableRouteKey, IRoute, routes } from './routes';

describe('findFirstNavigableRouteKey', () => {
  it('skips ignored routes and returns the first visible business page', () => {
    const routeItems: IRoute[] = [
      {
        name: 'menu.home',
        key: 'dashboard/workplace',
        ignore: true,
      },
      {
        name: 'menu.storeConfig',
        key: 'store-config',
        children: [
          {
            name: 'menu.storeConfig.employee',
            key: 'store-config/employee',
            ignore: true,
          },
          {
            name: 'menu.product.list',
            key: 'product/list',
          },
        ],
      },
    ];

    expect(findFirstNavigableRouteKey(routeItems)).toBe('product/list');
  });

  it('nests order list and after-sales list under the order menu in the store system', () => {
    const orderRoute = routes.find((item) => item.key === 'order');
    const topLevelAfterSalesRoute = routes.find((item) => item.key === 'after-sales');

    expect(orderRoute?.ignore).not.toBe(true);
    expect(orderRoute?.children?.map((item) => item.key)).toEqual([
      'order/list',
      'after-sales/list',
    ]);
    expect(topLevelAfterSalesRoute).toBeUndefined();
  });

  it('keeps merchant store management as a parent menu with store list as the only visible child', () => {
    const organizationRoute = routes.find(
      (item) => item.key === 'merchant-system.organization'
    );

    expect(organizationRoute?.children?.map((item) => item.key)).toEqual([
      'merchant/organization',
    ]);
    expect(
      organizationRoute?.children?.[0].children?.every((item) => item.ignore)
    ).toBe(true);
  });
});
