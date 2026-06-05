export const PRODUCT_ATTRIBUTE_TEXT_MAX_LENGTH_LIMIT = 1000;
export const PRODUCT_ATTRIBUTE_NUMBER_PRECISION_LIMIT = 2;

const ATTRIBUTE_TEXT_MAX_LENGTH_REQUIRED_MESSAGE = '请输入最大字符数';
const ATTRIBUTE_TEXT_MAX_LENGTH_INVALID_MESSAGE = `最大字符数需为 1-${PRODUCT_ATTRIBUTE_TEXT_MAX_LENGTH_LIMIT} 的整数`;
const ATTRIBUTE_NUMBER_PRECISION_REQUIRED_MESSAGE = '请输入最多小数位数';
const ATTRIBUTE_NUMBER_PRECISION_INVALID_MESSAGE = `最多小数位数需为 0-${PRODUCT_ATTRIBUTE_NUMBER_PRECISION_LIMIT} 的整数`;

export function validateAttributeTextMaxLength(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return ATTRIBUTE_TEXT_MAX_LENGTH_REQUIRED_MESSAGE;
  }

  if (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= PRODUCT_ATTRIBUTE_TEXT_MAX_LENGTH_LIMIT
  ) {
    return undefined;
  }

  return ATTRIBUTE_TEXT_MAX_LENGTH_INVALID_MESSAGE;
}

export function getAttributeTextMaxLengthRule() {
  return {
    validator: (value: unknown, callback: (error?: string) => void) => {
      callback(validateAttributeTextMaxLength(value));
    },
  };
}

export function validateAttributeNumberPrecision(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return ATTRIBUTE_NUMBER_PRECISION_REQUIRED_MESSAGE;
  }

  if (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= PRODUCT_ATTRIBUTE_NUMBER_PRECISION_LIMIT
  ) {
    return undefined;
  }

  return ATTRIBUTE_NUMBER_PRECISION_INVALID_MESSAGE;
}

export function getAttributeNumberPrecisionRule() {
  return {
    validator: (value: unknown, callback: (error?: string) => void) => {
      callback(validateAttributeNumberPrecision(value));
    },
  };
}
