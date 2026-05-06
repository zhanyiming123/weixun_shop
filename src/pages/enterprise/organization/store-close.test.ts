import { describe, expect, it } from 'vitest';
import { getStoreCloseCheckResult } from './store-close';

describe('store close checks', () => {
  it('allows manual close when no business data exists', () => {
    expect(
      getStoreCloseCheckResult('store_empty', {
        hasProductData: () => false,
        hasMarketingData: () => false,
        hasOperationData: () => false,
      })
    ).toEqual({
      canClose: true,
      blockingReasons: [],
    });
  });

  it('blocks manual close when product data exists', () => {
    expect(
      getStoreCloseCheckResult('store_product', {
        hasProductData: () => true,
        hasMarketingData: () => false,
        hasOperationData: () => false,
      })
    ).toEqual({
      canClose: false,
      blockingReasons: ['product'],
    });
  });

  it('blocks manual close when marketing data exists', () => {
    expect(
      getStoreCloseCheckResult('store_marketing', {
        hasProductData: () => false,
        hasMarketingData: () => true,
        hasOperationData: () => false,
      })
    ).toEqual({
      canClose: false,
      blockingReasons: ['marketing'],
    });
  });

  it('blocks manual close when operation data exists', () => {
    expect(
      getStoreCloseCheckResult('store_operation', {
        hasProductData: () => false,
        hasMarketingData: () => false,
        hasOperationData: () => true,
      })
    ).toEqual({
      canClose: false,
      blockingReasons: ['operation'],
    });
  });

  it('returns every blocking reason when multiple business data sources exist', () => {
    expect(
      getStoreCloseCheckResult('store_all', {
        hasProductData: () => true,
        hasMarketingData: () => true,
        hasOperationData: () => true,
      })
    ).toEqual({
      canClose: false,
      blockingReasons: ['product', 'marketing', 'operation'],
    });
  });
});
