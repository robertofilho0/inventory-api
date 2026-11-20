import { STOCK_LOW } from '../messaging/events.js';
import { StockService } from './stock.service.js';

/** Testa a regra de publicação do evento sem banco, simulando a transação. */
function setup(
  previous: number,
  minStock: number,
  type: 'IN' | 'OUT' | 'ADJUSTMENT',
  quantity: number,
) {
  const next =
    type === 'IN'
      ? previous + quantity
      : type === 'OUT'
        ? previous - quantity
        : quantity;
  const product = {
    id: 'p1',
    sku: 'SKU-1',
    name: 'Produto',
    minStock,
    active: true,
    quantity: next,
  };
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([{ quantity: previous }]),
    product: { update: vi.fn().mockResolvedValue(product) },
    stockMovement: {
      create: vi
        .fn()
        .mockResolvedValue({ previousQuantity: previous, newQuantity: next }),
    },
  };
  const prisma = { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };
  const products = { findOne: vi.fn().mockResolvedValue(product) };
  const events = { publish: vi.fn() };
  const service = new StockService(
    prisma as never,
    products as never,
    events as never,
  );
  return { service, events };
}

describe('StockService · evento stock.low', () => {
  it('publica ao cruzar o estoque mínimo', async () => {
    const { service, events } = setup(5, 2, 'OUT', 3);
    await service.move('p1', { type: 'OUT', quantity: 3 });
    expect(events.publish).toHaveBeenCalledWith(
      STOCK_LOW,
      expect.objectContaining({ quantity: 2, minStock: 2 }),
    );
  });

  it('não publica se já estava abaixo do mínimo', async () => {
    const { service, events } = setup(2, 2, 'OUT', 1);
    await service.move('p1', { type: 'OUT', quantity: 1 });
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('não publica em entradas acima do mínimo', async () => {
    const { service, events } = setup(1, 2, 'IN', 10);
    await service.move('p1', { type: 'IN', quantity: 10 });
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('rejeita saída maior que o saldo', async () => {
    const { service } = setup(1, 0, 'OUT', 5);
    await expect(
      service.move('p1', { type: 'OUT', quantity: 5 }),
    ).rejects.toThrow(/Estoque insuficiente/);
  });
});
