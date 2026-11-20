# 📦 Inventory API

[![CI](https://github.com/robertofilho0/inventory-api/actions/workflows/ci.yml/badge.svg)](https://github.com/robertofilho0/inventory-api/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/express-5-000000?logo=express)
![MongoDB](https://img.shields.io/badge/mongodb-7-47A248?logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

API REST de controle de estoque: categorias, produtos, **movimentações com histórico** (entrada, saída e ajuste) e **relatórios** de valor em estoque e itens abaixo do mínimo.

## ✨ Destaques

- **Movimentações atômicas**: a saída só é aplicada se houver saldo (`findOneAndUpdate` condicional), o que evita estoque negativo mesmo com requisições simultâneas. Isso é coberto por teste.
- **Histórico de estoque**: toda alteração de saldo gera um registro com saldo anterior, saldo novo e motivo. O saldo não pode ser editado diretamente.
- **Estoque mínimo** por produto, com flag `lowStock` e relatório de reposição.
- **Relatório gerencial** com aggregation pipeline: valor total do estoque, unidades, itens zerados e totais por categoria.
- **Integridade**: SKU único, categoria validada na criação e bloqueio da remoção de categorias com produtos.
- Listagem com filtros (categoria, faixa de preço, busca por nome/SKU, estoque baixo, ativo), ordenação e paginação.
- Validação com **Zod**, erros padronizados, **Helmet**, **CORS**, **rate limiting** e health check.
- **Swagger UI** em `/docs`, **testes de integração** com MongoDB em memória, **Docker** e **CI**.

## 🧱 Stack

Node.js 22+ · Express 5 · MongoDB / Mongoose · Zod · Jest · Supertest · ESLint · Prettier · Docker

## 📁 Estrutura

```
src/
├── app.js / server.js
├── config/        # env validado e conexão com o banco
├── controllers/   # category, product e report
├── services/      # stock.service.js: regra de movimentação atômica
├── models/        # Category, Product, StockMovement
├── validators/    # schemas Zod
├── middlewares/   # validação, 404 e erros
├── routes/
└── docs/openapi.json
tests/             # testes de validação e integração
```

## 🚀 Como rodar

### Com Docker

```bash
git clone https://github.com/robertofilho0/inventory-api.git
cd inventory-api
docker compose up --build
```

A API sobe em `http://localhost:5000` e a documentação em `http://localhost:5000/docs`.

### Localmente

```bash
npm install
cp .env.example .env   # ajuste o MONGO_URI (local ou Atlas)
npm run dev
```

| Variável      | Padrão                                    | Descrição                                 |
| ------------- | ----------------------------------------- | ----------------------------------------- |
| `PORT`        | `5000`                                    | Porta HTTP                                |
| `MONGO_URI`   | `mongodb://localhost:27017/inventory-api` | String de conexão do MongoDB              |
| `CORS_ORIGIN` | `*`                                       | Origens permitidas, separadas por vírgula |

## 📚 Endpoints

| Método   | Rota                          | Descrição                                        |
| -------- | ----------------------------- | ------------------------------------------------ |
| `GET`    | `/api/categories`             | Lista categorias com quantidade de produtos      |
| `POST`   | `/api/categories`             | Cria categoria                                   |
| `GET`    | `/api/categories/:id`         | Busca categoria                                  |
| `PATCH`  | `/api/categories/:id`         | Atualiza categoria                               |
| `DELETE` | `/api/categories/:id`         | Remove categoria (somente se não tiver produtos) |
| `GET`    | `/api/products`               | Lista produtos (filtros e paginação)             |
| `POST`   | `/api/products`               | Cria produto                                     |
| `GET`    | `/api/products/:id`           | Busca produto                                    |
| `PATCH`  | `/api/products/:id`           | Atualiza dados (exceto saldo)                    |
| `DELETE` | `/api/products/:id`           | Remove produto e histórico                       |
| `GET`    | `/api/products/:id/movements` | Histórico de movimentações                       |
| `POST`   | `/api/products/:id/movements` | Entrada (`in`), saída (`out`) ou ajuste          |
| `GET`    | `/api/reports/summary`        | Valor em estoque, unidades e alertas             |
| `GET`    | `/api/reports/low-stock`      | Produtos no estoque mínimo ou abaixo dele        |

**Filtros de `/api/products`:** `category`, `search`, `minPrice`, `maxPrice`, `lowStock`, `active`, `sortBy` (`name`, `price`, `quantity`, `createdAt`), `order`, `page`, `limit`.

### Exemplos

```bash
# Categoria
curl -X POST http://localhost:5000/api/categories \
  -H "Content-Type: application/json" -d '{"name":"Eletrônicos"}'

# Produto (o estoque inicial vira a primeira movimentação)
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Notebook Gamer","sku":"NB-ACER-001","price":5800,"quantity":5,"minStock":2,"category":"<ID_CATEGORIA>"}'

# Saída de estoque
curl -X POST http://localhost:5000/api/products/<ID_PRODUTO>/movements \
  -H "Content-Type: application/json" -d '{"type":"out","quantity":3,"reason":"Venda #1042"}'

# Relatório
curl http://localhost:5000/api/reports/summary
```

Se a saída for maior que o saldo, a resposta é `409`:

```json
{ "error": "Estoque insuficiente: disponível 2, solicitado 3" }
```

## 🧪 Testes e qualidade

```bash
npm test               # sobe um MongoDB em memória automaticamente
npm run test:coverage
npm run lint
```

## 📄 Licença

MIT. Veja [LICENSE](LICENSE).

---

Feito por [Roberto Filho](https://github.com/robertofilho0) · [LinkedIn](https://www.linkedin.com/in/roberto-filho-393b372b2/)
