import auth, { AuthParams } from '@/utils/authentication';
import { OrganizationScope } from '@/utils/organization';
import { useEffect, useMemo, useState } from 'react';

export type IRoute = AuthParams & {
  name: string;
  key: string;
  visibleScopes?: OrganizationScope[];
  // 当前页是否展示面包屑
  breadcrumb?: boolean;
  children?: IRoute[];
  // 当前路由是否渲染菜单项，为 true 的话不会在菜单中显示，但可通过路由地址访问。
  ignore?: boolean;
};

export const routes: IRoute[] = [
  {
    name: 'menu.dashboard',
    key: 'dashboard',
    children: [
      {
        name: 'menu.dashboard.workplace',
        key: 'dashboard/workplace',
        visibleScopes: ['headquarter', 'region', 'store'],
      },
    ],
  },
  {
    name: 'menu.product',
    key: 'product',
    children: [
      {
        name: 'menu.product.list',
        key: 'product/list',
        visibleScopes: ['headquarter', 'region', 'store'],
      },
      {
        name: 'menu.product.create',
        key: 'product/create',
        ignore: true,
        visibleScopes: ['headquarter', 'region', 'store'],
      },
      {
        name: 'menu.product.category',
        key: 'product/category',
        visibleScopes: ['headquarter'],
      },
      {
        name: 'menu.product.catalog',
        key: 'product/catalog',
        visibleScopes: ['headquarter'],
      },
      {
        name: 'menu.product.attribute',
        key: 'product/attribute',
        visibleScopes: ['headquarter'],
      },
    ],
  },
  {
    name: 'menu.order',
    key: 'order',
    children: [
      {
        name: 'menu.order.list',
        key: 'order/list',
        visibleScopes: ['headquarter', 'region', 'store'],
      },
    ],
  },
  {
    name: 'menu.afterSales',
    key: 'after-sales',
    children: [
      {
        name: 'menu.afterSales.list',
        key: 'after-sales/list',
        visibleScopes: ['headquarter', 'region', 'store'],
      },
    ],
  },
  {
    name: 'menu.marketing',
    key: 'marketing',
    children: [
      {
        name: 'menu.marketing.center',
        key: 'marketing/center',
        visibleScopes: ['headquarter', 'region', 'store'],
        children: [
          {
            name: 'menu.marketing.couponList',
            key: 'marketing/center/coupon/list',
            ignore: true,
            visibleScopes: ['headquarter', 'region', 'store'],
          },
          {
            name: 'menu.marketing.couponCreate',
            key: 'marketing/center/coupon/create',
            ignore: true,
            visibleScopes: ['headquarter', 'region', 'store'],
          },
          {
            name: 'menu.marketing.couponDetail',
            key: 'marketing/center/coupon/detail',
            ignore: true,
            visibleScopes: ['headquarter', 'region', 'store'],
          },
          {
            name: 'menu.marketing.couponEdit',
            key: 'marketing/center/coupon/edit',
            ignore: true,
            visibleScopes: ['headquarter', 'region', 'store'],
          },
        ],
      },
    ],
  },
  {
    name: 'menu.enterprise',
    key: 'enterprise',
    children: [
      {
        name: 'menu.enterprise.organization',
        key: 'enterprise/organization',
        visibleScopes: ['headquarter'],
        children: [
          {
            name: 'menu.enterprise.organization.create',
            key: 'enterprise/organization/create',
            ignore: true,
            visibleScopes: ['headquarter'],
          },
          {
            name: 'menu.enterprise.organization.edit',
            key: 'enterprise/organization/edit',
            ignore: true,
            visibleScopes: ['headquarter'],
          },
        ],
      },
      {
        name: 'menu.enterprise.department',
        key: 'enterprise/department',
        visibleScopes: ['headquarter'],
      },
      {
        name: 'menu.enterprise.employee',
        key: 'enterprise/employee',
        visibleScopes: ['headquarter'],
        children: [
          {
            name: 'menu.enterprise.employee.create',
            key: 'enterprise/employee/create',
            ignore: true,
            visibleScopes: ['headquarter'],
          },
        ],
      },
      {
        name: 'menu.enterprise.role',
        key: 'enterprise/role',
        visibleScopes: ['headquarter'],
        children: [
          {
            name: 'menu.enterprise.role.create',
            key: 'enterprise/role/create',
            ignore: true,
            visibleScopes: ['headquarter'],
          },
          {
            name: 'menu.enterprise.role.edit',
            key: 'enterprise/role/edit',
            ignore: true,
            visibleScopes: ['headquarter'],
          },
        ],
      },
    ],
  },
];

export const getName = (path: string, routes) => {
  return routes.find((item) => {
    const itemPath = `/${item.key}`;
    if (path === itemPath) {
      return item.name;
    } else if (item.children) {
      return getName(path, item.children);
    }
  });
};

export const generatePermission = (role: string) => {
  const actions = role === 'admin' ? ['*'] : ['read'];
  const result = {};

  const travel = (_routes: IRoute[]) => {
    _routes.forEach((item) => {
      if (item.children?.length) {
        travel(item.children);
        return;
      }

      result[item.name] = actions;
    });
  };

  travel(routes);
  return result;
};

function collectRouteKeys(routeItems: IRoute[], keys: string[] = []) {
  routeItems.forEach((route) => {
    keys.push(route.key);
    if (route.children?.length) {
      collectRouteKeys(route.children, keys);
    }
  });

  return keys;
}

export const ALL_ROUTE_KEYS = collectRouteKeys(routes);

const useRoute = (
  userPermission,
  currentScope: OrganizationScope = 'headquarter'
): [IRoute[], string] => {
  const filterRoute = (routes: IRoute[], arr = []): IRoute[] => {
    if (!routes.length) {
      return [];
    }
    for (const route of routes) {
      const { requiredPermissions, oneOfPerm, visibleScopes } = route;
      let visible = true;
      if (visibleScopes?.length) {
        visible = visibleScopes.includes(currentScope);
      }
      if (requiredPermissions) {
        visible =
          visible && auth({ requiredPermissions, oneOfPerm }, userPermission);
      }

      if (!visible) {
        continue;
      }
      if (route.children && route.children.length) {
        const newRoute = { ...route, children: [] };
        filterRoute(route.children, newRoute.children);
        if (newRoute.children.length) {
          arr.push(newRoute);
        }
      } else {
        arr.push({ ...route });
      }
    }

    return arr;
  };

  const [permissionRoute, setPermissionRoute] = useState(() => filterRoute(routes));

  useEffect(() => {
    const newRoutes = filterRoute(routes);
    setPermissionRoute(newRoutes);
  }, [currentScope, JSON.stringify(userPermission)]);

  const defaultRoute = useMemo(() => {
    const first = permissionRoute[0];
    if (first) {
      const firstRoute = first?.children?.[0]?.key || first.key;
      return firstRoute;
    }
    return '';
  }, [permissionRoute]);

  return [permissionRoute, defaultRoute];
};

export default useRoute;
