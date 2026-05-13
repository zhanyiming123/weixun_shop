import React from 'react';
import { Redirect } from 'react-router-dom';
import { getMerchantOrganizationModalPath } from '../store-modal-utils';

function MerchantOrganizationCreatePage() {
  return <Redirect to={getMerchantOrganizationModalPath('create')} />;
}

export default MerchantOrganizationCreatePage;
