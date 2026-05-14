import auth, { AuthParams } from '@/utils/authentication';
import { DemoIdentityId, DemoSystemId } from '@/utils/demo';
import { OrganizationScope } from '@/utils/organization';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type IRoute = AuthParams & {
  name: string;
  key: string;
  visibleScopes?: OrganizationScope[];
  visibleSystems?: DemoSystemId[];
  visibleDemoIdentities?: DemoIdentityId[];
  breadcrumb?: boolean;
  children?: IRoute[];
  ignore?: boolean;
};

export const routes: IRoute[] = [
  {
    name: 'menu.home',
    key: 'dashboard/workplace',
    ignore: true,
    visibleScopes: ['headquarter', 'region', 'store'],
    visibleSystems: ['merchant', 'store'],
    visibleDemoIdentities: ['merchant_admin', 'region_admin', 'store_staff'],
  },
  {
    name: 'menu.merchant.organization',
    key: 'merchant-system.organization',
    visibleScopes: ['headquarter', 'region', 'store'],
    visibleSystems: ['merchant'],
    visibleDemoIdentities: ['merchant_admin', 'region_admin'],
    children: [
      {
        name: 'menu.merchant.organization.list',
        key: 'merchant/organization',
        visibleScopes: ['headquarter', 'region', 'store'],
        visibleSystems: ['merchant'],
        visibleDemoIdentities: ['merchant_admin', 'region_admin'],
        children: [
          {
            name: 'menu.merchant.storeEmployee',
            key: 'merchant/organization/store-employee',
            ignore: true,
            visibleScopes: ['headquarter', 'region', 'store'],
            visibleSystems: ['merchant'],
            visibleDemoIdentities: ['merchant_admin', 'region_admin'],
          },
          {
            name: 'menu.merchant.storeEmployee',
            key: 'merchant/organization/store-employee/edit',
            ignore: true,
            visibleScopes: ['headquarter', 'region', 'store'],
            visibleSystems: ['merchant'],
            visibleDemoIdentities: ['merchant_admin', 'region_admin'],
          },
        ],
      },
    ],
  },
  {
    name: 'menu.merchant.organization.create',
    key: 'merchant/organization/create',
    ignore: true,
    breadcrumb: false,
    visibleScopes: ['headquarter', 'region', 'store'],
    visibleSystems: ['merchant'],
    visibleDemoIdentities: ['merchant_admin', 'region_admin'],
  },
  {
    name: 'menu.merchant.organization.edit',
    key: 'merchant/organization/edit',
    ignore: true,
    breadcrumb: false,
    visibleScopes: ['headquarter', 'region', 'store'],
    visibleSystems: ['merchant'],
    visibleDemoIdentities: ['merchant_admin', 'region_admin'],
  },
  {
    name: 'menu.productConfig',
    key: 'product-config',
    visibleScopes: ['headquarter', 'region', 'store'],
    visibleSystems: ['merchant'],
    visibleDemoIdentities: ['merchant_admin'],
    children: [
      {
        name: 'menu.product.category',
        key: 'product-config/category',
        visibleScopes: ['headquarter', 'region', 'store'],
        visibleSystems: ['merchant'],
        visibleDemoIdentities: ['merchant_admin'],
      },
      {
        name: 'menu.product.catalog',
        key: 'product-config/catalog',
        visibleScopes: ['headquarter', 'region', 'store'],
        visibleSystems: ['merchant'],
        visibleDemoIdentities: ['merchant_admin'],
      },
      {
        name: 'menu.product.attribute',
        key: 'product-config/attribute',
        visibleScopes: ['headquarter', 'region', 'store'],
        visibleSystems: ['merchant'],
        visibleDemoIdentities: ['merchant_admin'],
      },
      {
        name: 'menu.product.spec',
        key: 'product-config/spec',
        visibleScopes: ['headquarter', 'region', 'store'],
        visibleSystems: ['merchant'],
        visibleDemoIdentities: ['merchant_admin'],
      },
    ],
  },
  {
    name: 'menu.marketing',
    key: 'marketing',
    visibleScopes: ['headquarter', 'region', 'store'],
    visibleSystems: ['merchant'],
    visibleDemoIdentities: ['merchant_admin'],
    children: [
      {
        name: 'menu.marketing.center',
        key: 'marketing/center',
        visibleScopes: ['headquarter', 'region', 'store'],
        visibleSystems: ['merchant'],
        visibleDemoIdentities: ['merchant_admin'],
        children: [
          {
            name: 'menu.marketing.couponList',
            key: 'marketing/center/coupon/list',
            ignore: true,
            breadcrumb: false,
            visibleScopes: ['headquarter', 'region', 'store'],
            visibleSystems: ['merchant'],
            visibleDemoIdentities: ['merchant_admin'],
          },
          {
            name: 'menu.marketing.couponCreate',
            key: 'marketing/center/coupon/create',
            ignore: true,
            breadcrumb: false,
            visibleScopes: ['headquarter', 'region', 'store'],
            visibleSystems: ['merchant'],
            visibleDemoIdentities: ['merchant_admin'],
          },
          {
            name: 'menu.marketing.couponDetail',
            key: 'marketing/center/coupon/detail',
            ignore: true,
            breadcrumb: false,
            visibleScopes: ['headquarter', 'region', 'store'],
            visibleSystems: ['merchant'],
            visibleDemoIdentities: ['merchant_admin'],
          },
          {
            name: 'menu.marketing.couponEdit',
            key: 'marketing/center/coupon/edit',
            ignore: true,
            breadcrumb: false,
            visibleScopes: ['headquarter', 'region', 'store'],
            visibleSystems: ['merchant'],
            visibleDemoIdentities: ['merchant_admin'],
          },
        ],
      },
    ],
  },
  {
    name: 'menu.merchant.permission',
    key: 'merchant/permission',
    visibleScopes: ['headquarter', 'region', 'store'],
    visibleSystems: ['merchant'],
    visibleDemoIdentities: ['merchant_admin'],
    children: [
      {
        name: 'menu.merchant.employee',
        key: 'merchant/employee',
        ignore: true,
        visibleScopes: ['headquarter', 'region', 'store'],
        visibleSystems: ['merchant'],
        visibleDemoIdentities: ['merchant_admin'],
      },
      {
        name: 'menu.merchant.storeEmployee',
        key: 'merchant/store-employee',
        ignore: true,
        visibleScopes: ['headquarter', 'region', 'store'],
        visibleSystems: ['merchant'],
        visibleDemoIdentities: ['merchant_admin'],
      },
      {
        name: 'menu.merchant.role',
        key: 'merchant/role',
        visibleScopes: ['headquarter', 'region', 'store'],
        visibleSystems: ['merchant'],
        visibleDemoIdentities: ['merchant_admin'],
      },
      {
        name: 'menu.merchant.department',
        key: 'merchant/department',
        visibleScopes: ['headquarter', 'region', 'store'],
        visibleSystems: ['merchant'],
        visibleDemoIdentities: ['merchant_admin'],
      },
    ],
  },
  {
    name: 'menu.merchant.systemSettings',
    key: 'merchant/system-settings',
    visibleScopes: ['headquarter', 'region', 'store'],
    visibleSystems: ['merchant'],
    visibleDemoIdentities: ['merchant_admin'],
    children: [
      {
        name: 'menu.merchant.systemMenuConfig',
        key: 'merchant/system-menu-config',
        visibleScopes: ['headquarter', 'region', 'store'],
        visibleSystems: ['merchant'],
        visibleDemoIdentities: ['merchant_admin'],
      },
      {
        name: 'menu.merchant.dataPermissionModuleConfig',
        key: 'merchant/data-permission-module-config',
        visibleScopes: ['headquarter', 'region', 'store'],
        visibleSystems: ['merchant'],
        visibleDemoIdentities: ['merchant_admin'],
      },
    ],
  },
  {
    name: 'menu.merchant.employee.create',
    key: 'merchant/employee/create',
    ignore: true,
    breadcrumb: false,
    visibleScopes: ['headquarter', 'region', 'store'],
    visibleSystems: ['merchant'],
    visibleDemoIdentities: ['merchant_admin'],
  },
  {
    name: 'menu.merchant.role.create',
    key: 'merchant/role/create',
    ignore: true,
    breadcrumb: false,
    visibleScopes: ['headquarter', 'region', 'store'],
    visibleSystems: ['merchant'],
    visibleDemoIdentities: ['merchant_admin'],
  },
  {
    name: 'menu.merchant.role.edit',
    key: 'merchant/role/edit',
    ignore: true,
    breadcrumb: false,
    visibleScopes: ['headquarter', 'region', 'store'],
    visibleSystems: ['merchant'],
    visibleDemoIdentities: ['merchant_admin'],
  },
  {
    name: 'menu.product',
    key: 'product',
    visibleScopes: ['store'],
    visibleSystems: ['store'],
    visibleDemoIdentities: ['region_admin', 'store_staff'],
    children: [
      {
        name: 'menu.product.list',
        key: 'product/list',
        visibleScopes: ['store'],
        visibleSystems: ['store'],
        visibleDemoIdentities: ['region_admin', 'store_staff'],
      },
      {
        name: 'menu.product.combo',
        key: 'product/combo',
        visibleScopes: ['store'],
        visibleSystems: ['store'],
        visibleDemoIdentities: ['region_admin', 'store_staff'],
      },
      {
        name: 'menu.product.bundle',
        key: 'product/bundle',
        ignore: true,
        visibleScopes: ['store'],
        visibleSystems: ['store'],
        visibleDemoIdentities: ['region_admin', 'store_staff'],
      },
      {
        name: 'menu.product.sharePool',
        key: 'product/share-pool',
        visibleScopes: ['store'],
        visibleSystems: ['store'],
        visibleDemoIdentities: ['region_admin', 'store_staff'],
      },
      {
        name: 'menu.product.create',
        key: 'product/create',
        ignore: true,
        breadcrumb: false,
        visibleScopes: ['store'],
        visibleSystems: ['store'],
        visibleDemoIdentities: ['region_admin', 'store_staff'],
      },
      {
        name: 'menu.product.comboCreate',
        key: 'product/combo/create',
        ignore: true,
        breadcrumb: false,
        visibleScopes: ['store'],
        visibleSystems: ['store'],
        visibleDemoIdentities: ['region_admin', 'store_staff'],
      },
      {
        name: 'menu.product.bundleCreate',
        key: 'product/bundle/create',
        ignore: true,
        breadcrumb: false,
        visibleScopes: ['store'],
        visibleSystems: ['store'],
        visibleDemoIdentities: ['region_admin', 'store_staff'],
      },
    ],
  },
  {
    name: 'menu.order',
    key: 'order',
    visibleScopes: ['store'],
    visibleSystems: ['store'],
    visibleDemoIdentities: ['region_admin', 'store_staff'],
    children: [
      {
        name: 'menu.order.list',
        key: 'order/list',
        visibleScopes: ['store'],
        visibleSystems: ['store'],
        visibleDemoIdentities: ['region_admin', 'store_staff'],
      },
      {
        name: 'menu.afterSales.list',
        key: 'after-sales/list',
        visibleScopes: ['store'],
        visibleSystems: ['store'],
        visibleDemoIdentities: ['region_admin', 'store_staff'],
      },
    ],
  },
  {
    name: 'menu.marketing',
    key: 'marketing',
    visibleScopes: ['store'],
    visibleSystems: ['store'],
    visibleDemoIdentities: ['region_admin', 'store_staff'],
    children: [
      {
        name: 'menu.marketing.center',
        key: 'marketing/center',
        visibleScopes: ['store'],
        visibleSystems: ['store'],
        visibleDemoIdentities: ['region_admin', 'store_staff'],
        children: [
          {
            name: 'menu.marketing.couponList',
            key: 'marketing/center/coupon/list',
            ignore: true,
            breadcrumb: false,
            visibleScopes: ['store'],
            visibleSystems: ['store'],
            visibleDemoIdentities: ['region_admin', 'store_staff'],
          },
          {
            name: 'menu.marketing.couponCreate',
            key: 'marketing/center/coupon/create',
            ignore: true,
            breadcrumb: false,
            visibleScopes: ['store'],
            visibleSystems: ['store'],
            visibleDemoIdentities: ['region_admin', 'store_staff'],
          },
          {
            name: 'menu.marketing.couponDetail',
            key: 'marketing/center/coupon/detail',
            ignore: true,
            breadcrumb: false,
            visibleScopes: ['store'],
            visibleSystems: ['store'],
            visibleDemoIdentities: ['region_admin', 'store_staff'],
          },
          {
            name: 'menu.marketing.couponEdit',
            key: 'marketing/center/coupon/edit',
            ignore: true,
            breadcrumb: false,
            visibleScopes: ['store'],
            visibleSystems: ['store'],
            visibleDemoIdentities: ['region_admin', 'store_staff'],
          },
        ],
      },
    ],
  },
  {
    name: 'menu.storeConfig',
    key: 'store-config',
    visibleScopes: ['store'],
    visibleSystems: ['store'],
    visibleDemoIdentities: ['region_admin'],
    children: [
      {
        name: 'menu.storeConfig.department',
        key: 'store-config/department',
        ignore: true,
        visibleScopes: ['store'],
        visibleSystems: ['store'],
        visibleDemoIdentities: ['region_admin'],
      },
      {
        name: 'menu.storeConfig.orgReference',
        key: 'store-config/org-reference',
        ignore: true,
        visibleScopes: ['store'],
        visibleSystems: ['store'],
        visibleDemoIdentities: ['region_admin'],
      },
      {
        name: 'menu.storeConfig.employee',
        key: 'store-config/employee',
        visibleScopes: ['store'],
        visibleSystems: ['store'],
        visibleDemoIdentities: ['region_admin'],
        children: [
          {
            name: 'menu.storeConfig.employee.create',
            key: 'store-config/employee/create',
            ignore: true,
            visibleScopes: ['store'],
            visibleSystems: ['store'],
            visibleDemoIdentities: ['region_admin'],
          },
          {
            name: 'menu.storeConfig.employee.edit',
            key: 'store-config/employee/edit',
            ignore: true,
            visibleScopes: ['store'],
            visibleSystems: ['store'],
            visibleDemoIdentities: ['region_admin'],
          },
        ],
      },
      {
        name: 'menu.storeConfig.role',
        key: 'store-config/role',
        ignore: true,
        visibleScopes: ['store'],
        visibleSystems: ['store'],
        visibleDemoIdentities: ['region_admin'],
      },
      {
        name: 'menu.storeConfig.basic',
        key: 'store-config/basic',
        ignore: true,
        visibleScopes: ['store'],
        visibleSystems: ['store'],
        visibleDemoIdentities: ['region_admin'],
      },
    ],
  },
  {
    name: 'menu.storeConfig.role.create',
    key: 'store-config/role/create',
    ignore: true,
    breadcrumb: false,
    visibleScopes: ['store'],
    visibleSystems: ['store'],
    visibleDemoIdentities: ['region_admin'],
  },
  {
    name: 'menu.storeConfig.role.edit',
    key: 'store-config/role/edit',
    ignore: true,
    breadcrumb: false,
    visibleScopes: ['store'],
    visibleSystems: ['store'],
    visibleDemoIdentities: ['region_admin'],
  },
];

export const getName = (path: string, routeItems: IRoute[]): IRoute | undefined => {
  return routeItems.find((item) => {
    const itemPath = `/${item.key}`;
    if (path === itemPath) {
      return item;
    }

    if (item.children) {
      return getName(path, item.children);
    }

    return false;
  });
};

export const generatePermission = () => ({});

function collectRouteKeys(routeItems: IRoute[], keys: string[] = []) {
  routeItems.forEach((route) => {
    keys.push(route.key);
    if (route.children?.length) {
      collectRouteKeys(route.children, keys);
    }
  });

  return keys;
}

export function findFirstNavigableRouteKey(routeItems: IRoute[]): string {
  for (const route of routeItems) {
    if (route.children?.length) {
      const childRouteKey = findFirstNavigableRouteKey(route.children);

      if (childRouteKey) {
        return childRouteKey;
      }
    }

    if (!route.ignore) {
      return route.key;
    }
  }

  return '';
}

export const ALL_ROUTE_KEYS = collectRouteKeys(routes);

const useRoute = (
  userPermission: Record<string, string[]> | undefined,
  currentScope: OrganizationScope = 'headquarter',
  currentDemoSystem: DemoSystemId = 'merchant',
  currentDemoIdentity: DemoIdentityId = 'merchant_admin'
): [IRoute[], string] => {
  const permissionSignature = JSON.stringify(userPermission || {});
  const filterRoute = useCallback(
    (routeItems: IRoute[], result: IRoute[] = []): IRoute[] => {
      if (!routeItems.length) {
        return [];
      }

      for (const route of routeItems) {
        const {
          requiredPermissions,
          oneOfPerm,
          visibleScopes,
          visibleSystems,
          visibleDemoIdentities,
        } = route;
        let visible = true;

        if (visibleScopes?.length) {
          visible = visibleScopes.includes(currentScope);
        }

        if (visibleSystems?.length) {
          visible = visible && visibleSystems.includes(currentDemoSystem);
        }

        if (visibleDemoIdentities?.length) {
          visible = visible && visibleDemoIdentities.includes(currentDemoIdentity);
        }

        if (requiredPermissions) {
          visible =
            visible &&
            auth({ requiredPermissions, oneOfPerm }, userPermission || {});
        }

        if (!visible) {
          continue;
        }

        if (route.children?.length) {
          const nextRoute = { ...route, children: [] as IRoute[] };
          filterRoute(route.children, nextRoute.children);
          if (nextRoute.children.length) {
            result.push(nextRoute);
          }
          continue;
        }

        result.push({ ...route });
      }

      return result;
    },
    [currentDemoIdentity, currentDemoSystem, currentScope, userPermission]
  );

  const [permissionRoute, setPermissionRoute] = useState(() => filterRoute(routes));

  useEffect(() => {
    setPermissionRoute(filterRoute(routes));
  }, [filterRoute, permissionSignature]);

  const defaultRoute = useMemo(() => {
    return findFirstNavigableRouteKey(permissionRoute);
  }, [permissionRoute]);

  return [permissionRoute, defaultRoute];
};

export default useRoute;
