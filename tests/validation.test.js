const request = require('supertest');
const app = require('../src/app');

const ID = '665f1c2b8a1e4b6d2c3f4a5b';

describe('Validação (sem banco)', () => {
  it('GET /health responde ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('404 para rota inexistente', async () => {
    expect((await request(app).get('/api/xyz')).status).toBe(404);
  });

  it('rejeita produto com preço negativo e SKU inválido', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ name: 'Mouse', sku: 'a b', price: -1, category: ID });
    expect(res.status).toBe(400);
    expect(res.body.details.map((d) => d.campo).sort()).toEqual(['price', 'sku']);
  });

  it('rejeita alteração direta do saldo pelo PATCH', async () => {
    const res = await request(app).patch(`/api/products/${ID}`).send({ quantity: 99 });
    expect(res.status).toBe(400);
  });

  it('rejeita movimentação com tipo inválido ou quantidade zero', async () => {
    const url = `/api/products/${ID}/movements`;
    expect((await request(app).post(url).send({ type: 'roubo', quantity: 1 })).status).toBe(400);
    expect((await request(app).post(url).send({ type: 'out', quantity: 0 })).status).toBe(400);
  });

  it('rejeita faixa de preço invertida', async () => {
    const res = await request(app).get('/api/products?minPrice=100&maxPrice=10');
    expect(res.status).toBe(400);
  });

  it('rejeita categoria com nome curto', async () => {
    expect((await request(app).post('/api/categories').send({ name: 'a' })).status).toBe(400);
  });

  it('rejeita ID inválido', async () => {
    expect((await request(app).get('/api/products/abc')).status).toBe(400);
  });
});
