import { describe, expect, it } from 'vitest';
import {
  PRODUCT_ATTRIBUTE_NUMBER_PRECISION_LIMIT,
  PRODUCT_ATTRIBUTE_TEXT_MAX_LENGTH_LIMIT,
  validateAttributeNumberPrecision,
  validateAttributeTextMaxLength,
} from './form-rules';

describe('product attribute form rules', () => {
  it('requires text max length for text attributes', () => {
    expect(validateAttributeTextMaxLength(undefined)).toBe('请输入最大字符数');
    expect(validateAttributeTextMaxLength('')).toBe('请输入最大字符数');
  });

  it('rejects non-positive or oversized text max length values', () => {
    expect(validateAttributeTextMaxLength(0)).toBe('最大字符数需为 1-1000 的整数');
    expect(validateAttributeTextMaxLength(-1)).toBe('最大字符数需为 1-1000 的整数');
    expect(validateAttributeTextMaxLength(1001)).toBe('最大字符数需为 1-1000 的整数');
    expect(validateAttributeTextMaxLength(1.5)).toBe('最大字符数需为 1-1000 的整数');
  });

  it('accepts integer values up to the configured upper bound', () => {
    expect(PRODUCT_ATTRIBUTE_TEXT_MAX_LENGTH_LIMIT).toBe(1000);
    expect(validateAttributeTextMaxLength(1)).toBeUndefined();
    expect(validateAttributeTextMaxLength(1000)).toBeUndefined();
  });

  it('requires number precision when decimal input is allowed', () => {
    expect(validateAttributeNumberPrecision(undefined)).toBe('请输入最多小数位数');
    expect(validateAttributeNumberPrecision('')).toBe('请输入最多小数位数');
  });

  it('rejects negative or oversized number precision values', () => {
    expect(validateAttributeNumberPrecision(-1)).toBe('最多小数位数需为 0-2 的整数');
    expect(validateAttributeNumberPrecision(3)).toBe('最多小数位数需为 0-2 的整数');
    expect(validateAttributeNumberPrecision(1.5)).toBe('最多小数位数需为 0-2 的整数');
  });

  it('accepts integer number precision values up to two digits', () => {
    expect(PRODUCT_ATTRIBUTE_NUMBER_PRECISION_LIMIT).toBe(2);
    expect(validateAttributeNumberPrecision(0)).toBeUndefined();
    expect(validateAttributeNumberPrecision(2)).toBeUndefined();
  });
});
