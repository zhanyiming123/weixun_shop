import React from 'react';
import { Link, Typography } from '@arco-design/web-react';
import { getProductSalesStoreCount } from './sales-store-detail';
import type { ProductItem } from '@/types/product';

type OnSaleStoreCountLinkProps<
  T extends ProductItem & {
    storeView?: {
      isShared?: boolean;
    };
  },
> = {
  product: T;
  onOpen: (product: T) => void;
  className?: string;
};

export default function OnSaleStoreCountLink<
  T extends ProductItem & {
    storeView?: {
      isShared?: boolean;
    };
  },
>({
  product,
  onOpen,
  className,
}: OnSaleStoreCountLinkProps<T>) {
  if (product.storeView?.isShared) {
    return <Typography.Text type="secondary">—</Typography.Text>;
  }

  const onSaleStoreCount = getProductSalesStoreCount(product);

  return (
    <Link
      className={className}
      disabled={onSaleStoreCount === 0}
      onClick={() => onSaleStoreCount > 0 && onOpen(product)}
    >
      {onSaleStoreCount}
    </Link>
  );
}
