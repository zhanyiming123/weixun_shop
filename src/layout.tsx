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
  const defaultSelectedKeys = activeRouteKey ? [activeRouteKey] : [];
  const paths = activeRouteKey ? activeRouteKey.split('/') : [];
  const defaultOpenKeys = paths.slice(0, paths.length - 1);

  const [breadcrumb, setBreadCrumb] = useState<React.ReactNode[]>([]);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [selectedKeys, setSelectedKeys] =
    useState<string[]>(defaultSelectedKeys);

  const routeMap = useRef<Map<string, React.ReactNode[]>>(new Map());
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

  function onClickMenuItem(key) {
    const currentRoute = flattenRoutes.find((r) => r.key === key);
    if (!currentRoute) {
      return;
    }

    const nextPath = currentRoute.path ? currentRoute.path : `/${key}`;
    const component = currentRoute.component;
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

  function toggleCollapse() {
    setCollapsed((collapsed) => !collapsed);
  }

  const paddingLeft = showMenu ? { paddingLeft: menuWidth } : {};
  const paddingTop = showNavbar ? { paddingTop: navbarHeight } : {};
  const paddingStyle = { ...paddingLeft, ...paddingTop };

  function renderRoutes(locale) {
    routeMap.current.clear();
    menuMap.current.clear();
    return function travel(_routes: IRoute[], level, parentNode = []) {
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
          breadcrumb ? [...parentNode, route.name] : []
        );

        const visibleChildren = (route.children || []).filter((child) => {
          const { ignore, breadcrumb = true } = child;
          if (ignore || route.ignore) {
            routeMap.current.set(
              `/${child.key}`,
              breadcrumb ? [...parentNode, route.name, child.name] : []
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
              {travel(visibleChildren, level + 1, [...parentNode, route.name])}
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
      isSameArray(prev, routeConfig) ? prev : routeConfig
    ));
    const pathKeys = pathname.split('/');
    const nextSelectedKeys: string[] = [];

    while (pathKeys.length > 0) {
      const currentRouteKey = pathKeys.join('/');
      const menuKey = currentRouteKey.replace(/^\//, '');
      const menuType = menuMap.current.get(menuKey);

      if (menuType && menuType.menuItem) {
        nextSelectedKeys.push(menuKey);
      }

      pathKeys.pop();
    }

    setSelectedKeys((prev) => (
      isSameArray(prev, nextSelectedKeys) ? prev : nextSelectedKeys
    ));
  }, [pathname, routes]);

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
                    {breadcrumb.map((node, index) => (
                      <Breadcrumb.Item key={index}>
                        {typeof node === 'string' ? locale[node] || node : node}
                      </Breadcrumb.Item>
                    ))}
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
