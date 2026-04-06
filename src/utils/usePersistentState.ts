import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { isSSR } from '@/utils/is';

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function readPersistentValue<T>(key: string, fallbackValue: T): T {
  if (isSSR) {
    return cloneValue(fallbackValue);
  }

  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return cloneValue(fallbackValue);
    }

    return JSON.parse(raw) as T;
  } catch (_) {
    return cloneValue(fallbackValue);
  }
}

export function writePersistentValue<T>(key: string, value: T) {
  if (isSSR) {
    return;
  }

  localStorage.setItem(key, JSON.stringify(value));
}

function usePersistentState<T>(
  key: string,
  fallbackValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() =>
    readPersistentValue(key, fallbackValue)
  );

  useEffect(() => {
    writePersistentValue(key, value);
  }, [key, value]);

  return [value, setValue];
}

export default usePersistentState;
