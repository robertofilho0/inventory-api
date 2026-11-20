import type { INestApplication } from '@nestjs/common';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { createApp, resetDb } from './helpers/app.js';

let app: INestApplication;
let prisma: PrismaService;
let http: Awaited<ReturnType<typeof createApp>>['http'];

const NAO_EXISTE = '00000000-0000-4000-8000-000000000000';

async function criarCategoria(name = 'Eletrônicos') {
  return (await http().post('/api/categories').send({ name }).expect(201)).body;
}

function criarProduto(categoryId: string, dados: Record<string, unknown> = {}) {
  return http()
    .post('/api/products')
    .send({
      name: 'Notebook',
      sku: 'nb-001',
      price: 5000,
      quantity: 5,
      minStock: 2,
      categoryId,
      ...dados,
    });
}

const mover = (id: string, body: object) =>
  http().post(`/api/products/${id}/movements`).send(body);

/** Espera um alerta ser gravado (o consumer RabbitMQ é assíncrono). */
async function esperarAlertas(total: number, timeout = 5000) {
  const inicio = Date.now();
  while (Date.now() - inicio < timeout) {
    if ((await prisma.stockAlert.count()) >= total) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Esperava ${total} alerta(s)`);
}

beforeAll(async () => {
  ({ app, prisma, http } = await createApp());
});
beforeEach(() => resetDb(prisma));
afterAll(() => app.close());

describe('Categorias', () => {
  it('cria, lista com contagem e impede nome duplicado', async () => {
    const cat = await criarCategoria();
    await criarProduto(cat.id).expect(201);

    const lista = await http().get('/api/categories').expect(200);
    expect(lista.body).toEqual([
      expect.objectContaining({ name: 'Eletrônicos', productCount: 1 }),
    ]);

    await http()
      .post('/api/categories')
      .send({ name: 'Eletrônicos' })
      .expect(409);
    await http()
      .patch(`/api/categories/${cat.id}`)
      .send({ description: 'Tech' })
      .expect(200);
  });

  it('não remove categoria com produtos, mas remove a vazia', async () => {
    const cheia = await criarCategoria();
    await criarProduto(cheia.id);
    await http().delete(`/api/categories/${cheia.id}`).expect(409);

    const vazia = await criarCategoria('Vazia');
    await http().delete(`/api/categories/${vazia.id}`).expect(204);
  });

  it('valida o ID', async () => {
    await http().get('/api/categories/abc').expect(400);
    await http().get(`/api/categories/${NAO_EXISTE}`).expect(404);
  });
});

describe('Produtos', () => {
  it('cria com SKU normalizado, preço em reais e movimentação inicial', async () => {
    const cat = await criarCategoria();
    const res = await criarProduto(cat.id, { price: 5899.9 }).expect(201);

    expect(res.body).toMatchObject({
      sku: 'NB-001',
      price: 5899.9,
      quantity: 5,
      lowStock: false,
    });
    expect(res.body.category).toMatchObject({ name: 'Eletrônicos' });
    expect(res.body.priceCents).toBeUndefined();

    const hist = await http()
      .get(`/api/products/${res.body.id}/movements`)
      .expect(200);
    expect(hist.body.data).toEqual([
      expect.objectContaining({
        type: 'IN',
        quantity: 5,
        previousQuantity: 0,
        newQuantity: 5,
      }),
    ]);
  });

  it('valida preço, SKU, categoria e duplicidade', async () => {
    const cat = await criarCategoria();
    const invalido = await criarProduto(cat.id, {
      price: -1,
      sku: 'a b',
    }).expect(400);
    expect(
      invalido.body.errors.map((e: { campo: string }) => e.campo).sort(),
    ).toEqual(['price', 'sku']);

    await criarProduto(NAO_EXISTE).expect(400);
    await criarProduto(cat.id).expect(201);
    await criarProduto(cat.id).expect(409);
  });

  it('filtra, busca, ordena e pagina', async () => {
    const a = await criarCategoria('Periféricos');
    const b = await criarCategoria('Monitores');
    await criarProduto(a.id, {
      name: 'Mouse',
      sku: 'MS-1',
      price: 50,
      quantity: 1,
    });
    await criarProduto(a.id, { name: 'Teclado', sku: 'TC-1', price: 150 });
    await criarProduto(b.id, { name: 'Monitor', sku: 'MN-1', price: 900 });

    expect(
      (await http().get(`/api/products?categoryId=${a.id}`)).body.meta.total,
    ).toBe(2);

    const preco = await http().get(
      '/api/products?minPrice=100&maxPrice=1000&sortBy=priceCents',
    );
    expect(preco.body.data.map((p: { name: string }) => p.name)).toEqual([
      'Teclado',
      'Monitor',
    ]);

    const busca = await http().get('/api/products?search=mo');
    expect(busca.body.data.map((p: { name: string }) => p.name)).toEqual([
      'Monitor',
      'Mouse',
    ]);

    const baixo = await http().get('/api/products?lowStock=true');
    expect(baixo.body.data.map((p: { name: string }) => p.name)).toEqual([
      'Mouse',
    ]);

    const pag = await http().get('/api/products?limit=2&page=2');
    expect(pag.body.meta).toEqual({
      total: 3,
      page: 2,
      limit: 2,
      totalPages: 2,
    });

    await http().get('/api/products?minPrice=100&maxPrice=10').expect(400);
  });

  it('não permite alterar o saldo pelo PATCH', async () => {
    const cat = await criarCategoria();
    const { body } = await criarProduto(cat.id);
    await http()
      .patch(`/api/products/${body.id}`)
      .send({ quantity: 99 })
      .expect(400);
    const upd = await http()
      .patch(`/api/products/${body.id}`)
      .send({ price: 4500 })
      .expect(200);
    expect(upd.body.price).toBe(4500);
  });
});

describe('Movimentações', () => {
  it('registra entrada, saída e ajuste mantendo o histórico', async () => {
    const cat = await criarCategoria();
    const { body: p } = await criarProduto(cat.id);

    expect(
      (
        await mover(p.id, {
          type: 'IN',
          quantity: 10,
          reason: 'Compra',
        }).expect(201)
      ).body.product.quantity,
    ).toBe(15);
    const saida = await mover(p.id, { type: 'OUT', quantity: 14 }).expect(201);
    expect(saida.body.product).toMatchObject({ quantity: 1, lowStock: true });

    const ajuste = await mover(p.id, {
      type: 'ADJUSTMENT',
      quantity: 8,
    }).expect(201);
    expect(ajuste.body.movement).toMatchObject({
      previousQuantity: 1,
      newQuantity: 8,
    });

    const hist = await http().get(`/api/products/${p.id}/movements`);
    expect(hist.body.meta.total).toBe(4);
    expect(hist.body.data[0].type).toBe('ADJUSTMENT');
  });

  it('impede saída maior que o saldo', async () => {
    const cat = await criarCategoria();
    const { body: p } = await criarProduto(cat.id);
    const res = await mover(p.id, { type: 'OUT', quantity: 6 }).expect(409);
    expect(res.body.message).toMatch(/Estoque insuficiente/);
    await mover(NAO_EXISTE, { type: 'IN', quantity: 1 }).expect(404);
  });

  it('não deixa o estoque negativo com saídas simultâneas', async () => {
    const cat = await criarCategoria();
    const { body: p } = await criarProduto(cat.id);

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        mover(p.id, { type: 'OUT', quantity: 2 }),
      ),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(2);
    expect((await http().get(`/api/products/${p.id}`)).body.quantity).toBe(1);
  });
});

describe('Alertas de estoque baixo (evento stock.low)', () => {
  it('gera um alerta quando o produto cruza o estoque mínimo, sem repetir', async () => {
    const cat = await criarCategoria();
    const { body: p } = await criarProduto(cat.id, {
      quantity: 5,
      minStock: 2,
    });

    await mover(p.id, { type: 'OUT', quantity: 1 }); // 4: acima do mínimo
    await mover(p.id, { type: 'OUT', quantity: 2 }); // 2: cruzou → alerta
    await mover(p.id, { type: 'OUT', quantity: 1 }); // 1: já estava abaixo
    await esperarAlertas(1);
    await new Promise((r) => setTimeout(r, 300));

    const alertas = await http().get('/api/alerts?pending=true').expect(200);
    expect(alertas.body.meta.total).toBe(1);
    expect(alertas.body.data[0]).toMatchObject({
      quantity: 2,
      minStock: 2,
      product: { sku: 'NB-001' },
    });

    const ack = await http()
      .patch(`/api/alerts/${alertas.body.data[0].id}/ack`)
      .expect(200);
    expect(ack.body.acknowledgedAt).toBeTruthy();
    expect((await http().get('/api/alerts?pending=true')).body.meta.total).toBe(
      0,
    );
  });

  it.runIf(process.env.RABBITMQ_URL)(
    'entrega o evento pelo RabbitMQ',
    async () => {
      const cat = await criarCategoria();
      const { body: p } = await criarProduto(cat.id, {
        quantity: 3,
        minStock: 1,
      });
      await mover(p.id, { type: 'OUT', quantity: 3 }).expect(201);
      await esperarAlertas(1);
      expect(
        await prisma.stockAlert.findFirst({ where: { productId: p.id } }),
      ).toMatchObject({ quantity: 0 });
    },
  );
});

describe('Relatórios', () => {
  it('resume o valor do estoque e os alertas', async () => {
    const cat = await criarCategoria();
    await criarProduto(cat.id, {
      sku: 'A-1',
      price: 10.5,
      quantity: 3,
      minStock: 5,
    });
    await criarProduto(cat.id, {
      sku: 'B-1',
      price: 100,
      quantity: 2,
      minStock: 0,
    });

    const res = await http().get('/api/reports/summary').expect(200);
    expect(res.body).toEqual({
      products: 2,
      units: 5,
      inventoryValue: 231.5,
      lowStock: 1,
      outOfStock: 0,
      byCategory: [
        {
          category: 'Eletrônicos',
          products: 2,
          units: 5,
          inventoryValue: 231.5,
        },
      ],
    });

    const low = await http().get('/api/reports/low-stock');
    expect(low.body.map((p: { sku: string }) => p.sku)).toEqual(['A-1']);
  });

  it('retorna zeros sem produtos', async () => {
    const res = await http().get('/api/reports/summary');
    expect(res.body).toMatchObject({
      products: 0,
      inventoryValue: 0,
      byCategory: [],
    });
  });
});

it('health check e documentação', async () => {
  expect((await http().get('/api/health').expect(200)).body.database).toBe(
    'up',
  );
  await http().get('/docs').expect(200);
});
