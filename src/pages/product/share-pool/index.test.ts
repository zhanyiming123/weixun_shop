import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('share pool list columns', () => {
  it('does not define the on-sale store column', () => {
    const source = readFileSync(path.resolve(__dirname, './index.tsx'), 'utf8');

    expect(source).not.toContain("title: '在售店铺'");
  });
});
