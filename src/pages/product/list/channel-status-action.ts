import type { ProductStatus } from '@/types/product';

export function getChannelStatusAction(status: ProductStatus) {
  return {
    label: status === 'on' ? '设为下架' : '设为上架',
    nextStatus: status === 'on' ? 'off' : 'on',
  } as const;
}
