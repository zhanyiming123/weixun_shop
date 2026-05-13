import React, { useMemo } from 'react';
import qs from 'query-string';
import { Redirect, useLocation } from 'react-router-dom';
import { getMerchantOrganizationModalPath } from '../store-modal-utils';

function MerchantOrganizationEditPage() {
  const location = useLocation();
  const query = useMemo(() => qs.parse(location.search), [location.search]);
  const organizationId = typeof query.id === 'string' ? query.id.trim() : '';

  return <Redirect to={getMerchantOrganizationModalPath('edit', organizationId)} />;
}

export default MerchantOrganizationEditPage;
