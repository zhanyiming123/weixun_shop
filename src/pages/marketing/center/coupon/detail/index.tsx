import React from 'react';
import { useLocation } from 'react-router-dom';
import CouponListPage from '../list';

function CouponDetailPage() {
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const couponId = query.get('id')?.trim() || undefined;

  return <CouponListPage detailCouponId={couponId} />;
}

export default CouponDetailPage;
