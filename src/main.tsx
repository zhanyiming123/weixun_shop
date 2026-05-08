import './style/global.less';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { createStore } from 'redux';
import { Provider } from 'react-redux';
import { ConfigProvider } from '@arco-design/web-react';
import zhCN from '@arco-design/web-react/es/locale/zh-CN';
import enUS from '@arco-design/web-react/es/locale/en-US';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import rootReducer from './store';
import PageLayout from './layout';
import { GlobalContext } from './context';
import Login from './pages/login';
import checkLogin from './utils/checkLogin';
import changeTheme from './utils/changeTheme';
import useStorage from './utils/useStorage';
import { buildAppPath, getAppRoutePath } from './utils/appPath';
import { buildDemoUserInfo, resolveDemoSelection } from './utils/demo';
import './mock';

const store = createStore(rootReducer);

function Index() {
  const [lang, setLang] = useStorage('arco-lang', 'zh-CN');
  const [theme, setTheme] = useStorage('arco-theme', 'light');

  function getArcoLocale() {
    switch (lang) {
      case 'zh-CN':
        return zhCN;
      case 'en-US':
        return enUS;
      default:
        return zhCN;
    }
  }

  function fetchUserInfo() {
    store.dispatch({
      type: 'update-userInfo',
      payload: { userLoading: true },
    });
    const currentState = store.getState();
    const resolvedSelection = resolveDemoSelection({
      currentDemoSystem: currentState.currentDemoSystem,
      currentDemoIdentity: currentState.currentDemoIdentity,
      currentOrganizationId: currentState.currentOrganization?.id,
    });

    store.dispatch({
      type: 'update-demo-selection',
      payload: {
        ...resolvedSelection,
        userInfo: buildDemoUserInfo(
          resolvedSelection.currentDemoIdentity,
          resolvedSelection.currentOrganization
        ),
      },
    });
    store.dispatch({
      type: 'update-userInfo',
      payload: {
        userInfo: buildDemoUserInfo(
          resolvedSelection.currentDemoIdentity,
          resolvedSelection.currentOrganization
        ),
        userLoading: false,
      },
    });
  }

  useEffect(() => {
    if (checkLogin()) {
      fetchUserInfo();
    } else if (getAppRoutePath() !== '/login') {
      window.location.pathname = buildAppPath('/login');
    }
  }, []);

  useEffect(() => {
    changeTheme(theme);
  }, [theme]);

  const contextValue = {
    lang,
    setLang,
    theme,
    setTheme,
  };

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ConfigProvider
        locale={getArcoLocale()}
        componentConfig={{
          Card: {
            bordered: false,
          },
          List: {
            bordered: false,
          },
          Table: {
            border: false,
          },
        }}
      >
        <Provider store={store}>
          <GlobalContext.Provider value={contextValue}>
            <Switch>
              <Route path="/login" component={Login} />
              <Route path="/" component={PageLayout} />
            </Switch>
          </GlobalContext.Provider>
        </Provider>
      </ConfigProvider>
    </BrowserRouter>
  );
}

ReactDOM.render(<Index />, document.getElementById('root'));
