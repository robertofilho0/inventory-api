import { fromCents } from '../common/schemas.js';
import type { Product } from '../generated/prisma/client.js';

/** Formato público do produto: preço em reais e indicador de estoque baixo. */
export function toProductResponse<T extends Product>(product: T) {
  const { priceCents, ...rest } = product;
  return {
    ...rest,
    price: fromCents(priceCents),
    lowStock: product.quantity <= product.minStock,
  };
}
