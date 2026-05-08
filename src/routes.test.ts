import { describe, expect, it } from 'vitest';
import { findFirstNavigableRouteKey, IRoute } from './routes';

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
});
