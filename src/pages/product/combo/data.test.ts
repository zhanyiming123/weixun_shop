import { beforeEach, describe, expect, it, vi } from 'vitest';

const readPersistentValueMock = vi.fn();
const writePersistentValueMock = vi.fn();

vi.mock('@/utils/usePersistentState', () => ({
  default: vi.fn(),
  readPersistentValue: readPersistentValueMock,
  writePersistentValue: writePersistentValueMock,
}));

describe('combo product data persistence migration', () => {
  beforeEach(() => {
    readPersistentValueMock.mockReset();
    writePersistentValueMock.mockReset();
  });

  it('backfills seeded combo options for cached guangzhou combo products', async () => {
    readPersistentValueMock.mockReturnValue([
      {
        id: 'C_1260601000000000001',
        productKind: 'combo',
        comboOptions: [],
      },
    ]);

    const { readProductItems } = await import('./data');
    const result = readProductItems();
    const target = result.find((item) => item.id === 'C_1260601000000000001');

    expect(target?.comboOptions?.length).toBeGreaterThan(0);
    expect(target?.comboOptions?.[0]?.items?.length).toBeGreaterThan(0);
    expect(writePersistentValueMock).toHaveBeenCalledTimes(1);
  });
});
