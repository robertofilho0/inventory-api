# 🛒 Inventory API - Node.js + Express + MongoDB
> API para gerenciamento de produtos e categorias, com operações CRUD, filtros e controle de estoque.
>Desenvolvida com **Node.js**, **Express** e **MongoDB Atlas**.

---

## 📌 Ajustes e melhorias
O projeto ainda está em desenvolvimento e as próximas atualizações serão voltadas para:

- [x] CRUD de categorias e produtos

 - [x] Filtro de produtos por categoria e preço

 - [x] Controle de estoque

 - [x] Autenticação de usuários (JWT)

 - [x] Testes automatizados

 ---

## 💻 Pré-requisitos
Antes de começar, verifique se você atendeu aos seguintes requisitos:

**Node.js** v16+ e **npm** instalados

Conta no **MongoDB Atlas** ou instância local do **MongoDB**

Compatível com **Windows**, **Linux** e **macOS**

---

## 🚀 Instalando Inventory API
**1. Clone o repositório:**

```bash
git clone https://github.com/RobertoTheDev/inventory-api.git
cd inventory-api
```
**2. Instale as dependências:**

```bash
npm install
```
**3. Configure o arquivo .env:**

```env
PORT=5000
MONGO_URI=mongodb+srv://usuario:senha@cluster0.mongodb.net/inventory
```
**Substitua usuario e senha pelo seu usuário e senha do MongoDB Atlas.**

**4. Execute a aplicação:**

```bash
node src/server.js
```

**Exemplos curl:**
- Criar categoria:
```bash

curl -X POST http://localhost:5000/api/categories \
-H "Content-Type: application/json" \
-d '{"name":"Eletrônicos"}'
```
- Listar categorias:
```bash
curl -X GET http://localhost:5000/api/categories
```


- Criar produto (substitua pelo ID da categoria)
```bash
curl -X POST http://localhost:5000/api/products \
-H "Content-Type: application/json" \
-d '{
  "name": "Notebook Gamer",
  "description": "Acer Nitro 5 - i7, 16GB RAM, GTX 1650",
  "price": 5800,
  "quantity": 5,
  "category": "689cc2ad4811c7a57a494758"
}'
```

- Listar :
```bash
curl -X GET http://localhost:5000/api/products

```
- Filtrar por categoria:
```bash
curl -X GET "http://localhost:5000/api/products?category=689cc2ad4811c7a57a494758"
```
- Atualizar estoque do produto (substitua pelo ID do produto):
```bash
curl -X PATCH http://localhost:5000/api/products/689cc3204811c7a57a49475e \
-H "Content-Type: application/json" \
-d '{"quantity": 12}'
```
- Deletar produto:
```bash
curl -X DELETE http://localhost:5000/api/products/689cc3204811c7a57a49475e
```