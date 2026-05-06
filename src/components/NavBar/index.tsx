import React, { useCallback, useContext, useEffect, useMemo } from 'react';
import {
  Tooltip,
  Input,
  Avatar,
  Select,
  Dropdown,
  Menu,
  Divider,
  Message,
  Button,
  Typography,
} from '@arco-design/web-react';
import { useHistory } from 'react-router-dom';
import {
  IconLanguage,
  IconNotification,
  IconSunFill,
  IconMoonFill,
  IconSettings,
  IconPoweroff,
  IconExperiment,
  IconDashboard,
} from '@arco-design/web-react/icon';
import { useSelector, useDispatch } from 'react-redux';
import { GlobalState } from '@/store';
import { GlobalContext } from '@/context';
import useLocale from '@/utils/useLocale';
import Logo from '@/assets/logo.svg';
import MessageBox from '@/components/MessageBox';
import IconButton from './IconButton';
import Settings from '../Settings';
import styles from './style/index.module.less';
import defaultLocale from '@/locale';
import useStorage from '@/utils/useStorage';
import {
  buildDemoUserInfo,
  getAvailableDemoIdentityIds,
  getAvailableOrganizationsForSelection,
  getDemoCurrentPresetTitle,
  getDemoOrganizationSelectionLabel,
  getDefaultDemoIdentityForSystem,
  persistDemoSelection,
  resolveDemoSelection,
  DEMO_SYSTEM_LABEL_MAP,
  DemoIdentityId,
  DemoSystemId,
} from '@/utils/demo';
import { buildCurrentOrganizationOptions, writeCurrentOrganizationId } from '@/utils/organization';

function Navbar({ show }: { show: boolean }) {
  const history = useHistory();
  const t = useLocale();
  const {
    userInfo,
    currentDemoSystem,
    currentDemoIdentity,
    currentOrganization,
    demoContext,
  } = useSelector((state: GlobalState) => state);
  const dispatch = useDispatch();
  const [, setUserStatus] = useStorage('userStatus');

  const { setLang, lang, theme, setTheme } = useContext(GlobalContext);
  const organizationOptions = useMemo(() => buildCurrentOrganizationOptions(), []);
  const activeDemoSystem = currentDemoSystem || 'merchant';
  const activeDemoIdentity = currentDemoIdentity || 'merchant_admin';

  function logout() {
    setUserStatus('logout');
    window.location.href = '/login';
  }

  function onMenuItemClick(key) {
    if (key === 'logout') {
      logout();
      return;
    }

    Message.info(`You clicked ${key}`);
  }

  const systemOptions = useMemo(
    () =>
      (['merchant', 'store'] as DemoSystemId[]).map((item) => ({
        label: DEMO_SYSTEM_LABEL_MAP[item],
        value: item,
      })),
    []
  );
  const organizationSelectOptions = useMemo(() => {
    return getAvailableOrganizationsForSelection(
      activeDemoSystem,
      activeDemoIdentity,
      organizationOptions
    ).map((item) => ({
      label: getDemoOrganizationSelectionLabel(
        activeDemoSystem,
        activeDemoIdentity,
        item
      ),
      value: item.id,
    }));
  }, [activeDemoIdentity, activeDemoSystem, organizationOptions]);
  const selectedOrganizationId = useMemo(() => {
    if (
      currentOrganization?.id &&
      organizationSelectOptions.some((item) => item.value === currentOrganization.id)
    ) {
      return currentOrganization.id;
    }

    return organizationSelectOptions[0]?.value;
  }, [currentOrganization?.id, organizationSelectOptions]);
  const fallbackOrganization = useMemo(
    () =>
      organizationOptions.find((item) => item.id === selectedOrganizationId) ||
      currentOrganization ||
      organizationOptions[0],
    [currentOrganization, organizationOptions, selectedOrganizationId]
  );
  const identityOptions = useMemo(() => {
    if (!fallbackOrganization) {
      return [];
    }

    return getAvailableDemoIdentityIds(
      activeDemoSystem,
      fallbackOrganization,
      organizationOptions
    ).map((item) => ({
      label:
        item === 'merchant_admin'
          ? '商户管理员'
          : item === 'region_admin'
            ? '区域管理员'
            : '店铺员工',
      value: item,
    }));
  }, [activeDemoSystem, fallbackOrganization, organizationOptions]);
  const currentPresetTitle = useMemo(() => {
    if (!currentOrganization) {
      return demoContext?.identityLabel || '商户管理员';
    }

    return getDemoCurrentPresetTitle(
      activeDemoSystem,
      activeDemoIdentity,
      currentOrganization
    );
  }, [
    activeDemoIdentity,
    activeDemoSystem,
    currentOrganization,
    demoContext?.identityLabel,
  ]);

  const applyResolvedSelection = useCallback((
    nextSelection: ReturnType<typeof resolveDemoSelection>
  ) => {
    persistDemoSelection(nextSelection);
    writeCurrentOrganizationId(nextSelection.currentOrganization.id);
    dispatch({
      type: 'update-demo-selection',
      payload: {
        ...nextSelection,
        userInfo: buildDemoUserInfo(
          nextSelection.currentDemoIdentity,
          nextSelection.currentOrganization
        ),
      },
    });
  }, [dispatch]);

  useEffect(() => {
    const resolvedSelection = resolveDemoSelection({
      currentDemoSystem,
      currentDemoIdentity,
      currentOrganizationId: selectedOrganizationId || currentOrganization?.id,
      organizationOptions,
    });

    const shouldSync =
      resolvedSelection.currentDemoSystem !== currentDemoSystem ||
      resolvedSelection.currentDemoIdentity !== currentDemoIdentity ||
      resolvedSelection.currentOrganization.id !== currentOrganization?.id;

    if (shouldSync) {
      applyResolvedSelection(resolvedSelection);
    }
  }, [
    currentDemoIdentity,
    currentDemoSystem,
    currentOrganization?.id,
    selectedOrganizationId,
    applyResolvedSelection,
    organizationOptions,
  ]);

  if (!show) {
    return (
      <div className={styles['fixed-settings']}>
        <Settings
          trigger={
            <Button icon={<IconSettings />} type="primary" size="large" />
          }
        />
      </div>
    );
  }

  const handleSystemChange = (value: string) => {
    const targetSystem = value as DemoSystemId;
    const targetIdentity = getDefaultDemoIdentityForSystem(targetSystem);
    const resolvedSelection = resolveDemoSelection({
      currentDemoSystem: targetSystem,
      currentDemoIdentity: targetIdentity,
      currentOrganizationId: selectedOrganizationId || currentOrganization?.id,
      organizationOptions,
    });
    applyResolvedSelection(resolvedSelection);
    history.push(`/${resolvedSelection.demoContext.defaultHomeRoute}`);
  };
  const handleIdentityChange = (value: string) => {
    const resolvedSelection = resolveDemoSelection({
      currentDemoSystem: activeDemoSystem,
      currentDemoIdentity: value as DemoIdentityId,
      currentOrganizationId: fallbackOrganization?.id,
      organizationOptions,
    });

    applyResolvedSelection(resolvedSelection);
    history.push(`/${resolvedSelection.demoContext.defaultHomeRoute}`);
  };
  const handleOrganizationChange = (value: string) => {
    const resolvedSelection = resolveDemoSelection({
      currentDemoSystem: activeDemoSystem,
      currentDemoIdentity: activeDemoIdentity,
      currentOrganizationId: value,
      organizationOptions,
    });

    applyResolvedSelection(resolvedSelection);
    history.push(`/${resolvedSelection.demoContext.defaultHomeRoute}`);
  };

  const droplist = (
    <Menu onClickMenuItem={onMenuItemClick}>
      <Menu.Item key="current-demo" disabled>
        <div className={styles.menuSummary}>
          <Typography.Text className={styles.menuSummaryTitle}>
            {demoContext?.systemLabel || DEMO_SYSTEM_LABEL_MAP.merchant}
          </Typography.Text>
          <Typography.Text type="secondary">
            {demoContext?.identityLabel || '商户管理员'}
          </Typography.Text>
        </div>
      </Menu.Item>
      <Menu.Item key="setting">
        <IconSettings className={styles['dropdown-icon']} />
        {t['menu.user.setting']}
      </Menu.Item>
      <Menu.SubMenu
        key="more"
        title={
          <div style={{ width: 88 }}>
            <IconExperiment className={styles['dropdown-icon']} />
            {t['message.seeMore']}
          </div>
        }
      >
        <Menu.Item key="workplace">
          <IconDashboard className={styles['dropdown-icon']} />
          {t['menu.home']}
        </Menu.Item>
      </Menu.SubMenu>

      <Divider style={{ margin: '4px 0' }} />
      <Menu.Item key="logout">
        <IconPoweroff className={styles['dropdown-icon']} />
        {t['navbar.logout']}
      </Menu.Item>
    </Menu>
  );

  return (
    <div className={styles.navbar}>
      <div className={styles.left}>
        <div className={styles.logo}>
          <Logo />
          <div className={styles['logo-name']}>上海唯寻教育科技有限公司</div>
        </div>
        <div className={styles.selectorGroup}>
          <div className={styles.selectorField}>
            <span className={styles.selectorLabel}>{t['navbar.demo.system']}</span>
            <Select
              className={styles.systemSelect}
              options={systemOptions}
              value={activeDemoSystem}
              onChange={handleSystemChange}
            />
          </div>
          <div className={styles.selectorField}>
            <span className={styles.selectorLabel}>{t['menu.user.switchRoles']}</span>
            <Select
              className={styles.identitySelect}
              options={identityOptions}
              value={activeDemoIdentity}
              onChange={handleIdentityChange}
              disabled={identityOptions.length <= 1}
            />
          </div>
          <div className={styles.selectorField}>
            <span className={styles.selectorLabel}>当前店铺</span>
            <Select
              className={styles.organizationSelect}
              options={organizationSelectOptions}
              value={selectedOrganizationId}
              onChange={handleOrganizationChange}
              disabled={
                activeDemoSystem === 'merchant' ||
                Boolean(demoContext?.organizationLocked) ||
                organizationSelectOptions.length <= 1
              }
            />
          </div>
          <div className={styles.currentPreset}>
            <Typography.Text className={styles.currentPresetTitle}>
              {currentPresetTitle}
            </Typography.Text>
            <Typography.Text type="secondary">
              {currentOrganization?.name || userInfo?.organization}
            </Typography.Text>
          </div>
        </div>
      </div>
      <ul className={styles.right}>
        <li>
          <Input.Search
            className={styles.round}
            placeholder={t['navbar.search.placeholder']}
          />
        </li>
        <li>
          <Select
            triggerElement={<IconButton icon={<IconLanguage />} />}
            options={[
              { label: '中文', value: 'zh-CN' },
              { label: 'English', value: 'en-US' },
            ]}
            value={lang}
            triggerProps={{
              autoAlignPopupWidth: false,
              autoAlignPopupMinWidth: true,
              position: 'br',
            }}
            trigger="hover"
            onChange={(value) => {
              setLang(value);
              const nextLang = defaultLocale[value];
              Message.info(`${nextLang['message.lang.tips']}${value}`);
            }}
          />
        </li>
        <li>
          <MessageBox>
            <IconButton icon={<IconNotification />} />
          </MessageBox>
        </li>
        <li>
          <Tooltip
            content={
              theme === 'light'
                ? t['settings.navbar.theme.toDark']
                : t['settings.navbar.theme.toLight']
            }
          >
            <IconButton
              icon={theme !== 'dark' ? <IconMoonFill /> : <IconSunFill />}
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            />
          </Tooltip>
        </li>
        <Settings />
        {userInfo && (
          <li>
            <Dropdown droplist={droplist} position="br">
              <Avatar size={32} style={{ cursor: 'pointer' }}>
                <img alt="avatar" src={userInfo.avatar} />
              </Avatar>
            </Dropdown>
          </li>
        )}
      </ul>
    </div>
  );
}

export default Navbar;
