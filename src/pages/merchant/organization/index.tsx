import React, { useMemo, useState } from 'react';
import { Button, Input, Tag, Typography } from '@arco-design/web-react';
import { IconPlus, IconSearch } from '@arco-design/web-react/icon';
import { useHistory, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  OrganizationItem,
  ORGANIZATION_STATUS_LABEL_MAP,
  useOrganizationItems,
} from '@/pages/enterprise/organization/data';
import { GlobalState } from '@/store';
import {
  buildDemoUserInfo,
  getDefaultDemoIdentityForSystem,
  persistDemoSelection,
  resolveDemoSelection,
} from '@/utils/demo';
import {
  getOrganizationCreatePath,
  getOrganizationEditPath,
} from '@/utils/demo-route';
import { writeCurrentOrganizationId } from '@/utils/organization';
import styles from './index.module.less';

const STORE_EMPLOYEE_VIEW_PATH = '/merchant/organization/store-employee';

function MerchantOrganizationPage() {
  const dispatch = useDispatch();
  const history = useHistory();
  const location = useLocation();
  const [organizationItems] = useOrganizationItems();
  const { currentDemoSystem, currentDemoIdentity, demoContext } =
    useSelector((state: GlobalState) => state);

  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const allowedOrganizationIds = demoContext?.allowedOrganizationIds || [];
  const hasOrganizationLimit = Boolean(allowedOrganizationIds.length);
  const allowedOrganizationIdSet = useMemo(
    () => new Set(allowedOrganizationIds),
    [allowedOrganizationIds]
  );

  const storeItems = useMemo(
    () =>
      organizationItems
        .filter((item) => item.type === 'store')
        .filter((item) =>
          hasOrganizationLimit ? allowedOrganizationIdSet.has(item.id) : true
        )
        .filter((item) =>
          appliedKeyword.trim() ? item.name.includes(appliedKeyword.trim()) : true
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [allowedOrganizationIdSet, appliedKeyword, hasOrganizationLimit, organizationItems]
  );

  function handleSearch() {
    setAppliedKeyword(keyword);
  }

  function handleReset() {
    setKeyword('');
    setAppliedKeyword('');
  }

  function goToEdit(item: OrganizationItem) {
    history.push(
      getOrganizationEditPath(location.pathname, item.id, item.type, 'basic')
    );
  }

  function goToCreate() {
    history.push(getOrganizationCreatePath(location.pathname, 'store'));
  }

  function goToStoreEmployee(item: OrganizationItem) {
    const nextSelection = resolveDemoSelection({
      currentDemoSystem,
      currentDemoIdentity,
      currentOrganizationId: item.id,
    });

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
    history.push(STORE_EMPLOYEE_VIEW_PATH);
  }

  function goToStoreSystem(item: OrganizationItem) {
    const targetIdentity = getDefaultDemoIdentityForSystem('store');
    const nextSelection = resolveDemoSelection({
      currentDemoSystem: 'store',
      currentDemoIdentity: targetIdentity,
      currentOrganizationId: item.id,
    });

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

    history.push(`/${nextSelection.demoContext.defaultHomeRoute}`);
  }

  return (
    <div className={styles.page}>
      {/* 筛选栏 */}
      <div className={styles.toolbar}>
        <Input
          allowClear
          className={styles.searchInput}
          placeholder="店铺名称"
          prefix={<IconSearch />}
          value={keyword}
          onChange={setKeyword}
          onPressEnter={handleSearch}
        />
        <Button type="primary" onClick={handleSearch}>
          查询
        </Button>
        <Button onClick={handleReset}>重置</Button>
      </div>

      {/* 卡片网格 */}
      <div className={styles.grid}>
        {/* 新建店铺卡片 */}
        <button type="button" className={styles.createCard} onClick={goToCreate}>
          <IconPlus className={styles.createIcon} />
          <span className={styles.createLabel}>新建店铺</span>
        </button>

        {/* 店铺卡片列表 */}
        {storeItems.map((item) => (
          <div key={item.id} className={styles.storeCard}>
            <div className={styles.cardHeader}>
              <Typography.Title heading={6} className={styles.cardName}>
                {item.name}
              </Typography.Title>
              <Tag
                className={styles.statusTag}
                color={item.status === 'enabled' ? 'green' : undefined}
              >
                {ORGANIZATION_STATUS_LABEL_MAP[item.status]}
              </Tag>
            </div>

            <div className={styles.cardCode}>{item.code}</div>

            <div className={styles.cardDivider} />

            <div className={styles.cardInfo}>
              <div className={styles.cardRow}>
                <span className={styles.cardRowLabel}>地址</span>
                <span className={styles.cardRowValue}>{item.address || '-'}</span>
              </div>
              <div className={styles.cardRow}>
                <span className={styles.cardRowLabel}>负责人</span>
                <span className={styles.cardRowValue}>
                  {item.managerName || '-'}
                  {item.contactPhone ? ` · ${item.contactPhone}` : ''}
                </span>
              </div>
            </div>

            <div className={styles.cardFooter}>
              <button
                type="button"
                className={styles.footerBtn}
                onClick={() => goToStoreEmployee(item)}
              >
                人员管理
              </button>
              <button
                type="button"
                className={styles.footerBtn}
                onClick={() => goToStoreSystem(item)}
              >
                进入店铺
              </button>
              <button
                type="button"
                className={styles.footerBtn}
                onClick={() => goToEdit(item)}
              >
                编辑
              </button>
            </div>
          </div>
        ))}
      </div>

      {appliedKeyword && !storeItems.length && (
        <div className={styles.emptyHint}>未找到名称含「{appliedKeyword}」的店铺</div>
      )}
    </div>
  );
}

export default MerchantOrganizationPage;
