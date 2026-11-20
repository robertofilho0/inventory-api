# 📦 Inventory API

[![CI](https://github.com/robertofilho0/inventory-api/actions/workflows/ci.yml/badge.svg)](https://github.com/robertofilho0/inventory-api/actions/workflows/ci.yml)
![NestJS](https://img.shields.io/badge/nestjs-12-E0234E?logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-6-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/postgresql-17-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/prisma-7-2D3748?logo=prisma&logoColor=white)
![RabbitMQ](https://img.shields.io/badge/rabbitmq-4-FF6600?logo=rabbitmq&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

API de controle de estoque em **NestJS + TypeScript**, com **PostgreSQL/Prisma**, movimentações atômicas com histórico, relatórios e **alertas de estoque baixo publicados no RabbitMQ**.

## ✨ Destaques

- **Movimentações atômicas**: cada entrada, saída ou ajuste roda numa transação que trava a linha do produto (`SELECT … FOR UPDATE`). Saídas simultâneas nunca deixam o saldo negativo, e isso é testado com requisições paralelas num PostgreSQL real.
- **Histórico completo**: toda alteração de saldo gera um registro com saldo anterior, saldo novo e motivo. O saldo não pode ser editado diretamente.
- **Mensageria com RabbitMQ**: quando um produto **cruza** o estoque mínimo, a API publica o evento `stock.low`. Um consumer (app híbrida HTTP + microservice) grava o alerta e só então confirma a mensagem (`ack` manual). Não há alertas repetidos enquanto o produto continua abaixo do mínimo.
- **Funciona sem broker**: sem `RABBITMQ_URL`, um publisher em memória entrega o evento direto ao handler. A troca é feita por injeção de dependência (`EventPublisher`), e o resto do código não muda.
- **Dinheiro em centavos** no banco (sem erro de arredondamento) e em reais na API.
- **Relatórios em SQL**: valor total do estoque, unidades, itens zerados, itens abaixo do mínimo e totais por categoria.
- Validação com **Zod** (nativa no Nest 12) e Swagger gerado a partir dos schemas, além de filtros, busca, ordenação e paginação.

## 🧱 Stack

NestJS 12 · TypeScript · PostgreSQL 17 · Prisma 7 · RabbitMQ 4 (`@nestjs/microservices`) · Zod · Swagger · Vitest · Supertest · Oxlint · Docker

## 🏗️ Fluxo do evento

```
POST /api/products/:id/movements
        │
        ▼
 StockService ── transação (FOR UPDATE) ──► PostgreSQL
        │ cruzou o mínimo?
        ▼
 EventPublisher.publish('stock.low')
        │
        ├── RabbitMqPublisher ──► fila inventory.stock-alerts ──► AlertsConsumer (@EventPattern) ──► stock_alerts + ack
        └── InMemoryPublisher (sem RABBITMQ_URL) ───────────────► AlertsService
```

## 📁 Estrutura

```
src/
├── categories/ products/      # CRUD
├── stock/                     # movimentações atômicas e histórico
├── messaging/                 # EventPublisher, RabbitMQ, memória e conexão do consumer
├── alerts/                    # consumer do evento stock.low e API de alertas
├── reports/                   # relatórios em SQL
├── prisma/ config/ common/ health/
prisma/schema.prisma + migrations/
test/                          # e2e contra PostgreSQL (e RabbitMQ no CI)
```

## 🚀 Como rodar

### Com Docker (API + PostgreSQL + RabbitMQ)

```bash
git clone https://github.com/robertofilho0/inventory-api.git
cd inventory-api
docker compose up --build
```

- API: `http://localhost:5000/api`
- Swagger: `http://localhost:5000/docs`
- Painel do RabbitMQ: `http://localhost:15672` (guest/guest)

### Localmente

```bash
npm install
cp .env.example .env      # remova RABBITMQ_URL para rodar sem broker
npx prisma migrate deploy
npm run start:dev
```

## 📚 Endpoints

| Método   | Rota                          | Descrição                                       |
| -------- | ----------------------------- | ----------------------------------------------- |
| `GET`    | `/api/categories`             | Lista categorias com quantidade de produtos     |
| `POST`   | `/api/categories`             | Cria categoria                                  |
| `PATCH`  | `/api/categories/:id`         | Atualiza categoria                              |
| `DELETE` | `/api/categories/:id`         | Remove (somente sem produtos)                   |
| `GET`    | `/api/products`               | Lista com filtros e paginação                   |
| `POST`   | `/api/products`               | Cria produto (o estoque inicial vira movimentação) |
| `GET`    | `/api/products/:id`           | Detalhes                                        |
| `PATCH`  | `/api/products/:id`           | Atualiza (exceto o saldo)                       |
| `DELETE` | `/api/products/:id`           | Remove                                          |
| `GET`    | `/api/products/:id/movements` | Histórico                                       |
| `POST`   | `/api/products/:id/movements` | Entrada (`IN`), saída (`OUT`) ou ajuste (`ADJUSTMENT`) |
| `GET`    | `/api/alerts?pending=true`    | Alertas de estoque baixo                        |
| `PATCH`  | `/api/alerts/:id/ack`         | Marca alerta como resolvido                     |
| `GET`    | `/api/reports/summary`        | Valor em estoque, unidades e totais por categoria |
| `GET`    | `/api/reports/low-stock`      | Produtos no mínimo ou abaixo dele               |

**Filtros de `/api/products`:** `categoryId`, `search` (nome ou SKU), `minPrice`, `maxPrice`, `lowStock`, `active`, `sortBy` (`name`, `priceCents`, `quantity`, `createdAt`), `order`, `page` e `limit`.

```bash
curl -X POST http://localhost:5000/api/products/<ID>/movements \
  -H "Content-Type: application/json" -d '{"type":"OUT","quantity":3,"reason":"Venda #1042"}'
```

Se a saída for maior que o saldo, a resposta é `409`: `{ "message": "Estoque insuficiente: disponível 2, solicitado 3" }`.

## 🧪 Testes

```bash
npm test             # unitários (regra de publicação do evento)
npm run test:e2e     # e2e: requer DATABASE_URL; com RABBITMQ_URL também testa o broker
npm run lint
```

O CI sobe **PostgreSQL** e **RabbitMQ**, aplica as migrations, confere se elas batem com o `schema.prisma` e roda lint, testes e build.

## 📄 Licença

MIT. Veja [LICENSE](LICENSE).

---

Feito por [Roberto Filho](https://github.com/robertofilho0) · [LinkedIn](https://www.linkedin.com/in/roberto-filho-393b372b2/)
