export class AppError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export function getErrorMessage(error: unknown, fallback = '操作失败，请稍后重试') {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
