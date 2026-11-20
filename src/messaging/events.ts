/** Evento publicado quando um produto atinge (ou fica abaixo) do estoque mínimo. */
export const STOCK_LOW = 'stock.low';

export interface StockLowEvent {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  minStock: number;
  occurredAt: string;
}
