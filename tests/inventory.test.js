const request = require('supertest');
const app = require('../src/app');
const db = require('./helpers/db');

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

const api = request(app);

async function criarCategoria(name = 'Eletrônicos') {
  const res = await request(app).post('/api/categories').send({ name });
  return res.body;
}

async function criarProduto(category, dados = {}) {
  const res = await request(app)
    .post('/api/products')
    .send({
      name: 'Notebook',
      sku: 'nb-001',
      price: 5000,
      quantity: 5,
      minStock: 2,
      category,
      ...dados,
    });
  return res;
}

describe('Categorias', () => {
  it('cria, lista com contagem, atualiza e impede nome duplicado', async () => {
    const cat = await criarCategoria();
    await criarProduto(cat.id);

    const lista = await api.get('/api/categories');
    expect(lista.body).toEqual([expect.objectContaining({ name: 'Eletrônicos', productCount: 1 })]);

    const dup = await api.post('/api/categories').send({ name: 'Eletrônicos' });
    expect(dup.status).toBe(409);

    const upd = await api.patch(`/api/categories/${cat.id}`).send({ description: 'Tech' });
    expect(upd.body.description).toBe('Tech');
  });

  it('não remove categoria com produtos', async () => {
    const cat = await criarCategoria();
    await criarProduto(cat.id);
    expect((await api.delete(`/api/categories/${cat.id}`)).status).toBe(409);
  });

  it('remove categoria vazia', async () => {
    const cat = await criarCategoria();
    expect((await api.delete(`/api/categories/${cat.id}`)).status).toBe(204);
  });
});

describe('Produtos', () => {
  it('cria produto com categoria populada e movimentação inicial', async () => {
    const cat = await criarCategoria();
    const res = await criarProduto(cat.id);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ sku: 'NB-001', quantity: 5, lowStock: false });
    expect(res.body.category).toMatchObject({ name: 'Eletrônicos' });

    const hist = await api.get(`/api/products/${res.body.id}/movements`);
    expect(hist.body.data).toEqual([
      expect.objectContaining({ type: 'in', quantity: 5, previousQuantity: 0, newQuantity: 5 }),
    ]);
  });

  it('rejeita categoria inexistente e SKU duplicado', async () => {
    const semCat = await criarProduto('665f1c2b8a1e4b6d2c3f4a5b');
    expect(semCat.status).toBe(400);

    const cat = await criarCategoria();
    await criarProduto(cat.id);
    expect((await criarProduto(cat.id)).status).toBe(409);
  });

  it('filtra, busca e pagina', async () => {
    const a = await criarCategoria('A');
    const b = await criarCategoria('B');
    await criarProduto(a.id, { name: 'Mouse', sku: 'MS-1', price: 50, quantity: 1 });
    await criarProduto(a.id, { name: 'Teclado', sku: 'TC-1', price: 150 });
    await criarProduto(b.id, { name: 'Monitor', sku: 'MN-1', price: 900 });

    const porCat = await api.get(`/api/products?category=${a.id}`);
    expect(porCat.body.meta.total).toBe(2);

    const preco = await api.get('/api/products?minPrice=100&maxPrice=1000&sortBy=price');
    expect(preco.body.data.map((p) => p.name)).toEqual(['Teclado', 'Monitor']);

    const busca = await api.get('/api/products?search=mo');
    expect(busca.body.data.map((p) => p.name).sort()).toEqual(['Monitor', 'Mouse']);

    const baixo = await api.get('/api/products?lowStock=true');
    expect(baixo.body.data.map((p) => p.name)).toEqual(['Mouse']);

    const pag = await api.get('/api/products?limit=2&page=2');
    expect(pag.body.data).toHaveLength(1);
    expect(pag.body.meta.totalPages).toBe(2);
  });

  it('atualiza e remove', async () => {
    const cat = await criarCategoria();
    const { body: p } = await criarProduto(cat.id);

    const upd = await api.patch(`/api/products/${p.id}`).send({ price: 4500 });
    expect(upd.body.price).toBe(4500);

    expect((await api.delete(`/api/products/${p.id}`)).status).toBe(204);
    expect((await api.get(`/api/products/${p.id}`)).status).toBe(404);
  });
});

describe('Movimentações de estoque', () => {
  it('registra entrada, saída e ajuste mantendo o histórico', async () => {
    const cat = await criarCategoria();
    const { body: p } = await criarProduto(cat.id);
    const url = `/api/products/${p.id}/movements`;

    const entrada = await api.post(url).send({ type: 'in', quantity: 10, reason: 'Compra' });
    expect(entrada.status).toBe(201);
    expect(entrada.body.product.quantity).toBe(15);

    const saida = await api.post(url).send({ type: 'out', quantity: 14 });
    expect(saida.body.product).toMatchObject({ quantity: 1, lowStock: true });

    const ajuste = await api.post(url).send({ type: 'adjustment', quantity: 8 });
    expect(ajuste.body.movement).toMatchObject({ previousQuantity: 1, newQuantity: 8 });

    const hist = await api.get(url);
    expect(hist.body.meta.total).toBe(4);
    expect(hist.body.data[0].type).toBe('adjustment');
  });

  it('impede saída maior que o saldo', async () => {
    const cat = await criarCategoria();
    const { body: p } = await criarProduto(cat.id);

    const res = await api
      .post(`/api/products/${p.id}/movements`)
      .send({ type: 'out', quantity: 6 });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Estoque insuficiente/);

    expect((await api.get(`/api/products/${p.id}`)).body.quantity).toBe(5);
  });

  it('não deixa o estoque negativo com saídas simultâneas', async () => {
    const cat = await criarCategoria();
    const { body: p } = await criarProduto(cat.id);
    const url = `/api/products/${p.id}/movements`;

    const results = await Promise.all(
      Array.from({ length: 5 }, () => request(app).post(url).send({ type: 'out', quantity: 2 })),
    );

    expect(results.filter((r) => r.status === 201)).toHaveLength(2);
    expect((await api.get(`/api/products/${p.id}`)).body.quantity).toBe(1);
  });
});

describe('Relatórios', () => {
  it('resume valor do estoque e alertas', async () => {
    const cat = await criarCategoria();
    await criarProduto(cat.id, { sku: 'A-1', price: 10, quantity: 3, minStock: 5 });
    await criarProduto(cat.id, { sku: 'B-1', price: 100, quantity: 2, minStock: 0 });

    const res = await api.get('/api/reports/summary');
    expect(res.body).toMatchObject({ products: 2, units: 5, inventoryValue: 230, lowStock: 1 });
    expect(res.body.byCategory).toEqual([
      { category: 'Eletrônicos', products: 2, units: 5, inventoryValue: 230 },
    ]);

    const low = await api.get('/api/reports/low-stock');
    expect(low.body.map((p) => p.sku)).toEqual(['A-1']);
  });

  it('retorna zeros sem produtos', async () => {
    const res = await api.get('/api/reports/summary');
    expect(res.body).toMatchObject({ products: 0, inventoryValue: 0, byCategory: [] });
  });
});
