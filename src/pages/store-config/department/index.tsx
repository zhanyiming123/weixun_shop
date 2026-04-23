import React, { useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import EnterpriseDepartmentPage from '@/pages/enterprise/department';
import { GlobalState } from '@/store';

function StoreConfigDepartmentPage() {
  const history = useHistory();
  const location = useLocation();
  const { currentOrganization } = useSelector((state: GlobalState) => state);

  useEffect(() => {
    const currentStoreId =
      currentOrganization?.scope === 'store' ? currentOrganization.id : '';

    if (!currentStoreId) {
      return;
    }

    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    const storeId = searchParams.get('storeId');

    if (tab === 'store' && storeId === currentStoreId) {
      return;
    }

    history.replace(`${location.pathname}?tab=store&storeId=${currentStoreId}`);
  }, [
    currentOrganization?.id,
    currentOrganization?.scope,
    history,
    location.pathname,
    location.search,
  ]);

  return <EnterpriseDepartmentPage />;
}

export default StoreConfigDepartmentPage;
