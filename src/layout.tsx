import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Switch, Route, Redirect, useHistory } from 'react-router-dom';
import { Layout, Menu, Breadcrumb, Spin } from '@arco-design/web-react';
import cs from 'classnames';
import {
  IconDashboard,
  IconList,
  IconSettings,
  IconFile,
  IconApps,
  IconUserGroup,
  IconMenuFold,
  IconMenuUnfold,
} from '@arco-design/web-react/icon';
import { useSelector } from 'react-redux';
import qs from 'query-string';
import NProgress from 'nprogress';
import Navbar from './components/NavBar';
import Footer from './components/Footer';
import useRoute, { ALL_ROUTE_KEYS, IRoute } from '@/routes';
import { isArray } from './utils/is';
import useLocale from './utils/useLocale';
import getUrlParams from './utils/getUrlParams';
import lazyload from './utils/lazyload';
import { GlobalState } from './store';
import styles from './style/layout.module.less';

const MenuItem = Menu.Item;
const SubMenu = Menu.SubMenu;

const Sider = Layout.Sider;
const Content = Layout.Content;

type BreadcrumbConfig = {
  name: React.ReactNode;
  routeKey: string;
  path: string;
  clickable: boolean;
};

function getIconFromKey(key) {
  if (key.startsWith('dashboard')) {
    return <IconDashboard className={styles.icon} />;
  }

  if (key.startsWith('product') || key.startsWith('product-config')) {
    return <IconApps className={styles.icon} />;
  }

  if (key.startsWith('order')) {
    return <IconList className={styles.icon} />;
  }

  if (key.startsWith('marketing')) {
    return <IconSettings className={styles.icon} />;
  }

  if (key.startsWith('after-sales')) {
    return <IconFile className={styles.icon} />;
  }

  if (
    key.startsWith('merchant') ||
    key.startsWith('store-config') ||
    key.startsWith('enterprise')
  ) {
    return <IconUserGroup className={styles.icon} />;
  }

  switch (key) {
    case 'dashboard':
      return <IconDashboard className={styles.icon} />;
    default:
      return <div className={styles['icon-empty']} />;
  }
}

function getFlattenRoutes(routes) {
  const mod = import.meta.glob('./pages/**/[a-z[]*.tsx');
  const res = [];
  function travel(_routes) {
    _routes.forEach((route) => {
      const visibleChildren = (route.children || []).filter(
        (child) => !child.ignore
      );
      if (route.key && (!route.children || !visibleChildren.length)) {
        try {
          route.component = lazyload(mod[`./pages/${route.key}/index.tsx`]);
          res.push(route);
        } catch (e) {
          console.log(route.key);
          console.error(e);
        }
      }

      if (isArray(route.children) && route.children.length) {
        travel(route.children);
      }
    });
  }
  travel(routes);
  return res;
}

function isSameArray<T>(left: T[], right: T[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((item, index) => item === right[index]);
}

function isSameBreadcrumb(
  left: BreadcrumbConfig[],
  right: BreadcrumbConfig[]
) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((item, index) => {
    const current = right[index];

    return (
      current &&
      item.name === current.name &&
      item.routeKey === current.routeKey &&
      item.path === current.path &&
      item.clickable === current.clickable
    );
  });
}

function getVisibleMenuChildren(route: IRoute) {
  return (route.children || []).filter((child) => !child.ignore);
}

function hasVisibleMenuItem(routeItems: IRoute[], targetKey: string): boolean {
  for (const route of routeItems) {
    const visibleChildren = getVisibleMenuChildren(route);

    if (!route.ignore && route.key === targetKey && !visibleChildren.length) {
      return true;
    }

    if (route.children?.length && hasVisibleMenuItem(route.children, targetKey)) {
      return true;
    }
  }

  return false;
}

function findVisibleMenuItemKey(
  routeItems: IRoute[],
  targetKey: string
): string | undefined {
  const candidateSegments = targetKey.split('/');

  while (candidateSegments.length > 0) {
    const candidateKey = candidateSegments.join('/');
    if (hasVisibleMenuItem(routeItems, candidateKey)) {
      return candidateKey;
    }

    candidateSegments.pop();
  }

  return undefined;
}

function findAncestorSubMenuKeys(
  routeItems: IRoute[],
  targetKey: string,
  ancestorKeys: string[] = []
): string[] | null {
  for (const route of routeItems) {
    const visibleChildren = getVisibleMenuChildren(route);
    const nextAncestorKeys =
      !route.ignore && visibleChildren.length
        ? [...ancestorKeys, route.key]
        : ancestorKeys;

    if (!route.ignore && route.key === targetKey && !visibleChildren.length) {
      return ancestorKeys;
    }

    if (route.children?.length) {
      const matchedKeys = findAncestorSubMenuKeys(
        route.children,
        targetKey,
        nextAncestorKeys
      );

      if (matchedKeys) {
        return matchedKeys;
      }
    }
  }

  return null;
}

function PageLayout() {
  const urlParams = getUrlParams();
  const history = useHistory();
  const pathname = history.location.pathname;
  const currentComponent = qs.parseUrl(pathname).url.slice(1);
  const locale = useLocale();
  const { settings, userLoading, userInfo } = useSelector(
    (state: GlobalState) => state
  );
  const { currentOrganization, currentDemoSystem, currentDemoIdentity } =
    useSelector((state: GlobalState) => state);

  const [routes, defaultRoute] = useRoute(
    userInfo?.permissions,
    currentOrganization?.scope,
    currentDemoSystem,
    currentDemoIdentity
  );
  const activeRouteKey = currentComponent || defaultRoute;
  const activeMenuKey = useMemo(
    () =>
      activeRouteKey
        ? findVisibleMenuItemKey(routes, activeRouteKey) || activeRouteKey
        : '',
    [activeRouteKey, routes]
  );
  const defaultSelectedKeys = activeMenuKey ? [activeMenuKey] : [];
  const defaultOpenKeys = activeMenuKey
    ? findAncestorSubMenuKeys(routes, activeMenuKey) || []
    : [];

  const [breadcrumb, setBreadCrumb] = useState<BreadcrumbConfig[]>([]);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [selectedKeys, setSelectedKeys] =
    useState<string[]>(defaultSelectedKeys);

  const routeMap = useRef<Map<string, BreadcrumbConfig[]>>(new Map());
  const menuMap = useRef<
    Map<string, { menuItem?: boolean; subMenu?: boolean }>
  >(new Map());

  const navbarHeight = 60;
  const menuWidth = collapsed ? 48 : settings.menuWidth;

  const showNavbar = settings.navbar && urlParams.navbar !== false;
  const showMenu = settings.menu && urlParams.menu !== false;
  const showFooter = settings.footer && urlParams.footer !== false;
  const menuRenderKey = [
    currentDemoSystem,
    currentDemoIdentity,
    currentOrganization?.id || '',
    pathname,
  ].join(':');

  const flattenRoutes = useMemo(() => getFlattenRoutes(routes) || [], [routes]);

  function resolveRouteTarget(key: string) {
    const currentRoute = flattenRoutes.find((route) => route.key === key);
    if (currentRoute) {
      return {
        path: currentRoute.path ? currentRoute.path : `/${currentRoute.key}`,
        component: currentRoute.component,
      };
    }

    const fallbackRoute = flattenRoutes.find((route) =>
      route.key.startsWith(`${key}/`)
    );

    if (!fallbackRoute) {
      return null;
    }

    return {
      path: fallbackRoute.path ? fallbackRoute.path : `/${fallbackRoute.key}`,
      component: fallbackRoute.component,
    };
  }

  function navigateByRouteKey(key: string) {
    const targetRoute = resolveRouteTarget(key);
    if (!targetRoute) {
      return;
    }

    const { path: nextPath, component } = targetRoute;
    NProgress.start();
    history.push(nextPath);

    Promise.resolve(component?.preload?.())
      .catch((error) => {
        console.error(`Failed to preload route: ${nextPath}`, error);
      })
      .finally(() => {
        NProgress.done();
      });
  }

  function onClickMenuItem(key) {
    navigateByRouteKey(key);
  }

  function createBreadcrumbItem(route: IRoute): BreadcrumbConfig {
    const targetRoute = resolveRouteTarget(route.key);
    return {
      name: route.name,
      routeKey: route.key,
      path: targetRoute?.path || `/${route.key}`,
      clickable: Boolean(targetRoute),
    };
  }

  function toggleCollapse() {
    setCollapsed((collapsed) => !collapsed);
  }

  const paddingLeft = showMenu ? { paddingLeft: menuWidth } : {};
  const paddingTop = showNavbar ? { paddingTop: navbarHeight } : {};
  const paddingStyle = { ...paddingLeft, ...paddingTop };

  function renderRoutes(locale) {
    routeMap.current.clear();
    menuMap.current.clear();
    return function travel(
      _routes: IRoute[],
      level: number,
      parentNode: BreadcrumbConfig[] = []
    ) {
      return _routes.map((route) => {
        const { breadcrumb = true, ignore } = route;
        const iconDom = getIconFromKey(route.key);
        const titleDom = (
          <>
            {iconDom} {locale[route.name] || route.name}
          </>
        );

        routeMap.current.set(
          `/${route.key}`,
          breadcrumb ? [...parentNode, createBreadcrumbItem(route)] : []
        );

        const visibleChildren = (route.children || []).filter((child) => {
          const { ignore, breadcrumb = true } = child;
          if (ignore || route.ignore) {
            routeMap.current.set(
              `/${child.key}`,
              breadcrumb
                ? [
                    ...parentNode,
                    createBreadcrumbItem(route),
                    createBreadcrumbItem(child),
                  ]
                : []
            );
          }

          return !ignore;
        });

        if (ignore) {
          return '';
        }
        if (visibleChildren.length) {
          menuMap.current.set(route.key, { subMenu: true });
          return (
            <SubMenu key={route.key} title={titleDom}>
              {travel(visibleChildren, level + 1, [
                ...parentNode,
                createBreadcrumbItem(route),
              ])}
            </SubMenu>
          );
        }
        menuMap.current.set(route.key, { menuItem: true });
        return <MenuItem key={route.key}>{titleDom}</MenuItem>;
      });
    };
  }

  useEffect(() => {
    const routeConfig = routeMap.current.get(pathname) || [];
    setBreadCrumb((prev) => (
      isSameBreadcrumb(prev, routeConfig) ? prev : routeConfig
    ));
    const nextSelectedKeys = activeMenuKey ? [activeMenuKey] : [];

    setSelectedKeys((prev) => (
      isSameArray(prev, nextSelectedKeys) ? prev : nextSelectedKeys
    ));
  }, [activeMenuKey, pathname, routes]);

  useEffect(() => {
    if (userLoading || !currentComponent || !defaultRoute) {
      return;
    }

    const hasAccess = flattenRoutes.some((route) => route.key === currentComponent);
    const isKnownRoute = ALL_ROUTE_KEYS.includes(currentComponent);

    if (!hasAccess && isKnownRoute) {
      history.replace(`/${defaultRoute}`);
    }
  }, [
    currentComponent,
    defaultRoute,
    flattenRoutes,
    history,
    userLoading,
  ]);

  return (
    <Layout className={styles.layout}>
      <div
        className={cs(styles['layout-navbar'], {
          [styles['layout-navbar-hidden']]: !showNavbar,
        })}
      >
        <Navbar show={showNavbar} />
      </div>
      {userLoading ? (
        <Spin className={styles['spin']} />
      ) : (
        <Layout>
          {showMenu && (
            <Sider
              className={styles['layout-sider']}
              width={menuWidth}
              collapsed={collapsed}
              onCollapse={setCollapsed}
              trigger={null}
              collapsible
              breakpoint="xl"
              style={paddingTop}
            >
              <div className={styles['menu-wrapper']}>
                <Menu
                  key={menuRenderKey}
                  collapse={collapsed}
                  selectable={false}
                  defaultOpenKeys={defaultOpenKeys}
                  onClickMenuItem={onClickMenuItem}
                  selectedKeys={selectedKeys}
                >
                  {renderRoutes(locale)(routes, 1)}
                </Menu>
              </div>
              <div className={styles['collapse-btn']} onClick={toggleCollapse}>
                {collapsed ? <IconMenuUnfold /> : <IconMenuFold />}
              </div>
            </Sider>
          )}
          <Layout className={styles['layout-content']} style={paddingStyle}>
            <div className={styles['layout-content-wrapper']}>
              {!!breadcrumb.length && (
                <div className={styles['layout-breadcrumb']}>
                  <Breadcrumb>
                    {breadcrumb.map((node, index) => {
                      const isLast = index === breadcrumb.length - 1;
                      const canNavigate = !isLast && node.clickable;
                      const label =
                        typeof node.name === 'string'
                          ? locale[node.name] || node.name
                          : node.name;

                      return (
                      <Breadcrumb.Item key={index}>
                        {canNavigate ? (
                          <button
                            type="button"
                            className={styles['layout-breadcrumb-link']}
                            onClick={() => navigateByRouteKey(node.routeKey)}
                          >
                            {label}
                          </button>
                        ) : (
                          label
                        )}
                      </Breadcrumb.Item>
                      );
                    })}
                  </Breadcrumb>
                </div>
              )}
              <Content>
                <Switch>
                  {flattenRoutes.map((route, index) => {
                    return (
                      <Route
                        exact
                        key={index}
                        path={`/${route.key}`}
                        component={route.component}
                      />
                    );
                  })}
                  <Route exact path="/">
                    <Redirect to={`/${defaultRoute}`} />
                  </Route>
                  <Route
                    path="*"
                    component={lazyload(() => import('./pages/exception/403'))}
                  />
                </Switch>
              </Content>
            </div>
            {showFooter && <Footer />}
          </Layout>
        </Layout>
      )}
    </Layout>
  );
}

export default PageLayout;
